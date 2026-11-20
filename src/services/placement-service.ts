import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { storedPlacementItemSchema, type PlacementPublicItem, type StoredPlacementItem } from "../schemas/placement.js";
import type { CefrLevel } from "../types/database.js";
import { catalogPlacementItems, shufflePlacementItem } from "./placement-bank.js";
import type { GeminiGateway } from "./gemini-gateway.js";
import { syncPathToLevel } from "./path-service.js";
import { ProfileStore } from "./profile-store.js";
import {
  PLACEMENT_CAP,
  bandDifficulty,
  levelFromTheta,
  observePlacement,
  placeLevel,
  placementShouldStop,
  retestOpen,
  skillScores,
  type SkillScore,
} from "./placement-score.js";

const OPEN_WINDOW_MS = 2 * 60 * 60 * 1000;

interface AttemptRow {
  id: string;
  target_lang: string;
  through_lang: string;
  kind: "placement" | "progress";
  status: "started" | "completed" | "abandoned";
  items: unknown;
  answers: unknown;
  correct_count: number | null;
  item_count: number | null;
  score: number | null;
  result_level: CefrLevel | null;
  previous_level: CefrLevel | null;
  bands: unknown;
  state: unknown;
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

export interface PlacementHistoryEntry {
  id: string;
  kind: "placement" | "progress";
  finished_at: string;
  score: number;
  result_level: CefrLevel;
  previous_level: CefrLevel | null;
  correct_count: number;
  item_count: number;
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

function publicAttempt(row: AttemptRow) {
  const items = asItems(row.items);
  const answers = asAnswers(row.answers);
  const state = readState(row.state);
  const pending = items.findIndex((item) => answers[item.id] === undefined);
  return {
    attempt_id: row.id,
    target_lang: row.target_lang,
    through_lang: row.through_lang,
    kind: row.kind,
    items: publicItems(items),
    answered: answers,
    index: pending < 0 ? Math.max(0, items.length - 1) : pending,
    adaptive: Boolean(state),
    cap: state ? PLACEMENT_CAP : items.length,
  };
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

function shuffleRows<T>(rows: readonly T[]): T[] {
  const next = [...rows];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    const other = next[swap];
    if (current === undefined || other === undefined) {
      continue;
    }
    next[index] = other;
    next[swap] = current;
  }
  return next;
}

export class PlacementService {
  constructor(
    private readonly pool: Pool,
    private readonly gemini: GeminiGateway,
  ) {}

