import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { scoreAnswerSchema, scoreCertSchema, scoreFinishSchema, scoreQuerySchema, scoreStartSchema } from "../schemas/score.js";
import type { ScoreService } from "../services/score-service.js";

export function registerScoreRoutes(app: FastifyInstance, pool: Pool, scores: ScoreService): void {
  app.get(
    "/api/v1/score",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = scoreQuerySchema.parse(request.query);
      return scores.status(user, query.target_lang);
    },
  );

  app.post(
    "/api/v1/score/start",
    {
      config: {
        rateLimit: { max: 6, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = scoreStartSchema.parse(request.body ?? {});
      return scores.start(user, body.target_lang, body.through_lang);
    },
  );

  app.post(
    "/api/v1/score/answer",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = scoreAnswerSchema.parse(request.body);
      return scores.answer(user, body.attempt_id, body.item_id, body.choice, body.elapsed_ms);
    },
  );

  app.post(
    "/api/v1/score/finish",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = scoreFinishSchema.parse(request.body);
      return scores.finish(user, body.attempt_id, body.writing, body.speaking);
    },
  );

  app.get(
    "/api/v1/score/cert/:token",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const params = scoreCertSchema.parse(request.params);
      return scores.certificate(params.token);
    },
  );
}
