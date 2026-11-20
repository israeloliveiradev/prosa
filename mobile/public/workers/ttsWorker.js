// Prosa — worker de síntese de voz no aparelho (servido cru em /workers/ttsWorker.js, sem bundler).
//
// - Kokoro-82M (kokoro-js 1.2.1, q8, WASM, 24 kHz) para inglês.
// - Piper (@mintplex-labs/piper-tts-web 1.0.5) para de, fr, es, it, ru e pt.
// - Japonês não passa por aqui: ele usa Web Speech no AudioService.
//
// Protocolo (tipos em src/workers/ttsWorker.ts):
//   SYNTHESIZE {engine, voice, lang, chunks[], priority} → SYNTH_PART (um por trecho) … SYNTHESIZED
//   PRELOAD {engine, voice, lang}                         → MODEL_PROGRESS … MODEL_READY, PRELOADED
//   PRIORITIZE {id}                                       → passa um pedido de pré-carga para a frente
//   INSPECT                                               → INSPECTED {piperStored, kokoroCached}
//
// Carregar modelos acontece fora da fila; a inferência é uma por vez (sessões ONNX não são reentrantes).
// Os mapas entre <voice-maps> são cópia literal de src/workers/ttsWorker.ts (teste de paridade).

const ORT_VERSION = "1.22.0-dev.20250409-89f8206ba4"; // mesmo build dos arquivos em /ort
const KOKORO_MODULE_URL = "https://esm.sh/kokoro-js@1.2.1/dist/kokoro.web.js";
const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const KOKORO_MODEL_FILE_URL = `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/onnx/model_quantized.onnx`;
const PIPER_MODULE_URL = `https://esm.sh/@mintplex-labs/piper-tts-web@1.0.5?deps=onnxruntime-web@${ORT_VERSION}`;
const PIPER_WASM_BASE = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
const PIPER_SESSION_LIMIT = 3;
const WARM_TEXT = "OK.";

// <voice-maps>
export const ENGINE_BY_LANG = {
  en: "kokoro",
  de: "piper",
  fr: "piper",
  es: "piper",
  it: "piper",
  ru: "piper",
  pt: "piper",
  ja: "webspeech",
};

export const DEFAULT_VOICE_BY_LANG = {
  en: "af_heart",
  de: "de_DE-thorsten-medium",
  fr: "fr_FR-siwis-medium",
  es: "es_ES-davefx-medium",
  it: "it_IT-paola-medium",
  ru: "ru_RU-irina-medium",
  pt: "pt_BR-faber-medium",
  ja: "webspeech:ja-JP",
};

