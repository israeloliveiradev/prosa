import { z } from "zod";

/**
 * Contratos do nivelamento adaptativo (`src/routes/placement.ts` no prosa-api).
 *
 * Nada aqui inventa um nível: campos que o servidor sempre manda são obrigatórios,
 * e os opcionais caem em vazio (`null`, `[]`), nunca num nível ou pontuação de mentira.
 */
export const CEFR_BAND_VALUES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const CefrBandSchema = z.enum(CEFR_BAND_VALUES);

export type PlacementBand = z.infer<typeof CefrBandSchema>;

export const PlacementSkillSchema = z.enum(["vocab", "grammar", "reading", "listening"]);

export type PlacementSkill = z.infer<typeof PlacementSkillSchema>;

export const PlacementKindSchema = z.enum(["placement", "progress"]);

export const PlacementHistoryEntrySchema = z.object({
  id: z.string(),
  kind: PlacementKindSchema.optional().default("placement"),
  finished_at: z.string(),
  score: z.number(),
  result_level: CefrBandSchema,
  previous_level: CefrBandSchema.nullable().optional().default(null),
  correct_count: z.number().optional().default(0),
  item_count: z.number().optional().default(0),
});

export type PlacementHistoryEntry = z.infer<typeof PlacementHistoryEntrySchema>;

/** Aceita também o formato antigo (`level`/`timestamp`) que alguns mocks ainda mandam. */
export const PlacementLastSchema = z
  .object({
    finished_at: z.string().optional(),
    timestamp: z.string().optional(),
    result_level: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    previous_level: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    kind: PlacementKindSchema.optional(),
  })
  .transform((last) => ({
    finished_at: last.finished_at || last.timestamp || "",
    result_level: last.result_level || last.level || null,
    previous_level: last.previous_level ?? null,
    score: last.score ?? null,
    kind: (last.kind || "placement") as "placement" | "progress",
  }));

export const PlacementStatusSchema = z.object({
  target_lang: z.string().optional(),
  through_lang: z.string().optional(),
  current_level: CefrBandSchema.nullable().optional().default(null),
  last: PlacementLastSchema.nullable().optional().default(null),
  due: z.boolean().optional().default(false),
  due_reason: z.enum(["never", "scheduled", "lessons", "wait"]).optional().default("never"),
  days_until: z.number().nullable().optional().default(null),
  open_attempt_id: z.string().nullable().optional().default(null),
  history: z.array(PlacementHistoryEntrySchema).optional().default([]),
});

export type PlacementStatus = z.infer<typeof PlacementStatusSchema>;

export const PlacementHistoryResponseSchema = z.object({
  history: z.array(PlacementHistoryEntrySchema).optional().default([]),
});

export const PlacementItemSchema = z.object({
  id: z.string(),
  band: CefrBandSchema,
  kind: PlacementSkillSchema,
  prompt: z.string(),
  hint: z.string().optional().default(""),
  options: z.array(z.string()),
  passage: z.string().optional(),
  audio_text: z.string().optional(),
});

export type PlacementItem = z.infer<typeof PlacementItemSchema>;

export const PlacementAttemptSchema = z.object({
  attempt_id: z.string(),
  target_lang: z.string(),
  through_lang: z.string(),
  kind: PlacementKindSchema.optional().default("placement"),
  items: z.array(PlacementItemSchema).optional().default([]),
  answered: z.record(z.string(), z.number()).optional().default({}),
  index: z.number().optional().default(0),
  adaptive: z.boolean().optional().default(false),
  /** Teto de perguntas do motor adaptativo; numa tentativa fixa, o total de itens. */
  cap: z.number().optional(),
});

export type PlacementAttempt = z.infer<typeof PlacementAttemptSchema>;

export const PlacementStepSchema = z.object({
  saved: z.boolean().optional().default(true),
  done: z.boolean().optional().default(false),
  asked: z.number().optional(),
  cap: z.number().optional(),
  next: PlacementItemSchema.nullable().optional().default(null),
});

export type PlacementStep = z.infer<typeof PlacementStepSchema>;

export const PlacementBandScoreSchema = z.object({
  band: CefrBandSchema,
  correct: z.number(),
  total: z.number(),
});

export type PlacementBandScore = z.infer<typeof PlacementBandScoreSchema>;

export const PlacementSkillScoreSchema = z.object({
  skill: PlacementSkillSchema,
  correct: z.number(),
  total: z.number(),
});

export type PlacementSkillScore = z.infer<typeof PlacementSkillScoreSchema>;

export const PlacementFinishSchema = z.object({
  attempt_id: z.string(),
  target_lang: z.string(),
  through_lang: z.string(),
  kind: PlacementKindSchema.optional().default("placement"),
  level: CefrBandSchema,
  previous_level: CefrBandSchema.nullable().optional().default(null),
  score: z.number(),
  correct: z.number(),
  total: z.number(),
  bands: z.array(PlacementBandScoreSchema).optional().default([]),
  skills: z.array(PlacementSkillScoreSchema).optional().default([]),
  history: z.array(PlacementHistoryEntrySchema).optional().default([]),
});

export type PlacementFinish = z.infer<typeof PlacementFinishSchema>;
