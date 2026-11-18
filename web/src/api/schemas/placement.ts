import { z } from "zod";

export const PlacementHistoryEntrySchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["placement", "progress"]).optional(),
  finished_at: z.string(),
  score: z.number(),
  result_level: z.string(),
  previous_level: z.string().nullable().optional(),
  correct_count: z.number().optional().default(0),
  item_count: z.number().optional().default(0),
});

export type PlacementHistoryEntry = z.infer<typeof PlacementHistoryEntrySchema>;

export const PlacementLastSchema = z
  .object({
    finished_at: z.string().optional(),
    timestamp: z.string().optional(),
    result_level: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    previous_level: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    kind: z.enum(["placement", "progress"]).optional(),
    skills: z.record(z.string(), z.number()).optional(),
  })
  .transform((last) => ({
    finished_at: last.finished_at || last.timestamp || "",
    result_level: last.result_level || last.level || null,
    previous_level: last.previous_level ?? null,
    score: last.score ?? null,
    kind: (last.kind || "placement") as "placement" | "progress",
    skills: last.skills,
  }));

export const PlacementStatusSchema = z.object({
  target_lang: z.string().optional().default("en"),
  through_lang: z.string().optional().default("pt"),
  current_level: z.string().optional().default("B1"),
  last: PlacementLastSchema.nullable().optional().default(null),
  due: z.boolean().optional().default(false),
  due_reason: z.enum(["never", "scheduled", "lessons", "wait"]).optional().default("never"),
  days_until: z.number().nullable().optional().default(null),
  open_attempt_id: z.string().nullable().optional().default(null),
  history: z.array(PlacementHistoryEntrySchema).optional().default([]),
});

export type PlacementStatus = z.infer<typeof PlacementStatusSchema>;

export const PlacementItemSchema = z.object({
  id: z.string(),
  band: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  kind: z.enum(["vocab", "grammar", "reading", "listening"]),
  prompt: z.string(),
  hint: z.string().optional().default(""),
  options: z.array(z.string()),
  passage: z.string().optional(),
  audio_text: z.string().optional(),
});

export type PlacementItem = z.infer<typeof PlacementItemSchema>;

export const PlacementAttemptSchema = z.object({
  attempt_id: z.string(),
  target_lang: z.string().optional().default("en"),
  through_lang: z.string().optional().default("pt"),
  kind: z.enum(["placement", "progress"]).optional().default("placement"),
  items: z.array(PlacementItemSchema).optional().default([]),
  answered: z.record(z.string(), z.number()).optional().default({}),
  index: z.number().optional().default(0),
  adaptive: z.boolean().optional().default(false),
  cap: z.number().optional().default(12),
});

export type PlacementAttempt = z.infer<typeof PlacementAttemptSchema>;

export const PlacementStepSchema = z.object({
  saved: z.boolean().optional().default(true),
  done: z.boolean().optional().default(false),
  asked: z.number().optional().default(0),
  cap: z.number().optional().default(12),
  next: PlacementItemSchema.nullable().optional().default(null),
});

export type PlacementStep = z.infer<typeof PlacementStepSchema>;

export const PlacementFinishSchema = z.object({
  attempt_id: z.string(),
  target_lang: z.string().optional().default("en"),
  through_lang: z.string().optional().default("pt"),
  kind: z.enum(["placement", "progress"]).optional().default("placement"),
  level: z.string(),
  previous_level: z.string().optional().default("A2"),
  score: z.number().optional().default(0),
  correct: z.number().optional().default(0),
  total: z.number().optional().default(0),
  bands: z
    .array(
      z.object({
        band: z.string(),
        correct: z.number(),
        total: z.number(),
      }),
    )
    .optional()
    .default([]),
  skills: z
    .array(
      z.object({
        skill: z.enum(["vocab", "grammar", "reading", "listening"]),
        correct: z.number(),
        total: z.number(),
      }),
    )
    .optional(),
  history: z.array(PlacementHistoryEntrySchema).optional().default([]),
});

export type PlacementFinish = z.infer<typeof PlacementFinishSchema>;

