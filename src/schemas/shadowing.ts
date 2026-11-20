import { z } from "zod";

export const soundNoteSchema = z.object({
  word: z.string().max(80),
  sound: z.object({
    pt: z.string().max(40),
    en: z.string().max(40),
  }),
  held: z.boolean(),
  heard: z.string().max(80),
  hint: z.object({
    pt: z.string().max(200),
    en: z.string().max(200),
  }),
});

export const shadowingResultSchema = z.object({
  transcription: z.string(),
  accuracy_score: z.number().int().min(0).max(100),
  mispronounced_words: z.array(z.string()),
  sounds: z.array(soundNoteSchema).max(4),
  /**
   * Ritmo medido de verdade? false quando o provedor não mede ritmo (fallback de transcrição)
   * e sempre em /analyze-shadowing, que não avalia ritmo: aí as notas de ritmo são 0 e o app
   * mostra "ritmo não medido" sem XP de ritmo.
   */
  rhythm_measured: z.boolean(),
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
