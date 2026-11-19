// Prosa Neural TTS Standalone Web Worker
// Automatically instantiated by SpeechService.
// Runs Kokoro-82M completely off the main UI thread.
// Guarantees 60 FPS on the UI, zero blocking, and persistent caching in CacheStorage.

import { StyleTextToSpeech2Model, AutoTokenizer, Tensor, RawAudio } from "https://esm.sh/@huggingface/transformers@3.5.1";
import { phonemize } from "https://esm.sh/phonemizer@1.2.1";

const VOICE_CACHE = new Map();

export const MENTOR_VOICE_MAP = {
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

let kokoroModel = null;
let kokoroTokenizer = null;
let isInitializingKokoro = false;

async function getKokoroEngine() {
  if (kokoroModel && kokoroTokenizer) {
    return { model: kokoroModel, tokenizer: kokoroTokenizer };
  }
  if (isInitializingKokoro) {
    while (isInitializingKokoro) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return { model: kokoroModel, tokenizer: kokoroTokenizer };
  }

  isInitializingKokoro = true;
  try {
    let device = "wasm";
    if (typeof navigator !== "undefined" && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) device = "webgpu";
      } catch {}
    }

    const modelPromise = StyleTextToSpeech2Model.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX",
      { dtype: "q8", device }
    );
    const tokenizerPromise = AutoTokenizer.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX"
    );

    const [m, t] = await Promise.all([modelPromise, tokenizerPromise]);
    kokoroModel = m;
    kokoroTokenizer = t;
    return { model: kokoroModel, tokenizer: kokoroTokenizer };
  } finally {
    isInitializingKokoro = false;
  }
}

async function fetchVoiceFile(voiceToken) {
  if (VOICE_CACHE.has(voiceToken)) {
    return VOICE_CACHE.get(voiceToken);
  }

  const url = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${voiceToken}.bin`;
  let arrayBuf = null;

  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open("kokoro-voices-v1");
      const matched = await cache.match(url);
      if (matched) {
        arrayBuf = await matched.arrayBuffer();
      } else {
        const res = await fetch(url);
        const clone = res.clone();
        await cache.put(url, clone);
        arrayBuf = await res.arrayBuffer();
      }
    } catch (e) {
      // Fallback to fetch
    }
  }

  if (!arrayBuf) {
    const res = await fetch(url);
    arrayBuf = await res.arrayBuffer();
  }

  const voiceFloat32 = new Float32Array(arrayBuf);
  VOICE_CACHE.set(voiceToken, voiceFloat32);
  return voiceFloat32;
}

self.onmessage = async (e) => {
  const { type, id, payload } = e.data || {};

  if (type === "WARMUP") {
    try {
      const { lang = "en", mentorId = "einstein" } = payload || {};
      const shortLang = lang.toLowerCase().split("-")[0];
      const mentorVoices = MENTOR_VOICE_MAP[mentorId] || MENTOR_VOICE_MAP.einstein;
      const voiceToken = mentorVoices[shortLang] || mentorVoices.en || "bm_george";

      await Promise.all([getKokoroEngine(), fetchVoiceFile(voiceToken)]);
      self.postMessage({ type: "WARMED_UP", id, lang, mentorId, ok: true });
    } catch (err) {
      self.postMessage({ type: "ERROR", id, error: err.message });
    }
    return;
  }

  if (type === "SYNTHESIZE" || type === "PRELOAD") {
    try {
      const { text, lang = "en", mentorId = "einstein", speed = 1.0 } = payload || {};
      const shortLang = lang.toLowerCase().split("-")[0];
      const mentorVoices = MENTOR_VOICE_MAP[mentorId] || MENTOR_VOICE_MAP.einstein;
      const voiceToken = mentorVoices[shortLang] || mentorVoices.en || "bm_george";

      const { model, tokenizer } = await getKokoroEngine();
      const voiceData = await fetchVoiceFile(voiceToken);

      const langCode = shortLang === "en" ? "en-us" : shortLang;
      let phonemeStr = text;
      try {
        const phonemes = await phonemize(text, langCode);
        phonemeStr = Array.isArray(phonemes) ? phonemes.join(" ") : String(phonemes);
      } catch {
        phonemeStr = text;
      }

      const { input_ids } = tokenizer(phonemeStr, { truncation: true });
      const index = 256 * Math.min(Math.max(input_ids.dims.at(-1) - 2, 0), 509);
      const styleSlice = voiceData.slice(index, index + 256);

      const inputs = {
        input_ids,
        style: new Tensor("float32", styleSlice, [1, 256]),
        speed: new Tensor("float32", [speed], [1]),
      };

      const { waveform } = await model(inputs);
      const rawAudio = new RawAudio(waveform.data, 24000);

      // Post message with transferable ArrayBuffer
      self.postMessage(
        {
          type: type === "PRELOAD" ? "PRELOADED" : "SYNTHESIZED",
          id,
          audioData: rawAudio.audio,
          samplingRate: rawAudio.sampling_rate || 24000,
          duration: rawAudio.audio.length / (rawAudio.sampling_rate || 24000),
          text,
          lang,
          mentorId,
          speed,
          voiceToken,
        },
        [rawAudio.audio.buffer]
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
