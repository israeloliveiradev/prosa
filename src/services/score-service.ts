import { randomBytes, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { storedPlacementItemSchema, type PlacementPublicItem, type StoredPlacementItem } from "../schemas/placement.js";
import type { CefrLevel } from "../types/database.js";
import { applySignals } from "./learner-profile.js";
import { catalogPlacementItems, shufflePlacementItem } from "./placement-bank.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import {
  PLACEMENT_CAP,
  bandDifficulty,
  levelFromTheta,
  observePlacement,
  placementShouldStop,
  retestOpen,
  skillScores,
} from "./placement-score.js";
import { speakingScore, writingScore } from "./exam-tracks.js";
import type { ProfileStore } from "./profile-store.js";
import {
  SCORE_CAP,
  bandFromScore,
  certificateHeld,
  combineScore,
  rushedFlags,
  scorePrompts,
  thetaToScore,
} from "./prosa-score.js";

const OPEN_WINDOW_MS = 2 * 60 * 60 * 1000;

interface AttemptRow {
  id: string;
  target_lang: string;
  through_lang: string;
  status: "started" | "completed" | "abandoned";
  items: unknown;
  answers: unknown;
  timings: unknown;
  state: unknown;
  writing: string;
  speaking: string;
  score: number | null;
  band: string | null;
  theta: number | null;
  sections: unknown;
  flags: unknown;
  share_token: string | null;
  started_at: Date;
  finished_at: Date | null;
}

interface AdaptiveState {
  mode: "adaptive";
  theta: number;
  information: number;
}

interface PoolRow {
  id: string;
  band: CefrLevel;
  kind: StoredPlacementItem["kind"];
  prompt: string;
  hint: string;
  options: unknown;
  answer: number;
  passage: string | null;
  audio_text: string | null;
  difficulty: number;
}

export class ScoreService {
  constructor(
    private readonly pool: Pool,
    private readonly profiles: ProfileStore,
    private readonly gemini: GeminiGateway,
  ) {}

  async status(user: AuthUser, targetLang = user.target_lang) {
    const last = await this.latest(user.id, targetLang);
    const lessons = last?.finished_at ? await this.lessonsSince(user.id, targetLang, last.finished_at) : 0;
    const retest = retestOpen({ lastFinishedAt: last?.finished_at ?? null, lessonsSince: lessons });
    const open = await this.openAttempt(user.id, targetLang);
    return {
      due: retest.due,
      reason: retest.reason,
      days_until: retest.days_until,
      open_attempt_id: open?.id ?? null,
      latest: last
        ? {
            score: last.score,
            band: last.band,
            share_token: last.share_token,
            finished_at: last.finished_at?.toISOString() ?? null,
            held: certificateHeld(asFlags(last.flags)),
          }
        : null,
    };
  }

  async start(user: AuthUser, targetLang = user.target_lang, throughLang = user.native_lang) {
    if (targetLang === throughLang) {
      throw new AppError(400, "Study a language through a different language");
    }
    const existing = await this.openAttempt(user.id, targetLang);
    if (existing && Date.now() - existing.started_at.getTime() < OPEN_WINDOW_MS) {
      return this.publicAttempt(existing);
    }
    if (existing) {
      await this.pool.query(`UPDATE prosa_score_attempts SET status = 'abandoned' WHERE id = $1`, [existing.id]);
    }
    await this.seedPool(targetLang, throughLang);
    if ((await this.unseenCount(user.id, targetLang, throughLang)) < 12) {
      await this.refill(user, targetLang, throughLang);
    }
    const level = await this.trackLevel(user.id, targetLang, user.level);
    const first = await this.pickItem(user.id, targetLang, throughLang, bandDifficulty(level), []);
    if (!first) {
      throw new AppError(503, "Score questions are not ready yet");
    }
    await this.markSeen(user.id, first.id);
    const state: AdaptiveState = { mode: "adaptive", theta: bandDifficulty(level), information: 0.5 };
    const inserted = await this.pool.query<AttemptRow>(
      `INSERT INTO prosa_score_attempts (user_id, target_lang, through_lang, status, items, answers, timings, state)
       VALUES ($1, $2, $3, 'started', $4::jsonb, '{}'::jsonb, '{}'::jsonb, $5::jsonb)
       RETURNING *`,
      [user.id, targetLang, throughLang, JSON.stringify([first]), JSON.stringify(state)],
    );
    const row = inserted.rows[0];
    if (!row) {
      throw new AppError(500, "Score could not start");
    }
    return this.publicAttempt(row);
  }

