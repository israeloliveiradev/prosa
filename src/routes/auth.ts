import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { readBearer, requireUser, revokeSession, issueSession, type AuthUser } from "../auth/session.js";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.js";
import { hashPassword, verifyPassword } from "../services/passwords.js";

let fillerHash: Promise<string> | null = null;

function filler(): Promise<string> {
  fillerHash ??= hashPassword("prosa-timing-filler");
  return fillerHash;
}

export function registerAuthRoutes(app: FastifyInstance, pool: Pool): void {
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
      const body = registerBodySchema.parse(request.body);
      const passwordHash = await hashPassword(body.password);
      try {
        const inserted = await pool.query<AuthUser>(
          `INSERT INTO users (email, password_hash, native_lang, target_lang, level, streak_freeze_count)
           VALUES ($1, $2, $3, $4, $5, 1)
           RETURNING id, email, native_lang, target_lang, level, plan`,
          [body.email, passwordHash, body.native_lang, body.target_lang, body.level],
        );
        const user = inserted.rows[0];
        if (!user) {
          throw new AppError(500, "Account was not created");
        }
        const token = await issueSession(pool, user.id);
        return reply.code(201).send({ token, user });
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
      const found = await pool.query<AuthUser & { password_hash: string }>(
        `SELECT id, email, native_lang, target_lang, level, plan, password_hash
         FROM users
         WHERE email = $1`,
        [body.email],
      );
      const row = found.rows[0];
      const passwordHash = row?.password_hash ?? (await filler());
      const matches = await verifyPassword(body.password, passwordHash);
      if (!row || !matches) {
        throw new AppError(401, "Invalid credentials");
      }
      const user: AuthUser = {
        id: row.id,
        email: row.email,
        native_lang: row.native_lang,
        target_lang: row.target_lang,
        level: row.level,
        plan: row.plan,
      };
      const token = await issueSession(pool, user.id);
      return { token, user };
    },
  );

  app.post("/api/v1/auth/logout", async (request) => {
    const token = readBearer(request);
    if (token) {
      await revokeSession(pool, token);
    }
    return { ok: true };
  });

  app.get("/api/v1/auth/me", async (request) => {
    const user = await requireUser(pool, request);
    const found = await pool.query<{ interests: string[] | null }>("SELECT interests FROM users WHERE id = $1", [user.id]);
    const interests = found.rows[0]?.interests ?? [];
    return { user: { ...user, interests } };
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
