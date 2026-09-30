import type { Pool } from "pg";
import type { AuthUser } from "../auth/session.js";
import { AppError } from "../http/errors.js";
import { pairFits } from "./pair-match.js";

interface PairRow {
  id: string;
  author_id: string;
  reviewer_id: string | null;
  target_lang: string;
  native_lang: string;
  prompt: string;
  body: string;
  understood: string;
  correction: string;
  question: string;
  status: "offered" | "taken" | "done";
  created_at: Date;
  reviewed_at: Date | null;
}

export class PairService {
  constructor(private readonly pool: Pool) {}

  async inbox(user: AuthUser) {
    await this.claim(user);
    const mine = await this.pool.query<PairRow>(
      `SELECT * FROM journal_pairs
       WHERE reviewer_id = $1 AND status IN ('taken', 'done')
       ORDER BY created_at DESC
       LIMIT 8`,
      [user.id],
    );
    const sent = await this.pool.query<PairRow>(
      `SELECT * FROM journal_pairs
       WHERE author_id = $1
       ORDER BY created_at DESC
       LIMIT 8`,
      [user.id],
    );
    return {
      inbox: mine.rows.filter((row) => row.status === "taken").map((row) => this.publicRow(row, "review")),
      sent: sent.rows.map((row) => this.publicRow(row, "author")),
    };
  }

  async offer(user: AuthUser, input: { target_lang: string; prompt: string; body: string }) {
    const reviewer = await this.pickReviewer(user, input.target_lang);
    const inserted = await this.pool.query<PairRow>(
      `INSERT INTO journal_pairs (author_id, reviewer_id, target_lang, native_lang, prompt, body, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user.id,
        reviewer,
        input.target_lang,
        user.native_lang,
        input.prompt,
        input.body,
        reviewer ? "taken" : "offered",
      ],
    );
    const row = inserted.rows[0];
    if (!row) {
      throw new AppError(500, "Pair could not be offered");
    }
    return {
      pair: this.publicRow(row, "author"),
      matched: Boolean(reviewer),
    };
  }

  async review(user: AuthUser, id: string, input: { understood: string; correction: string; question: string }) {
    const found = await this.pool.query<PairRow>(
      `SELECT * FROM journal_pairs WHERE id = $1 AND reviewer_id = $2 AND status = 'taken'`,
      [id, user.id],
    );
    const row = found.rows[0];
    if (!row) {
      throw new AppError(404, "This pair is not waiting for you");
    }
    const updated = await this.pool.query<PairRow>(
      `UPDATE journal_pairs
       SET understood = $2, correction = $3, question = $4, status = 'done', reviewed_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, input.understood, input.correction, input.question],
    );
    const next = updated.rows[0];
    if (!next) {
      throw new AppError(500, "Pair could not be saved");
    }
    return this.publicRow(next, "review");
  }

  private async claim(user: AuthUser): Promise<void> {
    const open = await this.pool.query<PairRow>(
      `SELECT * FROM journal_pairs
       WHERE reviewer_id IS NULL AND status = 'offered' AND author_id <> $1 AND target_lang = $2
       ORDER BY created_at ASC
       LIMIT 6`,
      [user.id, user.native_lang],
    );
    for (const row of open.rows) {
      if (
        pairFits(
          { native_lang: row.native_lang, target_lang: row.target_lang },
          { native_lang: user.native_lang, target_lang: user.target_lang },
        )
      ) {
        await this.pool.query(
          `UPDATE journal_pairs SET reviewer_id = $2, status = 'taken' WHERE id = $1 AND reviewer_id IS NULL`,
          [row.id, user.id],
        );
        return;
      }
    }
  }

  private async pickReviewer(author: AuthUser, targetLang: string): Promise<string | null> {
    const found = await this.pool.query<{ id: string; native_lang: string; target_lang: string }>(
      `SELECT id, native_lang, target_lang FROM users
       WHERE id <> $1
         AND email_verified_at IS NOT NULL
         AND native_lang = $2
       ORDER BY (target_lang = $3) DESC, created_at ASC
       LIMIT 24`,
      [author.id, targetLang, author.native_lang],
    );
    const match = found.rows.find((row) =>
      pairFits(
        { native_lang: author.native_lang, target_lang: targetLang },
        { native_lang: row.native_lang, target_lang: row.target_lang },
      ),
    );
    return match?.id ?? null;
  }

  private publicRow(row: PairRow, side: "author" | "review") {
    return {
      id: row.id,
      target_lang: row.target_lang,
      prompt: row.prompt,
      body: side === "review" || row.status === "done" ? row.body : row.body,
      understood: row.status === "done" || side === "review" ? row.understood : "",
      correction: row.status === "done" || side === "review" ? row.correction : "",
      question: row.status === "done" || side === "review" ? row.question : "",
      status: row.status,
      matched: Boolean(row.reviewer_id),
      created_at: row.created_at.toISOString(),
    };
  }
}
