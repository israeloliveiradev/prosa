import { z } from "zod";
import { TARGET_LANGS } from "../types/database.js";
import { unitIdSchema } from "./lesson.js";

export const PATH_UI_LOCALES = ["pt", "en", "de", "fr", "es", "it", "ja"] as const;

export const pathQuerySchema = z.object({
  locale: z.enum(PATH_UI_LOCALES).optional(),
  target_lang: z.enum(TARGET_LANGS).optional(),
});

export const unitParamsSchema = z.object({
  id: unitIdSchema,
});

/** Data local do aluno (AAAA-MM-DD). O servidor aceita só hoje, ontem ou amanhã em UTC (fusos). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "date must be a real calendar day");

export const sessionCompleteBodySchema = z.object({
  date: isoDateSchema,
  unit_id: unitIdSchema.optional(),
  elapsed_seconds: z.number().int().min(0).max(86_400).optional(),
  target_lang: z.enum(TARGET_LANGS).optional(),
});

export type SessionCompleteBody = z.infer<typeof sessionCompleteBodySchema>;

export const pathAnswerSchema = z.object({
  item_id: z.string().trim().min(1).max(80),
  choice: z.number().int().min(0).max(3),
});

export const pathFinishBodySchema = z.object({
  attempt_id: z.string().uuid(),
  answers: z.array(pathAnswerSchema).max(40),
});

export type PathFinishBody = z.infer<typeof pathFinishBodySchema>;

export const checkpointStartBodySchema = z
  .object({
    target_lang: z.enum(TARGET_LANGS).optional(),
  })
  .default({});

/** Item de teste guardado no servidor: `answer` nunca sai na resposta. */
export const storedUnitTestItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  skill: z.enum(["grammar", "vocab"]),
  format: z.enum(["cloze", "meaning"]),
  prompt: z.string().trim().min(1).max(400),
  options: z.array(z.string().trim().min(1).max(160)).length(4),
  answer: z.number().int().min(0).max(3),
  source: z.enum(["ai", "fallback"]),
});

export type StoredUnitTestItem = z.infer<typeof storedUnitTestItemSchema>;
export type PublicUnitTestItem = Omit<StoredUnitTestItem, "answer" | "source">;
