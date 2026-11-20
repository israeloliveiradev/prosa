import type { Pool } from "pg";
import { streakBroken, streakFrom } from "./path-service.js";

export interface StreakView {
  streak_count: number;
  /** Dia (YYYY-MM-DD) da última sessão diária concluída, em qualquer curso; null sem sessão. */
  last_session_date: string | null;
}

/**
 * Ofensiva calculada na leitura (M3) a partir de `session_completions`: dias seguidos
 * terminando na sessão mais recente, e 0 quando ela é mais velha que anteontem em UTC
 * (`streakBroken`: um dia de folga para fusos a oeste de UTC; o app decide pela data local).
 * Assim o número nunca fica "vivo" só porque ninguém recalculou a coluna `users.streak_count`.
 */
export function streakOnRead(dates: readonly string[], now = new Date()): StreakView {
  const unique = [...new Set(dates)].sort().reverse();
  const last = unique[0] ?? null;
  if (!last || streakBroken(last, now)) {
    return { streak_count: 0, last_session_date: last };
  }
  return { streak_count: streakFrom(unique), last_session_date: last };
}

export async function readStreak(pool: Pool, userId: string, now = new Date()): Promise<StreakView> {
  const found = await pool.query<{ day: string }>(
    `SELECT DISTINCT to_char(date, 'YYYY-MM-DD') AS day
     FROM session_completions
     WHERE user_id = $1
     ORDER BY day DESC
     LIMIT 1000`,
    [userId],
  );
  return streakOnRead(
    found.rows.map((row) => row.day),
    now,
  );
}
