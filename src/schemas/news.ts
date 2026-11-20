import { z } from "zod";
import { lessonPayloadSchema } from "./lesson.js";
import { speakBodySchema } from "./speech.js";
import { CEFR_LEVELS } from "../types/database.js";

export const NEWS_SOURCE_DEPTHS = ["full", "summary"] as const;
export type NewsSourceDepth = (typeof NEWS_SOURCE_DEPTHS)[number];

export const storedNewsSchema = lessonPayloadSchema.extend({
  source_url: z.string().regex(/^https:\/\/\S+$/),
  source_title: z.string().trim().min(1).max(300),
  published: z.string().trim().min(1).max(80).optional(),
  /**
   * "full": a IA leu o corpo da matéria (editor da lista). "summary": só manchete + resumo do
   * RSS; o texto é mais curto e não acrescenta fatos. Ausente nas entradas antigas = "summary".
   */
  source_depth: z.enum(NEWS_SOURCE_DEPTHS).optional(),
  /** Nome do editor ("BBC", "NHK"…), quando conhecido. */
  source_name: z.string().trim().min(1).max(120).nullable().optional(),
});

export type StoredNews = z.infer<typeof storedNewsSchema>;

export const newsRequestSchema = z.object({
  interest: z.string().trim().min(1).max(80).optional(),
  voice: speakBodySchema.shape.voice,
  index: z.number().int().min(0).max(2).optional(),
  level: z.enum(CEFR_LEVELS).optional(),
});
