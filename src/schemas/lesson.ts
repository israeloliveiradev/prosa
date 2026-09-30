import { z } from "zod";
import { MIND_IDS } from "../services/minds.js";
import { CEFR_LEVELS } from "../types/database.js";

const mindIdSchema = z.enum(MIND_IDS);

export const vocabularyEntrySchema = z.object({
  word: z.string().trim().min(1),
  translation: z.string().trim().min(1),
  example_sentence: z.string().trim().min(1),
});

export const lessonPayloadSchema = z.object({
  title: z.string().trim().min(1),
  story_text: z.string().trim().min(1),
  translation: z.string().trim().min(1),
  vocabulary: z.array(vocabularyEntrySchema).min(1).max(12),
  journal_prompt: z.string().trim().min(1),
});

export type LessonPayload = z.infer<typeof lessonPayloadSchema>;

export const generateLessonBodySchema = z
  .object({
    user_id: z.string().uuid().optional(),
    target_lang: z.string().trim().min(2).max(16).optional(),
    native_lang: z.string().trim().min(2).max(16).optional(),
    level: z.enum(CEFR_LEVELS).optional(),
    topic: z.string().trim().min(1).max(120).default("everyday life"),
    interests: z.array(z.string().trim().min(1).max(48)).max(12).optional(),
    cognate: z.boolean().optional(),
    mind_reading: mindIdSchema.optional(),
    mind_memory: mindIdSchema.optional(),
    mind_speech: mindIdSchema.optional(),
    mind_journal: mindIdSchema.optional(),
  })
  .superRefine((value, context) => {
    if (!value.target_lang || !value.native_lang || !value.level) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "target_lang, native_lang and level are required",
      });
    }
  });

export type GenerateLessonBody = z.infer<typeof generateLessonBodySchema>;

export interface LessonProfile {
  target_lang: string;
  native_lang: string;
  level: (typeof CEFR_LEVELS)[number];
  topic: string;
  interests: string[];
  minds: {
    reading: (typeof MIND_IDS)[number];
    memory: (typeof MIND_IDS)[number];
    speech: (typeof MIND_IDS)[number];
    journal: (typeof MIND_IDS)[number];
  };
}
