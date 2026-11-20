import { SESSION_SECONDS, type SessionPhase } from "@/lib/session-clock";

/**
 * Regras puras de Hoje (e do botão da barra lateral), testadas em tests/unit/home-model.test.ts.
 */

export type SessionStatus = "start" | "continue" | "done";

export interface RunLike {
  date: string;
  completed: readonly string[];
  elapsed: number;
  finished: boolean;
}

/**
 * Estado da sessão de hoje a partir do que o aparelho guardou:
 * - "done": a sessão completa de hoje entrou na ofensiva, ou o progresso salvo de hoje terminou;
 * - "continue": há progresso salvo de hoje (etapa concluída ou tempo corrido) ou a lição de hoje já foi gerada;
 * - "start": nada de hoje ainda.
 */
export function sessionStatus(input: { today: string; sessionDoneToday: boolean; run: RunLike | null; lessonDate: string | null }): SessionStatus {
  if (input.sessionDoneToday) {
    return "done";
  }
  const run = input.run && input.run.date === input.today ? input.run : null;
  if (run?.finished) {
    return "done";
  }
  if (run && (run.completed.length > 0 || run.elapsed > 0)) {
    return "continue";
  }
  if (input.lessonDate === input.today) {
    return "continue";
  }
  return "start";
}

/** Duração (segundos) de cada fase do plano, na ordem. */
export function phaseDurations(phases: readonly SessionPhase[], total = SESSION_SECONDS): Array<{ id: SessionPhase["id"]; seconds: number }> {
  return phases.map((phase, index) => ({ id: phase.id, seconds: Math.max(0, (phases[index + 1]?.start ?? total) - phase.start) }));
}

/** Minutos com uma casa decimal no idioma da interface (ex.: "1,5 min", "1.5分"). */
export function formatMinutes(seconds: number, bcp47: string): string {
  const minutes = Math.round((seconds / 60) * 10) / 10;
  try {
    return new Intl.NumberFormat(bcp47, { style: "unit", unit: "minute", unitDisplay: "short", maximumFractionDigits: 1 }).format(minutes);
  } catch {
    return `${minutes} min`;
  }
}

/** Primeira letra maiúscula (datas do Intl vêm em minúsculas em vários idiomas). */
export function capitalizeFirst(text: string, bcp47: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(bcp47) + text.slice(1) : text;
}

/** Etapas concluídas hoje (só valem as do progresso salvo de hoje). */
export function completedToday(run: RunLike | null, today: string): string[] {
  return run && run.date === today ? [...run.completed] : [];
}

/**
 * Posição da régua: o início da primeira etapa não concluída. Com a sessão feita, a régua fica cheia;
 * sem nada feito, vazia. Não usa o relógio da sessão, só etapas realmente concluídas.
 */
export function rulerSeconds(phases: readonly SessionPhase[], completed: readonly string[], status: SessionStatus, total = SESSION_SECONDS): number {
  if (status === "done") {
    return total;
  }
  const frontier = phases.find((phase) => !completed.includes(phase.id));
  return frontier ? frontier.start : total;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type Level = (typeof LEVELS)[number];

export function asLevel(value: unknown): Level | null {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value.toUpperCase()) ? (value.toUpperCase() as Level) : null;
}

/** Próxima faixa CEFR; null no topo (C2). */
export function nextLevel(level: string): Level | null {
  const current = asLevel(level);
  if (!current) {
    return null;
  }
  return LEVELS[LEVELS.indexOf(current) + 1] ?? null;
}

/** Fração da meta de XP (0 a 1). Meta inválida conta como sem meta. */
export function xpFraction(xp: number, goal: number): number {
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(xp) || xp <= 0) {
    return 0;
  }
  return Math.min(1, xp / goal);
}

/** Dia da semana curto (ex.: "seg.", "Mon") de uma data YYYY-MM-DD, no idioma da interface. */
export function weekdayShort(isoDay: string, bcp47: string): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDay;
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  try {
    return new Intl.DateTimeFormat(bcp47, { weekday: "short", timeZone: "UTC" }).format(date);
  } catch {
    return isoDay;
  }
}

/** Data longa de hoje no idioma da interface (ex.: "quinta-feira, 19 de novembro"). */
export function longDate(isoDay: string, bcp47: string): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDay;
  }
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  try {
    return new Intl.DateTimeFormat(bcp47, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date);
  } catch {
    return isoDay;
  }
}

export type BandStatus = "below" | "current" | "locked";

/** Situação de uma faixa CEFR diante do nível atual do aluno. Nível desconhecido: tudo bloqueado menos A1. */
export function bandStatus(band: string, currentLevel: string): BandStatus {
  const current = asLevel(currentLevel);
  const target = asLevel(band);
  if (!target) {
    return "locked";
  }
  if (!current) {
    return target === "A1" ? "current" : "locked";
  }
  const diff = LEVELS.indexOf(target) - LEVELS.indexOf(current);
  return diff < 0 ? "below" : diff === 0 ? "current" : "locked";
}

/** Histórico do mais recente para o mais antigo (a API devolve do mais antigo para o mais recente). */
export function newestFirst<T extends { finished_at: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => Date.parse(b.finished_at) - Date.parse(a.finished_at));
}

/** Data curta de uma tentativa (ISO completo) no idioma da interface. */
export function shortDate(iso: string, bcp47: string): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat(bcp47, { day: "numeric", month: "short", year: "numeric" }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 10);
  }
}
