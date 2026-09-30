import type { Pool } from "pg";
import { costMicros, perSessionMicros, type UsageNote } from "./session-cost.js";

export class UsageMeter {
  constructor(private readonly pool: Pool) {}

  async record(note: UsageNote): Promise<void> {
    await this.pool.query(
      `INSERT INTO usage_events (task, provider, lane, cached, cost_micros)
       VALUES ($1, $2, $3, $4, $5)`,
      [note.task, note.provider, note.lane, note.cached, costMicros(note)],
    );
  }

  async today(lessons: number) {
    const found = await this.pool.query<{
      calls: string;
      hits: string;
      misses: string;
      micros: string;
    }>(
      `SELECT
         count(*)::text AS calls,
         count(*) FILTER (WHERE cached)::text AS hits,
         count(*) FILTER (WHERE NOT cached)::text AS misses,
         coalesce(sum(cost_micros), 0)::text AS micros
       FROM usage_events
       WHERE created_at >= date_trunc('day', now())`,
    );
    const row = found.rows[0];
    const calls = Number(row?.calls ?? 0);
    const cache_hits = Number(row?.hits ?? 0);
    const cache_misses = Number(row?.misses ?? 0);
    const cost_micros = Number(row?.micros ?? 0);
    return {
      calls,
      cache_hits,
      cache_misses,
      cost_micros,
      per_session_micros: perSessionMicros(cost_micros, lessons),
    };
  }
}
