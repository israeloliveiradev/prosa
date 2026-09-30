import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireUser } from "../auth/session.js";
import {
  placementAnswerBodySchema,
  placementFinishBodySchema,
  placementStartBodySchema,
} from "../schemas/placement.js";
import type { PlacementService } from "../services/placement-service.js";
import { TARGET_LANGS } from "../types/database.js";

const statusQuerySchema = z.object({
  target_lang: z.enum(TARGET_LANGS).optional(),
});

export function registerPlacementRoutes(app: FastifyInstance, pool: Pool, placement: PlacementService): void {
  app.get(
    "/api/v1/placement/status",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = statusQuerySchema.parse(request.query);
      return placement.status(user, query.target_lang);
    },
  );

  app.get(
    "/api/v1/placement/history",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = statusQuerySchema.parse(request.query);
      return { history: await placement.history(user, query.target_lang) };
    },
  );

  app.post(
    "/api/v1/placement/start",
    {
      config: {
        rateLimit: { max: 6, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = placementStartBodySchema.parse(request.body ?? {});
      return placement.start(user, body.target_lang, body.through_lang);
    },
  );

  app.post(
    "/api/v1/placement/answer",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = placementAnswerBodySchema.parse(request.body);
      return placement.answer(user, body.attempt_id, body.item_id, body.choice);
    },
  );

  app.post(
    "/api/v1/placement/finish",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = placementFinishBodySchema.parse(request.body);
      return placement.finish(user, body.attempt_id);
    },
  );
}
