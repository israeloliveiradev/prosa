import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Pool } from "pg";
import { readBearer, requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { generateLessonBodySchema } from "../schemas/lesson.js";
import { listCognates } from "../services/cognates.js";
import type { LessonService } from "../services/lesson-service.js";
import { TARGET_LANGS, THROUGH_LANGS } from "../types/database.js";

const cognateQuerySchema = z.object({
  through: z.enum(THROUGH_LANGS),
  target: z.enum(TARGET_LANGS),
});

export function registerLessonRoutes(app: FastifyInstance, lessons: LessonService, pool: Pool): void {
  app.post(
    "/api/v1/lessons/generate",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const parsed = generateLessonBodySchema.parse(request.body);
      const user = readBearer(request) ? await requireUser(pool, request) : undefined;
      const body = user ? { ...parsed, user_id: user.id } : { ...parsed, user_id: undefined };
      if (!user && (!body.target_lang || !body.native_lang || !body.level)) {
        throw new AppError(400, "target_lang, native_lang and level are required");
      }
      const result = await lessons.generate(body, user);
      reply.header("x-prosa-cache", result.cached ? "hit" : "miss");
      return { ...result.lesson, anchors: result.anchors, unit: result.unit };
    },
  );

  app.get(
    "/api/v1/cognates",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const query = cognateQuerySchema.parse(request.query);
      if (query.through === query.target) {
        return { anchors: [] };
      }
      return { anchors: await listCognates(pool, query.through, query.target) };
    },
  );
}