export const KOKORO_VOICES = {
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

export const PIPER_VOICES = {
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
export const KOKORO_MENTOR_VOICES = {
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
export const PIPER_MENTOR_VOICES = {
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

let kokoroPromise = null;
const kokoroFiles = new Map();
let piperModulePromise = null;
const piperSessions = new Map();

const queue = [];
const waiting = new Map();
let running = false;
let sequence = 0;

function post(message, transfer) {
  self.postMessage(message, transfer || []);
}

function errorText(error, fallback) {
  if (error && typeof error.message === "string" && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

function shortLang(lang) {
  return String(lang || "").trim().toLowerCase().slice(0, 2);
}

// Resolve motor e voz com os mesmos mapas do app; ids desconhecidos caem na voz padrão do idioma.
function resolveVoice(payload) {
  const lang = shortLang(payload.lang);
  const engine = payload.engine || ENGINE_BY_LANG[lang];
  if (engine === "kokoro") {
    const voice = payload.voice && KOKORO_VOICES[payload.voice] ? payload.voice : DEFAULT_VOICE_BY_LANG.en;
    return { engine, voice };
  }
  if (engine === "piper") {
    const info = payload.voice ? PIPER_VOICES[payload.voice] : null;
    if (info && (!lang || info.lang === lang)) return { engine, voice: payload.voice };
    const fallback = DEFAULT_VOICE_BY_LANG[lang];
    if (fallback && PIPER_VOICES[fallback]) return { engine, voice: fallback };
    throw new Error(`no-piper-voice:${lang}`);
  }
  throw new Error(`unsupported-engine:${engine || lang}`);
}

function loadKokoro() {
  if (!kokoroPromise) {
    kokoroPromise = (async () => {
      const { KokoroTTS } = await import(KOKORO_MODULE_URL);
      const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (info) => {
          if (!info || !info.file) return;
          if (info.status === "progress" && typeof info.total === "number" && info.total > 0) {
            kokoroFiles.set(info.file, { loaded: info.loaded || 0, total: info.total });
          } else if (info.status === "done") {
            const previous = kokoroFiles.get(info.file);
            if (!previous) return;
            kokoroFiles.set(info.file, { loaded: previous.total, total: previous.total });
          } else {
            return;
          }
          let loaded = 0;
          let total = 0;
          for (const file of kokoroFiles.values()) {
            loaded += file.loaded;
            total += file.total;
          }
          post({ type: "MODEL_PROGRESS", engine: "kokoro", voice: null, loaded, total, file: info.file });
        },
      });
      post({ type: "MODEL_READY", engine: "kokoro", voice: null });
      return tts;
    })();
    kokoroPromise.catch(() => {
      kokoroPromise = null;
    });
  }
  return kokoroPromise;
}

function loadPiperModule() {
  if (!piperModulePromise) {
    piperModulePromise = import(PIPER_MODULE_URL);
    piperModulePromise.catch(() => {
      piperModulePromise = null;
    });
  }
  return piperModulePromise;
}

function loadPiper(voiceId, origin) {
  const existing = piperSessions.get(voiceId);
  if (existing) {
    piperSessions.delete(voiceId);
    piperSessions.set(voiceId, existing);
    return existing;
  }
  const promise = (async () => {
    const { TtsSession } = await loadPiperModule();
    const base = origin || (self.location ? self.location.origin : "");
    // O TtsSession guarda um singleton e devolve o PRIMEIRO modelo para qualquer voiceId.
    // Zerar antes de criar garante um modelo por voz (o construtor roda na mesma volta síncrona).
    TtsSession._instance = null;
    const session = await TtsSession.create({
      voiceId,
      wasmPaths: {
        onnxWasm: `${base}/ort/`,
        piperData: `${PIPER_WASM_BASE}.data`,
        piperWasm: `${PIPER_WASM_BASE}.wasm`,
      },
      progress: (info) => {
        if (!info || !info.url || String(info.url).startsWith("tts://")) return;
        post({ type: "MODEL_PROGRESS", engine: "piper", voice: voiceId, loaded: info.loaded || 0, total: info.total || 0, file: info.url });
      },
    });
    TtsSession._instance = null;
    post({ type: "MODEL_READY", engine: "piper", voice: voiceId });
    return session;
  })();
  piperSessions.set(voiceId, promise);
  promise.catch(() => {
    if (piperSessions.get(voiceId) === promise) piperSessions.delete(voiceId);
  });
  while (piperSessions.size > PIPER_SESSION_LIMIT) {
    const oldest = piperSessions.keys().next().value;
    piperSessions.delete(oldest);
  }
  return promise;
}

function loadModel(engine, voice, origin) {
  return engine === "kokoro" ? loadKokoro() : loadPiper(voice, origin);
}

function wavToFloat32(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const tag = (offset) =>
    String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
  if (arrayBuffer.byteLength < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("piper-wav-invalid");
  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  while (offset + 8 <= arrayBuffer.byteLength) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true) || 1;
      sampleRate = view.getUint32(body + 4, true);
    } else if (id === "data") {
      const bytes = Math.min(size, arrayBuffer.byteLength - body);
      const frames = Math.floor(bytes / (2 * channels));
      const samples = new Float32Array(frames);
      for (let frame = 0; frame < frames; frame += 1) {
        samples[frame] = view.getInt16(body + frame * 2 * channels, true) / 32768;
      }
      if (!sampleRate) throw new Error("piper-wav-invalid");
      return { samples, sampleRate };
    }
    offset = body + size + (size % 2);
  }
  throw new Error("piper-wav-invalid");
}

function ownBuffer(samples) {
  if (samples.byteOffset === 0 && samples.byteLength === samples.buffer.byteLength && samples.buffer instanceof ArrayBuffer) {
    return samples;
  }
  return samples.slice();
}

async function inferChunk(engine, voice, origin, text) {
  if (engine === "kokoro") {
    const tts = await loadKokoro();
    // Velocidade sempre 1: a velocidade de escuta é aplicada uma vez só, no <audio> com preservesPitch.
    const out = await tts.generate(text, { voice, speed: 1 });
    return { samples: out.audio, sampleRate: out.sampling_rate || 24000 };
  }
  const session = await loadPiper(voice, origin);
  const blob = await session.predict(text);
  return wavToFloat32(await blob.arrayBuffer());
}

function enqueue(job) {
  queue.push(job);
  void pump();
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      const job = queue.shift();
      waiting.delete(job.id);
      try {
        await job.run();
      } catch (error) {
        post({ type: "ERROR", id: job.id, error: errorText(error, "synthesis-failed") });
      }
    }
  } finally {
    running = false;
  }
}

