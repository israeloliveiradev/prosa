import { z } from "zod";

const drillSchema = z.object({
  prompt: z.string().trim().min(3).max(240),
  options: z.array(z.string().trim().min(1).max(80)).length(4),
  answer: z.number().int().min(0).max(3),
});

export const duelRoundSchema = z.object({
  drills: z.array(drillSchema).min(8).max(12),
});

export type DuelRound = z.infer<typeof duelRoundSchema>;

export const duelScoreBodySchema = z
  .object({
    score: z.number().int().min(0).max(20_000),
    best_combo: z.number().int().min(0).max(40),
    correct_count: z.number().int().min(0).max(40),
  })
  .refine((data) => data.best_combo <= data.correct_count && data.score <= 5 * data.correct_count * (data.correct_count + 1), {
    message: "Score is outside the combo ceiling",
  });

export type DuelScoreBody = z.infer<typeof duelScoreBodySchema>;

export interface DuelBoardEntry {
  label: string;
  score: number;
  best_combo: number;
  you: boolean;
}
