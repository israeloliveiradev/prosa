import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Pool, PoolClient } from "pg";
import { requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { mnemonicBodySchema, retentionBodySchema, syncReviewsBodySchema, type SyncReviewsBody } from "../schemas/srs.js";
import type { MnemonicService } from "../services/mnemonic-service.js";
import { scheduleFsrs } from "../services/fsrs.js";
import { retentionSnapshot } from "../services/retention.js";

export function registerSrsRoutes(app: FastifyInstance, pool: Pool, mnemonics: MnemonicService): void {
  app.get(
    "/api/v1/srs/cards",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const result = await pool.query<{
        id: string;
        front_phrase: string;
        back_translation: string;
        context_sentence: string;
        repetition_count: number;
        interval_days: number;
        ease_factor: string | number;
        status: "learning" | "reviewing" | "mastered";
        stability: number;
        difficulty: number;
        next_review_at: Date;
      }>(
        `SELECT id, front_phrase, back_translation, context_sentence, repetition_count, interval_days,
                ease_factor, status, stability, difficulty, next_review_at
         FROM srs_cards
         WHERE user_id = $1 AND target_lang = $2
         ORDER BY next_review_at ASC
         LIMIT 300`,
        [user.id, user.target_lang],
      );
      return {
        cards: result.rows.map((row) => ({
          id: row.id,
          front_phrase: row.front_phrase,
          back_translation: row.back_translation,
          context_sentence: row.context_sentence,
          repetition_count: row.repetition_count,
          interval_days: row.interval_days,
          ease_factor: Number(row.ease_factor),
          status: row.status,
          stability: row.stability,
          difficulty: row.difficulty,
          due: row.next_review_at.toISOString(),
        })),
      };
    },
  );

  app.post(
    "/api/v1/srs/sync",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request) => {
      const body = syncReviewsBodySchema.parse(request.body);
      const account = await requireUser(pool, request);
      if (body.user_id !== account.id) {
        throw new AppError(403, "Review batch belongs to another account");
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const synced = await applyReviews(client, body, account.target_lang);
        await client.query("COMMIT");
        return { synced_ids: synced };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.post(
    "/api/v1/srs/mnemonic",
    {
      config: {
        rateLimit: { max: 8, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = mnemonicBodySchema.parse(request.body);
      return mnemonics.forCard(user, body);
    },
  );

  app.post(
    "/api/v1/srs/retention",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const user = await requireUser(pool, request);
      const body = retentionBodySchema.parse(request.body);
      const snapshot = retentionSnapshot(
        body.cards.map((card) => ({
          phrase: card.phrase,
          intervalDays: card.interval_days,
          status: card.status,
        })),
      );
      await pool.query(
        `INSERT INTO user_retention_logs (user_id, log_date, words_mastered, words_decaying, retention_score)
         VALUES ($1, CURRENT_DATE, $2, $3, $4)
         ON CONFLICT (user_id, log_date)
         DO UPDATE SET
           words_mastered = EXCLUDED.words_mastered,
           words_decaying = EXCLUDED.words_decaying,
           retention_score = EXCLUDED.retention_score`,
        [user.id, snapshot.mastered, snapshot.decaying, snapshot.score],
      );
      return {
        words_mastered: snapshot.mastered,
        words_decaying: snapshot.decaying,
        words_critical: snapshot.critical,
        retention_score: snapshot.score,
      };
    },
  );
}

async function applyReviews(client: PoolClient, body: SyncReviewsBody, targetLang: string): Promise<string[]> {
  const user = await client.query("SELECT id FROM users WHERE id = $1", [body.user_id]);
  if (user.rowCount === 0) {
    throw new AppError(404, "User not found");
  }

  const synced: string[] = [];
  for (const review of body.reviews) {
    let eventId = review.client_id;
    const existing = await client.query<{ user_id: string }>(
      "SELECT user_id FROM srs_sync_events WHERE client_id = $1",
      [review.client_id],
    );
    if ((existing.rowCount ?? 0) > 0) {
      if (existing.rows[0]?.user_id === body.user_id) {
        synced.push(review.client_id);
        continue;
      }
      eventId = createHash("sha256").update(`${body.user_id}:${review.client_id}`).digest("hex").slice(0, 32);
      const remapped = await client.query("SELECT 1 FROM srs_sync_events WHERE client_id = $1", [eventId]);
      if ((remapped.rowCount ?? 0) > 0) {
        synced.push(review.client_id);
        continue;
      }
    }

    const found = await client.query<{
      id: string;
      stability: number;
      difficulty: number;
      repetition_count: number;
      last_review_at: Date | null;
    }>(
      `SELECT id, stability, difficulty, repetition_count, last_review_at
       FROM srs_cards
       WHERE user_id = $1 AND target_lang = $2 AND lower(front_phrase) = lower($3)
       ORDER BY next_review_at ASC
       LIMIT 1`,
      [body.user_id, targetLang, review.front_phrase],
    );
    let card = found.rows[0];
    if (!card) {
      const inserted = await client.query<{
        id: string;
        stability: number;
        difficulty: number;
        repetition_count: number;
        last_review_at: Date | null;
      }>(
        `INSERT INTO srs_cards (user_id, target_lang, front_phrase, back_translation, context_sentence)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, stability, difficulty, repetition_count, last_review_at`,
        [body.user_id, targetLang, review.front_phrase, review.back_translation, review.context_sentence],
      );
      card = inserted.rows[0];
    }
    if (!card) {
      throw new AppError(500, "Card was not created");
    }
    const scheduled = scheduleFsrs(
      {
        stability: Number(card.stability) || 0,
        difficulty: Number(card.difficulty) || 0,
        reps: card.repetition_count,
        lastReviewAt: card.last_review_at ? card.last_review_at.getTime() : null,
      },
      review.quality,
    );
    await client.query(
      `UPDATE srs_cards
       SET repetition_count = $2,
           interval_days = $3,
           ease_factor = $4,
           status = $5,
           next_review_at = $6,
           stability = $7,
           difficulty = $8,
           last_review_at = now()
       WHERE id = $1`,
      [
        card.id,
        scheduled.reps,
        scheduled.intervalDays,
        scheduled.easeFactor,
        scheduled.status,
        new Date(scheduled.dueAt).toISOString(),
        scheduled.stability,
        scheduled.difficulty,
      ],
    );
    await client.query(
      `INSERT INTO srs_sync_events (client_id, user_id, card_id, quality)
       VALUES ($1, $2, $3, $4)`,
      [eventId, body.user_id, card.id, review.quality],
    );
    synced.push(review.client_id);
  }

  return synced;
}
