import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";
import { parseAdminEmails, type Env } from "./config.js";
import { createPool } from "./db/postgres.js";
import { createRedis } from "./db/redis.js";
import { AppError, publicErrorMessage } from "./http/errors.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAccountRoutes } from "./routes/account.js";
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
import { registerSecurityHeaders } from "./security/headers.js";
import { isAllowedOrigin } from "./security/origins.js";
import { DuelService } from "./services/duel-service.js";
import { PersonaService } from "./services/persona-service.js";
import { JournalService } from "./services/journal-service.js";
import { LessonCache } from "./services/lesson-cache.js";
import { LessonService } from "./services/lesson-service.js";
import { GeminiGateway } from "./services/gemini-gateway.js";
import { GrammarService } from "./services/grammar-service.js";
import { MnemonicService } from "./services/mnemonic-service.js";
import { NeuralVoice } from "./services/neural-voice.js";
import { Mailer } from "./services/mailer.js";
import { OpsService } from "./services/ops.js";
import { PasswordReset } from "./services/password-reset.js";
import { ReminderService } from "./services/reminders.js";
import { SecondFactor } from "./services/second-factor.js";
import { EmailVerify } from "./services/email-verify.js";
import { PersonalizationService } from "./services/personalization-service.js";
import { ShadowingService } from "./services/shadowing-service.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.body.password",
          "req.body.current_password",
          "req.body.code",
          "req.body.ticket",
        ],
        censor: "[redacted]",
      },
    },
    bodyLimit: 1_048_576,
  });
  const pool = createPool(env);
  const redis = createRedis(env);
  await redis.connect();

  registerSecurityHeaders(app);

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin, env));
    },
    methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization"],
    credentials: false,
    maxAge: 600,
  });

  app.addHook("onRequest", async (request) => {
    const method = request.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return;
    }
    const origin = request.headers.origin;
    if (origin && !isAllowedOrigin(origin, env)) {
      throw new AppError(403, "Origin not allowed");
    }
  });

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

  const ops = new OpsService(pool);
  const gemini = new GeminiGateway(env.GEMINI_API_KEY, env.GEMINI_MODEL, (failure) => {
    void ops.record("gemini", "error", failure.busy ? "Gemini 429/quota" : "Gemini request failed", failure.message);
  });
  const cache = new LessonCache(pool, redis, env.LESSON_CACHE_TTL_SECONDS);
  const lessons = new LessonService(pool, redis, cache, gemini, ops);
  const neural = new NeuralVoice(redis, env.EDGE_TTS_URL, env.LESSON_CACHE_TTL_SECONDS, (ok, message) => {
    void ops.record("audio", ok ? "ok" : "error", message);
  });
  const shadowing = new ShadowingService(gemini, neural);
  const journal = new JournalService(gemini);
  const personalization = new PersonalizationService(pool, gemini, lessons, neural, ops);
  const mnemonics = new MnemonicService(pool, gemini);
  const grammar = new GrammarService(gemini, neural);
  const duel = new DuelService(pool, gemini);
  const persona = new PersonaService(pool, gemini);

  const emails = parseAdminEmails(env.ADMIN_EMAILS);
  const mailer = new Mailer(env);
  const reset = new PasswordReset(pool, redis, mailer);
  const factors = new SecondFactor(pool, redis, mailer);
  const verify = new EmailVerify(pool, redis, mailer);
  const reminders = new ReminderService(pool, redis, mailer);
  const reminderTick = setInterval(() => {
    void reminders.tick();
  }, 15 * 60 * 1000);
  registerHealthRoute(app, pool, redis);
  registerAuthRoutes(app, pool, redis, emails, reset, factors, verify, mailer);
  registerAccountRoutes(app, pool, mailer, factors);
  registerAdminRoutes(app, pool, emails, env, ops);
  registerLessonRoutes(app, lessons, pool);
  registerPersonalizationRoutes(app, pool, personalization);
  registerAudioRoutes(app, shadowing, neural);
  registerJournalRoutes(app, journal);
  registerSrsRoutes(app, pool, mnemonics);
  registerGrammarRoutes(app, pool, grammar);
  registerDuelRoutes(app, pool, duel);
  registerPersonaRoutes(app, pool, persona);
  registerBillingRoutes(app, env, pool, redis);

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

    return reply.code(statusCode).send({ error: publicErrorMessage(error, statusCode) });
  });

  app.addHook("onClose", async () => {
    clearInterval(reminderTick);
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
