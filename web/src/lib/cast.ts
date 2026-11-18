import { useSyncExternalStore } from "react";
import { CAST_SLOTS, DEFAULT_CAST, mindById, parseCast, slotForPhase, type CastSlot, type Mind, type MindId } from "@/design/minds";
import { kv } from "@/lib/kv";
import { getLocale, type DisplayLocale } from "@/lib/i18n";

const STORAGE_KEY = "prosa.cast.v1";

let picks = readStored();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function readStored(): Record<CastSlot, MindId> {
  const raw = kv.getString(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_CAST };
  }
  try {
    return parseCast(JSON.parse(raw) as Partial<Record<CastSlot, string>>);
  } catch {
    return { ...DEFAULT_CAST };
  }
}

export function getCast(): Record<CastSlot, MindId> {
  return picks;
}

export function hydrateCast(next: Partial<Record<CastSlot, string>> | undefined): Record<CastSlot, MindId> {
  picks = parseCast({ ...picks, ...next });
  kv.set(STORAGE_KEY, JSON.stringify(picks));
  emit();
  return picks;
}

export function setCastSlot(slot: CastSlot, id: MindId): Record<CastSlot, MindId> {
  return hydrateCast({ [slot]: id });
}

export function mindForPhase(phase: string, cast = picks): Mind {
  return mindById(cast[slotForPhase(phase)]);
}

export function castPeople(cast = picks): Mind[] {
  return CAST_SLOTS.map((slot) => mindById(cast[slot]));
}

export function mindCopy(mind: Mind, locale: DisplayLocale = getLocale()) {
  return {
    line: mind.line[locale],
    bio: mind.bio[locale],
    role: locale === "en" ? ({ reading: "Reading", memory: "Memory", speech: "Speech", journal: "Journal" } as const)[mind.slot] : ({ reading: "Leitura", memory: "Memória", speech: "Fala", journal: "Diário" } as const)[mind.slot],
  };
}

export function useCast() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => picks,
    () => picks,
  );
  return {
    picks: current,
    people: CAST_SLOTS.map((slot) => mindById(current[slot])),
    setSlot: setCastSlot,
  };
}
