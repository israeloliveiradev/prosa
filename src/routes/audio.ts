import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "../http/errors.js";
import { isSupportedAudioMime, languageCodeSchema, referenceTextSchema } from "../schemas/shadowing.js";
import { speakBodySchema } from "../schemas/speech.js";
import type { NeuralVoice } from "../services/neural-voice.js";
import type { ShadowingService } from "../services/shadowing-service.js";
import { voicesFor } from "../services/voice-catalog.js";

export function registerAudioRoutes(app: FastifyInstance, shadowing: ShadowingService, neural: NeuralVoice): void {
  app.post(
    "/api/v1/audio/analyze-shadowing",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const payload = await readShadowingRequest(request);
      return shadowing.analyze(payload);
    },
  );

  app.post(
    "/api/v1/audio/analyze-shadowing-phonetic",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const payload = await readShadowingRequest(request);
      return shadowing.analyzePhonetic(payload);
    },
  );

  app.post(
    "/api/v1/audio/transcribe",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const payload = await readTranscriptionRequest(request);
      return shadowing.transcribe(payload);
    },
  );

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
    const body = speakBodySchema.parse(request.body);
    const spoken = await neural.speak(body);
    return { audio_url: spoken.audioUrl, words: spoken.words };
  };

  const speakRoute = {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: "1 minute",
      },
    },
  } as const;

  app.post("/api/v1/audio/speak", speakRoute, synthesize);
  app.post("/api/v1/tts/synthesize", speakRoute, synthesize);

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
