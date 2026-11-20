import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import type { MnemonicBody } from "../schemas/srs.js";
import type { GeminiGateway } from "./gemini-gateway.js";

export function mnemonicEligible(repetitionCount: number, reviews: number, failures: number): boolean {
  if (repetitionCount <= 3 || reviews < 1) {
    return false;
  }
  return failures / reviews > 0.6;
}

/** Contagem de revisões de um cartão, como o servidor as registrou. */
export interface ReviewCounts {
  synced_reviews: number;
  synced_failures: number;
  logged_reviews: number;
  logged_failures: number;
}

/**
 * Revisões e falhas do cartão a partir do que o servidor gravou: os eventos de
 * `/srs/sync` (srs_sync_events) e, para cartões antigos sem eventos, o
 * srs_review_logs. As duas fontes não se somam, para não contar a mesma revisão duas vezes.
 * Falha = nota abaixo de 3 ("de novo").
 */
export function reviewHistory(counts: ReviewCounts): { reviews: number; failures: number } {
  const synced = Math.max(0, Number(counts.synced_reviews) || 0);
  if (synced > 0) {
    return { reviews: synced, failures: Math.max(0, Number(counts.synced_failures) || 0) };
  }
  return {
    reviews: Math.max(0, Number(counts.logged_reviews) || 0),
    failures: Math.max(0, Number(counts.logged_failures) || 0),
  };
}

interface CardRow extends ReviewCounts {
  id: string;
  repetition_count: number;
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
}

export class MnemonicService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  /**
   * O cliente só diz qual cartão (front_phrase). A elegibilidade vem do histórico
   * gravado no servidor e o texto da âncora usa a tradução e a frase do cartão
   * guardado, não as enviadas.
   */
  async forCard(user: AuthUser, body: MnemonicBody): Promise<{ eligible: false } | { eligible: true; association_text: string }> {
    const found = await this.pool.query<CardRow>(
      `SELECT c.id,
              c.repetition_count,
              c.front_phrase,
              c.back_translation,
              c.context_sentence,
              (SELECT COUNT(*) FROM srs_sync_events e WHERE e.card_id = c.id AND e.user_id = c.user_id)::int AS synced_reviews,
              (SELECT COUNT(*) FROM srs_sync_events e WHERE e.card_id = c.id AND e.user_id = c.user_id AND e.quality < 3)::int AS synced_failures,
              (SELECT COUNT(*) FROM srs_review_logs l WHERE l.card_id = c.id AND l.user_id = c.user_id)::int AS logged_reviews,
              (SELECT COUNT(*) FROM srs_review_logs l WHERE l.card_id = c.id AND l.user_id = c.user_id AND l.quality < 3)::int AS logged_failures
       FROM srs_cards c
       WHERE c.user_id = $1 AND c.target_lang = $2 AND lower(c.front_phrase) = lower($3)
       ORDER BY c.next_review_at ASC
       LIMIT 1`,
      [user.id, user.target_lang, body.front_phrase],
    );
    const card = found.rows[0];
    if (!card) {
      return { eligible: false };
    }
    const { reviews, failures } = reviewHistory(card);
    if (!mnemonicEligible(Number(card.repetition_count) || 0, reviews, failures)) {
      return { eligible: false };
    }

    const stored = await this.pool.query<{ association_text: string }>(
      "SELECT association_text FROM srs_mnemonics WHERE card_id = $1",
      [card.id],
    );
    const existing = stored.rows[0]?.association_text;
    if (existing) {
      return { eligible: true, association_text: existing };
    }

    const interests = await this.pool.query<{ interests: string[] | null }>("SELECT interests FROM users WHERE id = $1", [user.id]);
    const association = await this.gemini.mnemonic({
      targetLang: user.target_lang,
      nativeLang: user.native_lang,
      word: card.front_phrase,
      translation: card.back_translation,
      sentence: card.context_sentence,
      interests: interests.rows[0]?.interests ?? [],
    });
    await this.pool.query(
      `INSERT INTO srs_mnemonics (card_id, association_text)
       VALUES ($1, $2)
       ON CONFLICT (card_id) DO NOTHING`,
      [card.id, association.association_text],
    );
    return { eligible: true, association_text: association.association_text };
  }
}
