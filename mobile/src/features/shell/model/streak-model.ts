/**
 * Ofensiva mostrada no cabeçalho e em Hoje.
 * Vale o número do servidor (conta); sem ele, o do aparelho, marcado como tal. Nunca inventa valor.
 */
export interface StreakUser {
  streak_count?: number | null;
  last_session_date?: string | null;
}

export interface StreakDisplay {
  count: number;
  source: "server" | "device";
}

function dayBefore(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) - 1)).toISOString().slice(0, 10);
}

export function displayStreak(user: StreakUser | null | undefined, deviceStreak: number, today: string): StreakDisplay {
  const server = user?.streak_count;
  if (typeof server !== "number" || !Number.isFinite(server)) {
    return { count: Math.max(0, Math.floor(deviceStreak || 0)), source: "device" };
  }
  const last = user?.last_session_date;
  // Valor guardado velho: a última sessão é anterior a ontem, a sequência já quebrou.
  const stale = typeof last === "string" && last < dayBefore(today);
  return { count: stale ? 0 : Math.max(0, Math.floor(server)), source: "server" };
}
