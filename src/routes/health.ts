import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import type { Redis } from "ioredis";
import { DATABASE_SCHEMA_VERSION } from "../types/database.js";

export function registerHealthRoute(app: FastifyInstance, pool: Pool, redis: Redis): void {
  app.get("/health", { config: { rateLimit: false } }, async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      const pong = await redis.ping();
      if (pong !== "PONG") {
        throw new Error("redis ping failed");
      }
    } catch {
      return reply.code(503).send({
        status: "unavailable",
        schema: DATABASE_SCHEMA_VERSION,
      });
    }

    return {
      status: "ok",
      schema: DATABASE_SCHEMA_VERSION,
    };
  });
}
