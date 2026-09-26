import type { FastifyInstance } from "fastify";
import type { Pool, PoolClient } from "pg";
import { requireUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { mnemonicBodySchema, retentionBodySchema, syncReviewsBodySchema, type SyncReviewsBody } from "../schemas/srs.js";
import type { MnemonicService } from "../services/mnemonic-service.js";
import { retentionSnapshot } from "../services/retention.js";

export function registerSrsRoutes(app: FastifyInstance, pool: Pool, mnemonics: MnemonicService): void {
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
        const synced = await applyReviews(client, body);
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

async function applyReviews(client: PoolClient, body: SyncReviewsBody): Promise<string[]> {
  const user = await client.query("SELECT id FROM users WHERE id = $1", [body.user_id]);
  if (user.rowCount === 0) {
    throw new AppError(404, "User not found");
  }

  const synced: string[] = [];
  for (const review of body.reviews) {
    const existing = await client.query("SELECT client_id FROM srs_sync_events WHERE client_id = $1", [
      review.client_id,
    ]);
    if ((existing.rowCount ?? 0) > 0) {
      synced.push(review.client_id);
      continue;
    }

    const found = await client.query<{ id: string }>(
      `SELECT id
       FROM srs_cards
       WHERE user_id = $1 AND front_phrase = $2
       ORDER BY next_review_at ASC
       LIMIT 1`,
      [body.user_id, review.front_phrase],
    );
    let cardId = found.rows[0]?.id;
    if (!cardId) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO srs_cards (user_id, front_phrase, back_translation, context_sentence)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [body.user_id, review.front_phrase, review.back_translation, review.context_sentence],
      );
      cardId = inserted.rows[0]?.id;
    }
    if (!cardId) {
      throw new AppError(500, "Card was not created");
    }

    await client.query("SELECT fn_execute_sm2_review($1::uuid, $2::smallint)", [cardId, review.quality]);
    await client.query(
      `INSERT INTO srs_sync_events (client_id, user_id, card_id, quality)
       VALUES ($1, $2, $3, $4)`,
      [review.client_id, body.user_id, cardId, review.quality],
    );
    synced.push(review.client_id);
  }

  return synced;
}
