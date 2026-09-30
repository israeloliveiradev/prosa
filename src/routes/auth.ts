import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { promoteAdmin } from "../auth/admin.js";
import { readBearer, requireUser, revokeSession, issueSession, type AuthUser } from "../auth/session.js";
import { forgotBodySchema, resetBodySchema, secondFactorBodySchema, verifyBodySchema } from "../schemas/account.js";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.js";
import { acquireOnce } from "../security/idempotency.js";
import { assertNotLocked, clearFailures, lockoutKey, recordFailure } from "../security/lockout.js";
import { publicInboxUrl } from "../security/origins.js";
import { digestCode } from "../services/codes.js";
import type { EmailVerify } from "../services/email-verify.js";
import type { Mailer } from "../services/mailer.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";
import type { PasswordReset } from "../services/password-reset.js";
import type { SecondFactor } from "../services/second-factor.js";

let fillerHash: Promise<string> | null = null;

function filler(): Promise<string> {
  fillerHash ??= hashPassword("prosa-timing-filler");
  return fillerHash;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  pool: Pool,
  redis: Redis,
  emails: ReadonlySet<string>,
  reset: PasswordReset,
  factors: SecondFactor,
  verify: EmailVerify,
  mailer: Mailer,
): void {
  app.get("/api/v1/auth/mail", async () => ({
    inbox_url: publicInboxUrl(mailer.inboxUrl()),
  }));

  app.post(
    "/api/v1/auth/register",
    {
      config: {
        rateLimit: {
          max: 8,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      if (!mailer.configured()) {
        throw new AppError(503, "Mail is not configured");
      }
      const body = registerBodySchema.parse(request.body);
      await acquireOnce(redis, `prosa:once:register:${digestCode(body.email)}`, 8);
      const passwordHash = await hashPassword(body.password);
      try {
        const inserted = await pool.query<AuthUser & { display_locale: "pt" | "en" }>(
          `INSERT INTO users (email, password_hash, native_lang, target_lang, level, streak_freeze_count, display_locale)
           VALUES ($1, $2, $3, $4, $5, 1, $6)
           RETURNING id, email, native_lang, target_lang, level, plan, role, display_locale`,
          [body.email, passwordHash, body.native_lang, body.target_lang, body.level, body.display_locale ?? "pt"],
        );
        const created = inserted.rows[0];
        if (!created) {
          throw new AppError(500, "Account was not created");
        }
        await verify.send(created.id, created.email, created.display_locale);
        return reply.code(201).send({ requires_verify: true, email: created.email });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "Email already registered");
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: 8,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = loginBodySchema.parse(request.body);
      const lock = lockoutKey("login", body.email);
      await assertNotLocked(redis, lock);
      const found = await pool.query<
        AuthUser & { password_hash: string; email_verified_at: Date | null; display_locale: "pt" | "en" }
      >(
        `SELECT id, email, native_lang, target_lang, level, plan, role, password_hash, email_verified_at, display_locale
         FROM users
         WHERE email = $1`,
        [body.email],
      );
      const row = found.rows[0];
      const passwordHash = row?.password_hash ?? (await filler());
      const matches = await verifyPassword(body.password, passwordHash);
      if (!row || !matches) {
        await recordFailure(redis, lock);
        throw new AppError(401, "Invalid credentials");
      }
      await clearFailures(redis, lock);
      if (!row.email_verified_at) {
        try {
          await verify.send(row.id, row.email, row.display_locale);
        } catch {
          /* the client still enters the code; resend is on the screen */
        }
        return { requires_verify: true, email: row.email };
      }
      const challenge = await factors.beginLogin(row.id);
      if (challenge) {
        return { requires_2fa: true, ticket: challenge.ticket, methods: challenge.methods };
      }
      const user = await promoteAdmin(pool, {
        id: row.id,
        email: row.email,
        native_lang: row.native_lang,
        target_lang: row.target_lang,
        level: row.level,
        plan: row.plan,
        role: row.role,
      }, emails);
      const token = await issueSession(pool, user.id);
      return { token, user };
    },
  );

  app.post(
    "/api/v1/auth/verify",
    {
      config: {
        rateLimit: {
          max: 8,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const body = verifyBodySchema.parse(request.body);
      const lock = lockoutKey("verify", body.email);
      await assertNotLocked(redis, lock);
      try {
        const userId = await verify.consume(body.email, body.code);
        await clearFailures(redis, lock);
        const found = await pool.query<AuthUser>(
          `SELECT id, email, native_lang, target_lang, level, plan, role FROM users WHERE id = $1`,
          [userId],
        );
        const row = found.rows[0];
        if (!row) {
          throw new AppError(400, "Verify code expired");
        }
        const user = await promoteAdmin(pool, row, emails);
        const token = await issueSession(pool, user.id);
        return reply.code(200).send({ token, user });
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 400) {
          await recordFailure(redis, lock);
        }
        throw error;
      }
    },
  );

  app.post(
    "/api/v1/auth/verify/resend",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = forgotBodySchema.parse(request.body);
      const lock = lockoutKey("verify-resend", body.email);
      await assertNotLocked(redis, lock);
      await recordFailure(redis, lock);
      const found = await pool.query<{ id: string; email: string; display_locale: "pt" | "en"; email_verified_at: Date | null }>(
        `SELECT id, email, display_locale, email_verified_at FROM users WHERE email = $1`,
        [body.email],
      );
      const row = found.rows[0];
      if (row && !row.email_verified_at) {
        await verify.send(row.id, row.email, row.display_locale);
      }
      return { ok: true };
    },
  );

  app.post(
    "/api/v1/auth/2fa",
    {
      config: {
        rateLimit: {
          max: 12,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = secondFactorBodySchema.parse(request.body);
      const lock = lockoutKey("2fa", body.ticket);
      await assertNotLocked(redis, lock);
      try {
        const userId = await factors.finishLogin(body.ticket, body.code);
        await clearFailures(redis, lock);
        const found = await pool.query<AuthUser>(
          `SELECT id, email, native_lang, target_lang, level, plan, role FROM users WHERE id = $1`,
          [userId],
        );
        const row = found.rows[0];
        if (!row) {
          throw new AppError(401, "Authentication required");
        }
        const user = await promoteAdmin(pool, row, emails);
        const token = await issueSession(pool, user.id);
        return { token, user };
      } catch (error) {
        if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 400)) {
          await recordFailure(redis, lock);
        }
        throw error;
      }
    },
  );

  app.post("/api/v1/auth/logout", async (request) => {
    const token = readBearer(request);
    if (token) {
      await revokeSession(pool, token);
    }
    return { ok: true };
  });

  app.post(
    "/api/v1/auth/forgot",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = forgotBodySchema.parse(request.body);
      const lock = lockoutKey("forgot", body.email);
      await assertNotLocked(redis, lock);
      await recordFailure(redis, lock);
      await reset.request(body.email);
      return { ok: true };
    },
  );

  app.post(
    "/api/v1/auth/reset",
    {
      config: {
        rateLimit: {
          max: 8,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = resetBodySchema.parse(request.body);
      const lock = lockoutKey("reset", body.email);
      await assertNotLocked(redis, lock);
      try {
        await reset.consume(body.email, body.code, body.password);
        await clearFailures(redis, lock);
        return { ok: true };
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 400) {
          await recordFailure(redis, lock);
        }
        throw error;
      }
    },
  );

  app.get("/api/v1/auth/me", async (request) => {
    const user = await promoteAdmin(pool, await requireUser(pool, request), emails);
    const found = await pool.query<{
      interests: string[] | null;
      streak_count: number;
      streak_freeze_count: number;
      last_lesson_at: Date | null;
      display_name: string | null;
      display_locale: "pt" | "en";
      reminder_enabled: boolean;
      reminder_hour: number;
      mind_reading: string;
      mind_memory: string;
      mind_speech: string;
      mind_journal: string;
    }>(
      `SELECT interests, streak_count, streak_freeze_count, last_lesson_at,
              display_name, display_locale, reminder_enabled, reminder_hour,
              mind_reading, mind_memory, mind_speech, mind_journal
       FROM users
       WHERE id = $1`,
      [user.id],
    );
    const extra = found.rows[0];
    return {
      user: {
        ...user,
        interests: extra?.interests ?? [],
        streak_count: extra?.streak_count ?? 0,
        streak_freeze_count: extra?.streak_freeze_count ?? 0,
        last_lesson_at: extra?.last_lesson_at?.toISOString() ?? null,
        display_name: extra?.display_name ?? null,
        display_locale: extra?.display_locale ?? "pt",
        reminder_enabled: extra?.reminder_enabled ?? false,
        reminder_hour: extra?.reminder_hour ?? 8,
        mind_reading: extra?.mind_reading ?? "einstein",
        mind_memory: extra?.mind_memory ?? "curie",
        mind_speech: extra?.mind_speech ?? "feynman",
        mind_journal: extra?.mind_journal ?? "davinci",
      },
    };
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
