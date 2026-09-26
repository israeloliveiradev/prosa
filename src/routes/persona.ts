import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { personaTurnBodySchema } from "../schemas/persona.js";
import type { PersonaService } from "../services/persona-service.js";

export function registerPersonaRoutes(app: FastifyInstance, pool: Pool, persona: PersonaService): void {
  app.get(
    "/api/v1/persona/scenes",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      return persona.scenes(user);
    },
  );

  app.post(
    "/api/v1/persona/turn",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = personaTurnBodySchema.parse(request.body);
      return persona.turn(user, body);
    },
  );
}
