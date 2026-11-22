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

const ROLES: Record<DisplayLocale, Record<CastSlot, string>> = {
  pt: { reading: "Leitura", memory: "Memória", speech: "Fala", journal: "Diário" },
  en: { reading: "Reading", memory: "Memory", speech: "Speech", journal: "Journal" },
  de: { reading: "Lesen", memory: "Gedächtnis", speech: "Sprechen", journal: "Tagebuch" },
  fr: { reading: "Lecture", memory: "Mémoire", speech: "Parole", journal: "Journal" },
  es: { reading: "Lectura", memory: "Memoria", speech: "Habla", journal: "Diario" },
  it: { reading: "Lettura", memory: "Memoria", speech: "Parlato", journal: "Diario" },
  ja: { reading: "読む", memory: "記憶", speech: "話す", journal: "日記" },
};

/** Texto da tabela no idioma pedido; sem tradução, cai no inglês (e depois no português). */
function localized(table: Record<DisplayLocale, string>, locale: DisplayLocale): string {
  return table[locale] ?? table.en ?? table.pt;
}

export function mindRole(slot: CastSlot, locale: DisplayLocale = getLocale()): string {
  return (ROLES[locale] ?? ROLES.en)[slot];
}

export function mindCopy(mind: Mind, locale: DisplayLocale = getLocale()) {
  return {
    line: localized(mind.line, locale),
    bio: localized(mind.bio, locale),
    role: mindRole(mind.slot, locale),
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
