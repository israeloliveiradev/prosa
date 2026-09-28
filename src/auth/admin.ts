import type { FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { AppError } from "../http/errors.js";
import { requireUser, type AuthUser } from "./session.js";

export async function promoteAdmin(pool: Pool, user: AuthUser, emails: ReadonlySet<string>): Promise<AuthUser> {
  if (!emails.has(user.email.toLowerCase()) || user.role === "admin") {
    return user;
  }
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1 AND role <> 'admin'", [user.id]);
  return { ...user, role: "admin" };
}

export async function requireAdmin(pool: Pool, request: FastifyRequest, emails: ReadonlySet<string>): Promise<AuthUser> {
  const user = await promoteAdmin(pool, await requireUser(pool, request), emails);
  if (user.role !== "admin") {
    throw new AppError(403, "Administrator access required");
  }
  return user;
}
