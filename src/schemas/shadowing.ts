import { z } from "zod";

export const shadowingResultSchema = z.object({
  transcription: z.string(),
  accuracy_score: z.number().int().min(0).max(100),
  mispronounced_words: z.array(z.string()),
});

export type ShadowingResult = z.infer<typeof shadowingResultSchema>;

export const phoneticShadowingResultSchema = shadowingResultSchema.extend({
  pitch_rhythm_match: z.number().int().min(0).max(100),
  cadence_match: z.number().int().min(0).max(100),
  bars: z.array(
    z.object({
      reference: z.number().int().min(0).max(100),
      spoken: z.number().int().min(0).max(100),
      drift: z.boolean(),
      note: z.enum(["apressou", "alongou", "no tempo"]),
    }),
  ),
});

export type PhoneticShadowingResult = z.infer<typeof phoneticShadowingResultSchema>;

export const referenceTextSchema = z.string().trim().min(1).max(2_000);

export const languageCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/);

const AUDIO_MIME_TYPES = new Set([
  "application/octet-stream",
  "audio/m4a",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);

export function isSupportedAudioMime(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return AUDIO_MIME_TYPES.has(normalized);
}
