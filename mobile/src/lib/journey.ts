import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";

export type JourneyStep = "welcome" | "pair" | "interests" | "place" | "ready";

export interface JourneyState {
  userId: string;
  done: boolean;
  step: JourneyStep;
  target_lang: string;
  through_lang: string;
  interests: string[];
  goal: string;
  level: string | null;
}

const STORAGE_KEY = "prosa.journey.v1";
const listeners = new Set<() => void>();

const EMPTY: JourneyState = {
  userId: "",
  done: false,
  step: "welcome",
  target_lang: "en",
  through_lang: "pt",
  interests: [],
  goal: "",
  level: null,
};

let state: JourneyState = EMPTY;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function isStep(value: string): value is JourneyStep {
  return value === "welcome" || value === "pair" || value === "interests" || value === "place" || value === "ready";
}

function readState(): JourneyState {
  const raw = kv.getString(STORAGE_KEY);
  if (!raw) {
    return EMPTY;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<JourneyState>;
    return {
      userId: typeof parsed.userId === "string" ? parsed.userId : "",
      done: parsed.done === true,
      step: parsed.step && isStep(parsed.step) ? parsed.step : "welcome",
      target_lang: typeof parsed.target_lang === "string" ? parsed.target_lang : "en",
      through_lang: typeof parsed.through_lang === "string" ? parsed.through_lang : "pt",
      interests: Array.isArray(parsed.interests) ? parsed.interests.filter((item) => typeof item === "string") : [],
      goal: typeof parsed.goal === "string" ? parsed.goal : "",
      level: typeof parsed.level === "string" ? parsed.level : null,
    };
  } catch {
    return EMPTY;
  }
}

function persist(next: JourneyState): void {
  state = next;
  kv.set(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export function hydrateJourney(): void {
  state = readState();
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

export function markJourneyDone(userId: string, level?: string): void {
  persist({ ...state, userId, done: true, step: "ready", ...(level ? { level } : {}) });
}

export function clearJourneyDone(): void {
  if (!state.done && state.step === "welcome") {
    return;
  }
  persist({ ...state, done: false, step: state.done ? "welcome" : state.step, level: null });
}

export function resetJourney(): void {
  persist(EMPTY);
}

export function journeyFinished(userId: string): boolean {
  return state.done && state.userId === userId;
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