  async answer(user: AuthUser, attemptId: string, itemId: string, choice: number, elapsedMs: number) {
    const row = await this.requireOpen(user.id, attemptId);
    const items = asItems(row.items);
    const answers = asAnswers(row.answers);
    const timings = asTimings(row.timings);
    const pending = items.find((entry) => answers[entry.id] === undefined);
    if (!pending || pending.id !== itemId) {
      throw new AppError(400, "Answer the current question");
    }
    const state = readState(row.state);
    if (!state) {
      throw new AppError(409, "This score attempt is closed");
    }
    const nextAnswers = { ...answers, [itemId]: choice };
    const nextTimings = { ...timings, [itemId]: elapsedMs };
    const observed = observePlacement(
      state.theta,
      state.information,
      pending.difficulty ?? bandDifficulty(pending.band),
      choice === pending.answer,
    );
    const asked = Object.keys(nextAnswers).length;
    const nextState: AdaptiveState = { mode: "adaptive", theta: observed.theta, information: observed.information };
    const stop =
      asked >= SCORE_CAP ||
      placementShouldStop({ asked: Math.min(asked, PLACEMENT_CAP), theta: observed.theta, information: observed.information });
    if (stop) {
      await this.pool.query(
        `UPDATE prosa_score_attempts SET answers = $2::jsonb, timings = $3::jsonb, state = $4::jsonb WHERE id = $1`,
        [attemptId, JSON.stringify(nextAnswers), JSON.stringify(nextTimings), JSON.stringify(nextState)],
      );
      return { saved: true as const, done: true, asked, cap: SCORE_CAP, next: null, prompts: scorePrompts(row.target_lang) };
    }
    const served = items.map((entry) => entry.kind);
    let next = await this.pickItem(user.id, row.target_lang, row.through_lang, observed.theta, served);
    if (!next) {
      await this.refill(user, row.target_lang, row.through_lang, levelFromTheta(observed.theta));
      next = await this.pickItem(user.id, row.target_lang, row.through_lang, observed.theta, served);
    }
    if (!next) {
      if (asked >= 8) {
        await this.pool.query(
          `UPDATE prosa_score_attempts SET answers = $2::jsonb, timings = $3::jsonb, state = $4::jsonb WHERE id = $1`,
          [attemptId, JSON.stringify(nextAnswers), JSON.stringify(nextTimings), JSON.stringify(nextState)],
        );
        return { saved: true as const, done: true, asked, cap: SCORE_CAP, next: null, prompts: scorePrompts(row.target_lang) };
      }
      throw new AppError(503, "Score questions are not ready yet");
    }
    await this.markSeen(user.id, next.id);
    const stored = [...items, next];
    await this.pool.query(
      `UPDATE prosa_score_attempts SET answers = $2::jsonb, timings = $3::jsonb, items = $4::jsonb, state = $5::jsonb WHERE id = $1`,
      [attemptId, JSON.stringify(nextAnswers), JSON.stringify(nextTimings), JSON.stringify(stored), JSON.stringify(nextState)],
    );
    const [pub] = publicItems([next]);
    return { saved: true as const, done: false, asked, cap: SCORE_CAP, next: pub ?? null, prompts: null };
  }

