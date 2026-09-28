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
  ADMIN_EMAILS: z.string().default(""),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:8081"),
  CORS_ORIGINS: z.string().default(""),
  MAIL_FROM: z.string().default("Prosa <prosa@local.test>"),
  RESEND_API_KEY: z.string().default(""),
  BREVO_API_KEY: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_INBOX_URL: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}

export function parseAdminEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(/[,\s]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.includes("@")),
  );
}
