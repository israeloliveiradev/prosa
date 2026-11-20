import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { requireUser, type AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { isSupportedAudioMime, languageCodeSchema, referenceTextSchema } from "../schemas/shadowing.js";
import { speakBatchBodySchema, speakBodySchema, speakStreamBodySchema } from "../schemas/speech.js";
import { pronunciationSignals } from "../services/learner-profile.js";
import type { NeuralVoice } from "../services/neural-voice.js";
import { ProfileStore } from "../services/profile-store.js";
import type { ShadowingService } from "../services/shadowing-service.js";
import { voicesFor } from "../services/voice-catalog.js";

/**
 * Chave do limite de taxa das rotas pagas: o usuário autenticado (todas as sessões dele
 * dividem o mesmo balde por rota); sem usuário, o IP.
 */
export function audioRateKey(user: Pick<AuthUser, "id"> | undefined, ip: string): string {
  return user ? `audio-user:${user.id}` : `audio-ip:${ip}`;
}

/** Idioma da gravação é o curso ativo? Só então a nota de pronúncia entra no perfil desse curso. */
export function sameCourseLanguage(language: string | undefined, targetLang: string): boolean {
  if (!language) {
    return false;
  }
  return language.slice(0, 2).toLowerCase() === targetLang.slice(0, 2).toLowerCase();
}

/**
 * Rotas /audio/* que custam (IA de transcrição/análise e voz neural) exigem conta e têm limite
 * por usuário. Ficam abertas só o catálogo de vozes e a leitura de um áudio já gerado
 * (`/audio/neural/:id`, endereçado por hash e tocado por <audio>, que não manda cabeçalho).
 *
 * `pool` vem de src/app.ts. Sem ele não há como validar o token: as rotas pagas respondem 503
 * em vez de ficar abertas.
 */
export function registerAudioRoutes(app: FastifyInstance, shadowing: ShadowingService, neural: NeuralVoice, pool?: Pool): void {
  const users = new WeakMap<FastifyRequest, AuthUser>();
  const profiles = pool ? new ProfileStore(pool) : null;
  if (!pool) {
    app.log.error("registerAudioRoutes: no database pool; paid /audio/* routes will answer 503 until src/app.ts passes it");
  }

  const authenticate = async (request: FastifyRequest): Promise<void> => {
    if (!pool) {
      throw new AppError(503, "Audio routes are not wired to the account store");
    }
    users.set(request, await requireUser(pool, request));
  };

  const accountOf = (request: FastifyRequest): AuthUser => {
    const user = users.get(request);
    if (!user) {
      throw new AppError(401, "Authentication required");
    }
    return user;
  };

  const paid = (max: number) =>
    ({
      onRequest: authenticate,
      config: {
        rateLimit: {
          max,
          timeWindow: "1 minute",
          keyGenerator: (request: FastifyRequest) => audioRateKey(users.get(request), request.ip),
        },
      },
    }) as const;

  /** A nota de pronúncia medida aqui vai para o perfil do curso (sinal do servidor, não do cliente). */
  const recordPronunciation = async (
    user: AuthUser,
    language: string | undefined,
    result: { transcription: string; accuracy_score: number; sounds?: ReadonlyArray<{ held: boolean; sound: { en: string } }> },
  ): Promise<void> => {
    if (!profiles || !sameCourseLanguage(language, user.target_lang)) {
      return;
    }
    const signals = pronunciationSignals(result);
    if (!signals) {
      return;
    }
    try {
      await profiles.merge(user.id, user.target_lang, signals);
    } catch (error) {
      app.log.warn({ err: error }, "pronunciation signal was not saved");
    }
  };

  app.post("/api/v1/audio/analyze-shadowing", paid(20), async (request) => {
    const user = accountOf(request);
    const payload = await readShadowingRequest(request);
    const result = await shadowing.analyze(payload);
    await recordPronunciation(user, payload.language, result);
    return result;
  });

  app.post("/api/v1/audio/analyze-shadowing-phonetic", paid(20), async (request) => {
    const user = accountOf(request);
    const payload = await readShadowingRequest(request);
    const result = await shadowing.analyzePhonetic(payload);
    await recordPronunciation(user, payload.language, result);
    return result;
  });

  app.post("/api/v1/audio/transcribe", paid(20), async (request) => {
    accountOf(request);
    const payload = await readTranscriptionRequest(request);
    return shadowing.transcribe(payload);
  });

  app.get(
    "/api/v1/audio/voices",
    async (request) => {
      const query = z.object({ lang: z.string().trim().min(2).max(16) }).parse(request.query);
      const voices = voicesFor(query.lang);
      return {
        voices,
        default_voice: voices[0]?.id ?? null,
      };
    },
  );

  const synthesize = async (request: FastifyRequest) => {
    accountOf(request);
    const body = speakBodySchema.parse(request.body);
    const spoken = await neural.speak(body);
    return { audio_url: spoken.audioUrl, words: spoken.words };
  };

  const speakRoute = paid(30);

  app.post("/api/v1/audio/speak", speakRoute, synthesize);
  app.post("/api/v1/tts/synthesize", speakRoute, synthesize);

  app.post("/api/v1/audio/speak-stream", speakRoute, async (request, reply) => {
    accountOf(request);
    const body = speakStreamBodySchema.parse(request.body);
    reply.header("Content-Type", "text/event-stream; charset=utf-8");
    reply.header("Cache-Control", "no-store");
    reply.header("Connection", "keep-alive");
    reply.header("X-Accel-Buffering", "no");
    reply.hijack();
    const headers: Record<string, string | string[] | undefined> = {};
    for (const [name, value] of Object.entries(reply.getHeaders())) {
      if (name.toLowerCase() === "content-length" || value === undefined || typeof value === "number") {
        continue;
      }
      headers[name] = value;
    }
    reply.raw.writeHead(200, headers);
    const abort = new AbortController();
    const stop = () => {
      if (!reply.raw.writableEnded) {
        abort.abort();
      }
    };
    reply.raw.once("close", stop);
    try {
      for await (const event of neural.stream(body, abort.signal)) {
        if (abort.signal.aborted) {
          break;
        }
        if (event.type === "audio") {
          reply.raw.write(`event: audio\ndata: ${event.bytes.toString("base64")}\n\n`);
          continue;
        }
        if (event.type === "word") {
          reply.raw.write(`event: word\ndata: ${JSON.stringify({ text: event.word.text, offset_ms: event.word.offset_ms })}\n\n`);
          continue;
        }
        if (event.type === "done") {
          reply.raw.write(`event: done\ndata: ${JSON.stringify({ id: event.id, audio_url: event.audioUrl })}\n\n`);
          continue;
        }
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: event.message })}\n\n`);
      }
    } catch {
      if (!abort.signal.aborted) {
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: "Neural voice is unavailable" })}\n\n`);
      }
    } finally {
      reply.raw.off("close", stop);
      reply.raw.end();
    }
  });

  app.post("/api/v1/audio/speak-batch", speakRoute, async (request) => {
    accountOf(request);
    const body = speakBatchBodySchema.parse(request.body);
    const clips = await neural.speakMany(body.texts.map((text) => ({ text, lang: body.lang, voice: body.voice })));
    return {
      clips: clips.map((spoken) => ({ audio_url: spoken.audioUrl, words: spoken.words })),
    };
  });

  app.get(
    "/api/v1/audio/neural/:id",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const id = z.string().regex(/^[a-f0-9]{64}$/).safeParse((request.params as { id?: string }).id);
      if (!id.success) {
        throw new AppError(400, "Invalid audio id");
      }
      const audio = await neural.read(id.data);
      if (!audio) {
        throw new AppError(404, "Audio not found");
      }
      return reply.type("audio/mpeg").header("cache-control", "private, max-age=86400").send(audio);
    },
  );
}

