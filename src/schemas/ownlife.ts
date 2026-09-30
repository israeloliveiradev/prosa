import { z } from "zod";

const lang = z.string().trim().toLowerCase().regex(/^(en|es|de|ru|fr|it|ja)$/);

export const ownlifeCalibrateSchema = z.object({
  target_lang: lang,
  source: z.string().trim().min(12).max(8000),
});

export const ownlifeMissionSchema = z.object({
  target_lang: lang,
  spoken: z.string().trim().min(2).max(2000),
});

export const ownlifeNoteSchema = z.object({
  text: z.string().trim().min(40).max(900),
  through_note: z.string().trim().max(400).default(""),
  vocabulary: z
    .array(
      z.object({
        word: z.string().trim().min(1).max(80),
        translation: z.string().trim().min(1).max(120),
        example_sentence: z.string().trim().min(1).max(240),
      }),
    )
    .min(3)
    .max(8),
  mission: z.object({
    prompt: z.string().trim().min(8).max(240),
    hold: z.string().trim().min(2).max(120),
  }),
});
