import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireUser } from "../auth/session.js";
import { personaTurnBodySchema, scenesQuerySchema } from "../schemas/persona.js";
import type { PersonaService } from "../services/persona-service.js";
import { TARGET_LANGS } from "../types/database.js";

/** Idioma-alvo opcional do turno (a cena pode ter sido pedida para outro curso da conta). */
const turnLangSchema = z.object({ target_lang: z.enum(TARGET_LANGS).optional() });

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
      const query = scenesQuerySchema.parse(request.query ?? {});
      return persona.scenes(user, query.target_lang);
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
      const { target_lang } = turnLangSchema.parse(request.body ?? {});
      return persona.turn(user, { ...body, ...(target_lang ? { target_lang } : {}) });
    },
  );
}
