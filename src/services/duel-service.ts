import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { duelRoundSchema, type DuelBoardEntry, type DuelScoreBody } from "../schemas/duel.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { shuffleDrill } from "./duel-score.js";

export class DuelService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  async round(user: AuthUser) {
    const interests = await this.interests(user.id);
    const generated = await this.gemini.duelDrills({
      targetLang: user.target_lang,
      throughLang: user.native_lang,
      level: user.level,
      interests,
    });
    const parsed = duelRoundSchema.safeParse({
      drills: generated.drills.map((drill) => ({
        ...drill,
        prompt: drill.prompt.replace(/_{3,}/g, "____"),
      })),
    });
    if (!parsed.success) {
      throw new AppError(502, "Duel response failed validation");
    }
    const drills = parsed.data.drills.filter((drill) => drill.prompt.includes("____") && new Set(drill.options.map((option) => option.toLowerCase())).size === 4);
    if (drills.length < 8) {
      throw new AppError(502, "Duel response failed validation");
    }
    return { drills: drills.map((drill) => shuffleDrill(drill)) };
  }

  async save(user: AuthUser, body: DuelScoreBody): Promise<{ saved: true }> {
    await this.pool.query(
      `INSERT INTO duel_runs (user_id, target_lang, level, score, best_combo, correct_count)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.target_lang, user.level, body.score, body.best_combo, body.correct_count],
    );
    return { saved: true };
  }

  async leaderboard(user: AuthUser): Promise<{ entries: DuelBoardEntry[] }> {
    const result = await this.pool.query<DuelBoardEntry>(
      `SELECT label, score, best_combo, you
       FROM (
         SELECT DISTINCT ON (r.user_id)
           left(COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'prosa'), 24) AS label,
           r.score,
           r.best_combo,
           (r.user_id = $2) AS you
         FROM duel_runs r
         JOIN users u ON u.id = r.user_id
         WHERE r.target_lang = $1
         ORDER BY r.user_id, r.score DESC, r.best_combo DESC, r.played_at DESC
       ) ranked
       ORDER BY score DESC, best_combo DESC
       LIMIT 20`,
      [user.target_lang, user.id],
    );
    return { entries: result.rows };
  }

  private async interests(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ interests: string[] }>("SELECT interests FROM users WHERE id = $1", [userId]);
    return result.rows[0]?.interests?.filter((item) => item.trim().length > 0) ?? [];
  }
}
