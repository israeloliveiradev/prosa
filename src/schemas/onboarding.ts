import { z } from "zod";
import { CEFR_LEVELS, TARGET_LANGS, THROUGH_LANGS } from "../types/database.js";

export const studyTrackSchema = z
  .object({
    target_lang: z.enum(TARGET_LANGS),
    through_lang: z.enum(THROUGH_LANGS),
    level: z.enum(CEFR_LEVELS).optional(),
    active: z.boolean().optional(),
  })
  .superRefine((track, context) => {
    if (track.target_lang === track.through_lang) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Study a language through a different language",
      });
    }
  });

export const onboardingQuizBodySchema = z
  .object({
    interests: z.array(z.string().trim().min(1).max(48)).min(1).max(12),
    goal: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
    level: z.enum(CEFR_LEVELS).optional(),
    target_lang: z.enum(TARGET_LANGS).optional(),
    through_lang: z.enum(THROUGH_LANGS).optional(),
    tracks: z.array(studyTrackSchema).min(1).max(7).optional(),
  })
  .superRefine((value, context) => {
    const tracks = value.tracks ?? [];
    const keys = tracks.map((track) => track.target_lang);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each study language must be unique",
      });
    }
  })
  .transform((value) => {
    const provided = value.tracks ?? [];
    const tracks =
      provided.length > 0
        ? provided
        : [
            {
              target_lang: value.target_lang ?? "en",
              through_lang:
                value.through_lang && value.through_lang !== (value.target_lang ?? "en") ? value.through_lang : "pt",
            },
          ];
    const activeIndex = Math.max(
      0,
      tracks.findIndex((track) => track.active),
    );
    return {
      interests: value.interests,
      ...(value.goal ? { goal: value.goal } : {}),
      ...(value.level ? { level: value.level } : {}),
      tracks: tracks.map((track, index) => ({
        target_lang: track.target_lang,
        through_lang: track.through_lang,
        level: track.level ?? value.level ?? "A2",
        active: index === activeIndex,
      })),
    };
  });

export type OnboardingQuizBody = z.infer<typeof onboardingQuizBodySchema>;

export const topicMatrixSchema = z.object({
  topics: z.array(z.string().trim().min(1).max(80)).min(4).max(8),
});

export const personalizedLessonBodySchema = z.object({
  selected_topic: z.string().trim().min(1).max(120),
});

export const activateTrackBodySchema = z
  .object({
    target_lang: z.enum(TARGET_LANGS),
    through_lang: z.enum(THROUGH_LANGS),
    level: z.enum(CEFR_LEVELS).optional(),
  })
  .refine((track) => track.target_lang !== track.through_lang, {
    message: "Study a language through a different language",
  });
