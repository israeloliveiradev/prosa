import { z } from "zod";

/**
 * Contrato da trilha híbrida (docs/12-trilha-contrato.md, rotas `/api/v1/path*` e
 * `/api/v1/sessions/complete`).
 *
 * Os campos que o contrato promete sempre presentes são obrigatórios: se o servidor
 * mudar o formato, a tela mostra erro em vez de inventar progresso.
 */
export const PATH_BAND_VALUES = ["A1", "A2", "B1", "B2", "C1"] as const;

export const PathBandSchema = z.enum(PATH_BAND_VALUES);

export type PathBand = z.infer<typeof PathBandSchema>;

export const UNIT_STATUS_VALUES = ["validated", "active", "mastered", "locked"] as const;

export const UnitStatusSchema = z.enum(UNIT_STATUS_VALUES);

export type UnitStatus = z.infer<typeof UnitStatusSchema>;

/** Id estável da unidade (src/curriculum/units.ts): "a1-01" … "c1-03". */
export const UNIT_ID_PATTERN = /^(a1|a2|b1|b2|c1)-\d{2}$/;

const count = z.number().int().nonnegative();

export const UnitMasterySchema = z.object({
  lessons: z.object({ done: count, required: count, met: z.boolean() }),
  lemmas: z.object({ known: count, total: count, required: count, met: z.boolean() }),
  journal: z.object({ met: z.boolean() }),
  test: z.object({
    best: z.number().nullable(),
    required: z.number(),
    available: z.boolean(),
    met: z.boolean(),
  }),
});

export type UnitMastery = z.infer<typeof UnitMasterySchema>;

export const UnitGrammarSchema = z.object({
  name: z.string(),
  examples: z.array(z.string()).default([]),
});

export const PathUnitSchema = z.object({
  id: z.string(),
  band: PathBandSchema,
  order: z.number().int(),
  status: UnitStatusSchema,
  title: z.string(),
  can_do: z.array(z.string()).default([]),
  focus: z.array(z.string()).default([]),
  /** Sem currículo do idioma para a unidade, o servidor pode mandar null. */
  grammar: UnitGrammarSchema.nullable().default(null),
  mastery: UnitMasterySchema,
  unlocked_at: z.string().nullable().default(null),
  completed_at: z.string().nullable().default(null),
});

export type PathUnit = z.infer<typeof PathUnitSchema>;

export const PathCheckpointSchema = z.object({
  band: PathBandSchema,
  available: z.boolean(),
  passed: z.boolean(),
});

export type PathCheckpoint = z.infer<typeof PathCheckpointSchema>;

export const PathResponseSchema = z.object({
  target_lang: z.string(),
  level: z.string(),
  current_unit_id: z.string().nullable(),
  units: z.array(PathUnitSchema),
  checkpoint: PathCheckpointSchema.nullable().default(null),
});

export type PathResponse = z.infer<typeof PathResponseSchema>;

export const SessionCompleteBodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  unit_id: z.string().regex(UNIT_ID_PATTERN).optional(),
  elapsed_seconds: z.number().int().nonnegative(),
});

export type SessionCompleteBody = z.infer<typeof SessionCompleteBodySchema>;

export const SessionCompleteResponseSchema = z.object({
  streak_count: count,
  unit: PathUnitSchema.nullable().default(null),
});

export type SessionCompleteResponse = z.infer<typeof SessionCompleteResponseSchema>;

/** Item de teste: 4 opções; as respostas certas ficam só no servidor. */
export const PathTestItemSchema = z.object({
  id: z.string(),
  skill: z.string().default(""),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  /** Teste da unidade: "cloze" (o enunciado tem ____) ou "meaning" (o enunciado é uma glosa em inglês entre aspas). */
  format: z.enum(["cloze", "meaning"]).nullable().optional(),
  /** Itens do banco de nivelamento (checkpoint) podem trazer texto, dica ou áudio. */
  passage: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
  audio_text: z.string().nullable().optional(),
});

export type PathTestItem = z.infer<typeof PathTestItemSchema>;

export const UnitTestStartSchema = z.object({
  attempt_id: z.string(),
  items: z.array(PathTestItemSchema).min(1),
});

export type UnitTestStart = z.infer<typeof UnitTestStartSchema>;

export const PathTestAnswerSchema = z.object({
  item_id: z.string(),
  choice: z.number().int().nonnegative(),
});

export type PathTestAnswer = z.infer<typeof PathTestAnswerSchema>;

export const UnitTestFinishSchema = z.object({
  score: z.number(),
  passed: z.boolean(),
  correct: count,
  total: count,
  unit: PathUnitSchema.nullable().default(null),
  next_unit_id: z.string().nullable().default(null),
});

export type UnitTestFinish = z.infer<typeof UnitTestFinishSchema>;

export const CheckpointStartSchema = z.object({
  attempt_id: z.string(),
  band: PathBandSchema,
  items: z.array(PathTestItemSchema).min(1),
});

export type CheckpointStart = z.infer<typeof CheckpointStartSchema>;

export const CheckpointFinishSchema = z.object({
  score: z.number(),
  passed: z.boolean(),
  level: z.string(),
});

export type CheckpointFinish = z.infer<typeof CheckpointFinishSchema>;
