import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import type { ProfileStore } from "./profile-store.js";
import { RETENTION_AIM, retentionRate } from "./measure.js";

export class MeasureService {
  constructor(
    private readonly pool: Pool,
    private readonly profiles: ProfileStore,
  ) {}

  async panel(user: AuthUser, targetLang = user.target_lang) {
    const profile = await this.profiles.load(user.id, targetLang);
    const history = await this.pool.query<{ result_level: string; score: number; finished_at: Date }>(
      `SELECT result_level, score, finished_at
       FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed' AND result_level IS NOT NULL AND finished_at IS NOT NULL
       ORDER BY finished_at ASC
       LIMIT 24`,
      [user.id, targetLang],
    );
    const cards = await this.pool.query<{ stability: number; last_review_at: Date | null }>(
      `SELECT stability, last_review_at FROM srs_cards WHERE user_id = $1 AND target_lang = $2`,
      [user.id, targetLang],
    );
    const lexicon = profile.lexicon_size > 0 ? profile.lexicon_size : cards.rows.length;
    const retention = retentionRate(cards.rows);
    return {
      cefr: history.rows.map((row) => ({
        level: row.result_level,
        score: row.score,
        finished_at: row.finished_at.toISOString(),
      })),
      retention,
      retention_aim: RETENTION_AIM,
      lexicon,
      fluency_wpm: profile.fluency_wpm,
      errors: profile.error_kinds,
      listening: profile.listening,
      reading: profile.reading,
    };
  }
}
