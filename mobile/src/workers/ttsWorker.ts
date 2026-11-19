// Prosa Neural TTS Web Worker
// Runs Kokoro-82M completely off the main thread.
// Guarantees 60 FPS on the UI, zero blocking, and persistent caching in CacheStorage.

export interface WorkerSynthesisRequest {
  type: "WARMUP" | "SYNTHESIZE" | "PRELOAD";
  id?: string;
  payload: {
    text: string;
    lang: string;
    mentorId: string;
    speed?: number;
    voiceToken?: string;
  };
}

export interface WorkerSynthesisResponse {
  type: "WARMED_UP" | "SYNTHESIZED" | "PRELOADED" | "ERROR";
  id?: string;
  audioData?: Float32Array;
  samplingRate?: number;
  duration?: number;
  text?: string;
  lang?: string;
  mentorId?: string;
  speed?: number;
  voiceToken?: string;
  error?: string;
}

export const MENTOR_VOICE_MAP: Record<string, Record<string, string>> = {
  curie: { en: "bf_emma", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", de: "bf_emma", pt: "pf_dora" },
  davinci: { en: "am_michael", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", de: "am_michael", pt: "pm_alex" },
  einstein: { en: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", de: "bm_george", pt: "pm_alex" },
  feynman: { en: "am_fenrir", fr: "ff_siwis", es: "em_santa", it: "im_nicola", ja: "jm_kento", de: "am_fenrir", pt: "pm_santa" },
  lovelace: { en: "af_bella", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", de: "af_bella", pt: "pf_dora" },
  aurelius: { en: "bm_lewis", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", de: "bm_lewis", pt: "pm_alex" },
  goethe: { en: "bm_fable", de: "bm_fable", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  bingen: { en: "af_sarah", de: "af_sarah", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", pt: "pf_dora" },
  hildegard: { en: "af_sarah", de: "af_sarah", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", pt: "pf_dora" },
  machado: { en: "am_michael", pt: "pm_alex", fr: "ff_siwis", es: "em_alex", it: "im_nicola", de: "am_michael", ja: "jm_kento" },
  tesla: { en: "am_puck", de: "am_puck", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  hypatia: { en: "af_aoede", fr: "ff_siwis", es: "ef_dora", it: "if_sara", ja: "jf_alpha", de: "af_aoede", pt: "pf_dora" },
  humboldt: { en: "bm_lewis", de: "bm_lewis", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  spinoza: { en: "am_michael", de: "am_michael", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  descartes: { en: "bm_george", fr: "ff_siwis", de: "bm_george", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  galileo: { en: "am_fenrir", it: "im_nicola", de: "am_fenrir", fr: "ff_siwis", es: "em_alex", ja: "jm_kento", pt: "pm_alex" },
  galilei: { en: "am_fenrir", it: "im_nicola", de: "am_fenrir", fr: "ff_siwis", es: "em_alex", ja: "jm_kento", pt: "pm_alex" },
  leibniz: { en: "bm_george", de: "bm_george", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  plato: { en: "am_onyx", de: "am_onyx", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  aristotle: { en: "am_echo", de: "am_echo", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  socrates: { en: "bm_daniel", de: "bm_daniel", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  cicero: { en: "am_adam", de: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  confucius: { en: "am_adam", de: "am_adam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  newton: { en: "am_eric", de: "am_eric", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
  darwin: { en: "am_liam", de: "am_liam", fr: "ff_siwis", es: "em_alex", it: "im_nicola", ja: "jm_kento", pt: "pm_alex" },
};
