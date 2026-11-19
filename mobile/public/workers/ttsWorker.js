// Prosa Hybrid Neural Speech Worker (Kokoro-82M + Piper TTS ONNX)
// 1. Kokoro-82M: Uses official KokoroTTS.generate(text, { voice }) with internal G2P IPA phonemizer.
//    Sample Rate: 24000 Hz. Used for English (en), French (fr), Japanese (ja), Spanish (es), Italian (it).
// 2. Piper TTS ONNX: Uses official Piper TtsSession.
//    Sample Rate: 22050 Hz. Used for German (de) and Portuguese (pt) to prevent English phonetic corruption.
// 3. Singleton in memory: Models loaded once and preserved across calls.

import { KokoroTTS } from "https://esm.sh/kokoro-js@1.2.1/dist/kokoro.web.js";

let kokoroInstance = null;
let kokoroPromise = null;
const piperSessions = new Map();

// Mentors voice profiles for Kokoro (en, fr, ja, es, it)
export const KOKORO_MENTOR_VOICES = {
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

// Mentors voice profiles for Piper (de, pt)
export const PIPER_MENTOR_VOICES = {
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
  return float32;
}

self.onmessage = async (e) => {
  const { type, id, payload } = e.data || {};

  if (type === "WARMUP") {
    try {
      const { lang = "en", mentorId = "einstein", origin = "" } = payload || {};
      const shortLang = lang.toLowerCase().split("-")[0];

      if (shortLang === "de" || shortLang === "pt") {
        const mentorPiper = PIPER_MENTOR_VOICES[mentorId] || PIPER_MENTOR_VOICES.einstein;
        const voiceId = mentorPiper[shortLang] || (shortLang === "de" ? "de_DE-thorsten-high" : "pt_BR-faber-medium");
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

      // Route German (de) and Portuguese (pt) to Piper TTS ONNX
      if (shortLang === "de" || shortLang === "pt") {
        const mentorPiper = PIPER_MENTOR_VOICES[mentorId] || PIPER_MENTOR_VOICES.einstein;
        const defaultVoice = shortLang === "de" ? "de_DE-thorsten-high" : "pt_BR-faber-medium";
        const voiceId = voice || mentorPiper[shortLang] || defaultVoice;

        const session = await getPiperSession(voiceId, origin);
        const wavBlob = await session.predict(text);
        const wavArrayBuf = await wavBlob.arrayBuffer();
        const float32Data = wavToFloat32(wavArrayBuf);
        const samplingRate = 22050; // Piper standard sample rate
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
