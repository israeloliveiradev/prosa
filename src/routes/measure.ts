import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireUser } from "../auth/session.js";
import { TARGET_LANGS } from "../types/database.js";
import type { MeasureService } from "../services/measure-service.js";

const query = z.object({
  target_lang: z.enum(TARGET_LANGS).optional(),
});

export function registerMeasureRoutes(app: FastifyInstance, pool: Pool, measure: MeasureService): void {
  app.get(
    "/api/v1/measure",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const parsed = query.parse(request.query);
      return measure.panel(user, parsed.target_lang);
    },
  );
}
