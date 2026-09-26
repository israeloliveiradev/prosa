import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";
import type { Env } from "./config.js";
import { createPool } from "./db/postgres.js";
import { createRedis } from "./db/redis.js";
import { AppError } from "./http/errors.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAudioRoutes } from "./routes/audio.js";
import { registerDuelRoutes } from "./routes/duel.js";
import { registerPersonaRoutes } from "./routes/persona.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerGrammarRoutes } from "./routes/grammar.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerJournalRoutes } from "./routes/journal.js";
import { registerLessonRoutes } from "./routes/lessons.js";
import { registerPersonalizationRoutes } from "./routes/personalization.js";
import { registerSrsRoutes } from "./routes/srs.js";
import { DuelService } from "./services/duel-service.js";
import { PersonaService } from "./services/persona-service.js";
import { JournalService } from "./services/journal-service.js";
import { LessonCache } from "./services/lesson-cache.js";
import { LessonService } from "./services/lesson-service.js";
import { GeminiGateway } from "./services/gemini-gateway.js";
import { GrammarService } from "./services/grammar-service.js";
import { MnemonicService } from "./services/mnemonic-service.js";
import { NeuralVoice } from "./services/neural-voice.js";
import { PersonalizationService } from "./services/personalization-service.js";
import { ShadowingService } from "./services/shadowing-service.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: true,
    bodyLimit: 1_048_576,
  });
  const pool = createPool(env);
  const redis = createRedis(env);
  await redis.connect();

  await app.register(cors, { origin: true });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
      fields: 4,
    },
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
    redis,
    nameSpace: "prosa-rl:",
  });

  const gemini = new GeminiGateway(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  const cache = new LessonCache(pool, redis, env.LESSON_CACHE_TTL_SECONDS);
  const lessons = new LessonService(pool, redis, cache, gemini);
  const neural = new NeuralVoice(redis, env.EDGE_TTS_URL, env.LESSON_CACHE_TTL_SECONDS);
  const shadowing = new ShadowingService(gemini, neural);
  const journal = new JournalService(gemini);
  const personalization = new PersonalizationService(pool, gemini, lessons, neural);
  const mnemonics = new MnemonicService(pool, gemini);
  const grammar = new GrammarService(gemini, neural);
  const duel = new DuelService(pool, gemini);
  const persona = new PersonaService(pool, gemini);

  registerHealthRoute(app, pool, redis);
  registerAuthRoutes(app, pool);
  registerLessonRoutes(app, lessons, pool);
  registerPersonalizationRoutes(app, pool, personalization);
  registerAudioRoutes(app, shadowing, neural);
  registerJournalRoutes(app, journal);
  registerSrsRoutes(app, pool, mnemonics);
  registerGrammarRoutes(app, pool, grammar);
  registerDuelRoutes(app, pool, duel);
  registerPersonaRoutes(app, pool, persona);
  registerBillingRoutes(app, env, pool);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Invalid request",
        details: error.issues.map((issue) => issue.message),
      });
    }

    const statusCode = error instanceof AppError ? error.statusCode : statusCodeOf(error);
    if (statusCode >= 500) {
      request.log.error({ err: error }, "request failed");
    }

    const message =
      statusCode >= 500 && !(error instanceof AppError) ? "Internal server error" : error.message;
    return reply.code(statusCode).send({ error: message });
  });

  app.addHook("onClose", async () => {
    await pool.end();
    redis.disconnect();
  });

  return app;
}

function statusCodeOf(error: FastifyError): number {
  if (typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600) {
    return error.statusCode;
  }
  return 500;
}
