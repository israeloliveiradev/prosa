import pg from "pg";
import type { Env } from "../config.js";

export function createPool(env: Env): pg.Pool {
  return new pg.Pool({
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    options: "-c statement_timeout=5000",
  });
}
