import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import {
  checkpointStartBodySchema,
  pathFinishBodySchema,
  pathQuerySchema,
  sessionCompleteBodySchema,
  unitParamsSchema,
} from "../schemas/path.js";
import type { PathService } from "../services/path-service.js";

/** Trilha híbrida (M2): docs/12-trilha-contrato.md. Todas as rotas exigem Bearer. */
export function registerPathRoutes(app: FastifyInstance, pool: Pool, path: PathService): void {
  app.get(
    "/api/v1/path",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = pathQuerySchema.parse(request.query ?? {});
      return path.view(user, {
        ...(query.locale ? { locale: query.locale } : {}),
        ...(query.target_lang ? { targetLang: query.target_lang } : {}),
      });
    },
  );

  app.post(
    "/api/v1/sessions/complete",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = sessionCompleteBodySchema.parse(request.body);
      return path.completeSession(user, body);
    },
  );

  app.post(
    "/api/v1/path/units/:id/test/start",
    {
      config: {
        rateLimit: { max: 6, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const params = unitParamsSchema.parse(request.params);
      return path.startUnitTest(user, params.id);
    },
  );

  app.post(
    "/api/v1/path/units/:id/test/finish",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const params = unitParamsSchema.parse(request.params);
      const body = pathFinishBodySchema.parse(request.body);
      return path.finishUnitTest(user, params.id, body);
    },
  );

  app.post(
    "/api/v1/path/checkpoint/start",
    {
      config: {
        rateLimit: { max: 6, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = checkpointStartBodySchema.parse(request.body ?? {});
      return path.startCheckpoint(user, body.target_lang);
    },
  );

  app.post(
    "/api/v1/path/checkpoint/finish",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = pathFinishBodySchema.parse(request.body);
      return path.finishCheckpoint(user, body);
    },
  );
}
