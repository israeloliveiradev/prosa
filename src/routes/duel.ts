import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { duelRoundBodySchema, duelScoreBodySchema } from "../schemas/duel.js";
import type { DuelService } from "../services/duel-service.js";

export function registerDuelRoutes(app: FastifyInstance, pool: Pool, duel: DuelService): void {
  app.post(
    "/api/v1/duel/round",
    {
      config: {
        rateLimit: { max: 8, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = duelRoundBodySchema.parse(request.body ?? {});
      return duel.round(user, body.unit_id);
    },
  );

  app.post(
    "/api/v1/duel/score",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = duelScoreBodySchema.parse(request.body);
      return duel.save(user, body);
    },
  );

  app.get(
    "/api/v1/duel/leaderboard",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      return duel.leaderboard(user);
    },
  );
}
