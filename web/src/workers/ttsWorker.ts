// Prosa — catálogo de vozes no aparelho e protocolo do worker de síntese.
//
// Motores:
// - Kokoro-82M (kokoro-js 1.2.1, 24 kHz) para inglês. O kokoro-js só fonemiza inglês.
// - Piper (@mintplex-labs/piper-tts-web 1.0.5) para de, fr, es, it, ru e pt (pt só como apoio).
// - Web Speech (speechSynthesis, ja-JP) só para japonês: não há Japonês neural no navegador.
//
// O worker de verdade é `public/workers/ttsWorker.js` (servido cru, sem bundler). Ele repete os
// mapas abaixo entre os marcadores `<voice-maps>`; o teste `tests/unit/voices-catalog.test.ts`
// exige que as duas cópias sejam idênticas e que cada id exista nos catálogos instalados.
//
// O piper-tts-web sempre usa o locutor 0 dos modelos com vários locutores:
// fr_FR-upmc-medium → "jessica" (feminina); es_ES-sharvard-medium → "M" (masculina).
// Os cartões de modelo de es_MX-claude-high e es_MX-ald-medium não dizem o gênero: medido pela
// frequência fundamental da fala gerada no navegador (claude ≈ 184 Hz, feminina; ald ≈ 148 Hz,
// masculina; referência: thorsten ≈ 117 Hz, af_heart ≈ 185 Hz).

export type TtsEngine = "kokoro" | "piper" | "webspeech";
export type VoiceGender = "female" | "male";
export type PiperLang = "de" | "fr" | "es" | "it" | "ru" | "pt";

export interface KokoroVoiceInfo {
  name: string;
  gender: VoiceGender;
  accent: "US" | "GB";
}

export interface PiperVoiceInfo {
  lang: PiperLang;
  name: string;
  gender: VoiceGender;
  sampleRate: number;
}

/** Pedido do app para o worker. */
export interface WorkerRequest {
  type: "SYNTHESIZE" | "PRELOAD" | "PRIORITIZE" | "INSPECT";
  id: string;
  payload?: {
    engine?: Exclude<TtsEngine, "webspeech">;
    voice?: string;
    lang?: string;
    /** Trechos já cortados pelo app (frases); o worker sintetiza um por vez, na ordem. */
    chunks?: string[];
    /** 0 = tocar agora; 1 = pré-carga. */
    priority?: number;
    origin?: string;
  };
}

/** Respostas do worker. `SYNTH_PART` chega uma vez por trecho, antes de `SYNTHESIZED`. */
export interface WorkerResponse {
  type: "SYNTH_PART" | "SYNTHESIZED" | "PRELOADED" | "MODEL_PROGRESS" | "MODEL_READY" | "INSPECTED" | "ERROR";
  id?: string;
  index?: number;
  audioData?: Float32Array;
  samplingRate?: number;
  parts?: number;
  latencyMs?: number;
  engine?: Exclude<TtsEngine, "webspeech">;
  voice?: string;
  loaded?: number;
  total?: number;
  file?: string;
  piperStored?: string[];
  kokoroCached?: boolean;
  error?: string;
}

// <voice-maps>
export const ENGINE_BY_LANG: Record<string, TtsEngine> = {
  en: "kokoro",
  de: "piper",
  fr: "piper",
  es: "piper",
  it: "piper",
  ru: "piper",
  pt: "piper",
  ja: "webspeech",
};

export const DEFAULT_VOICE_BY_LANG: Record<string, string> = {
  en: "af_heart",
  de: "de_DE-thorsten-medium",
  fr: "fr_FR-siwis-medium",
  es: "es_ES-davefx-medium",
  it: "it_IT-paola-medium",
  ru: "ru_RU-irina-medium",
  pt: "pt_BR-faber-medium",
  ja: "webspeech:ja-JP",
};

