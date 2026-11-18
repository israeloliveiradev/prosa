import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import {
  applyAward,
  createEmptyXpState,
  sanitizeGoal,
  todayXp,
  totalXp,
  weekDots,
  type XpGoal,
  type XpReason,
  type XpState,
} from "@/lib/xp-rules";

const STORAGE_KEY = "prosa.xp.v1";
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readState(): XpState {
  const raw = kv.getString(STORAGE_KEY);
  if (!raw) {
    return createEmptyXpState();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<XpState>;
    return {
      log: parsed.log && typeof parsed.log === "object" ? parsed.log : {},
      awarded: parsed.awarded && typeof parsed.awarded === "object" ? parsed.awarded : {},
      goal: sanitizeGoal(parsed.goal),
    };
  } catch {
    return createEmptyXpState();
  }
}

let state: XpState = readState();

function persist(next: XpState): void {
  state = next;
  kv.set(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export function awardXp(reason: XpReason, key: string, dateOverride?: string): number {
  const today = dateOverride ?? new Date().toISOString().slice(0, 10);
  const { state: nextState, gained } = applyAward(state, reason, key, today);
  if (gained > 0) {
    persist(nextState);
  }
  return gained;
}

export function setXpGoal(goal: XpGoal): void {
  persist({ ...state, goal: sanitizeGoal(goal) });
}

export function resetXp(): void {
  persist(createEmptyXpState());
}

export function getXpState(): XpState {
  return state;
}

export function useXp(dateOverride?: string): {
  today: number;
  total: number;
  goal: XpGoal;
  state: XpState;
  weekProgress: boolean[];
} {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );

  const today = dateOverride ?? new Date().toISOString().slice(0, 10);
  const activeDates = Object.keys(current.log).filter((d) => (current.log[d] ?? 0) > 0);

  return {
    today: todayXp(current, today),
    total: totalXp(current),
    goal: current.goal,
    state: current,
    weekProgress: weekDots(activeDates, today),
  };
}
