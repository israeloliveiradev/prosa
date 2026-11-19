// Prosa Hybrid Neural Speech Worker (Kokoro-82M + Piper TTS ONNX)
// 1. Kokoro-82M: Uses official KokoroTTS.generate(text, { voice, speed }) with internal G2P IPA phonemizer.
//    Sample Rate: 24000 Hz. Used for English (en), French (fr), Japanese (ja), Spanish (es), Italian (it).
// 2. Piper TTS ONNX: Uses official Piper TtsSession.
//    Sample Rate: 22050 Hz. Used for German (de) and Portuguese (pt) to prevent English phonetic corruption.
// 3. 100% Unique Voices per Mentor: Every mentor has a distinct voice profile, gender, and timbre.
// 4. Singleton in memory: Models loaded once and preserved across calls.

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
  // Female Mentors
  curie: { en: "bf_emma", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", pt: "pf_dora" },
  lovelace: { en: "af_bella", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", pt: "pf_dora" },
  hypatia: { en: "af_aoede", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", pt: "pf_dora" },
  bingen: { en: "af_sarah", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_tebukuro", pt: "pf_dora" },
  hildegard: { en: "af_sarah", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_tebukuro", pt: "pf_dora" },

  // Male Mentors (Grave, Paused, Solemn)
  einstein: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  aurelius: { en: "bm_lewis", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  socrates: { en: "bm_daniel", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  goethe: { en: "bm_fable", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  plato: { en: "am_echo", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  aristotle: { en: "am_onyx", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  confucius: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  descartes: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  leibniz: { en: "bm_fable", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  humboldt: { en: "bm_lewis", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  spinoza: { en: "am_echo", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  darwin: { en: "am_liam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },

  // Male Mentors (Expressive, Agile, Dynamic)
  feynman: { en: "am_michael", fr: "ff_siwis", es: "em_santa", it: "im_nicola", ja: "jm_kumo", pt: "pm_santa" },
  davinci: { en: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  tesla: { en: "am_puck", fr: "ff_siwis", es: "em_santa", it: "im_nicola", ja: "jm_kumo", pt: "pm_santa" },
  cicero: { en: "am_eric", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  newton: { en: "am_eric", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  galileo: { en: "am_fenrir", fr: "ff_siwis", es: "em_santa", it: "im_nicola", ja: "jm_kumo", pt: "pm_santa" },
  galilei: { en: "am_fenrir", fr: "ff_siwis", es: "em_santa", it: "im_nicola", ja: "jm_kumo", pt: "pm_santa" },
  machado: { en: "am_michael", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
};

export const PIPER_MENTOR_VOICES: Record<string, Record<string, string>> = {
  // Female Mentors -> Female German (de_DE-kerstin-low) & Female Portuguese (pt_BR-edresson-low)
  curie: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low" },
  lovelace: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low" },
  hypatia: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low" },
  bingen: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low" },
  hildegard: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low" },

  // Male Mentors -> Male German & Male Portuguese
  einstein: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  aurelius: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium" },
  socrates: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium" },
  goethe: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  feynman: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  davinci: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  tesla: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  cicero: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  confucius: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium" },
  newton: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  darwin: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  galileo: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  galilei: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  machado: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  spinoza: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  descartes: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  leibniz: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
  plato: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium" },
  aristotle: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium" },
  humboldt: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium" },
};
