import { z } from "zod";
import { TARGET_LANGS, THROUGH_LANGS } from "../types/database.js";

export const scoreQuerySchema = z.object({
  target_lang: z.enum(TARGET_LANGS).optional(),
});

export const scoreStartSchema = z.object({
  target_lang: z.enum(TARGET_LANGS).optional(),
  through_lang: z.enum(THROUGH_LANGS).optional(),
});

export const scoreAnswerSchema = z.object({
  attempt_id: z.string().uuid(),
  item_id: z.string().trim().min(1).max(80),
  choice: z.number().int().min(0).max(3),
  elapsed_ms: z.number().int().min(0).max(180_000),
});

export const scoreFinishSchema = z.object({
  attempt_id: z.string().uuid(),
  writing: z.string().trim().min(1).max(4000),
  speaking: z.string().trim().min(1).max(2000),
});

export const scoreCertSchema = z.object({
  token: z.string().trim().min(8).max(48),
});
