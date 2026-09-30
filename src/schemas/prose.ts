import { z } from "zod";
import { MIND_IDS } from "../services/minds.js";

export const proseTurnBodySchema = z.object({
  user_line: z.string().trim().max(500).default(""),
  topic: z.string().trim().min(2).max(80),
  story: z.string().trim().max(700).optional(),
  mind: z.enum(MIND_IDS).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["mind", "learner"]),
        text: z.string().trim().min(1).max(500),
      }),
    )
    .max(8)
    .default([]),
});

export const talkMoveSchema = z.enum(["clarify", "rephrase", "continue"]);

export const proseReplySchema = z.object({
  reply: z.string().trim().min(1).max(500),
  through_note: z.string().trim().max(280).default(""),
  mistake: z.string().trim().max(80).default(""),
  fix: z.string().trim().max(160).default(""),
  facts: z.array(z.string().trim().min(1).max(80)).max(3).default([]),
  goal: z.string().trim().max(80).default(""),
  thread: z.string().trim().max(240).default(""),
  move: talkMoveSchema.default("continue"),
});

export type ProseTurnBody = z.infer<typeof proseTurnBodySchema>;
export type ProseReply = z.infer<typeof proseReplySchema>;
