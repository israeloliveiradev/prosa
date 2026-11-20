import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { unitById } from "../curriculum/index.js";
import { AppError } from "../http/errors.js";
import { duelRoundSchema, type DuelBoardEntry, type DuelScoreBody } from "../schemas/duel.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { shuffleDrill } from "./duel-score.js";
import { duelFocus, rankUnitDrills, unitDuelPlan, type UnitDuelPlan } from "./duel-focus.js";
import { emptyProfile } from "./learner-profile.js";
import { initialStatuses, loadUnitBrief } from "./path-service.js";
import { ProfileStore } from "./profile-store.js";

export class DuelService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  /**
   * Rodada do duelo. Com `unitId` é a rodada-chefe da unidade: os drills cobram a gramática e
   * os lemas-núcleo dela (src/curriculum) além dos tipos de erro do aluno.
   */
  async round(user: AuthUser, unitId?: string) {
    const plan = unitId ? await this.unitPlan(user, unitId) : null;
    const interests = await this.interests(user.id);
    const profile = await this.profile(user.id, user.target_lang);
    const focus = duelFocus(profile);
    const generated = await this.gemini.duelDrills({
      targetLang: user.target_lang,
      throughLang: user.native_lang,
      level: user.level,
      interests,
      focus,
      ...(plan ? { unit: plan } : {}),
    });
    const parsed = duelRoundSchema.safeParse({
      drills: generated.drills.slice(0, 12).map((drill) => ({
        ...drill,
        prompt: drill.prompt.replace(/_{3,}/g, "____"),
      })),
    });
    if (!parsed.success) {
      throw new AppError(502, "Duel response failed validation");
    }
    const valid = parsed.data.drills.filter(
      (drill) => drill.prompt.includes("____") && new Set(drill.options.map((option) => option.toLowerCase())).size === 4,
    );
    if (valid.length < 8) {
      throw new AppError(502, "Duel response failed validation");
    }
    const drills = plan ? rankUnitDrills(valid, plan.words, user.target_lang) : valid;
    return {
      drills: drills.map((drill) => shuffleDrill(drill)),
      focus,
      unit_id: unitId ?? null,
      best: await this.best(user.id, user.target_lang, unitId ?? null),
    };
  }

  async save(user: AuthUser, body: DuelScoreBody): Promise<{ saved: true; best: number }> {
    const unitId = body.unit_id && unitById(body.unit_id) ? body.unit_id : null;
    await this.pool.query(
      `INSERT INTO duel_runs (user_id, target_lang, level, score, best_combo, correct_count, unit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.target_lang, user.level, body.score, body.best_combo, body.correct_count, unitId],
    );
    return { saved: true, best: (await this.best(user.id, user.target_lang, unitId)) ?? body.score };
  }

  /** Placar do modo livre (as rodadas-chefe de unidade não entram). */
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
         WHERE r.target_lang = $1 AND r.unit_id IS NULL
         ORDER BY r.user_id, r.score DESC, r.best_combo DESC, r.played_at DESC
       ) ranked
       ORDER BY score DESC, best_combo DESC
       LIMIT 20`,
      [user.target_lang, user.id],
    );
    return { entries: result.rows };
  }

  /** Recorde pessoal do aluno nesse idioma e nessa unidade (null = modo livre); null sem rodada salva. */
  private async best(userId: string, targetLang: string, unitId: string | null): Promise<number | null> {
    const result = await this.pool.query<{ best: number | null }>(
      `SELECT max(score)::int AS best
       FROM duel_runs
       WHERE user_id = $1 AND target_lang = $2 AND unit_id IS NOT DISTINCT FROM $3`,
      [userId, targetLang, unitId],
    );
    const best = result.rows[0]?.best;
    return typeof best === "number" ? best : null;
  }

  private async unitPlan(user: AuthUser, unitId: string): Promise<UnitDuelPlan> {
    if (!unitById(unitId)) {
      throw new AppError(404, "Unit not found");
    }
    const status = await this.pool.query<{ status: string }>(
      "SELECT status FROM path_progress WHERE user_id = $1 AND target_lang = $2 AND unit_id = $3",
      [user.id, user.target_lang, unitId],
    );
    // Sem linha na trilha ainda (conta nova), vale o estado inicial do nível do aluno.
    const current = status.rows[0]?.status ?? initialStatuses(user.level).get(unitId);
    if (current === "locked") {
      throw new AppError(409, "This unit is locked");
    }
    const brief = await loadUnitBrief(this.pool, user.id, user.target_lang, unitId);
    if (!brief) {
      throw new AppError(404, "Unit not found");
    }
    return unitDuelPlan({ topic: brief.unit.topic, grammar: brief.grammar, lemmas: brief.lemmas, focus: brief.focus });
  }

  private async profile(userId: string, targetLang: string) {
    try {
      return await new ProfileStore(this.pool).load(userId, targetLang);
    } catch {
      return emptyProfile();
    }
  }

  private async interests(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ interests: string[] }>("SELECT interests FROM users WHERE id = $1", [userId]);
    return result.rows[0]?.interests?.filter((item) => item.trim().length > 0) ?? [];
  }
}