  async finish(user: AuthUser, attemptId: string, writing: string, speaking: string) {
    const row = await this.requireOpen(user.id, attemptId);
    const items = asItems(row.items);
    const answers = asAnswers(row.answers);
    const timings = asTimings(row.timings);
    const state = readState(row.state);
    const answered = items.filter((item) => answers[item.id] !== undefined);
    if (!state || answered.length < 8) {
      throw new AppError(400, "Score is incomplete");
    }
    const mc = thetaToScore(state.theta);
    const write = writingScore(writing);
    const speak = speakingScore(speaking);
    const skills = skillScores(answered, answers);
    const reading = percentOf(skills, ["reading", "vocab", "grammar"], mc);
    const listening = percentOf(skills, ["listening"], mc);
    const score = combineScore(mc, write, speak);
    const band = bandFromScore(score);
    const flags = rushedFlags(timings);
    const held = certificateHeld(flags);
    const token = held ? null : randomBytes(16).toString("base64url");
    const sections = { reading, listening, writing: write, speaking: speak };
    await this.pool.query(
      `UPDATE prosa_score_attempts
       SET status = 'completed',
           finished_at = now(),
           writing = $2,
           speaking = $3,
           score = $4,
           band = $5,
           theta = $6,
           sections = $7::jsonb,
           flags = $8::jsonb,
           share_token = $9
       WHERE id = $1`,
      [attemptId, writing, speaking, score, band, state.theta, JSON.stringify(sections), JSON.stringify(flags), token],
    );
    if (!held) {
      await this.applyLevel(user.id, row.target_lang, row.through_lang, band);
    }
    const profile = await this.profiles.load(user.id, row.target_lang);
    await this.profiles.save(
      user.id,
      row.target_lang,
      applySignals(profile, {
        reading,
        listening,
        writing: write,
        fluency: speak,
      }),
    );
    return {
      attempt_id: attemptId,
      score,
      band,
      previous: (await this.previousScore(user.id, row.target_lang, attemptId)) ?? null,
      sections,
      flags,
      held,
      share_token: token,
      target_lang: row.target_lang,
    };
  }

  async certificate(token: string) {
    const found = await this.pool.query<AttemptRow>(
      `SELECT * FROM prosa_score_attempts
       WHERE share_token = $1 AND status = 'completed'`,
      [token],
    );
    const row = found.rows[0];
    if (!row || row.score === null || !row.band || !row.finished_at) {
      throw new AppError(404, "Certificate was not found");
    }
    const sections = asSections(row.sections);
    return {
      score: row.score,
      band: row.band,
      target_lang: row.target_lang,
      finished_at: row.finished_at.toISOString(),
      sections,
    };
  }

  private publicAttempt(row: AttemptRow) {
    const items = asItems(row.items);
    const answers = asAnswers(row.answers);
    const pending = items.findIndex((item) => answers[item.id] === undefined);
    const state = readState(row.state);
    const asked = Object.keys(answers).length;
    const produce = pending < 0 && Boolean(state) && asked >= 8;
    return {
      attempt_id: row.id,
      target_lang: row.target_lang,
      through_lang: row.through_lang,
      items: publicItems(items),
      answered: answers,
      index: pending < 0 ? items.length : pending,
      adaptive: true,
      cap: SCORE_CAP,
      produce,
      prompts: produce ? scorePrompts(row.target_lang) : null,
    };
  }

