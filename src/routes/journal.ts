import type { FastifyInstance } from "fastify";
import { evaluateJournalBodySchema } from "../schemas/journal.js";
import { reconstructionBodySchema } from "../schemas/reconstruction.js";
import type { JournalService } from "../services/journal-service.js";

export function registerJournalRoutes(app: FastifyInstance, journal: JournalService): void {
  app.post(
    "/api/v1/journal/evaluate",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = evaluateJournalBodySchema.parse(request.body);
      return journal.evaluate(body);
    },
  );

  app.post(
    "/api/v1/journal/reconstruct",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = reconstructionBodySchema.parse(request.body);
      return journal.reconstruct(body);
    },
  );
}
