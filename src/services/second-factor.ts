import { createHash, randomBytes } from "node:crypto";
import type { Redis } from "ioredis";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { digestCode, sameDigest, sixDigitCode } from "./codes.js";
import { brandedMail } from "./mail-templates.js";
import type { Mailer } from "./mailer.js";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "./totp.js";

export type FactorMethod = "totp" | "email";

interface FactorRow {
  id: string;
  email: string;
  display_locale: "pt" | "en";
  totp_secret: string | null;
  totp_enabled: boolean;
  email_2fa: boolean;
}

export class SecondFactor {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly mailer: Mailer,
  ) {}

  async flags(userId: string): Promise<{ totp_enabled: boolean; email_2fa: boolean }> {
    const found = await this.pool.query<{ totp_enabled: boolean; email_2fa: boolean }>(
      "SELECT totp_enabled, email_2fa FROM users WHERE id = $1",
      [userId],
    );
    return found.rows[0] ?? { totp_enabled: false, email_2fa: false };
  }

  async beginLogin(userId: string): Promise<{ ticket: string; methods: FactorMethod[] } | null> {
    const user = await this.load(userId);
    const methods: FactorMethod[] = [];
    if (user.totp_enabled) {
      methods.push("totp");
    }
    if (user.email_2fa) {
      methods.push("email");
    }
    if (methods.length === 0) {
      return null;
    }
    const ticket = randomBytes(24).toString("base64url");
    await this.redis.set(`prosa:2fa:${digestCode(ticket)}`, userId, "EX", 300);
    if (user.email_2fa) {
      try {
        await this.sendEmailCode(user, "login");
      } catch (error) {
        if (!user.totp_enabled) {
          throw error;
        }
      }
    }
    return { ticket, methods };
  }

  async finishLogin(ticket: string, code: string): Promise<string> {
    const userId = await this.redis.get(`prosa:2fa:${digestCode(ticket)}`);
    if (!userId) {
      throw new AppError(401, "Second factor expired");
    }
    const user = await this.load(userId);
    const trimmed = code.replace(/\s/g, "");
    const totpOk = Boolean(user.totp_enabled && user.totp_secret && verifyTotp(user.totp_secret, trimmed));
    const emailOk = user.email_2fa && (await this.consumeEmailCode(userId, "login", trimmed));
    const recoveryOk = await this.consumeRecovery(userId, trimmed);
    if (!totpOk && !emailOk && !recoveryOk) {
      throw new AppError(401, "Invalid second factor");
    }
    await this.redis.del(`prosa:2fa:${digestCode(ticket)}`);
    return userId;
  }

  async startTotp(userId: string, email: string): Promise<{ secret: string; otpauth_url: string }> {
    const secret = generateTotpSecret();
    await this.redis.set(`prosa:totp-setup:${userId}`, secret, "EX", 600);
    return { secret, otpauth_url: otpauthUrl(email, secret) };
  }

  async confirmTotp(userId: string, code: string): Promise<string[]> {
    const secret = await this.redis.get(`prosa:totp-setup:${userId}`);
    if (!secret || !verifyTotp(secret, code)) {
      throw new AppError(400, "Invalid second factor");
    }
    await this.pool.query("UPDATE users SET totp_secret = $2, totp_enabled = true WHERE id = $1", [userId, secret]);
    await this.redis.del(`prosa:totp-setup:${userId}`);
    return this.issueRecovery(userId);
  }

  async verifyOwned(userId: string, code: string): Promise<boolean> {
    const user = await this.load(userId);
    const trimmed = code.replace(/\s/g, "");
    if (user.totp_enabled && user.totp_secret && verifyTotp(user.totp_secret, trimmed)) {
      return true;
    }
    return this.consumeRecovery(userId, trimmed);
  }

  async disableTotp(userId: string): Promise<void> {
    await this.pool.query("UPDATE users SET totp_secret = NULL, totp_enabled = false WHERE id = $1", [userId]);
    await this.pool.query("DELETE FROM user_recovery_codes WHERE user_id = $1", [userId]);
  }

  async setEmailFactor(userId: string, enabled: boolean): Promise<void> {
    const user = await this.load(userId);
    if (enabled) {
      await this.sendEmailCode(user, "enable-email");
      return;
    }
    await this.pool.query("UPDATE users SET email_2fa = false WHERE id = $1", [userId]);
  }

  async confirmEmailFactor(userId: string, code: string): Promise<void> {
    const user = await this.load(userId);
    if (!(await this.consumeEmailCode(userId, "enable-email", code))) {
      throw new AppError(400, "Invalid second factor");
    }
    await this.pool.query("UPDATE users SET email_2fa = true WHERE id = $1", [user.id]);
  }

  async requestEmailChange(userId: string, nextEmail: string): Promise<void> {
    const taken = await this.pool.query("SELECT 1 FROM users WHERE email = $1 AND id <> $2", [nextEmail, userId]);
    if (taken.rowCount) {
      throw new AppError(409, "Email already registered");
    }
    const user = await this.load(userId);
    const code = sixDigitCode();
    await this.redis.set(`prosa:email:${userId}`, `${nextEmail}:${digestCode(code)}`, "EX", 900);
    const letter = brandedMail({ locale: user.display_locale, kind: "email-change", code });
    const ok = await this.mailer.send({ to: nextEmail, ...letter });
    if (!ok) {
      await this.redis.del(`prosa:email:${userId}`);
      throw new AppError(503, "Mail is not configured");
    }
  }

  async confirmEmailChange(userId: string, code: string): Promise<string> {
    const stored = await this.redis.get(`prosa:email:${userId}`);
    if (!stored) {
      throw new AppError(400, "Email code expired");
    }
    const [email, hash] = stored.split(":");
    if (!email || !hash || !sameDigest(hash, digestCode(code))) {
      throw new AppError(400, "Email code expired");
    }
    try {
      await this.pool.query("UPDATE users SET email = $2, email_verified_at = now() WHERE id = $1", [userId, email]);
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new AppError(409, "Email already registered");
      }
      throw error;
    }
    await this.redis.del(`prosa:email:${userId}`);
    return email;
  }

  private async sendEmailCode(user: FactorRow, purpose: string): Promise<void> {
    const code = sixDigitCode();
    await this.redis.set(`prosa:otp:${purpose}:${user.id}`, digestCode(code), "EX", 300);
    const letter = brandedMail({
      locale: user.display_locale,
      kind: purpose === "enable-email" ? "enable-email" : "login",
      code,
    });
    const ok = await this.mailer.send({ to: user.email, ...letter });
    if (!ok) {
      await this.redis.del(`prosa:otp:${purpose}:${user.id}`);
      throw new AppError(503, "Mail is not configured");
    }
  }

  private async consumeEmailCode(userId: string, purpose: string, code: string): Promise<boolean> {
    const key = `prosa:otp:${purpose}:${userId}`;
    const stored = await this.redis.get(key);
    if (!stored || !sameDigest(stored, digestCode(code))) {
      return false;
    }
    await this.redis.del(key);
    return true;
  }

  private async issueRecovery(userId: string): Promise<string[]> {
    await this.pool.query("DELETE FROM user_recovery_codes WHERE user_id = $1", [userId]);
    const codes = Array.from({ length: 8 }, () => randomBytes(16).toString("hex"));
    for (const code of codes) {
      await this.pool.query("INSERT INTO user_recovery_codes (user_id, code_hash) VALUES ($1, $2)", [
        userId,
        createHash("sha256").update(code).digest("hex"),
      ]);
    }
    return codes;
  }

  private async consumeRecovery(userId: string, code: string): Promise<boolean> {
    const hash = createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
    const found = await this.pool.query<{ id: string }>(
      "SELECT id FROM user_recovery_codes WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL",
      [userId, hash],
    );
    const row = found.rows[0];
    if (!row) {
      return false;
    }
    await this.pool.query("UPDATE user_recovery_codes SET used_at = now() WHERE id = $1", [row.id]);
    return true;
  }

  private async load(userId: string): Promise<FactorRow> {
    const found = await this.pool.query<FactorRow>(
      "SELECT id, email, display_locale, totp_secret, totp_enabled, email_2fa FROM users WHERE id = $1",
      [userId],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "Account not found");
    }
    return row;
  }
}
