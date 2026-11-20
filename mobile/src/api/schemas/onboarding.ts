import { z } from "zod";

const CefrSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const OnboardingTrackInputSchema = z.object({
  target_lang: z.string(),
  through_lang: z.string(),
  level: CefrSchema.optional(),
  active: z.boolean(),
});

export type OnboardingTrackInput = z.infer<typeof OnboardingTrackInputSchema>;

/**
 * Corpo de POST /api/v1/onboarding/quiz (src/schemas/onboarding.ts no backend):
 * 1 a 12 temas de até 48 caracteres, objetivo de até 200, até 7 trilhas.
 * O backend ainda descarta `goal` ao gravar (M2), mas o usa para sugerir tópicos.
 */
export const OnboardingInputSchema = z.object({
  interests: z.array(z.string().min(1).max(48)).min(1).max(12),
  goal: z.string().max(200).optional(),
  tracks: z.array(OnboardingTrackInputSchema).min(1).max(7),
  level: CefrSchema.optional(),
  target_lang: z.string().optional(),
  through_lang: z.string().optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const OnboardingResponseSchema = z.object({
  interests: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  target_lang: z.string().optional().default("en"),
  native_lang: z.string().optional().default("pt"),
  level: z.string().optional(),
  tracks: z
    .array(
      z.object({
        target_lang: z.string(),
        through_lang: z.string(),
        level: z.string().optional(),
        active: z.boolean().optional(),
      }),
    )
    .optional()
    .default([]),
});

export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;
