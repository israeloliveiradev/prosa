import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { examChooseSchema, examFinishSchema, examQuerySchema } from "../schemas/exam.js";
import type { ExamService } from "../services/exam-service.js";

export function registerExamRoutes(app: FastifyInstance, pool: Pool, exams: ExamService): void {
  app.get(
    "/api/v1/exams",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const query = examQuerySchema.parse(request.query);
      return exams.status(user, query.target_lang);
    },
  );

  app.post(
    "/api/v1/exams/choose",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = examChooseSchema.parse(request.body);
      return exams.choose(user, body.target_lang, body.exam_id);
    },
  );

  app.get(
    "/api/v1/exams/mock",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      await requireUser(pool, request);
      const query = examQuerySchema.parse(request.query);
      if (!query.exam_id) {
        throw new AppError(400, "exam_id is required");
      }
      return exams.mock(query.target_lang, query.exam_id);
    },
  );

  app.post(
    "/api/v1/exams/finish",
    {
      config: {
        rateLimit: { max: 8, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = examFinishSchema.parse(request.body);
      return exams.finish(user, body);
    },
  );
}
