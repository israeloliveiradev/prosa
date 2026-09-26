import { z } from "zod";
import { lessonPayloadSchema } from "./lesson.js";
import { speakBodySchema } from "./speech.js";
import { CEFR_LEVELS } from "../types/database.js";

export const storedNewsSchema = lessonPayloadSchema.extend({
  source_url: z.string().regex(/^https:\/\/\S+$/),
  source_title: z.string().trim().min(1).max(300),
});

export type StoredNews = z.infer<typeof storedNewsSchema>;

export const newsRequestSchema = z.object({
  interest: z.string().trim().min(1).max(80).optional(),
  voice: speakBodySchema.shape.voice,
  index: z.number().int().min(0).max(2).optional(),
  level: z.enum(CEFR_LEVELS).optional(),
});
