import type { Pool } from "pg";
import {
  applySignals,
  emptyProfile,
  scoreOf,
  type LearnerProfile,
} from "./learner-profile.js";

interface ProfileRow {
  reading: number;
  listening: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  fluency: number;
  writing: number;
  hearing: number;
  lexicon_size: number;
  coverage: number;
  error_kinds: unknown;
  weak_sounds: unknown;
  goal: string;
  weekly_aim: string;
  minutes_per_day: number;
  exam_track: string;
  fluency_wpm: number;
  session_duration_mode?: string;
  total_active_seconds?: number | string;
  paused_session_state?: unknown;
  milestones_30h?: unknown;
}

export class ProfileStore {
  constructor(private readonly pool: Pool) {}

  async load(userId: string, targetLang: string): Promise<LearnerProfile> {
    const result = await this.pool.query<ProfileRow>(
      `SELECT reading, listening, vocabulary, grammar, pronunciation, fluency, writing, hearing,
              lexicon_size, coverage, error_kinds, weak_sounds, goal, weekly_aim, minutes_per_day, exam_track, fluency_wpm,
              session_duration_mode, total_active_seconds, paused_session_state, milestones_30h
       FROM learner_profile
       WHERE user_id = $1 AND target_lang = $2`,
      [userId, code(targetLang)],
    );
    const row = result.rows[0];
    if (!row) {
      return emptyProfile();
    }
    const mode = row.session_duration_mode;
    const validMode = mode === "pro_40" || mode === "sprint_60" ? mode : "lite_20";
    const activeSecs = typeof row.total_active_seconds === "number"
      ? row.total_active_seconds
      : typeof row.total_active_seconds === "string"
      ? parseInt(row.total_active_seconds, 10) || 0
      : 0;
    const pausedState = row.paused_session_state && typeof row.paused_session_state === "object"
      ? (row.paused_session_state as Record<string, unknown>)
      : null;
    const milestones = Array.isArray(row.milestones_30h)
      ? row.milestones_30h.filter((x): x is number => typeof x === "number")
      : [];

    return {
      reading: scoreOf(row.reading),
      listening: scoreOf(row.listening),
      vocabulary: scoreOf(row.vocabulary),
      grammar: scoreOf(row.grammar),
      pronunciation: scoreOf(row.pronunciation),
      fluency: scoreOf(row.fluency),
      writing: scoreOf(row.writing),
      hearing: scoreOf(row.hearing),
      lexicon_size: Math.max(0, Math.round(row.lexicon_size)),
      coverage: scoreOf(row.coverage),
      error_kinds: strings(row.error_kinds),
      weak_sounds: strings(row.weak_sounds),
      goal: row.goal ?? "",
      weekly_aim: row.weekly_aim ?? "",
      minutes_per_day: Math.max(5, Math.min(120, row.minutes_per_day || 20)),
      exam_track: row.exam_track ?? "",
      fluency_wpm: Math.max(0, Math.min(400, row.fluency_wpm || 0)),
      session_duration_mode: validMode,
      total_active_seconds: Math.max(0, activeSecs),
      paused_session_state: pausedState,
      milestones_30h: milestones,
    };
  }

  async save(userId: string, targetLang: string, profile: LearnerProfile): Promise<LearnerProfile> {
    await this.pool.query(
      `INSERT INTO learner_profile (
         user_id, target_lang, reading, listening, vocabulary, grammar, pronunciation, fluency, writing, hearing,
         lexicon_size, coverage, error_kinds, weak_sounds, goal, weekly_aim, minutes_per_day, exam_track, fluency_wpm,
         session_duration_mode, total_active_seconds, paused_session_state, milestones_30h, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17, $18, $19, $20, $21, $22::jsonb, $23::jsonb, now())
       ON CONFLICT (user_id, target_lang) DO UPDATE SET
         reading = EXCLUDED.reading,
         listening = EXCLUDED.listening,
         vocabulary = EXCLUDED.vocabulary,
         grammar = EXCLUDED.grammar,
         pronunciation = EXCLUDED.pronunciation,
         fluency = EXCLUDED.fluency,
         writing = EXCLUDED.writing,
         hearing = EXCLUDED.hearing,
         lexicon_size = EXCLUDED.lexicon_size,
         coverage = EXCLUDED.coverage,
         error_kinds = EXCLUDED.error_kinds,
         weak_sounds = EXCLUDED.weak_sounds,
         goal = EXCLUDED.goal,
         weekly_aim = EXCLUDED.weekly_aim,
         minutes_per_day = EXCLUDED.minutes_per_day,
         exam_track = EXCLUDED.exam_track,
         fluency_wpm = EXCLUDED.fluency_wpm,
         session_duration_mode = EXCLUDED.session_duration_mode,
         total_active_seconds = EXCLUDED.total_active_seconds,
         paused_session_state = EXCLUDED.paused_session_state,
         milestones_30h = EXCLUDED.milestones_30h,
         updated_at = now()`,
      [
        userId,
        code(targetLang),
        profile.reading,
        profile.listening,
        profile.vocabulary,
        profile.grammar,
        profile.pronunciation,
        profile.fluency,
        profile.writing,
        profile.hearing,
        profile.lexicon_size,
        profile.coverage,
        JSON.stringify(profile.error_kinds),
        JSON.stringify(profile.weak_sounds),
        profile.goal,
        profile.weekly_aim,
        profile.minutes_per_day,
        profile.exam_track,
        profile.fluency_wpm,
        profile.session_duration_mode || "lite_20",
        profile.total_active_seconds || 0,
        profile.paused_session_state ? JSON.stringify(profile.paused_session_state) : null,
        JSON.stringify(profile.milestones_30h || []),
      ],
    );
    return profile;
  }

  async merge(
    userId: string,
    targetLang: string,
    signals: Parameters<typeof applySignals>[1],
  ): Promise<LearnerProfile> {
    const current = await this.load(userId, targetLang);
    return this.save(userId, targetLang, applySignals(current, signals));
  }
}

function code(lang: string): string {
  return lang.trim().toLowerCase().slice(0, 2);
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6);
}
