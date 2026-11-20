import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireUser } from "../auth/session.js";
import { newsRequestSchema } from "../schemas/news.js";
import { activateTrackBodySchema, onboardingQuizBodySchema, personalizedLessonBodySchema } from "../schemas/onboarding.js";
import { speakBodySchema } from "../schemas/speech.js";
import type { PersonalizationService } from "../services/personalization-service.js";

/** Voz Edge opcional: sem ela a lição volta sem áudio do servidor (o app narra no aparelho). */
const lessonVoiceSchema = z.object({ voice: speakBodySchema.shape.voice });

export function registerPersonalizationRoutes(
  app: FastifyInstance,
  pool: Pool,
  personalization: PersonalizationService,
): void {
  app.post(
    "/api/v1/onboarding/quiz",
    {
      config: {
        rateLimit: { max: 8, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = onboardingQuizBodySchema.parse(request.body);
      return personalization.saveQuiz(user, body);
    },
  );

  app.get("/api/v1/study/tracks", async (request) => {
    const user = await requireUser(pool, request);
    return { tracks: await personalization.listTracks(user) };
  });

  app.post(
    "/api/v1/study/activate",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = activateTrackBodySchema.parse(request.body);
      return personalization.activateTrack(user, body.target_lang, body.through_lang, body.level);
    },
  );

  app.post(
    "/api/v1/lessons/generate-personalized",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const user = await requireUser(pool, request);
      const body = personalizedLessonBodySchema.parse(request.body);
      const { voice } = lessonVoiceSchema.parse(request.body ?? {});
      const result = await personalization.generatePersonalized(user, body.selected_topic, {
        ...(body.unit_id ? { unitId: body.unit_id } : {}),
        ...(voice ? { voice } : {}),
      });
      reply.header("x-prosa-cache", result.cached ? "hit" : "miss");
      return {
        ...result.lesson,
        anchors: result.anchors,
        unit: result.unit,
        audio_url: result.audio_url,
        words: result.words,
      };
    },
  );

  app.post(
    "/api/v1/news/fetch-adapted",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const user = await requireUser(pool, request);
      const body = newsRequestSchema.parse(request.body ?? {});
      const result = await personalization.fetchAdaptedNews(user, body.interest, body.voice, body.index ?? 0, body.level);
      reply.header("x-prosa-cache", result.cached ? "hit" : "miss");
      return {
        ...result.news,
        published: result.news.published ?? null,
        audio_url: result.audio_url,
        words: result.words,
      };
    },
  );
}
