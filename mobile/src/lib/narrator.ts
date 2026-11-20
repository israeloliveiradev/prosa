import { useEffect, useSyncExternalStore } from "react";
import { voiceCopy } from "@/lib/copy/voice";
import { kv } from "@/lib/kv";
import { dayIndex, localDate } from "@/lib/listen-pace";
import { onSystemVoicesChanged, systemVoices } from "@/services/speechService";
import { DEFAULT_VOICE_BY_LANG, ENGINE_BY_LANG, KOKORO_VOICES, PIPER_VOICES, type TtsEngine, type VoiceGender } from "@/workers/ttsWorker";

/**
 * Vozes do narrador, todas no aparelho:
 * - en: Kokoro-82M (um modelo; cada voz é um estilo leve);
 * - de, fr, es, it, ru, pt: Piper (um modelo por voz, baixado no primeiro uso);
 * - ja: vozes do sistema (Web Speech), listadas do próprio aparelho.
 */
export interface NarrationVoice {
  id: string;
  /** Nome próprio da voz. */
  name: string;
  /** Nome para exibir (com o sotaque quando ele importa: "Emma (GB)"). */
  label: string;
  gender: VoiceGender | null;
  engine: TtsEngine;
  lang: string;
}

/** Vozes oferecidas no seletor, na ordem de exibição (a primeira é a padrão do idioma). */
export const NARRATOR_VOICE_IDS: Readonly<Record<string, readonly string[]>> = {
  en: ["af_heart", "am_michael", "bf_emma", "bm_george", "af_bella", "am_fenrir"],
  de: ["de_DE-thorsten-medium", "de_DE-kerstin-low", "de_DE-karlsson-low", "de_DE-ramona-low"],
  fr: ["fr_FR-siwis-medium", "fr_FR-tom-medium", "fr_FR-upmc-medium", "fr_FR-gilles-low"],
  es: ["es_ES-davefx-medium", "es_MX-claude-high", "es_ES-sharvard-medium", "es_MX-ald-medium"],
  it: ["it_IT-paola-medium", "it_IT-riccardo-x_low"],
  ru: ["ru_RU-irina-medium", "ru_RU-dmitri-medium", "ru_RU-denis-medium", "ru_RU-ruslan-medium"],
  pt: ["pt_BR-faber-medium", "pt_BR-edresson-low"],
};

const STORAGE_KEY = "prosa.narrator.v1";
const listeners = new Set<() => void>();
let hydrated = false;
let saved: Record<string, string> = {};
let systemWatch: (() => void) | null = null;

function code(lang: string): string {
  return lang.trim().toLowerCase().slice(0, 2);
}

function catalogVoice(id: string, lang: string): NarrationVoice | null {
  const kokoro = KOKORO_VOICES[id];
  if (kokoro && lang === "en") {
    return { id, name: kokoro.name, label: `${kokoro.name} (${kokoro.accent})`, gender: kokoro.gender, engine: "kokoro", lang };
  }
  const piper = PIPER_VOICES[id];
  if (piper && piper.lang === lang) {
    return { id, name: piper.name, label: piper.name, gender: piper.gender, engine: "piper", lang };
  }
  return null;
}

export function voicesFor(lang: string): NarrationVoice[] {
  const target = code(lang);
  if (ENGINE_BY_LANG[target] === "webspeech") {
    const system = systemVoices(target).map((voice) => ({
      id: voice.id,
      name: voice.name,
      label: voice.name,
      gender: voice.gender,
      engine: "webspeech" as const,
      lang: target,
    }));
    if (system.length > 0) {
      return system;
    }
    const fallback = DEFAULT_VOICE_BY_LANG[target];
    const name = voiceCopy().deviceVoiceName;
    return fallback ? [{ id: fallback, name, label: name, gender: null, engine: "webspeech", lang: target }] : [];
  }
  return (NARRATOR_VOICE_IDS[target] ?? []).flatMap((id) => {
    const voice = catalogVoice(id, target);
    return voice ? [voice] : [];
  });
}

/**
 * Voz padrão do dia. Em inglês ela muda a cada dia entre as vozes do Kokoro (todas usam o mesmo
 * modelo, então variar não custa download). Nos idiomas do Piper cada voz é um modelo de
 * dezenas de MB: a padrão fica fixa e as outras ficam no seletor.
 */
export function defaultVoiceId(lang: string, date = localDate()): string {
  const target = code(lang);
  const options = voicesFor(target);
  if (options.length === 0) {
    return "";
  }
  if (ENGINE_BY_LANG[target] === "kokoro") {
    return options[dayIndex(date, options.length)]?.id ?? options[0]?.id ?? "";
  }
  return options[0]?.id ?? "";
}

export function sampleLine(lang: string): string {
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
  return lines[code(lang)] ?? lines.en ?? "Hello.";
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
  const target = code(lang);
  const chosen = readSaved()[target];
  if (chosen && voicesFor(target).some((voice) => voice.id === chosen)) {
    return chosen;
  }
  return defaultVoiceId(target);
}

function notify(): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

export function setNarratorVoice(lang: string, voiceId: string): void {
  const target = code(lang);
  if (!voicesFor(target).some((voice) => voice.id === voiceId)) {
    return;
  }
  hydrated = true;
  const next = { ...readSaved(), [target]: voiceId };
  saved = next;
  kv.set(STORAGE_KEY, JSON.stringify(next));
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!systemWatch) {
    // As vozes do sistema (japonês) chegam depois do carregamento no Chrome.
    systemWatch = onSystemVoicesChanged(notify);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && systemWatch) {
      systemWatch();
      systemWatch = null;
    }
  };
}

export function useNarratorVoice(lang: string): string {
  const target = code(lang);
  const selected = useSyncExternalStore(subscribe, () => narratorVoice(target), () => defaultVoiceId(target));
  useEffect(() => {
    if (hydrated) {
      return;
    }
    hydrated = true;
    notify();
  }, []);
  return selected;
}

/** Assina mudanças na escolha de voz e na lista de vozes do sistema. */
export function subscribeNarrator(listener: () => void): () => void {
  return subscribe(listener);
}
