import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { handsFreeHeld } from "./hands-free-hold.js";
import type { ProfileStore } from "./profile-store.js";

interface NoteRow {
  id: string;
  source: string;
  calibrated: string;
  through_note: string;
  mission_prompt: string;
  mission_hold: string;
  mission_done: boolean;
  created_at: Date;
}

export class OwnlifeService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
    private readonly profiles: ProfileStore,
  ) {}

  async latest(user: AuthUser, targetLang: string) {
    const found = await this.pool.query<NoteRow>(
      `SELECT id, source, calibrated, through_note, mission_prompt, mission_hold, mission_done, created_at
       FROM ownlife_notes
       WHERE user_id = $1 AND target_lang = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const row = found.rows[0];
    return row ? this.publicNote(row) : null;
  }

  async calibrate(user: AuthUser, targetLang: string, source: string) {
    const text = source.trim();
    if (/^https?:\/\//i.test(text) && !text.includes(" ") && text.length < 400) {
      throw new AppError(400, "Paste the text, not only the link");
    }
    const level = user.target_lang === targetLang ? user.level : user.level;
    const note = await this.gemini.calibrateLife({
      targetLang,
      nativeLang: user.native_lang,
      level,
      source: text,
    });
    const inserted = await this.pool.query<NoteRow>(
      `INSERT INTO ownlife_notes (user_id, target_lang, source, calibrated, through_note, mission_prompt, mission_hold)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, source, calibrated, through_note, mission_prompt, mission_hold, mission_done, created_at`,
      [user.id, targetLang, text.slice(0, 8000), note.text, note.through_note, note.mission.prompt, note.mission.hold],
    );
    const row = inserted.rows[0];
    if (!row) {
      throw new AppError(500, "Life note could not be saved");
    }
    const profile = await this.profiles.load(user.id, targetLang);
    await this.profiles.merge(user.id, targetLang, {
      lexicon_size: Math.max(profile.lexicon_size, note.vocabulary.length),
    });
    return { ...this.publicNote(row), vocabulary: note.vocabulary };
  }

  async mission(user: AuthUser, targetLang: string, spoken: string) {
    const latest = await this.pool.query<NoteRow>(
      `SELECT id, source, calibrated, through_note, mission_prompt, mission_hold, mission_done, created_at
       FROM ownlife_notes
       WHERE user_id = $1 AND target_lang = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const row = latest.rows[0];
    if (!row) {
      throw new AppError(404, "Calibrate a text first");
    }
    const held = handsFreeHeld(row.mission_hold, spoken);
    if (held) {
      await this.pool.query(`UPDATE ownlife_notes SET mission_done = true WHERE id = $1`, [row.id]);
    }
    return { held, hold: row.mission_hold, prompt: row.mission_prompt };
  }

  private publicNote(row: NoteRow) {
    return {
      id: row.id,
      calibrated: row.calibrated,
      through_note: row.through_note,
      mission_prompt: row.mission_prompt,
      mission_hold: row.mission_hold,
      mission_done: row.mission_done,
      created_at: row.created_at.toISOString(),
    };
  }
}
