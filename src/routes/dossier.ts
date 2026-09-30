import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import {
  dossierCheckpointIdSchema,
  dossierCheckpointSchema,
  dossierQuerySchema,
  dossierTokenSchema,
} from "../schemas/dossier.js";
import type { DossierService } from "../services/dossier-service.js";

export function registerDossierRoutes(app: FastifyInstance, pool: Pool, dossiers: DossierService): void {
  app.get(
    "/api/v1/dossier",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = dossierQuerySchema.parse(request.query);
      return dossiers.mine(user, query.target_lang);
    },
  );

  app.post(
    "/api/v1/dossier/publish",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = dossierQuerySchema.parse(request.body);
      return dossiers.publish(user, body.target_lang);
    },
  );

  app.post(
    "/api/v1/dossier/checkpoint",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return dossiers.addCheckpoint(user, dossierCheckpointSchema.parse(request.body));
    },
  );

  app.post(
    "/api/v1/dossier/checkpoint/:id/done",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      const params = dossierCheckpointIdSchema.parse(request.params);
      return dossiers.closeCheckpoint(user, params.id);
    },
  );

  app.get(
    "/api/v1/dossier/view/:token",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request) => {
      const params = dossierTokenSchema.parse(request.params);
      return dossiers.view(params.token);
    },
  );
}
