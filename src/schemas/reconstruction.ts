import { z } from "zod";
import { CEFR_LEVELS } from "../types/database.js";

const noteSchema = z.object({
  original: z.string().trim().min(1).max(400),
  corrected: z.string().trim().min(1).max(400),
  reason: z.string().trim().min(1).max(400),
});

const literalSchema = z.object({
  phrase: z.string().trim().min(1).max(400),
  native_alternative: z.string().trim().min(1).max(400),
  reason: z.string().trim().min(1).max(400),
});

export const reconstructionReportSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .transform((value) => Math.round(value)),
  grammar: z.array(noteSchema).max(8),
  literals: z.array(literalSchema).max(8),
});

export type ReconstructionReport = z.infer<typeof reconstructionReportSchema>;

export const reconstructionBodySchema = z.object({
  attempt: z.string().trim().min(1).max(4_000),
  story_text: z.string().trim().min(1).max(8_000),
  translation: z.string().trim().min(1).max(8_000),
  target_lang: z.string().trim().min(2).max(16),
  through_lang: z.string().trim().min(2).max(16),
  level: z.enum(CEFR_LEVELS),
});

export type ReconstructionBody = z.infer<typeof reconstructionBodySchema>;
