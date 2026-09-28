import type { Redis } from "ioredis";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { digestCode, sameDigest, sixDigitCode } from "./codes.js";
import { brandedMail, type MailLocale } from "./mail-templates.js";
import type { Mailer } from "./mailer.js";

const TTL = 900;

export class EmailVerify {
  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis,
    private readonly mailer: Mailer,
  ) {}

  key(email: string): string {
    return `prosa:verify:${digestCode(email)}`;
  }

  async send(userId: string, email: string, locale: MailLocale): Promise<void> {
    if (!this.mailer.configured()) {
      throw new AppError(503, "Mail is not configured");
    }
    const code = sixDigitCode();
    await this.redis.set(this.key(email), `${userId}:${digestCode(code)}`, "EX", TTL);
    const letter = brandedMail({ locale, kind: "verify", code });
    const ok = await this.mailer.send({ to: email, ...letter });
    if (!ok) {
      await this.redis.del(this.key(email));
      throw new AppError(503, "The verification letter did not leave");
    }
  }

  async consume(email: string, code: string): Promise<string> {
    const stored = await this.redis.get(this.key(email));
    if (!stored) {
      throw new AppError(400, "Verify code expired");
    }
    const [userId, hash] = stored.split(":");
    if (!userId || !hash || !sameDigest(hash, digestCode(code))) {
      throw new AppError(400, "Verify code expired");
    }
    await this.pool.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1", [userId]);
    await this.redis.del(this.key(email));
    return userId;
  }
}