  private async requireOpen(userId: string, attemptId: string): Promise<AttemptRow> {
    const found = await this.pool.query<AttemptRow>(
      `SELECT * FROM prosa_score_attempts WHERE id = $1 AND user_id = $2`,
      [attemptId, userId],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "Score was not found");
    }
    if (row.status !== "started") {
      throw new AppError(409, "This score is already closed");
    }
    return row;
  }

  private async openAttempt(userId: string, targetLang: string): Promise<AttemptRow | undefined> {
    const found = await this.pool.query<AttemptRow>(
      `SELECT * FROM prosa_score_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'started' AND started_at > now() - interval '2 hours'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId, targetLang],
    );
    return found.rows[0];
  }

  private async latest(userId: string, targetLang: string): Promise<AttemptRow | undefined> {
    const found = await this.pool.query<AttemptRow>(
      `SELECT * FROM prosa_score_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed'
       ORDER BY finished_at DESC
       LIMIT 1`,
      [userId, targetLang],
    );
    return found.rows[0];
  }

  private async previousScore(userId: string, targetLang: string, attemptId: string): Promise<number | null> {
    const found = await this.pool.query<{ score: number }>(
      `SELECT score FROM prosa_score_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed' AND id <> $3 AND score IS NOT NULL
       ORDER BY finished_at DESC
       LIMIT 1`,
      [userId, targetLang, attemptId],
    );
    return found.rows[0]?.score ?? null;
  }

  private async seedPool(targetLang: string, throughLang: string): Promise<void> {
    for (const item of catalogPlacementItems(targetLang, throughLang)) {
      await this.pool.query(
        `INSERT INTO placement_items
           (id, target_lang, through_lang, band, kind, prompt, hint, options, answer, passage, audio_text, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
         ON CONFLICT (id, through_lang) DO NOTHING`,
        [
          item.id,
          targetLang,
          throughLang,
          item.band,
          item.kind,
          item.prompt,
          item.hint,
          JSON.stringify(item.options),
          item.answer,
          item.passage ?? null,
          item.audio_text ?? null,
          item.difficulty ?? bandDifficulty(item.band),
        ],
      );
    }
  }

  private async markSeen(userId: string, itemId: string): Promise<void> {
    await this.pool.query(`INSERT INTO prosa_score_seen (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      userId,
      itemId,
    ]);
  }

  private async unseenCount(userId: string, targetLang: string, throughLang: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM placement_items
       WHERE target_lang = $2 AND through_lang = $3
         AND NOT EXISTS (
           SELECT 1 FROM prosa_score_seen WHERE user_id = $1 AND item_id = placement_items.id
         )`,
      [userId, targetLang, throughLang],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  private async pickItem(
    userId: string,
    targetLang: string,
    throughLang: string,
    theta: number,
    servedKinds: string[],
  ): Promise<StoredPlacementItem | null> {
    const found = await this.pool.query<PoolRow>(
      `SELECT id, band, kind, prompt, hint, options, answer, passage, audio_text, difficulty
       FROM placement_items
       WHERE target_lang = $2 AND through_lang = $3
         AND NOT EXISTS (
           SELECT 1 FROM prosa_score_seen WHERE user_id = $1 AND item_id = placement_items.id
         )
       ORDER BY abs(difficulty - $4)
       LIMIT 40`,
      [userId, targetLang, throughLang, theta],
    );
    const counts = new Map<string, number>();
    for (const kind of servedKinds) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    const ranked = found.rows
      .flatMap((row) => {
        const item = rowToItem(row);
        return item ? [item] : [];
      })
      .sort((left, right) => {
        const leftScore = Math.abs((left.difficulty ?? bandDifficulty(left.band)) - theta) + (counts.get(left.kind) ?? 0) * 0.45;
        const rightScore = Math.abs((right.difficulty ?? bandDifficulty(right.band)) - theta) + (counts.get(right.kind) ?? 0) * 0.45;
        return leftScore - rightScore;
      });
    const chosen = ranked[0];
    return chosen ? shufflePlacementItem(chosen) : null;
  }

  private async refill(user: AuthUser, targetLang: string, throughLang: string, band?: CefrLevel): Promise<void> {
    try {
      const existing = await this.pool.query<{ prompt: string }>(
        `SELECT prompt FROM placement_items WHERE target_lang = $1 AND through_lang = $2 ORDER BY created_at DESC LIMIT 24`,
        [targetLang, throughLang],
      );
      const interests = await this.pool.query<{ interests: string[] | null }>("SELECT interests FROM users WHERE id = $1", [
        user.id,
      ]);
      const generated = await this.gemini.placementBatch({
        targetLang,
        throughLang,
        band: band ?? user.level,
        interests: interests.rows[0]?.interests?.filter((item) => item.trim().length > 0) ?? [],
        avoid: existing.rows.map((row) => row.prompt),
      });
      for (const raw of generated) {
        const parsed = storedPlacementItemSchema.safeParse({
          ...raw,
          id: `score-${randomUUID()}`,
          passage: raw.kind === "reading" ? raw.passage : "",
          audio_text: raw.kind === "listening" ? raw.audio_text : "",
          difficulty: bandDifficulty(raw.band),
        });
        if (!parsed.success) {
          continue;
        }
        await this.pool.query(
          `INSERT INTO placement_items
             (id, target_lang, through_lang, band, kind, prompt, hint, options, answer, passage, audio_text, difficulty)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
           ON CONFLICT (id, through_lang) DO NOTHING`,
          [
            parsed.data.id,
            targetLang,
            throughLang,
            parsed.data.band,
            parsed.data.kind,
            parsed.data.prompt,
            parsed.data.hint,
            JSON.stringify(parsed.data.options),
            parsed.data.answer,
            parsed.data.passage ?? null,
            parsed.data.audio_text ?? null,
            parsed.data.difficulty ?? bandDifficulty(parsed.data.band),
          ],
        );
      }
    } catch {
      // The seeded bank still serves the test when the model is busy.
    }
  }

  private async trackLevel(userId: string, targetLang: string, fallback: CefrLevel): Promise<CefrLevel> {
    const result = await this.pool.query<{ level: CefrLevel }>(
      `SELECT level FROM study_tracks WHERE user_id = $1 AND target_lang = $2`,
      [userId, targetLang],
    );
    return result.rows[0]?.level ?? fallback;
  }

  private async applyLevel(userId: string, targetLang: string, throughLang: string, level: CefrLevel): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO study_tracks (user_id, target_lang, through_lang, level, active)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (user_id, target_lang)
         DO UPDATE SET level = EXCLUDED.level, through_lang = EXCLUDED.through_lang`,
        [userId, targetLang, throughLang, level],
      );
      const active = await client.query<{ target_lang: string }>(
        `SELECT target_lang FROM study_tracks WHERE user_id = $1 AND active = true`,
        [userId],
      );
      if ((active.rows[0]?.target_lang ?? targetLang) === targetLang) {
        await client.query("UPDATE users SET level = $2, native_lang = $3 WHERE id = $1", [userId, level, throughLang]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async lessonsSince(userId: string, targetLang: string, since: Date): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM daily_lessons
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed' AND lesson_date >= $3::date`,
      [userId, targetLang, since.toISOString().slice(0, 10)],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}

function asItems(value: unknown): StoredPlacementItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const parsed = storedPlacementItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function asAnswers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const next: Record<string, number> = {};
  for (const [key, choice] of Object.entries(value)) {
    if (typeof choice === "number" && Number.isInteger(choice) && choice >= 0 && choice <= 3) {
      next[key] = choice;
    }
  }
  return next;
}

function asTimings(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const next: Record<string, number> = {};
  for (const [key, ms] of Object.entries(value)) {
    if (typeof ms === "number" && Number.isFinite(ms) && ms >= 0) {
      next[key] = Math.round(ms);
    }
  }
  return next;
}

function asFlags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asSections(value: unknown): ScoreSectionsSafe {
  const row = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    reading: num(row.reading),
    listening: num(row.listening),
    writing: num(row.writing),
    speaking: num(row.speaking),
  };
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function publicItems(items: StoredPlacementItem[]): PlacementPublicItem[] {
  return items.map(({ answer: _answer, difficulty: _difficulty, ...item }) => item);
}

function readState(value: unknown): AdaptiveState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as { mode?: unknown; theta?: unknown; information?: unknown };
  if (row.mode !== "adaptive" || typeof row.theta !== "number" || typeof row.information !== "number") {
    return null;
  }
  return { mode: "adaptive", theta: row.theta, information: row.information };
}

function rowToItem(row: PoolRow): StoredPlacementItem | null {
  const options = Array.isArray(row.options) ? row.options.filter((option): option is string => typeof option === "string") : [];
  const parsed = storedPlacementItemSchema.safeParse({
    id: row.id,
    band: row.band,
    kind: row.kind,
    prompt: row.prompt,
    hint: row.hint,
    options,
    answer: row.answer,
    passage: row.passage,
    audio_text: row.audio_text,
    difficulty: row.difficulty,
  });
  return parsed.success ? parsed.data : null;
}

function percentOf(
  skills: Array<{ skill: string; correct: number; total: number }>,
  names: string[],
  fallback: number,
): number {
  const held = skills.filter((skill) => names.includes(skill.skill));
  const total = held.reduce((sum, skill) => sum + skill.total, 0);
  if (total === 0) {
    return fallback;
  }
  const correct = held.reduce((sum, skill) => sum + skill.correct, 0);
  return Math.round((correct / total) * 100);
}

interface ScoreSectionsSafe {
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}
