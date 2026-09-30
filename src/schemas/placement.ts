import { z } from "zod";
import { CEFR_LEVELS, TARGET_LANGS, THROUGH_LANGS } from "../types/database.js";

export const placementKindSchema = z.enum(["placement", "progress"]);
export const placementItemKindSchema = z.enum(["vocab", "grammar", "reading", "listening"]);

export const placementStartBodySchema = z.object({
  target_lang: z.enum(TARGET_LANGS).optional(),
  through_lang: z.enum(THROUGH_LANGS).optional(),
});

export const placementAnswerBodySchema = z.object({
  attempt_id: z.string().uuid(),
  item_id: z.string().trim().min(1).max(64),
  choice: z.number().int().min(0).max(3),
});

export const placementFinishBodySchema = z.object({
  attempt_id: z.string().uuid(),
});

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const storedPlacementItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  band: z.enum(CEFR_LEVELS),
  kind: placementItemKindSchema,
  prompt: z.string().trim().min(1).max(400),
  hint: z.string().trim().min(1).max(240),
  options: z.array(z.string().trim().min(1).max(160)).length(4),
  answer: z.number().int().min(0).max(3),
  passage: optionalText(700),
  audio_text: optionalText(320),
  difficulty: z.number().min(-4).max(4).optional(),
});

export const generatedPlacementSchema = z.object({
  items: z.array(storedPlacementItemSchema).min(6).max(24),
});

export type StoredPlacementItem = z.infer<typeof storedPlacementItemSchema>;
export type PlacementPublicItem = Omit<StoredPlacementItem, "answer">;