  async status(user: AuthUser, targetLang = user.target_lang) {
    const last = await this.pool.query<AttemptRow>(
      `SELECT *
       FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed'
       ORDER BY finished_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const open = await this.pool.query<{ id: string }>(
      `SELECT id
       FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'started' AND started_at > now() - interval '2 hours'
       ORDER BY started_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const lastRow = last.rows[0];
    const lessonsSince = lastRow?.finished_at
      ? await this.lessonsSince(user.id, targetLang, lastRow.finished_at)
      : 0;
    const window = retestOpen({
      lastFinishedAt: lastRow?.finished_at ?? null,
      lessonsSince,
    });
    return {
      target_lang: targetLang,
      through_lang: user.target_lang === targetLang ? user.native_lang : user.native_lang,
      current_level: user.target_lang === targetLang ? user.level : await this.trackLevel(user.id, targetLang, user.level),
      last: lastRow
        ? {
            finished_at: lastRow.finished_at?.toISOString() ?? lastRow.started_at.toISOString(),
            result_level: lastRow.result_level,
            previous_level: lastRow.previous_level,
            score: lastRow.score,
            kind: lastRow.kind,
          }
        : null,
      due: window.due,
      due_reason: window.reason,
      days_until: window.days_until,
      open_attempt_id: open.rows[0]?.id ?? null,
      history: await this.history(user, targetLang),
    };
  }

  async history(user: AuthUser, targetLang = user.target_lang): Promise<PlacementHistoryEntry[]> {
    const result = await this.pool.query<AttemptRow>(
      `SELECT *
       FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed'
       ORDER BY finished_at ASC
       LIMIT 24`,
      [user.id, targetLang],
    );
    return result.rows.flatMap((row) => {
      if (!row.result_level || row.score === null || !row.finished_at) {
        return [];
      }
      return [
        {
          id: row.id,
          kind: row.kind,
          finished_at: row.finished_at.toISOString(),
          score: row.score,
          result_level: row.result_level,
          previous_level: row.previous_level,
          correct_count: row.correct_count ?? 0,
          item_count: row.item_count ?? 0,
        },
      ];
    });
  }

  async start(
    user: AuthUser,
    targetLang = user.target_lang,
    throughLang = user.native_lang,
  ) {
    if (targetLang === throughLang) {
      throw new AppError(400, "Study a language through a different language");
    }
    const existing = await this.pool.query<AttemptRow>(
      `SELECT *
       FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'started' AND started_at > now() - interval '2 hours'
       ORDER BY started_at DESC
       LIMIT 1`,
      [user.id, targetLang],
    );
    const open = existing.rows[0];
    if (open && Date.now() - open.started_at.getTime() < OPEN_WINDOW_MS) {
      return publicAttempt(open);
    }
    if (open) {
      await this.pool.query(`UPDATE placement_attempts SET status = 'abandoned' WHERE id = $1`, [open.id]);
    }
    const completed = await this.pool.query<{ id: string }>(
      `SELECT id FROM placement_attempts
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed'
       LIMIT 1`,
      [user.id, targetLang],
    );
    const kind = completed.rows.length > 0 ? "progress" : "placement";
    await this.seedPool(targetLang, throughLang);
    await this.backfillSeen(user.id, targetLang);
    const unseen = await this.unseenCount(user.id, targetLang, throughLang);
    if (unseen < 12) {
      await this.refill(user, targetLang, throughLang);
    }
    const level = await this.trackLevel(user.id, targetLang, user.level);
    const first = await this.pickItem(user.id, targetLang, throughLang, bandDifficulty(level), []);
    if (!first) {
      throw new AppError(503, "New placement questions are not ready yet");
    }
    await this.markSeen(user.id, first.id);
    const state: AdaptiveState = { mode: "adaptive", theta: bandDifficulty(level), information: 0.5 };
    const inserted = await this.pool.query<AttemptRow>(
      `INSERT INTO placement_attempts (user_id, target_lang, through_lang, kind, status, items, answers, state)
       VALUES ($1, $2, $3, $4, 'started', $5::jsonb, '{}'::jsonb, $6::jsonb)
       RETURNING *`,
      [user.id, targetLang, throughLang, kind, JSON.stringify([first]), JSON.stringify(state)],
    );
    const row = inserted.rows[0];
    if (!row) {
      throw new AppError(500, "Placement could not start");
    }
    return publicAttempt(row);
  }

  async answer(user: AuthUser, attemptId: string, itemId: string, choice: number) {
    const row = await this.requireOpen(user.id, attemptId);
    const items = asItems(row.items);
    const answers = asAnswers(row.answers);
    const pending = items.find((entry) => answers[entry.id] === undefined);
    if (!pending || pending.id !== itemId) {
      throw new AppError(400, "Answer the current question");
    }
    const state = readState(row.state);
    const nextAnswers = { ...answers, [itemId]: choice };
    if (!state) {
      await this.pool.query(`UPDATE placement_attempts SET answers = $2::jsonb WHERE id = $1`, [
        attemptId,
        JSON.stringify(nextAnswers),
      ]);
      return { saved: true as const, done: false, asked: Object.keys(nextAnswers).length, cap: items.length, next: null };
    }
    const observed = observePlacement(
      state.theta,
      state.information,
      pending.difficulty ?? bandDifficulty(pending.band),
      choice === pending.answer,
    );
    const asked = Object.keys(nextAnswers).length;
    await this.noteOutcome(pending.id, row.through_lang, choice === pending.answer);
    const nextState: AdaptiveState = { mode: "adaptive", theta: observed.theta, information: observed.information };
    if (placementShouldStop({ asked, theta: observed.theta, information: observed.information })) {
      await this.pool.query(`UPDATE placement_attempts SET answers = $2::jsonb, state = $3::jsonb WHERE id = $1`, [
        attemptId,
        JSON.stringify(nextAnswers),
        JSON.stringify(nextState),
      ]);
      return { saved: true as const, done: true, asked, cap: PLACEMENT_CAP, next: null };
    }
    const served = items.map((entry) => entry.kind);
    let next = await this.pickItem(user.id, row.target_lang, row.through_lang, observed.theta, served);
    if (!next) {
      await this.refill(user, row.target_lang, row.through_lang, levelFromTheta(observed.theta));
      next = await this.pickItem(user.id, row.target_lang, row.through_lang, observed.theta, served);
    }
    if (!next) {
      if (asked >= 8) {
        await this.pool.query(`UPDATE placement_attempts SET answers = $2::jsonb, state = $3::jsonb WHERE id = $1`, [
          attemptId,
          JSON.stringify(nextAnswers),
          JSON.stringify(nextState),
        ]);
        return { saved: true as const, done: true, asked, cap: PLACEMENT_CAP, next: null };
      }
      throw new AppError(503, "New placement questions are not ready yet");
    }
    await this.markSeen(user.id, next.id);
    const stored = [...items, next];
    await this.pool.query(
      `UPDATE placement_attempts SET answers = $2::jsonb, items = $3::jsonb, state = $4::jsonb WHERE id = $1`,
      [attemptId, JSON.stringify(nextAnswers), JSON.stringify(stored), JSON.stringify(nextState)],
    );
    const [pub] = publicItems([next]);
    return { saved: true as const, done: false, asked, cap: PLACEMENT_CAP, next: pub ?? null };
  }

  async finish(user: AuthUser, attemptId: string) {
    const row = await this.requireOpen(user.id, attemptId);
    const items = asItems(row.items);
    const answers = asAnswers(row.answers);
    const state = readState(row.state);
    const answered = items.filter((item) => answers[item.id] !== undefined);
    if (state ? answered.length < 8 : items.length < 12) {
      throw new AppError(400, "Placement is incomplete");
    }
    const result = placeLevel(answered, answers);
    const level = state ? levelFromTheta(state.theta) : result.level;
    const skills: SkillScore[] = skillScores(answered, answers);
    const previousLevel = await this.trackLevel(user.id, row.target_lang, user.level);
    await this.pool.query(
      `UPDATE placement_attempts
       SET status = 'completed',
           finished_at = now(),
           correct_count = $2,
           item_count = $3,
           score = $4,
           result_level = $5,
           previous_level = $6,
           bands = $7::jsonb,
           answers = $8::jsonb
       WHERE id = $1`,
      [
        attemptId,
        result.correct,
        result.total,
        result.score,
        level,
        previousLevel,
        JSON.stringify(result.bands),
        JSON.stringify(answers),
      ],
    );
    await this.applyLevel(user.id, row.target_lang, row.through_lang, level);
    await this.writeSkills(user.id, row.target_lang, skills);
    try {
      // Bandas abaixo do novo nível viram validated e a unidade ativa avança; nada volta a locked.
      await syncPathToLevel(this.pool, user.id, row.target_lang, level);
    } catch {
      // O nível já foi gravado; o próximo GET /path sobe a trilha a partir dele.
    }
    return {
      attempt_id: attemptId,
      target_lang: row.target_lang,
      through_lang: row.through_lang,
      kind: row.kind,
      level,
      previous_level: previousLevel,
      score: result.score,
      correct: result.correct,
      total: result.total,
      bands: result.bands.filter((band) => band.total > 0),
      skills,
      history: await this.history(user, row.target_lang),
    };
  }

  /**
   * Itens do banco de nivelamento de uma faixa, para o checkpoint da trilha (com gabarito,
   * que fica só no servidor). Prefere itens que o aluno ainda não viu e pede mais à IA
   * quando a faixa tem poucos itens novos.
   */
  async checkpointItems(
    user: AuthUser,
    targetLang: string,
    throughLang: string,
    band: CefrLevel,
    count: number,
  ): Promise<StoredPlacementItem[]> {
    await this.seedPool(targetLang, throughLang);
    await this.backfillSeen(user.id, targetLang);
    let rows = await this.bandRows(user.id, targetLang, throughLang, band);
    if (rows.filter((row) => !row.seen).length < count) {
      await this.refill(user, targetLang, throughLang, band);
      rows = await this.bandRows(user.id, targetLang, throughLang, band);
    }
    const ordered = [...shuffleRows(rows.filter((row) => !row.seen)), ...shuffleRows(rows.filter((row) => row.seen))];
    const chosen = ordered
      .flatMap((row) => {
        const item = rowToItem(row);
        return item ? [shufflePlacementItem(item)] : [];
      })
      .slice(0, count);
    for (const item of chosen) {
      await this.markSeen(user.id, item.id);
    }
    return chosen;
  }

  private async bandRows(
    userId: string,
    targetLang: string,
    throughLang: string,
    band: CefrLevel,
  ): Promise<Array<PoolRow & { seen: boolean }>> {
    const found = await this.pool.query<PoolRow & { seen: boolean }>(
      `SELECT id, band, kind, prompt, hint, options, answer, passage, audio_text, difficulty,
              EXISTS (SELECT 1 FROM placement_seen WHERE user_id = $1 AND item_id = placement_items.id) AS seen
       FROM placement_items
       WHERE target_lang = $2 AND through_lang = $3 AND band = $4
       ORDER BY created_at DESC
       LIMIT 80`,
      [userId, targetLang, throughLang, band],
    );
    return found.rows;
  }

  /** Notas por habilidade do nivelamento entram no perfil do aluno (learner_profile). */
  private async writeSkills(userId: string, targetLang: string, skills: SkillScore[]): Promise<void> {
    const signals: { vocabulary?: number; grammar?: number; reading?: number; listening?: number } = {};
    for (const skill of skills) {
      if (skill.total <= 0) {
        continue;
      }
      const value = Math.round((100 * skill.correct) / skill.total);
      if (skill.skill === "vocab") {
        signals.vocabulary = value;
      } else {
        signals[skill.skill] = value;
      }
    }
    if (Object.keys(signals).length === 0) {
      return;
    }
    try {
      await new ProfileStore(this.pool).merge(userId, targetLang, signals);
    } catch {
      // O perfil é auxiliar: o resultado do nivelamento já está salvo.
    }
  }

  private async requireOpen(userId: string, attemptId: string): Promise<AttemptRow> {
    const found = await this.pool.query<AttemptRow>(
      `SELECT * FROM placement_attempts WHERE id = $1 AND user_id = $2`,
      [attemptId, userId],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "Placement was not found");
    }
    if (row.status !== "started") {
      throw new AppError(409, "This placement is already closed");
    }
    return row;
  }

