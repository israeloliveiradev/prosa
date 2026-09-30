import { z } from "zod";

const lang = z.string().trim().toLowerCase().regex(/^(en|es|de|ru|fr|it|ja)$/);

export const pairOfferSchema = z.object({
  target_lang: lang,
  prompt: z.string().trim().max(400).default(""),
  body: z.string().trim().min(12).max(4000),
});

export const pairReviewSchema = z.object({
  understood: z.string().trim().min(2).max(800),
  correction: z.string().trim().min(2).max(800),
  question: z.string().trim().min(2).max(400),
});

export const pairIdSchema = z.object({
  id: z.string().uuid(),
});
