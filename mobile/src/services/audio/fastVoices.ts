// Prosa — vozes rápidas em inglês (Piper), para aparelhos em que o Kokoro fica mais lento que a fala.
//
// Ids do catálogo do @mintplex-labs/piper-tts-web 1.0.5 (PATH_MAP), todos de um só locutor.
// Gênero conferido pela frequência fundamental da fala gerada no navegador (ver o teste
// `tests/unit/voice-speed.test.ts` e o relatório do M2). Cada voz é um modelo próprio (~60 MB).
//
// O worker de runtime (`public/workers/ttsWorker.js`) repete o mapa PIPER_EN_VOICES entre os
// marcadores `<fast-en-voices>`; o teste exige que as duas cópias sejam idênticas.

import { KOKORO_MENTOR_VOICES, KOKORO_VOICES, type VoiceGender } from "@/workers/ttsWorker";

export interface FastEnglishVoiceInfo {
  lang: "en";
  name: string;
  gender: VoiceGender;
  accent: "US" | "GB";
  sampleRate: number;
}

export const PIPER_EN_VOICES: Readonly<Record<string, FastEnglishVoiceInfo>> = {
  "en_US-lessac-medium": { lang: "en", name: "Lessac", gender: "female", accent: "US", sampleRate: 22050 },
  "en_US-ryan-medium": { lang: "en", name: "Ryan", gender: "male", accent: "US", sampleRate: 22050 },
  "en_GB-cori-medium": { lang: "en", name: "Cori", gender: "female", accent: "GB", sampleRate: 22050 },
  "en_GB-alan-medium": { lang: "en", name: "Alan", gender: "male", accent: "GB", sampleRate: 22050 },
};

/** Voz rápida padrão: fica fixa (cada voz é um download), como nos outros idiomas do Piper. */
export const FAST_EN_DEFAULT = "en_US-lessac-medium";

/** Ordem do seletor no modo rápido (a primeira é a padrão). */
export const FAST_NARRATOR_VOICE_IDS: readonly string[] = [
  "en_US-lessac-medium",
  "en_US-ryan-medium",
  "en_GB-cori-medium",
  "en_GB-alan-medium",
];

export function isFastEnglishVoice(voice: string | null | undefined): boolean {
  return Boolean(voice) && Object.prototype.hasOwnProperty.call(PIPER_EN_VOICES, voice as string);
}

/** A voz rápida com o mesmo gênero e sotaque de uma voz do Kokoro (ou a padrão). */
export function fastEquivalent(kokoroVoice: string | null | undefined): string {
  const info = kokoroVoice ? KOKORO_VOICES[kokoroVoice] : undefined;
  if (!info) {
    return FAST_EN_DEFAULT;
  }
  const match = FAST_NARRATOR_VOICE_IDS.find((id) => {
    const fast = PIPER_EN_VOICES[id];
    return fast?.gender === info.gender && fast.accent === info.accent;
  });
  return match ?? FAST_NARRATOR_VOICE_IDS.find((id) => PIPER_EN_VOICES[id]?.gender === info.gender) ?? FAST_EN_DEFAULT;
}

/** Voz rápida de cada mente: a equivalente da voz Kokoro dela (mesmo gênero e sotaque). */
export const FAST_EN_MENTOR_VOICES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(KOKORO_MENTOR_VOICES).map(([mind, row]) => [mind, fastEquivalent(row.en)]),
);
