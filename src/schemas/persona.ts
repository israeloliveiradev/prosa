import { z } from "zod";
import { TARGET_LANGS } from "../types/database.js";

/** Uma linha de cena: sem quebras de linha (vai para o prompt), tamanho limitado. */
const sceneLine = (max: number) =>
  z
    .string()
    .transform((value) => value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1).max(max));

export const SCENE_KINDS = ["goal", "unit", "interest"] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

/**
 * Cena de conversa (M3). title/setting/learner_role/partner_role/objective (e twist) vêm no
 * idioma de interface da conta; quem faz o papel do parceiro fala sempre o idioma-alvo.
 */
export const sceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,64}$/),
  kind: z.enum(SCENE_KINDS),
  title: sceneLine(80),
  setting: sceneLine(220),
  learner_role: sceneLine(100),
  partner_role: sceneLine(100),
  objective: sceneLine(220),
  twist: sceneLine(220).nullable(),
  /** Primeira fala do parceiro, no idioma-alvo (só nas cenas da IA). Sem ela, o aluno abre. */
  opener: sceneLine(300).nullable().optional(),
  unit_id: z
    .string()
    .regex(/^(a1|a2|b1|b2|c1)-[0-9]{2}$/)
    .nullable(),
});

export type Scene = z.infer<typeof sceneSchema>;

export const scenesQuerySchema = z.object({
  target_lang: z.enum(TARGET_LANGS).optional(),
});

/** O que a IA devolve para as 3 cenas (id e unit_id são do servidor). */
export const generatedScenesSchema = z.object({
  scenes: z
    .array(
      z.object({
        kind: z.enum(SCENE_KINDS),
        title: sceneLine(80),
        setting: sceneLine(220),
        learner_role: sceneLine(100),
        partner_role: sceneLine(100),
        objective: sceneLine(220),
        twist: z
          .string()
          .nullable()
          .optional()
          .transform((value) => {
            const line = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim() ?? "";
            return line.length > 0 ? line.slice(0, 220) : null;
          }),
        opener: z
          .string()
          .nullable()
          .optional()
          .transform((value) => {
            const line = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim() ?? "";
            return line.length > 0 ? line.slice(0, 300) : null;
          }),
      }),
    )
    .min(3),
});

export const personaTurnBodySchema = z
  .object({
    /** Cena fixa antiga (persona-scenes.ts). Opcional quando `scene` vem junto. */
    scene_id: z
      .string()
      .regex(/^[a-z0-9-]{3,64}$/)
      .optional(),
    /** Cena do M3 (GET /persona/scenes): o parceiro faz partner_role nesse cenário. */
    scene: sceneSchema.optional(),
    user_line: z.string().trim().min(1).max(500),
    history: z
      .array(
        z.object({
          role: z.enum(["persona", "learner"]),
          text: z.string().trim().min(1).max(500),
        }),
      )
      .max(12),
  })
  .refine((body) => Boolean(body.scene || body.scene_id), { message: "scene or scene_id is required" });

export const personaReplySchema = z.object({
  reply: z.string().trim().min(1).max(600),
  tone: z.enum(["adequate", "direct", "informal", "inadequate"]),
  cultural_note: z.string().trim().min(8).max(400),
});

export type PersonaTurnBody = z.infer<typeof personaTurnBodySchema>;
export type PersonaReply = z.infer<typeof personaReplySchema>;
