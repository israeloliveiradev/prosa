import { createHash, randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";

export interface AuthUser {
  id: string;
  email: string;
  native_lang: string;
  target_lang: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  plan: "free" | "pro";
  role: "learner" | "admin";
}

const USER_COLUMNS = "u.id, u.email, u.native_lang, u.target_lang, u.level, u.plan, u.role";

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueSession(pool: Pool, userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [userId, tokenHash(token)],
  );
  return token;
}

export async function revokeSession(pool: Pool, token: string): Promise<void> {
  await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash(token)]);
}

export async function revokeAllSessions(pool: Pool, userId: string): Promise<void> {
  await pool.query("DELETE FROM auth_sessions WHERE user_id = $1", [userId]);
}

export async function revokeOtherSessions(pool: Pool, userId: string, keepToken: string): Promise<void> {
  await pool.query("DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2", [
    userId,
    tokenHash(keepToken),
  ]);
}

export function readBearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) {
    return null;
  }
  return token;
}

export async function optionalUser(pool: Pool, request: FastifyRequest): Promise<AuthUser | null> {
  if (!readBearer(request)) {
    return null;
  }
  try {
    return await requireUser(pool, request);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      return null;
    }
    throw error;
  }
}

export async function requireUser(pool: Pool, request: FastifyRequest): Promise<AuthUser> {
  const token = readBearer(request);
  if (!token) {
    throw new AppError(401, "Authentication required");
  }
  const result = await pool.query<AuthUser>(
    `SELECT ${USER_COLUMNS}
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND u.email_verified_at IS NOT NULL`,
    [tokenHash(token)],
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(401, "Authentication required");
  }
  return user;
}
