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

export class MnemonicService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  async forCard(user: AuthUser, body: MnemonicBody): Promise<{ eligible: false } | { eligible: true; association_text: string }> {
    const found = await this.pool.query<{ id: string; repetition_count: number; reviews: number; failures: number }>(
      `SELECT c.id,
              c.repetition_count,
              COUNT(l.id)::int AS reviews,
              COUNT(l.id) FILTER (WHERE l.quality < 3)::int AS failures
       FROM srs_cards c
       LEFT JOIN srs_review_logs l ON l.card_id = c.id
       WHERE c.user_id = $1 AND c.front_phrase = $2
       GROUP BY c.id
       ORDER BY c.next_review_at ASC
       LIMIT 1`,
      [user.id, body.front_phrase],
    );
    const card = found.rows[0];
    const reviews = Number(card?.reviews ?? 0);
    const failures = Number(card?.failures ?? 0);
    const repetitions = Number(card?.repetition_count ?? 0);
    if (!card || !mnemonicEligible(repetitions, reviews, failures)) {
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
      word: body.front_phrase,
      translation: body.back_translation,
      sentence: body.context_sentence,
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
