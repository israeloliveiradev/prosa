// Prosa Hybrid Neural Speech Worker (Kokoro-82M + Piper TTS ONNX)
// 1. Kokoro-82M: Uses official KokoroTTS.generate(text, { voice }) with internal G2P IPA phonemizer.
//    Sample Rate: 24000 Hz. Used for English (en), French (fr), Japanese (ja), Spanish (es), Italian (it).
// 2. Piper TTS ONNX: Uses official Piper TtsSession.
//    Sample Rate: 22050 Hz. Used for German (de) and Portuguese (pt) to prevent English phonetic corruption.
// 3. Singleton in memory: Models loaded once and preserved across calls.

export interface WorkerSynthesisRequest {
  type: "WARMUP" | "SYNTHESIZE" | "PRELOAD";
  id?: string;
  payload: {
    text: string;
    lang: string;
    mentorId: string;
    speed?: number;
    voice?: string;
    origin?: string;
  };
}

export interface WorkerSynthesisResponse {
  type: "WARMED_UP" | "SYNTHESIZED" | "PRELOADED" | "ERROR";
  id?: string;
  audioData?: Float32Array;
  samplingRate?: number;
  duration?: number;
  latencyMs?: number;
  engine?: string;
  text?: string;
  lang?: string;
  mentorId?: string;
  speed?: number;
  voiceToken?: string;
  error?: string;
}

export const KOKORO_MENTOR_VOICES: Record<string, Record<string, string>> = {
  curie: { en: "af_river", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha" },
  lovelace: { en: "af_bella", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha" },
  hypatia: { en: "af_bella", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha" },
  bingen: { en: "af_river", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha" },
  hildegard: { en: "af_river", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha" },
  einstein: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  aurelius: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  goethe: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  feynman: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  davinci: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  tesla: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  cicero: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  confucius: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  newton: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  darwin: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  galileo: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  galilei: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  machado: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  spinoza: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  descartes: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  leibniz: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  plato: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  aristotle: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  socrates: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
  humboldt: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento" },
};

export const PIPER_MENTOR_VOICES: Record<string, Record<string, string>> = {
  curie: { de: "de_DE-kerstin-low", pt: "pt_BR-faber-medium" },
  lovelace: { de: "de_DE-kerstin-low", pt: "pt_BR-faber-medium" },
  hypatia: { de: "de_DE-kerstin-low", pt: "pt_BR-faber-medium" },
  bingen: { de: "de_DE-kerstin-low", pt: "pt_BR-faber-medium" },
  hildegard: { de: "de_DE-kerstin-low", pt: "pt_BR-faber-medium" },
  einstein: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  aurelius: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  goethe: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  feynman: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  davinci: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  tesla: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  cicero: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  confucius: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  newton: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  darwin: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  galileo: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  galilei: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  machado: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  spinoza: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  descartes: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  leibniz: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  plato: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  aristotle: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  socrates: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  humboldt: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
};
