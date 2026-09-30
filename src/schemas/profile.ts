import { z } from "zod";

const score = z.number().min(0).max(100);
const lang = z.string().trim().toLowerCase().regex(/^(en|es|de|ru|fr|it|ja)$/);

export const profileSignalsSchema = z.object({
  target_lang: lang,
  reading: score.optional(),
  listening: score.optional(),
  vocabulary: score.optional(),
  grammar: score.optional(),
  pronunciation: score.optional(),
  fluency: score.optional(),
  writing: score.optional(),
  hearing: score.optional(),
  lexicon_size: z.number().int().min(0).max(100_000).optional(),
  coverage: score.optional(),
  error: z.string().trim().max(40).optional(),
  sound: z.string().trim().max(40).optional(),
  goal: z.string().trim().max(80).optional(),
  weekly_aim: z.string().trim().max(80).optional(),
  minutes_per_day: z.number().int().min(5).max(120).optional(),
  fluency_wpm: z.number().int().min(0).max(400).optional(),
});

export const profileQuerySchema = z.object({
  target_lang: lang,
});
