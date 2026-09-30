import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { orgCreateSchema, orgJoinSchema, orgTermSchema } from "../schemas/org.js";
import type { OrgService } from "../services/org-service.js";

export function registerOrgRoutes(app: FastifyInstance, pool: Pool, orgs: OrgService): void {
  app.get(
    "/api/v1/org",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return orgs.mine(user);
    },
  );

  app.post(
    "/api/v1/org",
    { config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return orgs.create(user, orgCreateSchema.parse(request.body));
    },
  );

  app.post(
    "/api/v1/org/join",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return orgs.join(user, orgJoinSchema.parse(request.body).code);
    },
  );

  app.post(
    "/api/v1/org/term",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return orgs.addTerm(user, orgTermSchema.parse(request.body));
    },
  );

  app.post(
    "/api/v1/org/leave",
    { config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (request) => {
      const user = await requireUser(pool, request);
      return orgs.leave(user);
    },
  );
}
