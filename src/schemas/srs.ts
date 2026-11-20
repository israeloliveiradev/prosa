import { z } from "zod";

export const reviewQualitySchema = z.union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)]);

export const syncReviewSchema = z.object({
  client_id: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  front_phrase: z.string().trim().min(1).max(240),
  back_translation: z.string().trim().min(1).max(240),
  context_sentence: z.string().trim().min(1).max(500),
  quality: reviewQualitySchema,
  /**
   * Quando o aluno respondeu (ISO 8601). Vale para revisões feitas offline: o servidor usa
   * esse horário se estiver entre 30 dias atrás e agora; fora disso, usa o próprio relógio
   * (ver reviewTime em routes/srs.ts). Formato inválido é recusado.
   */
  reviewed_at: z.string().datetime({ offset: true }).optional(),
});

export const syncReviewsBodySchema = z.object({
  user_id: z.string().uuid(),
  reviews: z.array(syncReviewSchema).min(1).max(50),
});

export const retentionCardSchema = z.object({
  interval_days: z.number().int().min(0).max(36500),
  status: z.enum(["learning", "reviewing", "mastered"]),
  phrase: z.string().trim().min(1).max(240),
});

export const retentionBodySchema = z.object({
  cards: z.array(retentionCardSchema).max(500),
});

/**
 * Pedido de âncora: só `front_phrase` identifica o cartão. Tradução e frase vêm do cartão
 * guardado no servidor; os campos abaixo continuam aceitos por compatibilidade, mas não são usados.
 */
export const mnemonicBodySchema = z.object({
  front_phrase: z.string().trim().min(1).max(240),
  back_translation: z.string().trim().min(1).max(240).optional(),
  context_sentence: z.string().trim().min(1).max(500).optional(),
});

export const mnemonicResponseSchema = z.object({
  association_text: z.string().trim().min(12).max(600),
});

export type SyncReviewsBody = z.infer<typeof syncReviewsBodySchema>;
export type MnemonicBody = z.infer<typeof mnemonicBodySchema>;