export const KOKORO_VOICES: Record<string, KokoroVoiceInfo> = {
  af_heart: { name: "Heart", gender: "female", accent: "US" },
  af_alloy: { name: "Alloy", gender: "female", accent: "US" },
  af_aoede: { name: "Aoede", gender: "female", accent: "US" },
  af_bella: { name: "Bella", gender: "female", accent: "US" },
  af_jessica: { name: "Jessica", gender: "female", accent: "US" },
  af_kore: { name: "Kore", gender: "female", accent: "US" },
  af_nicole: { name: "Nicole", gender: "female", accent: "US" },
  af_nova: { name: "Nova", gender: "female", accent: "US" },
  af_river: { name: "River", gender: "female", accent: "US" },
  af_sarah: { name: "Sarah", gender: "female", accent: "US" },
  af_sky: { name: "Sky", gender: "female", accent: "US" },
  am_adam: { name: "Adam", gender: "male", accent: "US" },
  am_echo: { name: "Echo", gender: "male", accent: "US" },
  am_eric: { name: "Eric", gender: "male", accent: "US" },
  am_fenrir: { name: "Fenrir", gender: "male", accent: "US" },
  am_liam: { name: "Liam", gender: "male", accent: "US" },
  am_michael: { name: "Michael", gender: "male", accent: "US" },
  am_onyx: { name: "Onyx", gender: "male", accent: "US" },
  am_puck: { name: "Puck", gender: "male", accent: "US" },
  am_santa: { name: "Santa", gender: "male", accent: "US" },
  bf_emma: { name: "Emma", gender: "female", accent: "GB" },
  bf_isabella: { name: "Isabella", gender: "female", accent: "GB" },
  bf_alice: { name: "Alice", gender: "female", accent: "GB" },
  bf_lily: { name: "Lily", gender: "female", accent: "GB" },
  bm_george: { name: "George", gender: "male", accent: "GB" },
  bm_lewis: { name: "Lewis", gender: "male", accent: "GB" },
  bm_daniel: { name: "Daniel", gender: "male", accent: "GB" },
  bm_fable: { name: "Fable", gender: "male", accent: "GB" },
};

export const PIPER_VOICES: Record<string, PiperVoiceInfo> = {
  "de_DE-thorsten-medium": { lang: "de", name: "Thorsten", gender: "male", sampleRate: 22050 },
  "de_DE-karlsson-low": { lang: "de", name: "Karlsson", gender: "male", sampleRate: 16000 },
  "de_DE-pavoque-low": { lang: "de", name: "Pavoque", gender: "male", sampleRate: 16000 },
  "de_DE-kerstin-low": { lang: "de", name: "Kerstin", gender: "female", sampleRate: 16000 },
  "de_DE-ramona-low": { lang: "de", name: "Ramona", gender: "female", sampleRate: 16000 },
  "de_DE-eva_k-x_low": { lang: "de", name: "Eva", gender: "female", sampleRate: 16000 },
  "fr_FR-siwis-medium": { lang: "fr", name: "Siwis", gender: "female", sampleRate: 22050 },
  "fr_FR-upmc-medium": { lang: "fr", name: "Jessica", gender: "female", sampleRate: 22050 },
  "fr_FR-tom-medium": { lang: "fr", name: "Tom", gender: "male", sampleRate: 44100 },
  "fr_FR-gilles-low": { lang: "fr", name: "Gilles", gender: "male", sampleRate: 16000 },
  "es_ES-davefx-medium": { lang: "es", name: "Dave", gender: "male", sampleRate: 22050 },
  "es_ES-sharvard-medium": { lang: "es", name: "Sharvard", gender: "male", sampleRate: 22050 },
  "es_MX-ald-medium": { lang: "es", name: "Ald", gender: "male", sampleRate: 22050 },
  "es_MX-claude-high": { lang: "es", name: "Claude", gender: "female", sampleRate: 22050 },
  "it_IT-paola-medium": { lang: "it", name: "Paola", gender: "female", sampleRate: 22050 },
  "it_IT-riccardo-x_low": { lang: "it", name: "Riccardo", gender: "male", sampleRate: 16000 },
  "ru_RU-irina-medium": { lang: "ru", name: "Irina", gender: "female", sampleRate: 22050 },
  "ru_RU-denis-medium": { lang: "ru", name: "Denis", gender: "male", sampleRate: 22050 },
  "ru_RU-dmitri-medium": { lang: "ru", name: "Dmitri", gender: "male", sampleRate: 22050 },
  "ru_RU-ruslan-medium": { lang: "ru", name: "Ruslan", gender: "male", sampleRate: 22050 },
  "pt_BR-faber-medium": { lang: "pt", name: "Faber", gender: "male", sampleRate: 22050 },
  "pt_BR-edresson-low": { lang: "pt", name: "Edresson", gender: "male", sampleRate: 16000 },
};

