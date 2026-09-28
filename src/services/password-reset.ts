import type { Redis } from "ioredis";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { digestCode, sameDigest, sixDigitCode } from "./codes.js";
import { brandedMail } from "./mail-templates.js";
import type { Mailer } from "./mailer.js";
import { hashPassword } from "./passwords.js";

const TTL = 900;

export class PasswordReset {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly mailer: Mailer,
  ) {}

  async request(email: string): Promise<void> {
    const found = await this.pool.query<{ id: string; display_locale: "pt" | "en" }>(
      "SELECT id, display_locale FROM users WHERE email = $1",
      [email],
    );
    const user = found.rows[0];
    if (!user || !this.mailer.configured()) {
      return;
    }
    const code = sixDigitCode();
    await this.redis.set(`prosa:reset:${digestCode(email)}`, `${user.id}:${digestCode(code)}`, "EX", TTL);
    const letter = brandedMail({ locale: user.display_locale, kind: "reset", code });
    const ok = await this.mailer.send({ to: email, ...letter });
    if (!ok) {
      await this.redis.del(`prosa:reset:${digestCode(email)}`);
    }
  }

  async consume(email: string, code: string, password: string): Promise<void> {
    const key = `prosa:reset:${digestCode(email)}`;
    const stored = await this.redis.get(key);
    if (!stored) {
      throw new AppError(400, "Reset code expired");
    }
    const [userId, hash] = stored.split(":");
    if (!userId || !hash || !sameDigest(hash, digestCode(code))) {
      throw new AppError(400, "Reset code expired");
    }
    await this.pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, await hashPassword(password)]);
    await this.pool.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
    await this.redis.del(key);
  }
}
