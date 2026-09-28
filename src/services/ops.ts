import type { Pool } from "pg";

export type OpsKind = "gemini" | "lesson" | "audio" | "news" | "billing";
export type OpsStatus = "ok" | "error" | "paused";

export interface OpsEvent {
  id: string;
  kind: OpsKind;
  status: OpsStatus;
  message: string;
  detail: string | null;
  created_at: string;
}

export class OpsService {
  constructor(private readonly pool: Pool) {}

  async isGenerationPaused(): Promise<boolean> {
    const found = await this.pool.query<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'generation_paused'",
    );
    return found.rows[0]?.value === "true";
  }

  async setGenerationPaused(paused: boolean): Promise<boolean> {
    await this.pool.query(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('generation_paused', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [paused ? "true" : "false"],
    );
    if (paused) {
      await this.record("lesson", "paused", "A geração foi pausada no painel.");
    }
    return paused;
  }

  async record(kind: OpsKind, status: OpsStatus, message: string, detail?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO ops_events (kind, status, message, detail)
       VALUES ($1, $2, $3, $4)`,
      [kind, status, message.slice(0, 400), detail?.slice(0, 800) ?? null],
    );
  }

  async events(kind?: OpsKind, limit = 30): Promise<OpsEvent[]> {
    const found = await this.pool.query<{
      id: string;
      kind: OpsKind;
      status: OpsStatus;
      message: string;
      detail: string | null;
      created_at: Date;
    }>(
      `SELECT id, kind, status, message, detail, created_at
       FROM ops_events
       WHERE ($1::text IS NULL OR kind = $1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [kind ?? null, Math.min(80, Math.max(1, limit))],
    );
    return found.rows.map((row) => ({
      ...row,
      created_at: row.created_at.toISOString(),
    }));
  }

  async series(days = 14): Promise<Array<{ date: string; users: number; lessons: number; duels: number }>> {
    const found = await this.pool.query<{ day: Date; users: string; lessons: string; duels: string }>(
      `WITH days AS (
         SELECT generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, interval '1 day')::date AS day
       )
       SELECT days.day,
              coalesce(u.total, 0)::text AS users,
              coalesce(l.total, 0)::text AS lessons,
              coalesce(d.total, 0)::text AS duels
       FROM days
       LEFT JOIN (
         SELECT created_at::date AS day, count(*) AS total FROM users GROUP BY 1
       ) u ON u.day = days.day
       LEFT JOIN (
         SELECT lesson_date AS day, count(*) AS total FROM daily_lessons GROUP BY 1
       ) l ON l.day = days.day
       LEFT JOIN (
         SELECT played_at::date AS day, count(*) AS total FROM duel_runs GROUP BY 1
       ) d ON d.day = days.day
       ORDER BY days.day`,
      [days],
    );
    return found.rows.map((row) => ({
      date: row.day.toISOString().slice(0, 10),
      users: Number(row.users),
      lessons: Number(row.lessons),
      duels: Number(row.duels),
    }));
  }
}

export function modelBusy(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}` : String(error);
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(text);
}
