import { z } from "zod";

export const wordMarkSchema = z.object({
  text: z.string().min(1),
  offset_ms: z.number().int().min(0),
});

export type WordMark = z.infer<typeof wordMarkSchema>;

export const speakBodySchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  lang: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2}(-[a-z]{2})?$/),
  voice: z
    .string()
    .trim()
    .regex(/^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/)
    .optional(),
});

export type SpeakBody = z.infer<typeof speakBodySchema>;

export const neuralSpeechSchema = z.object({
  audio_base64: z.string().min(1),
  words: z.array(wordMarkSchema),
});
