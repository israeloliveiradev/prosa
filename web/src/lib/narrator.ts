import { useEffect, useSyncExternalStore } from "react";
import { kv } from "@/lib/kv";
import { dayIndex, localDate } from "@/lib/listen-pace";

export interface NarrationVoice {
  id: string;
  name: string;
  detail: string;
  lang: string;
}

const VOICES: readonly NarrationVoice[] = [
  { id: "en-US-AvaNeural", name: "Ava", detail: "feminina", lang: "en" },
  { id: "en-US-AndrewNeural", name: "Andrew", detail: "masculina", lang: "en" },
  { id: "en-US-EmmaNeural", name: "Emma", detail: "feminina", lang: "en" },
  { id: "en-US-BrianNeural", name: "Brian", detail: "masculina", lang: "en" },
  { id: "es-ES-ElviraNeural", name: "Elvira", detail: "feminina", lang: "es" },
  { id: "es-ES-AlvaroNeural", name: "Álvaro", detail: "masculina", lang: "es" },
  { id: "es-MX-DaliaNeural", name: "Dalia", detail: "feminina", lang: "es" },
  { id: "es-MX-JorgeNeural", name: "Jorge", detail: "masculina", lang: "es" },
  { id: "de-DE-KatjaNeural", name: "Katja", detail: "feminina", lang: "de" },
  { id: "de-DE-ConradNeural", name: "Conrad", detail: "masculina", lang: "de" },
  { id: "fr-FR-DeniseNeural", name: "Denise", detail: "feminina", lang: "fr" },
  { id: "fr-FR-HenriNeural", name: "Henri", detail: "masculina", lang: "fr" },
  { id: "it-IT-ElsaNeural", name: "Elsa", detail: "feminina", lang: "it" },
  { id: "it-IT-DiegoNeural", name: "Diego", detail: "masculina", lang: "it" },
  { id: "ru-RU-SvetlanaNeural", name: "Svetlana", detail: "feminina", lang: "ru" },
  { id: "ru-RU-DmitryNeural", name: "Dmitry", detail: "masculina", lang: "ru" },
  { id: "ja-JP-NanamiNeural", name: "Nanami", detail: "feminina", lang: "ja" },
  { id: "ja-JP-KeitaNeural", name: "Keita", detail: "masculina", lang: "ja" },
  { id: "pt-BR-FranciscaNeural", name: "Francisca", detail: "feminina", lang: "pt" },
  { id: "pt-BR-AntonioNeural", name: "Antonio", detail: "masculina", lang: "pt" },
];

const STORAGE_KEY = "prosa.narrator.v1";
const listeners = new Set<() => void>();
let hydrated = false;
let saved: Record<string, string> = {};

export function voicesFor(lang: string): NarrationVoice[] {
  const code = lang.trim().toLowerCase().slice(0, 2);
  return VOICES.filter((voice) => voice.lang === code);
}

export function defaultVoiceId(lang: string, date = localDate()): string {
  const options = voicesFor(lang);
  if (options.length === 0) {
    return "";
  }
  return options[dayIndex(date, options.length)]?.id ?? "";
}

export function sampleLine(lang: string): string {
  const code = lang.trim().toLowerCase().slice(0, 2);
  const lines: Record<string, string> = {
    en: "Hello. I will read with you today.",
    es: "Hola. Hoy leo contigo.",
    de: "Hallo. Heute lese ich mit dir.",
    fr: "Bonjour. Aujourd'hui, je lis avec toi.",
    it: "Ciao. Oggi leggo con te.",
    ru: "Привет. Сегодня я читаю с тобой.",
    ja: "こんにちは。今日は一緒に読みます。",
    pt: "Olá. Hoje eu leio com você.",
  };
  return lines[code] ?? lines.en ?? "Hello.";
}

function readSaved(): Record<string, string> {
  if (!hydrated) {
    return saved;
  }
  const raw = kv.getString(STORAGE_KEY);
  if (!raw) {
    saved = {};
    return saved;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      saved = {};
      return saved;
    }
    saved = parsed as Record<string, string>;
    return saved;
  } catch {
    saved = {};
    return saved;
  }
}

export function narratorVoice(lang: string): string {
  const code = lang.trim().toLowerCase().slice(0, 2);
  const chosen = readSaved()[code];
  if (chosen && voicesFor(code).some((voice) => voice.id === chosen)) {
    return chosen;
  }
  return defaultVoiceId(code);
}

export function setNarratorVoice(lang: string, voiceId: string): void {
  const code = lang.trim().toLowerCase().slice(0, 2);
  if (!voicesFor(code).some((voice) => voice.id === voiceId)) {
    return;
  }
  hydrated = true;
  const next = { ...readSaved(), [code]: voiceId };
  saved = next;
  kv.set(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNarratorVoice(lang: string): string {
  const code = lang.trim().toLowerCase().slice(0, 2);
  const selected = useSyncExternalStore(subscribe, () => narratorVoice(code), () => defaultVoiceId(code));
  useEffect(() => {
    if (hydrated) {
      return;
    }
    hydrated = true;
    for (const listener of listeners) {
      listener();
    }
  }, []);
  return selected;
}
