import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { profileQuerySchema, profileSignalsSchema } from "../schemas/profile.js";
import { clockHint, profileNote } from "../services/learner-profile.js";
import type { ProfileStore } from "../services/profile-store.js";

export function registerProfileRoutes(app: FastifyInstance, pool: Pool, store: ProfileStore): void {
  app.get("/api/v1/profile", async (request) => {
    const user = await requireUser(pool, request);
    const query = profileQuerySchema.parse(request.query);
    const profile = await store.load(user.id, query.target_lang);
    return {
      profile,
      note: profileNote(profile),
      clock: clockHint(profile),
    };
  });

  app.post("/api/v1/profile/signals", async (request) => {
    const user = await requireUser(pool, request);
    const body = profileSignalsSchema.parse(request.body);
    const { target_lang, ...signals } = body;
    const profile = await store.merge(user.id, target_lang, signals);
    return {
      profile,
      note: profileNote(profile),
      clock: clockHint(profile),
    };
  });
}
