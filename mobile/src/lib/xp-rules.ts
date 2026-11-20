/**
 * Regras puras do XP. XP só vem de ação real (fase concluída, cartão revisado, fala,
 * reconstrução, duelo), uma única vez por chave e com teto diário por tipo de ação.
 */
export type XpReason = "phase" | "card" | "speech" | "reconstruction" | "duel";

export type XpGoal = 20 | 50 | 100;

export const XP_GOALS: readonly XpGoal[] = [20, 50, 100];

export interface XpState {
  log: Record<string, number>; // date (YYYY-MM-DD, calendário local) -> xp
  awarded: Record<string, string[]>; // date -> chaves concedidas naquele dia ("reason:key")
  goal: XpGoal;
}

export interface XpDay {
  date: string;
  xp: number;
}

export const DEFAULT_XP_GOAL: XpGoal = 50;

export const XP_VALUES: Record<XpReason, number> = {
  phase: 10,
  card: 1,
  speech: 5,
  reconstruction: 20,
  duel: 1,
};

/** Quantas vezes por dia cada tipo de ação paga XP. */
export const XP_DAILY_LIMITS: Partial<Record<XpReason, number>> = {
  phase: 8,
  card: 20,
  speech: 4,
  reconstruction: 1,
  duel: 30,
};

/** Por quantos dias as chaves concedidas ficam guardadas para garantir a idempotência. */
export const XP_KEY_RETENTION_DAYS = 35;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Data do calendário LOCAL (YYYY-MM-DD); a mesma convenção de `isoDate` em `@/lib/progress`. */
export function localIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Soma `delta` dias a uma data ISO (aritmética de calendário, sem fuso). */
export function shiftIsoDate(date: string, delta: number): string {
  const at = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) {
    return date;
  }
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}

/** As `count` datas que terminam em `today`, da mais antiga para hoje. */
export function lastIsoDates(today: string, count: number): string[] {
  const result: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    result.push(shiftIsoDate(today, -offset));
  }
  return result;
}

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

/** XP dos últimos `count` dias terminando em `today` (dias sem estudo valem 0). */
export function xpLog(state: XpState, today: string, count = 7): XpDay[] {
  return lastIsoDates(today, count).map((date) => ({ date, xp: state.log[date] ?? 0 }));
}

export function countAwardedForReason(awardedList: string[], reason: XpReason): number {
  const prefix = `${reason}:`;
  return awardedList.filter((k) => k.startsWith(prefix)).length;
}

export function wasAwarded(state: XpState, reason: XpReason, key: string): boolean {
  const compositeKey = `${reason}:${key}`;
  return Object.values(state.awarded).some((keys) => keys.includes(compositeKey));
}

/** Remove as chaves de dias mais antigos que a janela de idempotência (o log de XP fica). */
export function pruneAwarded(state: XpState, today: string, keepDays = XP_KEY_RETENTION_DAYS): XpState {
  const oldest = shiftIsoDate(today, -keepDays);
  const entries = Object.entries(state.awarded);
  const kept = entries.filter(([date]) => date >= oldest);
  if (kept.length === entries.length) {
    return state;
  }
  return { ...state, awarded: Object.fromEntries(kept) };
}

export function applyAward(
  state: XpState,
  reason: XpReason,
  key: string,
  date: string,
): { state: XpState; gained: number } {
  const cleanKey = key.trim();
  if (!cleanKey || !isIsoDate(date) || !(reason in XP_VALUES)) {
    return { state, gained: 0 };
  }
  const compositeKey = `${reason}:${cleanKey}`;
  const dayAwarded = state.awarded[date] ?? [];

  // Idempotente por chave: a mesma ação nunca paga duas vezes, nem em outro dia.
  if (wasAwarded(state, reason, cleanKey)) {
    return { state, gained: 0 };
  }

  // Teto diário por tipo de ação.
  const limit = XP_DAILY_LIMITS[reason];
  if (typeof limit === "number" && countAwardedForReason(dayAwarded, reason) >= limit) {
    return { state, gained: 0 };
  }

  const gained = XP_VALUES[reason];
  const nextState: XpState = {
    ...state,
    log: {
      ...state.log,
      [date]: (state.log[date] ?? 0) + gained,
    },
    awarded: {
      ...state.awarded,
      [date]: [...dayAwarded, compositeKey],
    },
  };

  return { state: pruneAwarded(nextState, date), gained };
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

/** Lê um XpState vindo do armazenamento, descartando o que não for válido. */
export function sanitizeXpState(value: unknown, goal?: XpGoal): XpState {
  const raw = value && typeof value === "object" ? (value as Partial<XpState>) : {};
  const log: Record<string, number> = {};
  if (raw.log && typeof raw.log === "object") {
    for (const [date, xp] of Object.entries(raw.log)) {
      if (isIsoDate(date) && typeof xp === "number" && Number.isFinite(xp) && xp > 0) {
        log[date] = Math.round(xp);
      }
    }
  }
  const awarded: Record<string, string[]> = {};
  if (raw.awarded && typeof raw.awarded === "object") {
    for (const [date, keys] of Object.entries(raw.awarded)) {
      if (isIsoDate(date) && Array.isArray(keys)) {
        awarded[date] = keys.filter((item): item is string => typeof item === "string");
      }
    }
  }
  return { log, awarded, goal: goal ?? sanitizeGoal(raw.goal) };
}
