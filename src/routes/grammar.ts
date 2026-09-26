import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { requireUser } from "../auth/session.js";
import { grammarRequestSchema, grammarVaryBodySchema } from "../schemas/grammar.js";
import type { GrammarService } from "../services/grammar-service.js";

export function registerGrammarRoutes(app: FastifyInstance, pool: Pool, grammar: GrammarService): void {
  app.post(
    "/api/v1/grammar/deconstruct",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = grammarRequestSchema.parse(request.body);
      return grammar.deconstruct(user, body.sentence);
    },
  );

  app.post(
    "/api/v1/grammar/vary",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = grammarVaryBodySchema.parse(request.body);
      return grammar.vary(user, body.blocks, body.voice);
    },
  );
}
