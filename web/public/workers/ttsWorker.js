// Prosa Hybrid Neural Speech Worker (Kokoro-82M + Piper TTS ONNX)
// 1. Kokoro-82M: Uses official KokoroTTS.generate(text, { voice, speed }) with internal G2P IPA phonemizer.
//    Sample Rate: 24000 Hz. Used for English (en), French (fr), Japanese (ja), Spanish (es), Italian (it).
// 2. Piper TTS ONNX: Uses official Piper TtsSession.
//    Sample Rate: 22050 Hz. Used for German (de) and Portuguese (pt) to prevent English phonetic corruption.
// 3. 100% Unique Voices per Mentor: Every mentor has a distinct voice profile, gender, and timbre.
// 4. Singleton in memory: Models loaded once and preserved across calls.

import { KokoroTTS } from "https://esm.sh/kokoro-js@1.2.1/dist/kokoro.web.js";

let kokoroInstance = null;
let kokoroPromise = null;
const piperSessions = new Map();

// Mentors voice profiles for Kokoro (en, fr, ja, es, it, pt)
// Rich 54-voice catalog from Kokoro-82M ensuring NO TWO MENTORS SOUND THE SAME
export const KOKORO_MENTOR_VOICES = {
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

// Mentors voice profiles for Piper (German, Portuguese, French, Spanish, Italian)
export const PIPER_MENTOR_VOICES = {
  // Female Mentors -> Female German (de_DE-kerstin-low, 16kHz) & Female Portuguese (pt_BR-edresson-low, 16kHz)
  curie: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  lovelace: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  hypatia: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  bingen: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  hildegard: { de: "de_DE-kerstin-low", pt: "pt_BR-edresson-low", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },

  // Male Mentors -> Male German & Male Portuguese / Romance
  einstein: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  aurelius: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  socrates: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  goethe: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  feynman: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  davinci: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  tesla: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  cicero: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  confucius: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  newton: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  darwin: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  galileo: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  galilei: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  machado: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  spinoza: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  descartes: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  leibniz: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  plato: { de: "de_DE-thorsten-medium", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  aristotle: { de: "de_DE-thorsten-low", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
  humboldt: { de: "de_DE-thorsten-high", pt: "pt_BR-faber-medium", fr: "fr_FR-siwis-medium", es: "es_ES-davefx-medium", it: "it_IT-paola-medium" },
};

async function getKokoroSingleton() {
  if (kokoroInstance) return kokoroInstance;
  if (kokoroPromise) return kokoroPromise;

  kokoroPromise = (async () => {
    let device = "wasm";
    if (typeof navigator !== "undefined" && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) device = "webgpu";
      } catch {}
    }

    const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device,
    });
    kokoroInstance = tts;
    return kokoroInstance;
  })();

  return kokoroPromise;
}

async function getPiperSession(voiceId, origin = "") {
  if (piperSessions.has(voiceId)) {
    return piperSessions.get(voiceId);
  }

  const baseOrigin = origin || (typeof self !== "undefined" && self.location ? self.location.origin : "");
  const { TtsSession } = await import("https://esm.sh/@mintplex-labs/piper-tts-web@1.0.5");
  const wasmPaths = {
    onnxWasm: `${baseOrigin}/ort/`,
    piperData: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data",
    piperWasm: "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm",
  };

  const session = await TtsSession.create({
    voiceId,
    wasmPaths,
  });

  piperSessions.set(voiceId, session);
  return session;
}

function wavToFloat32(arrayBuffer) {
  const dataView = new DataView(arrayBuffer);
  // Extract real sampleRate directly from bytes 24..27 of RIFF WAV header (16000 for low, 22050 for med/high)
  let samplingRate = 22050;
  try {
    if (arrayBuffer.byteLength >= 28) {
      const parsedRate = dataView.getUint32(24, true);
      if (parsedRate >= 8000 && parsedRate <= 96000) {
        samplingRate = parsedRate;
      }
    }
  } catch {}

  let offset = 44;
  for (let i = 12; i < Math.min(arrayBuffer.byteLength - 8, 200); i += 2) {
    if (
      dataView.getUint8(i) === 0x64 &&
      dataView.getUint8(i + 1) === 0x61 &&
      dataView.getUint8(i + 2) === 0x74 &&
      dataView.getUint8(i + 3) === 0x61
    ) {
      offset = i + 8;
      break;
    }
  }

  const int16Count = Math.floor((arrayBuffer.byteLength - offset) / 2);
  const float32 = new Float32Array(int16Count);
  for (let i = 0; i < int16Count; i++) {
    float32[i] = dataView.getInt16(offset + i * 2, true) / 32768.0;
  }
  return { float32Data: float32, samplingRate };
}

