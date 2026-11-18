import { z } from "zod";

export const OnboardingTrackInputSchema = z.object({
  target_lang: z.string(),
  through_lang: z.string(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  active: z.boolean(),
});

export const OnboardingInputSchema = z.object({
  interests: z.array(z.string()),
  goal: z.string().optional(),
  tracks: z.array(OnboardingTrackInputSchema),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const OnboardingResponseSchema = z.object({
  interests: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  target_lang: z.string().optional().default("en"),
  native_lang: z.string().optional().default("pt"),
  level: z.string().optional(),
});

export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;
