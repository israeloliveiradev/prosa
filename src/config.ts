import { z } from "zod";

const envSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  POSTGRES_HOST: z.string().min(1).default("127.0.0.1"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5433),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  REDIS_HOST: z.string().min(1).default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6380),
  REDIS_PASSWORD: z.string().min(1),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  LESSON_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  EDGE_TTS_URL: z.string().url().default("http://127.0.0.1:8077"),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_PRICE_ID: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