// Mentoras: curie, lovelace, hypatia. Os demais são mentores.
// Einstein, Curie e Feynman têm vozes distintas em todo idioma com 3 vozes ou mais.
export const KOKORO_MENTOR_VOICES: Record<string, Record<string, string>> = {
  einstein: { en: "bm_george" },
  curie: { en: "bf_emma" },
  feynman: { en: "am_michael" },
  lovelace: { en: "af_bella" },
  hypatia: { en: "af_heart" },
  plato: { en: "am_echo" },
  newton: { en: "bm_fable" },
  galileo: { en: "am_fenrir" },
  aristotle: { en: "am_onyx" },
  darwin: { en: "bm_daniel" },
  socrates: { en: "bm_lewis" },
  tesla: { en: "am_puck" },
  cicero: { en: "am_eric" },
  davinci: { en: "am_liam" },
  confucius: { en: "am_echo" },
  aurelius: { en: "bm_george" },
};

// pt só tem vozes masculinas no catálogo do piper-tts-web (faber, edresson): as mentoras usam faber.
// it só tem duas vozes (paola feminina, riccardo masculina).
export const PIPER_MENTOR_VOICES: Record<string, Record<string, string>> = {
  einstein: { de: "de_DE-thorsten-medium", fr: "fr_FR-tom-medium", es: "es_ES-davefx-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-dmitri-medium", pt: "pt_BR-faber-medium" },
  curie: { de: "de_DE-kerstin-low", fr: "fr_FR-siwis-medium", es: "es_MX-claude-high", it: "it_IT-paola-medium", ru: "ru_RU-irina-medium", pt: "pt_BR-faber-medium" },
  feynman: { de: "de_DE-karlsson-low", fr: "fr_FR-gilles-low", es: "es_ES-sharvard-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-denis-medium", pt: "pt_BR-edresson-low" },
  lovelace: { de: "de_DE-ramona-low", fr: "fr_FR-upmc-medium", es: "es_MX-claude-high", it: "it_IT-paola-medium", ru: "ru_RU-irina-medium", pt: "pt_BR-faber-medium" },
  hypatia: { de: "de_DE-eva_k-x_low", fr: "fr_FR-siwis-medium", es: "es_MX-claude-high", it: "it_IT-paola-medium", ru: "ru_RU-irina-medium", pt: "pt_BR-faber-medium" },
  plato: { de: "de_DE-pavoque-low", fr: "fr_FR-tom-medium", es: "es_MX-ald-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-ruslan-medium", pt: "pt_BR-faber-medium" },
  newton: { de: "de_DE-thorsten-medium", fr: "fr_FR-gilles-low", es: "es_ES-davefx-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-dmitri-medium", pt: "pt_BR-faber-medium" },
  galileo: { de: "de_DE-karlsson-low", fr: "fr_FR-tom-medium", es: "es_ES-sharvard-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-denis-medium", pt: "pt_BR-edresson-low" },
  aristotle: { de: "de_DE-pavoque-low", fr: "fr_FR-gilles-low", es: "es_MX-ald-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-ruslan-medium", pt: "pt_BR-faber-medium" },
  darwin: { de: "de_DE-thorsten-medium", fr: "fr_FR-tom-medium", es: "es_ES-davefx-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-dmitri-medium", pt: "pt_BR-faber-medium" },
  socrates: { de: "de_DE-pavoque-low", fr: "fr_FR-gilles-low", es: "es_MX-ald-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-ruslan-medium", pt: "pt_BR-faber-medium" },
  tesla: { de: "de_DE-karlsson-low", fr: "fr_FR-gilles-low", es: "es_ES-sharvard-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-denis-medium", pt: "pt_BR-edresson-low" },
  cicero: { de: "de_DE-thorsten-medium", fr: "fr_FR-tom-medium", es: "es_ES-davefx-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-ruslan-medium", pt: "pt_BR-faber-medium" },
  davinci: { de: "de_DE-karlsson-low", fr: "fr_FR-tom-medium", es: "es_ES-sharvard-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-denis-medium", pt: "pt_BR-edresson-low" },
  confucius: { de: "de_DE-pavoque-low", fr: "fr_FR-gilles-low", es: "es_MX-ald-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-ruslan-medium", pt: "pt_BR-faber-medium" },
  aurelius: { de: "de_DE-thorsten-medium", fr: "fr_FR-tom-medium", es: "es_ES-davefx-medium", it: "it_IT-riccardo-x_low", ru: "ru_RU-dmitri-medium", pt: "pt_BR-faber-medium" },
};
// </voice-maps>