function synthesize(message) {
  const payload = message.payload || {};
  let target;
  try {
    target = resolveVoice(payload);
  } catch (error) {
    post({ type: "ERROR", id: message.id, error: errorText(error, "synthesis-failed") });
    return;
  }
  const chunks = Array.isArray(payload.chunks) && payload.chunks.length > 0 ? payload.chunks : [String(payload.text || "")];
  const texts = chunks.map((chunk) => String(chunk || "").trim()).filter((chunk) => chunk.length > 0);
  if (texts.length === 0) {
    post({ type: "ERROR", id: message.id, error: "empty-text" });
    return;
  }
  const job = {
    id: message.id,
    priority: typeof payload.priority === "number" ? payload.priority : 0,
    seq: sequence++,
    run: async () => {
      const started = performance.now();
      let sampleRate = 0;
      for (let index = 0; index < texts.length; index += 1) {
        const out = await inferChunk(target.engine, target.voice, payload.origin, texts[index]);
        const data = ownBuffer(out.samples);
        sampleRate = out.sampleRate;
        post({ type: "SYNTH_PART", id: message.id, index, audioData: data, samplingRate: out.sampleRate }, [data.buffer]);
      }
      post({
        type: "SYNTHESIZED",
        id: message.id,
        engine: target.engine,
        voice: target.voice,
        samplingRate: sampleRate,
        parts: texts.length,
        latencyMs: Math.round(performance.now() - started),
      });
    },
  };
  waiting.set(message.id, job);
  loadModel(target.engine, target.voice, payload.origin).then(
    () => enqueue(job),
    (error) => {
      waiting.delete(message.id);
      post({ type: "ERROR", id: message.id, error: errorText(error, "model-load-failed") });
    },
  );
}

function preload(message) {
  const payload = message.payload || {};
  let target;
  try {
    target = resolveVoice(payload);
  } catch (error) {
    post({ type: "ERROR", id: message.id, error: errorText(error, "model-load-failed") });
    return;
  }
  loadModel(target.engine, target.voice, payload.origin).then(
    () => {
      // Um trecho curto busca o estilo da voz (Kokoro) ou o fonemizador (Piper) e aquece a sessão.
      enqueue({
        id: message.id,
        priority: 1,
        seq: sequence++,
        run: async () => {
          await inferChunk(target.engine, target.voice, payload.origin, WARM_TEXT);
          post({ type: "PRELOADED", id: message.id, engine: target.engine, voice: target.voice });
        },
      });
    },
    (error) => post({ type: "ERROR", id: message.id, error: errorText(error, "model-load-failed") }),
  );
}

async function inspect(message) {
  const piperStored = [];
  let kokoroCached = false;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle("piper", { create: true });
    for await (const name of dir.keys()) {
      const id = name.endsWith(".onnx") ? name.slice(0, -5) : "";
      if (id && PIPER_VOICES[id]) piperStored.push(id);
    }
  } catch {
    // OPFS indisponível: nada guardado.
  }
  try {
    const cache = await caches.open("transformers-cache");
    kokoroCached = Boolean(await cache.match(KOKORO_MODEL_FILE_URL));
  } catch {
    kokoroCached = false;
  }
  post({ type: "INSPECTED", id: message.id, piperStored, kokoroCached });
}

self.onmessage = (event) => {
  const message = event.data || {};
  switch (message.type) {
    case "SYNTHESIZE":
      synthesize(message);
      return;
    case "PRELOAD":
    case "WARMUP":
      preload(message);
      return;
    case "PRIORITIZE": {
      const job = waiting.get(message.id);
      if (job) job.priority = 0;
      return;
    }
    case "INSPECT":
      void inspect(message);
      return;
    default:
      post({ type: "ERROR", id: message.id, error: `unknown-message:${message.type}` });
  }
};
