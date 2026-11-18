import { z } from "zod";

export const StudyTrackSchema = z.object({
  target_lang: z.string(),
  through_lang: z.string(),
  level: z.string().optional().default("A2"),
  active: z.boolean().optional().default(false),
});

export type StudyTrackChoice = z.infer<typeof StudyTrackSchema>;

export const ListStudyTracksResponseSchema = z.object({
  tracks: z.array(StudyTrackSchema).optional().default([]),
});

export const ActivateStudyTrackInputSchema = z.object({
  target_lang: z.string(),
  through_lang: z.string(),
  level: z.string().optional(),
});

export type ActivateStudyTrackInput = z.infer<typeof ActivateStudyTrackInputSchema>;

export const ActivateStudyTrackResponseSchema = z.object({
  target_lang: z.string(),
  through_lang: z.string(),
  level: z.string().optional().default("A2"),
});

export type ActivateStudyTrackResponse = z.infer<typeof ActivateStudyTrackResponseSchema>;
