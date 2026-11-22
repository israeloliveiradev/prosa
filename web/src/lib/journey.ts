import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import {
  EMPTY_JOURNEY,
  parseJourney,
  type JourneyState,
} from "@/features/onboarding/model/journey-snapshot";
import {
  MAX_GOAL_NOTE_LENGTH,
  isDailyMinutes,
  isGoalId,
  normalizePair,
  toCefrLevel,
  type DailyMinutes,
  type GoalId,
  type JourneyStep,
  type LevelSource,
} from "@/features/onboarding/model/journey-flow";
import { sanitizeThemes } from "@/lib/themes";

export type { JourneyState, JourneyStep, DailyMinutes, GoalId, LevelSource };
export { parseJourney };

const STORAGE_KEY = "prosa.journey.v1";
const listeners = new Set<() => void>();
const EMPTY = EMPTY_JOURNEY;

let state: JourneyState = EMPTY;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function persist(next: JourneyState): void {
  state = next;
  kv.set(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export function hydrateJourney(): void {
  state = parseJourney(kv.getString(STORAGE_KEY));
}

hydrateJourney();

export function getJourney(): JourneyState {
  return state;
}

/** Par da conta (idioma-alvo e de apoio) para semear a jornada nova. */
export interface JourneyAccount {
  target_lang?: string | null;
  native_lang?: string | null;
}

/** Jornada vazia deste aluno, já com o par escolhido no cadastro (não o en/pt padrão). */
function freshJourney(userId: string, account?: JourneyAccount): JourneyState {
  if (!account?.target_lang) {
    return { ...EMPTY, userId };
  }
  return { ...EMPTY, userId, ...normalizePair(account.target_lang, account.native_lang) };
}

export function openJourney(userId: string, account?: JourneyAccount): JourneyState {
  if (state.userId === userId) {
    return state;
  }
  const next = freshJourney(userId, account);
  persist(next);
  return next;
}

export function reopenFirstDay(userId: string, account?: JourneyAccount): JourneyState {
  const next = freshJourney(userId, account);
  persist(next);
  return next;
}

export function patchJourney(patch: Partial<JourneyState>): JourneyState {
  const next = { ...state, ...patch };
  persist(next);
  return next;
}

/** Objetivo, nota e minutos por dia que a conta guarda (backend M2, /auth/me). */
export interface AccountPlan {
  id: string;
  goal?: string | null;
  goal_note?: string | null;
  daily_minutes?: number | null;
}

/**
 * A conta já recebeu o plano pelo M2? O objetivo só chega lá por PATCH /account/settings
 * (não tem valor padrão), enquanto os minutos nascem com 20: sem objetivo na conta, os
 * minutos dela podem ser só o padrão.
 */
function accountPlanSaved(user: AccountPlan): boolean {
  return isGoalId(user.goal);
}

function planFromAccount(user: AccountPlan, base: JourneyState): Pick<JourneyState, "goal" | "goal_note" | "minutes"> {
  const saved = accountPlanSaved(user);
  return {
    goal: isGoalId(user.goal) ? user.goal : base.goal,
    goal_note:
      typeof user.goal_note === "string" ? user.goal_note.slice(0, MAX_GOAL_NOTE_LENGTH) : saved ? "" : base.goal_note,
    minutes: isDailyMinutes(user.daily_minutes) ? user.daily_minutes : base.minutes,
  };
}

/**
 * Depois de o plano ir para a conta, a conta vale também neste aparelho (mudança feita em
 * outro aparelho chega aqui). Só mexe numa jornada concluída do mesmo aluno: durante o
 * primeiro dia, as escolhas em andamento ficam no aparelho até o plano ser salvo.
 */
export function adoptAccountPlan(user: AccountPlan): void {
  if (state.userId !== user.id || !state.done || !accountPlanSaved(user)) {
    return;
  }
  const plan = planFromAccount(user, state);
  if (plan.goal === state.goal && plan.goal_note === state.goal_note && plan.minutes === state.minutes) {
    return;
  }
  persist({ ...state, ...plan });
}

/**
 * Plano deste aparelho que a conta ainda não tem: jornada concluída antes do M2, quando o
 * objetivo e os minutos só ficavam no aparelho. Só vale com a resposta de /auth/me do M2
 * (goal null explícito e daily_minutes presente); a resposta de login não traz esses campos.
 */
export function localPlanForAccount(user: AccountPlan): { goal: GoalId; goal_note: string | null; daily_minutes: DailyMinutes } | null {
  if (state.userId !== user.id || !state.done || user.goal !== null || user.daily_minutes === undefined || !isGoalId(state.goal)) {
    return null;
  }
  const note = state.goal_note.trim();
  return { goal: state.goal, goal_note: note.length > 0 ? note : null, daily_minutes: state.minutes };
}

export function markJourneyDone(userId: string, level?: string | null): void {
  const known = toCefrLevel(level);
  persist({ ...state, userId, done: true, step: "plan", ...(known ? { level: known } : {}) });
}

/**
 * Conclui a jornada com o que a conta já guarda (par, temas, nível): usado
 * quando o servidor mostra que o aluno já passou pelo primeiro dia, por
 * exemplo em outro aparelho. Objetivo, nota e minutos vêm da conta quando este
 * aparelho não tem jornada desse aluno, ou quando a conta já recebeu o plano (M2);
 * senão ficam os deste aparelho.
 */
export function markJourneyDoneFromAccount(user: AccountPlan & {
  target_lang?: string | null;
  native_lang?: string | null;
  interests?: readonly string[] | null;
  level?: string | null;
}): void {
  const own = state.userId === user.id;
  const local = own ? state : { ...EMPTY, userId: user.id };
  const base = !own || accountPlanSaved(user) ? { ...local, ...planFromAccount(user, local) } : local;
  const pair = normalizePair(user.target_lang, user.native_lang);
  const interests = user.interests && user.interests.length > 0 ? sanitizeThemes(user.interests) : base.interests;
  persist({
    ...base,
    userId: user.id,
    done: true,
    step: "plan",
    target_lang: pair.target_lang,
    through_lang: pair.through_lang,
    interests,
    level: toCefrLevel(user.level) ?? base.level,
  });
}

export function clearJourneyDone(): void {
  if (!state.done && state.step === "welcome") {
    return;
  }
  persist({ ...state, done: false, step: state.done ? "welcome" : state.step, level: null, level_source: null });
}

export function resetJourney(): void {
  persist(EMPTY);
}

export function journeyFinished(userId: string): boolean {
  return state.done && state.userId === userId;
}

/** Meta diária escolhida no primeiro dia (20 min se ainda não escolheu). */
export function dailyGoalMinutes(current: JourneyState = state): DailyMinutes {
  return current.minutes;
}

export function useJourney(): JourneyState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}
