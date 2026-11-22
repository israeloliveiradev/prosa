import { randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { profileNote } from "./learner-profile.js";
import { practiceFocus } from "./dossier.js";
import type { ProfileStore } from "./profile-store.js";

interface DossierRow {
  id: string;
  share_token: string;
  updated_at: Date;
}

interface CheckpointRow {
  id: string;
  focus: string;
  note: string;
  due_on: Date | string | null;
  done: boolean;
  created_at: Date;
}

export class DossierService {
  constructor(
    private readonly pool: Pool,
    private readonly profiles: ProfileStore,
  ) {}

  async mine(user: AuthUser, targetLang: string) {
    const row = await this.load(user.id, targetLang);
    const body = await this.body(user, targetLang);
    return {
      share_token: row?.share_token ?? null,
      ...body,
    };
  }

  async publish(user: AuthUser, targetLang: string) {
    const token = randomBytes(16).toString("base64url");
    await this.pool.query(
      `INSERT INTO tutor_dossiers (user_id, target_lang, share_token)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, target_lang)
       DO UPDATE SET share_token = EXCLUDED.share_token, updated_at = now()`,
      [user.id, targetLang, token],
    );
    const body = await this.body(user, targetLang);
    return { share_token: token, ...body };
  }

  async addCheckpoint(user: AuthUser, input: { target_lang: string; focus: string; note: string; due_on?: string }) {
    let dossier = await this.load(user.id, input.target_lang);
    if (!dossier) {
      await this.publish(user, input.target_lang);
      dossier = await this.load(user.id, input.target_lang);
    }
    if (!dossier) {
      throw new AppError(500, "Dossier could not open");
    }
    await this.pool.query(
      `INSERT INTO tutor_checkpoints (dossier_id, focus, note, due_on)
       VALUES ($1, $2, $3, $4::date)`,
      [dossier.id, input.focus, input.note, input.due_on ?? null],
    );
    return this.mine(user, input.target_lang);
  }

  async closeCheckpoint(user: AuthUser, checkpointId: string) {
    const found = await this.pool.query<{ target_lang: string }>(
      `UPDATE tutor_checkpoints AS c
       SET done = true
       FROM tutor_dossiers AS d
       WHERE c.id = $2 AND c.dossier_id = d.id AND d.user_id = $1
       RETURNING d.target_lang`,
      [user.id, checkpointId],
    );
    const lang = found.rows[0]?.target_lang;
    if (!lang) {
      throw new AppError(404, "Checkpoint was not found");
    }
    return this.mine(user, lang);
  }

  async view(token: string) {
    const found = await this.pool.query<{ user_id: string; target_lang: string; account_level: string; account_target: string }>(
      `SELECT d.user_id, d.target_lang, u.level AS account_level, u.target_lang AS account_target
       FROM tutor_dossiers AS d JOIN users AS u ON u.id = d.user_id
       WHERE d.share_token = $1`,
      [token],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "Dossier was not found");
    }
    // Mesmo nível que o dono vê em mine(): sem linha em study_tracks, vale o nível da conta
    // (que é o do curso ativo, então só serve de reserva quando o dossiê é desse curso).
    const fallback = row.account_target === row.target_lang ? row.account_level : undefined;
    const level = await this.level(row.user_id, row.target_lang, fallback);
    return this.body({ id: row.user_id, level, target_lang: row.target_lang }, row.target_lang);
  }

  private async body(user: { id: string; level: string; target_lang: string }, targetLang: string) {
    const profile = await this.profiles.load(user.id, targetLang);
    const note = profileNote(profile);
    const level = await this.level(user.id, targetLang, user.level);
    const placement = await this.pool.query<{ result_level: string; score: number; finished_at: Date }>(
      `SELECT result_level, score, finished_at
       FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed' AND result_level IS NOT NULL AND finished_at IS NOT NULL
       ORDER BY finished_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const last = placement.rows[0];
    const score = await this.pool.query<{ score: number; band: string }>(
      `SELECT score, band FROM prosa_score_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed' AND score IS NOT NULL
       ORDER BY finished_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const dossier = await this.load(user.id, targetLang);
    const checks = dossier
      ? await this.pool.query<CheckpointRow>(
          `SELECT id, focus, note, due_on, done, created_at
           FROM tutor_checkpoints WHERE dossier_id = $1
           ORDER BY created_at DESC LIMIT 8`,
          [dossier.id],
        )
      : { rows: [] };
    return {
      target_lang: targetLang,
      level: last?.result_level ?? level,
      practice: practiceFocus(note, profile.error_kinds, profile.weak_sounds),
      errors: profile.error_kinds,
      sounds: profile.weak_sounds,
      lexicon: profile.lexicon_size,
      fluency_wpm: profile.fluency_wpm,
      listening: profile.listening,
      reading: profile.reading,
      last_placement: last
        ? {
            level: last.result_level,
            score: last.score,
            finished_at: last.finished_at instanceof Date ? last.finished_at.toISOString() : String(last.finished_at),
          }
        : null,
      prosa_score: score.rows[0] ?? null,
      checkpoints: checks.rows.map((row) => ({
        id: row.id,
        focus: row.focus,
        note: row.note,
        due_on: row.due_on ? String(row.due_on).slice(0, 10) : null,
        done: row.done,
      })),
    };
  }

  private async load(userId: string, targetLang: string): Promise<DossierRow | undefined> {
    const found = await this.pool.query<DossierRow>(
      `SELECT id, share_token, updated_at FROM tutor_dossiers WHERE user_id = $1 AND target_lang = $2`,
      [userId, targetLang],
    );
    return found.rows[0];
  }

  private async level(userId: string, targetLang: string, fallback = "A1"): Promise<string> {
    const found = await this.pool.query<{ level: string }>(
      `SELECT level FROM study_tracks WHERE user_id = $1 AND target_lang = $2`,
      [userId, targetLang],
    );
    return found.rows[0]?.level ?? fallback;
  }
}
