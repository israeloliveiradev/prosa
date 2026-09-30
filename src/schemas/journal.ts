import { z } from "zod";
import { CEFR_LEVELS } from "../types/database.js";

export const journalCorrectionSchema = z.object({
  original: z.string().trim().min(1),
  corrected: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  kind: z.string().trim().max(80).default(""),
});

export const journalEvaluationSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .transform((value) => Math.round(value)),
  corrections: z.array(journalCorrectionSchema).max(20),
  native_upgrade: z.string().trim().min(1),
});

export type JournalEvaluation = z.infer<typeof journalEvaluationSchema>;

export const evaluateJournalBodySchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  journal_prompt: z.string().trim().min(1).max(1_000),
  target_lang: z.string().trim().min(2).max(16),
  native_lang: z.string().trim().min(2).max(16),
  level: z.enum(CEFR_LEVELS),
  attempt: z.number().int().min(1).max(4).default(1),
});

export type EvaluateJournalBody = z.infer<typeof evaluateJournalBodySchema>;
