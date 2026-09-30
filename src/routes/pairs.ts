import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { pairIdSchema, pairOfferSchema, pairReviewSchema } from "../schemas/pairs.js";
import type { PairService } from "../services/pair-service.js";

export function registerPairRoutes(app: FastifyInstance, pool: Pool, pairs: PairService): void {
  app.get(
    "/api/v1/pairs",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return pairs.inbox(user);
    },
  );

  app.post(
    "/api/v1/pairs/offer",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return pairs.offer(user, pairOfferSchema.parse(request.body));
    },
  );

  app.post(
    "/api/v1/pairs/:id/review",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const params = pairIdSchema.parse(request.params);
      return pairs.review(user, params.id, pairReviewSchema.parse(request.body));
    },
  );
}
