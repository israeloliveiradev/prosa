import { useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";

export type GuideArea = "welcome" | "prosa" | "news" | "practice" | "memory";

const STORAGE_KEY = "prosa.guide.v1";
const listeners = new Set<() => void>();

interface GuideState {
  seen: GuideArea[];
}

let state: GuideState = { seen: [] };

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readState(): GuideState {
  const raw = kv.getString(STORAGE_KEY);
  if (!raw) {
    return { seen: [] };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GuideState>;
    const seen = Array.isArray(parsed.seen)
      ? parsed.seen.filter((item): item is GuideArea =>
          item === "welcome" || item === "prosa" || item === "news" || item === "practice" || item === "memory",
        )
      : [];
    return { seen };
  } catch {
    return { seen: [] };
  }
}

export function hydrateGuide(): void {
  state = readState();
}

hydrateGuide();

export function guideSeen(area: GuideArea): boolean {
  return state.seen.includes(area);
}

export function resetGuide(): void {
  state = { seen: [] };
  kv.delete(STORAGE_KEY);
  emit();
}

export function markGuideSeen(area: GuideArea): void {
  if (state.seen.includes(area)) {
    return;
  }
  state = { seen: [...state.seen, area] };
  kv.set(STORAGE_KEY, JSON.stringify(state));
  emit();
}

export function useGuideSeen(area: GuideArea): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state.seen.includes(area),
    () => state.seen.includes(area),
  );
}
