export type XpReason = "phase" | "card" | "speech" | "reconstruction" | "duel";

export type XpGoal = 20 | 50 | 100;

export interface XpState {
  log: Record<string, number>; // date (YYYY-MM-DD) -> xp
  awarded: Record<string, string[]>; // date -> list of awarded unique keys
  goal: XpGoal;
}

export const DEFAULT_XP_GOAL: XpGoal = 50;

export const XP_VALUES: Record<XpReason, number> = {
  phase: 10,
  card: 1,
  speech: 5,
  reconstruction: 20,
  duel: 1,
};

export const XP_DAILY_LIMITS: Partial<Record<XpReason, number>> = {
  card: 20,
  speech: 1,
  duel: 30,
};

export function createEmptyXpState(goal: XpGoal = DEFAULT_XP_GOAL): XpState {
  return {
    log: {},
    awarded: {},
    goal,
  };
}

export function todayXp(state: XpState, date: string): number {
  return state.log[date] ?? 0;
}

export function totalXp(state: XpState): number {
  return Object.values(state.log).reduce((acc, curr) => acc + curr, 0);
}

export function countAwardedForReason(awardedList: string[], reason: XpReason): number {
  const prefix = `${reason}:`;
  return awardedList.filter((k) => k.startsWith(prefix)).length;
}

export function applyAward(
  state: XpState,
  reason: XpReason,
  key: string,
  date: string,
): { state: XpState; gained: number } {
  const compositeKey = `${reason}:${key}`;
  const dayAwarded = state.awarded[date] ?? [];

  // Se já foi concedido para esta chave exata neste dia
  if (dayAwarded.includes(compositeKey)) {
    return { state, gained: 0 };
  }

  // Verifica limites diários por categoria
  const limit = XP_DAILY_LIMITS[reason];
  if (typeof limit === "number") {
    const currentCount = countAwardedForReason(dayAwarded, reason);
    if (currentCount >= limit) {
      return { state, gained: 0 };
    }
  }

  const gained = XP_VALUES[reason];
  const currentDayXp = state.log[date] ?? 0;

  const nextState: XpState = {
    ...state,
    log: {
      ...state.log,
      [date]: currentDayXp + gained,
    },
    awarded: {
      ...state.awarded,
      [date]: [...dayAwarded, compositeKey],
    },
  };

  return { state: nextState, gained };
}

/**
 * Retorna 7 booleanos de Segunda a Domingo para a semana contendo a data `today`.
 */
export function weekDots(dates: string[], today: string): boolean[] {
  const dateObj = new Date(`${today}T12:00:00Z`);
  if (isNaN(dateObj.getTime())) {
    return [false, false, false, false, false, false, false];
  }

  // No JS: 0 = domingo, 1 = segunda, ..., 6 = sábado
  const dayOfWeek = dateObj.getUTCDay();
  // Distância até a segunda-feira desta semana (segunda = 0, domingo = 6)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(dateObj);
  monday.setUTCDate(dateObj.getUTCDate() + mondayOffset);

  const setOfDates = new Set(dates);
  const result: boolean[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    result.push(setOfDates.has(iso));
  }

  return result;
}

export function sanitizeGoal(val: unknown): XpGoal {
  if (val === 20 || val === 50 || val === 100) {
    return val;
  }
  return DEFAULT_XP_GOAL;
}
