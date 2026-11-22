import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";
import { GlossTranslator, redisGlossStore } from "./services/gloss-translation.js";
import { parseAdminEmails, type Env } from "./config.js";
import { createPool } from "./db/postgres.js";
import { createRedis } from "./db/redis.js";
import { AppError, publicErrorMessage } from "./http/errors.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAccountRoutes } from "./routes/account.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAudioRoutes } from "./routes/audio.js";
import { registerDuelRoutes } from "./routes/duel.js";
import { registerExamRoutes } from "./routes/exam.js";
import { registerScoreRoutes } from "./routes/score.js";
import { registerPairRoutes } from "./routes/pairs.js";
import { registerMeasureRoutes } from "./routes/measure.js";
import { registerOwnlifeRoutes } from "./routes/ownlife.js";
import { registerDossierRoutes } from "./routes/dossier.js";
import { registerOrgRoutes } from "./routes/org.js";
import { registerPersonaRoutes } from "./routes/persona.js";
import { registerProseRoutes } from "./routes/prose.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerGrammarRoutes } from "./routes/grammar.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerJournalRoutes } from "./routes/journal.js";
import { registerLessonRoutes } from "./routes/lessons.js";
import { registerPersonalizationRoutes } from "./routes/personalization.js";
import { registerPathRoutes } from "./routes/path.js";
import { registerPlacementRoutes } from "./routes/placement.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerFluencyRoutes } from "./routes/fluency.js";
import { registerSrsRoutes } from "./routes/srs.js";
import { registerSecurityHeaders } from "./security/headers.js";
import { isAllowedOrigin } from "./security/origins.js";
import { DuelService } from "./services/duel-service.js";
import { ExamService } from "./services/exam-service.js";
import { ScoreService } from "./services/score-service.js";
import { PairService } from "./services/pair-service.js";
import { MeasureService } from "./services/measure-service.js";
import { OwnlifeService } from "./services/ownlife-service.js";
import { DossierService } from "./services/dossier-service.js";
import { OrgService } from "./services/org-service.js";
import { UsageMeter } from "./services/usage-meter.js";
import { PersonaService } from "./services/persona-service.js";
import { ProseService } from "./services/prose-service.js";
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
import { NewsPreload } from "./services/news-preload.js";
import { PathService } from "./services/path-service.js";
import { PlacementService } from "./services/placement-service.js";
import { ProfileStore } from "./services/profile-store.js";
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
          "req.body.totp_code",
          "req.body.recovery_code",
          "req.body.secret",
        ],
        censor: "[redacted]",
      },
    },
    bodyLimit: 1_048_576,
  });
  const pool = createPool(env);
  const redis = createRedis(env);
  await redis.connect();

  registerSecurityHeaders(app, env.APP_PUBLIC_URL);

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
  const usage = new UsageMeter(pool);
  const gemini = new GeminiGateway(
    env.GEMINI_API_KEY,
    env.GEMINI_MODEL,
    (failure) => {
      void ops.record("gemini", "error", failure.busy ? "Gemini 429/quota" : "Gemini request failed", failure.message);
    },
    {
      groqApiKey: env.GROQ_API_KEY,
      groqModel: env.GROQ_MODEL,
      openrouterApiKey: env.OPENROUTER_API_KEY,
      openrouterModel: env.OPENROUTER_MODEL,
      referer: env.APP_PUBLIC_URL,
    },
    (provider) => {
      void ops.record(
        "gemini",
        "ok",
        provider === "groq" ? "Groq atendeu depois do Gemini falhar" : "OpenRouter atendeu depois do Gemini falhar",
      );
    },
    (note) => {
      void usage.record(note);
    },
  );
  const cache = new LessonCache(pool, redis, env.LESSON_CACHE_TTL_SECONDS);
  const lessons = new LessonService(pool, redis, cache, gemini, ops, usage);
  const neural = new NeuralVoice(
    redis,
    env.EDGE_TTS_URL,
    env.LESSON_CACHE_TTL_SECONDS,
    (ok, message) => {
      void ops.record("audio", ok ? "ok" : "error", message);
    },
    usage,
  );
  const shadowing = new ShadowingService(gemini, neural);
  const journal = new JournalService(pool, gemini);
  const personalization = new PersonalizationService(pool, gemini, lessons, neural, ops);
  const placement = new PlacementService(pool, gemini);
  const learningPath = new PathService(
    pool,
    gemini,
    placement,
    new GlossTranslator(gemini, redisGlossStore(redis)),
  );
  const mnemonics = new MnemonicService(pool, gemini);
  const grammar = new GrammarService(gemini, neural);
  const duel = new DuelService(pool, gemini);
  const persona = new PersonaService(pool, gemini, redis);
  const prose = new ProseService(pool, gemini);
  const profiles = new ProfileStore(pool);
  const exams = new ExamService(pool, profiles);
  const scores = new ScoreService(pool, profiles, gemini);
  const pairs = new PairService(pool);
  const measure = new MeasureService(pool, profiles);
  const ownlife = new OwnlifeService(pool, gemini, profiles);
  const dossiers = new DossierService(pool, profiles);
  const orgs = new OrgService(pool);

  const emails = parseAdminEmails(env.ADMIN_EMAILS);
  const mailer = new Mailer(env);
  const reset = new PasswordReset(pool, redis, mailer);
  const factors = new SecondFactor(pool, redis, mailer);
  const verify = new EmailVerify(pool, redis, mailer);
  const reminders = new ReminderService(pool, redis, mailer);
  const newsPreload = new NewsPreload(pool, redis, personalization, { enabled: env.NEWS_PRELOAD_ENABLED }, ops, {
    isPaused: () => ops.isGenerationPaused(),
  });
  void reminders.tick();
  const reminderTick = setInterval(() => {
    void reminders.tick();
    void newsPreload.tick().catch((error: unknown) => {
      app.log.warn({ err: error }, "news preload tick failed");
    });
  }, 15 * 60 * 1000);
  registerHealthRoute(app, pool, redis);
  registerAuthRoutes(app, pool, redis, emails, reset, factors, verify, mailer);
  registerAccountRoutes(app, pool, mailer, factors);
  registerAdminRoutes(app, pool, emails, env, ops, usage);
  registerLessonRoutes(app, lessons, pool);
  registerPersonalizationRoutes(app, pool, personalization);
  registerPlacementRoutes(app, pool, placement);
  registerPathRoutes(app, pool, learningPath);
  registerAudioRoutes(app, shadowing, neural, pool);
  registerJournalRoutes(app, pool, journal);
  registerProfileRoutes(app, pool, profiles);
  registerFluencyRoutes(app, pool, profiles);
  registerSrsRoutes(app, pool, mnemonics);
  registerGrammarRoutes(app, pool, grammar);
  registerDuelRoutes(app, pool, duel);
  registerExamRoutes(app, pool, exams);
  registerScoreRoutes(app, pool, scores);
  registerPairRoutes(app, pool, pairs);
  registerMeasureRoutes(app, pool, measure);
  registerOwnlifeRoutes(app, pool, ownlife);
  registerDossierRoutes(app, pool, dossiers);
  registerOrgRoutes(app, pool, orgs);
  registerPersonaRoutes(app, pool, persona);
  registerProseRoutes(app, pool, prose);
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
