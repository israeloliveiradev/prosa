import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { ownlifeCalibrateSchema, ownlifeMissionSchema } from "../schemas/ownlife.js";
import { profileQuerySchema } from "../schemas/profile.js";
import type { OwnlifeService } from "../services/ownlife-service.js";

export function registerOwnlifeRoutes(app: FastifyInstance, pool: Pool, life: OwnlifeService): void {
  app.get(
    "/api/v1/ownlife",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = profileQuerySchema.parse(request.query);
      return { note: await life.latest(user, query.target_lang) };
    },
  );

  app.post(
    "/api/v1/ownlife",
    { config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = ownlifeCalibrateSchema.parse(request.body);
      return life.calibrate(user, body.target_lang, body.source);
    },
  );

  app.post(
    "/api/v1/ownlife/mission",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = ownlifeMissionSchema.parse(request.body);
      return life.mission(user, body.target_lang, body.spoken);
    },
  );
}
