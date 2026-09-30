import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { proseTurnBodySchema } from "../schemas/prose.js";
import type { ProseService } from "../services/prose-service.js";

export function registerProseRoutes(app: FastifyInstance, pool: Pool, prose: ProseService): void {
  app.get(
    "/api/v1/prose/memory",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      return prose.memory(user);
    },
  );

  app.post(
    "/api/v1/prose/turn",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = proseTurnBodySchema.parse(request.body);
      return prose.turn(user, body);
    },
  );
}