  private async seedPool(targetLang: string, throughLang: string): Promise<void> {
    const seeds = catalogPlacementItems(targetLang, throughLang);
    for (const item of seeds) {
      await this.insertItem(targetLang, throughLang, { ...item, difficulty: item.difficulty ?? bandDifficulty(item.band) });
    }
  }

  private async insertItem(targetLang: string, throughLang: string, item: StoredPlacementItem): Promise<void> {
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

  private async backfillSeen(userId: string, targetLang: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO placement_seen (user_id, item_id)
       SELECT $1, item->>'id'
       FROM placement_attempts, jsonb_array_elements(items) AS item
       WHERE user_id = $1 AND target_lang = $2 AND status = 'completed'
       ON CONFLICT DO NOTHING`,
      [userId, targetLang],
    );
  }

  private async markSeen(userId: string, itemId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO placement_seen (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, itemId],
    );
  }

  private async unseenCount(userId: string, targetLang: string, throughLang: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM placement_items
       WHERE target_lang = $2 AND through_lang = $3
         AND NOT EXISTS (
           SELECT 1 FROM placement_seen WHERE user_id = $1 AND item_id = placement_items.id
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
           SELECT 1 FROM placement_seen WHERE user_id = $1 AND item_id = placement_items.id
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
      .sort((left, right) => this.itemScore(left, theta, counts) - this.itemScore(right, theta, counts));
    const chosen = ranked[0];
    return chosen ? shufflePlacementItem(chosen) : null;
  }

  private itemScore(item: StoredPlacementItem, theta: number, counts: Map<string, number>): number {
    const distance = Math.abs((item.difficulty ?? bandDifficulty(item.band)) - theta);
    const repeats = (counts.get(item.kind) ?? 0) * 0.45;
    const firstListen = item.kind === "listening" && (counts.get("listening") ?? 0) === 0 ? -0.7 : 0;
    return distance + repeats + firstListen;
  }

  private async refill(user: AuthUser, targetLang: string, throughLang: string, band?: CefrLevel): Promise<void> {
    try {
      const focus = band ?? (await this.scarcestBand(user.id, targetLang, throughLang));
      const existing = await this.pool.query<{ prompt: string }>(
        `SELECT prompt FROM placement_items WHERE target_lang = $1 AND through_lang = $2 ORDER BY created_at DESC LIMIT 24`,
        [targetLang, throughLang],
      );
      const interests = await this.interests(user.id);
      const generated = await this.gemini.placementBatch({
        targetLang,
        throughLang,
        band: focus,
        interests,
        avoid: existing.rows.map((row) => row.prompt),
      });
      for (const raw of generated) {
        if (raw.kind === "listening" && raw.audio_text.trim().length === 0) {
          continue;
        }
        const parsed = storedPlacementItemSchema.safeParse({
          ...raw,
          id: `gen-${randomUUID()}`,
          passage: raw.kind === "reading" ? raw.passage : "",
          audio_text: raw.kind === "listening" ? raw.audio_text : "",
          difficulty: bandDifficulty(raw.band),
        });
        if (!parsed.success) {
          continue;
        }
        await this.insertItem(targetLang, throughLang, shufflePlacementItem(parsed.data));
      }
    } catch {
      // The seeded bank still serves the test when the model is busy.
    }
  }

  private async scarcestBand(userId: string, targetLang: string, throughLang: string): Promise<CefrLevel> {
    const result = await this.pool.query<{ band: CefrLevel; count: string }>(
      `SELECT band, count(*)::text AS count
       FROM placement_items
       WHERE target_lang = $2 AND through_lang = $3
         AND NOT EXISTS (
           SELECT 1 FROM placement_seen WHERE user_id = $1 AND item_id = placement_items.id
         )
       GROUP BY band`,
      [userId, targetLang, throughLang],
    );
    const counts = new Map(result.rows.map((row) => [row.band, Number(row.count)]));
    const order: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    return order.reduce((lowest, band) => ((counts.get(band) ?? 0) < (counts.get(lowest) ?? 0) ? band : lowest), "B1");
  }

  private async noteOutcome(itemId: string, throughLang: string, correct: boolean): Promise<void> {
    await this.pool.query(
      `UPDATE placement_items
       SET shown_count = shown_count + 1,
           hit_count = hit_count + $3,
           difficulty = CASE
             WHEN shown_count + 1 >= 8 THEN LEAST(3.2, GREATEST(-3.2, difficulty + (0.65 - (hit_count + $3)::float / (shown_count + 1)) * 0.4))
             ELSE difficulty
           END
       WHERE id = $1 AND through_lang = $2`,
      [itemId, throughLang, correct ? 1 : 0],
    );
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

  private async interests(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ interests: string[] | null }>("SELECT interests FROM users WHERE id = $1", [userId]);
    return result.rows[0]?.interests?.filter((item) => item.trim().length > 0) ?? [];
  }
}

