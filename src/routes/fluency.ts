import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireUser } from "../auth/session.js";
import { calculate360Status, getAllMilestones, logActiveTime } from "../services/fluency-360.js";
import { buildInterleavingSession } from "../services/interleaving-engine.js";
import type { ProfileStore } from "../services/profile-store.js";

const langQuerySchema = z.object({
  target_lang: z.string().trim().toLowerCase().regex(/^(en|es|de|ru|fr|it|ja)$/),
});

const logTimeBodySchema = z.object({
  target_lang: z.string().trim().toLowerCase().regex(/^(en|es|de|ru|fr|it|ja)$/),
  seconds: z.number().int().min(1).max(28800),
});

export function registerFluencyRoutes(app: FastifyInstance, pool: Pool, store: ProfileStore): void {
  app.get("/api/v1/fluency/360-meter", async (request) => {
    const user = await requireUser(pool, request);
    const query = langQuerySchema.parse(request.query);
    const profile = await store.load(user.id, query.target_lang);
    const status = calculate360Status(profile.total_active_seconds || 0);
    const milestones = getAllMilestones(status.totalActiveHours);

    return {
      status,
      milestones,
      session_duration_mode: profile.session_duration_mode || "lite_20",
      paused_session_state: profile.paused_session_state || null,
    };
  });

  app.post("/api/v1/fluency/log-time", async (request) => {
    const user = await requireUser(pool, request);
    const body = logTimeBodySchema.parse(request.body);
    const profile = await store.load(user.id, body.target_lang);

    const { updatedProfile, status, newlyUnlockedMilestone } = logActiveTime(profile, body.seconds);
    await store.save(user.id, body.target_lang, updatedProfile);

    return {
      status,
      session_duration_mode: updatedProfile.session_duration_mode,
      newly_unlocked_milestone: newlyUnlockedMilestone,
    };
  });

  app.get("/api/v1/session/interleaving-plan", async (request) => {
    const user = await requireUser(pool, request);
    const query = langQuerySchema.parse(request.query);
    const profile = await store.load(user.id, query.target_lang);

    const plan = buildInterleavingSession(profile.session_duration_mode || "lite_20", 5);

    return {
      plan,
      session_duration_mode: profile.session_duration_mode || "lite_20",
      paused_session_state: profile.paused_session_state || null,
    };
  });
}
