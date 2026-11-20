import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import {
  EMPTY_JOURNEY,
  parseJourney,
  type JourneyState,
} from "@/features/onboarding/model/journey-snapshot";
import {
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

export function openJourney(userId: string): JourneyState {
  if (state.userId === userId) {
    return state;
  }
  const next = { ...EMPTY, userId };
  persist(next);
  return next;
}

export function reopenFirstDay(userId: string): JourneyState {
  const next = { ...EMPTY, userId };
  persist(next);
  return next;
}

export function patchJourney(patch: Partial<JourneyState>): JourneyState {
  const next = { ...state, ...patch };
  persist(next);
  return next;
}

export function markJourneyDone(userId: string, level?: string | null): void {
  const known = toCefrLevel(level);
  persist({ ...state, userId, done: true, step: "plan", ...(known ? { level: known } : {}) });
}

/**
 * Conclui a jornada com o que a conta já guarda (par, temas, nível): usado
 * quando o servidor mostra que o aluno já passou pelo primeiro dia, por
 * exemplo em outro aparelho. Objetivo e minutos continuam os deste aparelho.
 */
export function markJourneyDoneFromAccount(user: {
  id: string;
  target_lang?: string | null;
  native_lang?: string | null;
  interests?: readonly string[] | null;
  level?: string | null;
}): void {
  const base = state.userId === user.id ? state : { ...EMPTY, userId: user.id };
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