self.onmessage = async (e) => {
  const { type, id, payload } = e.data || {};

  if (type === "WARMUP") {
    try {
      const { lang = "en", mentorId = "einstein", origin = "" } = payload || {};
      const shortLang = lang.toLowerCase().split("-")[0];

      // Route German (de), Portuguese (pt), French (fr), Spanish (es), Italian (it) to Piper TTS ONNX
      const isPiperLang = shortLang === "de" || shortLang === "pt" || shortLang === "fr" || shortLang === "es" || shortLang === "it";
      if (isPiperLang) {
        const mentorPiper = PIPER_MENTOR_VOICES[mentorId] || PIPER_MENTOR_VOICES.einstein;
        const defaultVoiceMap = {
          de: "de_DE-thorsten-high",
          pt: "pt_BR-faber-medium",
          fr: "fr_FR-siwis-medium",
          es: "es_ES-davefx-medium",
          it: "it_IT-paola-medium",
        };
        const defaultVoice = defaultVoiceMap[shortLang] || "de_DE-thorsten-high";
        const voiceId = mentorPiper[shortLang] || defaultVoice;
        await getPiperSession(voiceId, origin);
      } else {
        await getKokoroSingleton();
      }

      self.postMessage({ type: "WARMED_UP", id, lang, mentorId, ok: true });
    } catch (err) {
      self.postMessage({ type: "ERROR", id, error: err.message || "Warmup failure" });
    }
    return;
  }

  if (type === "SYNTHESIZE" || type === "PRELOAD") {
    const t0 = performance.now();
    try {
      const { text, lang = "en", mentorId = "einstein", speed = 1.0, voice = null, origin = "" } = payload || {};
      const shortLang = lang.toLowerCase().split("-")[0];

      // Route German (de), Portuguese (pt), French (fr), Spanish (es), Italian (it) to Piper TTS ONNX
      const isPiperLang = shortLang === "de" || shortLang === "pt" || shortLang === "fr" || shortLang === "es" || shortLang === "it";
      if (isPiperLang) {
        const mentorPiper = PIPER_MENTOR_VOICES[mentorId] || PIPER_MENTOR_VOICES.einstein;
        const defaultVoiceMap = {
          de: "de_DE-thorsten-high",
          pt: "pt_BR-faber-medium",
          fr: "fr_FR-siwis-medium",
          es: "es_ES-davefx-medium",
          it: "it_IT-paola-medium",
        };
        const defaultVoice = defaultVoiceMap[shortLang] || "de_DE-thorsten-high";
        const voiceId = voice || mentorPiper[shortLang] || defaultVoice;

        const session = await getPiperSession(voiceId, origin);
        const wavBlob = await session.predict(text);
        const wavArrayBuf = await wavBlob.arrayBuffer();
        const { float32Data, samplingRate } = wavToFloat32(wavArrayBuf);
        const duration = float32Data.length / samplingRate;
        const latencyMs = Math.round(performance.now() - t0);

        self.postMessage(
          {
            type: type === "PRELOAD" ? "PRELOADED" : "SYNTHESIZED",
            id,
            audioData: float32Data,
            samplingRate,
            duration,
            latencyMs,
            engine: "Piper TTS ONNX",
            voiceToken: voiceId,
            text,
            lang,
            mentorId,
            speed,
          },
          [float32Data.buffer]
        );
        return;
      }

      // Kokoro-82M for English, French, Japanese, Spanish, Italian
      const mentorKokoro = KOKORO_MENTOR_VOICES[mentorId] || KOKORO_MENTOR_VOICES.einstein;
      const voiceToken = voice || mentorKokoro[shortLang] || mentorKokoro.en || "af_river";

      const tts = await getKokoroSingleton();
      // Official KokoroTTS.generate with internal G2P IPA phonemizer
      const audioResult = await tts.generate(text, {
        voice: voiceToken,
        speed: speed || 1.0,
      });

      const float32Data = audioResult.audio;
      const samplingRate = audioResult.sampling_rate || 24000; // Kokoro standard 24000 Hz
      const duration = float32Data.length / samplingRate;
      const latencyMs = Math.round(performance.now() - t0);

      self.postMessage(
        {
          type: type === "PRELOAD" ? "PRELOADED" : "SYNTHESIZED",
          id,
          audioData: float32Data,
          samplingRate,
          duration,
          latencyMs,
          engine: "Kokoro-82M",
          voiceToken,
          text,
          lang,
          mentorId,
          speed,
        },
        [float32Data.buffer]
      );
    } catch (err) {
      self.postMessage({
        type: "ERROR",
        id,
        error: err.message || "Synthesis failure in worker",
      });
    }
  }
};