async function readShadowingRequest(request: FastifyRequest): Promise<{
  audio: Buffer;
  filename: string;
  mimeType: string;
  referenceText: string;
  language?: string;
}> {
  if (!request.isMultipart()) {
    throw new AppError(415, "Expected multipart audio upload");
  }

  let audio: Buffer | undefined;
  let filename = "speech.webm";
  let mimeType = "application/octet-stream";
  let referenceText: string | undefined;
  let language: string | undefined;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "audio") {
        await part.toBuffer();
        continue;
      }
      audio = await part.toBuffer();
      filename = part.filename || filename;
      mimeType = part.mimetype || mimeType;
      continue;
    }
    if (part.fieldname === "reference_text" && typeof part.value === "string") {
      referenceText = part.value;
    } else if (part.fieldname === "language" && typeof part.value === "string" && part.value.trim()) {
      language = part.value.trim();
    }
  }

  if (!audio || audio.length === 0) {
    throw new AppError(400, "audio file is required");
  }
  if (!isSupportedAudioMime(mimeType)) {
    throw new AppError(415, "Unsupported audio type");
  }

  const reference = referenceTextSchema.safeParse(referenceText);
  if (!reference.success) {
    throw new AppError(400, "reference_text is required");
  }

  if (language) {
    const parsedLanguage = languageCodeSchema.safeParse(language.toLowerCase());
    if (!parsedLanguage.success) {
      throw new AppError(400, "language must be an ISO code such as en or pt-BR");
    }
    language = parsedLanguage.data;
  }

  return {
    audio,
    filename,
    mimeType,
    referenceText: reference.data,
    ...(language ? { language } : {}),
  };
}

async function readTranscriptionRequest(request: FastifyRequest): Promise<{
  audio: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}> {
  if (!request.isMultipart()) {
    throw new AppError(415, "Expected multipart audio upload");
  }

  let audio: Buffer | undefined;
  let filename = "speech.webm";
  let mimeType = "application/octet-stream";
  let language: string | undefined;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "audio") {
        await part.toBuffer();
        continue;
      }
      audio = await part.toBuffer();
      filename = part.filename || filename;
      mimeType = part.mimetype || mimeType;
      continue;
    }
    if (part.fieldname === "language" && typeof part.value === "string" && part.value.trim()) {
      language = part.value.trim();
    }
  }

  if (!audio || audio.length === 0) {
    throw new AppError(400, "audio file is required");
  }
  if (!isSupportedAudioMime(mimeType)) {
    throw new AppError(415, "Unsupported audio type");
  }
  if (language) {
    const parsedLanguage = languageCodeSchema.safeParse(language.toLowerCase());
    if (!parsedLanguage.success) {
      throw new AppError(400, "language must be an ISO code such as en or pt-BR");
    }
    language = parsedLanguage.data;
  }

  return {
    audio,
    filename,
    mimeType,
    ...(language ? { language } : {}),
  };
}
