// Prosa — worker de síntese de voz no aparelho (servido cru em /workers/ttsWorker.js, sem bundler).
//
// - Kokoro-82M (kokoro-js 1.2.1, 24 kHz) para inglês: pela placa de vídeo (WebGPU, fp32) quando o
//   aparelho tem um adaptador de verdade, senão no processador (WASM, q8). Se o WebGPU falhar ao
//   carregar, devolver áudio inválido ou cair no meio do uso, o worker volta sozinho para o WASM.
// - Piper (@mintplex-labs/piper-tts-web 1.0.5) para de, fr, es, it, ru e pt, e as vozes rápidas em
//   inglês (en_US/en_GB) que o guarda de velocidade usa quando o Kokoro é lento no aparelho.
// - Japonês não passa por aqui: ele usa Web Speech no AudioService.
//
// Protocolo (tipos em src/workers/ttsWorker.ts; os campos novos estão em src/services/speechService.ts):
//   SYNTHESIZE {engine, voice, lang, chunks[], priority} → SYNTH_PART (um por trecho, com inferMs,
//                                                           cold e device) … SYNTHESIZED
//   PRELOAD {engine, voice, lang}                         → MODEL_PROGRESS … MODEL_READY, PRELOADED
//   BENCH {engine, voice, lang, text}                     → BENCHED {inferMs, audioMs, device}
//   PRIORITIZE {id}                                       → passa um pedido de pré-carga para a frente
//   DROP {ids[]}                                          → tira da fila (ou para no próximo trecho) a pré-carga
//   CONFIG {kokoroDevice: auto|webgpu|wasm}               → escolha do dispositivo do Kokoro (testes)
//   INSPECT                                               → INSPECTED {piperStored, kokoroCached, kokoroDevice}
//
// Carregar modelos acontece fora da fila; a inferência é uma por vez (sessões ONNX não são reentrantes).
// Os mapas entre <voice-maps> são cópia literal de src/workers/ttsWorker.ts; o mapa das vozes
// rápidas em inglês (fast-en-voices) é cópia de src/services/audio/fastVoices.ts (testes de paridade).

const ORT_VERSION = "1.22.0-dev.20250409-89f8206ba4"; // mesmo build dos arquivos em /ort
const KOKORO_MODULE_URL = "https://esm.sh/kokoro-js@1.2.1/dist/kokoro.web.js";
const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
// fp32 é o recomendado pelo kokoro-js para WebGPU. Medido (Intel Iris Xe): fp16 e q4f16 são um pouco
// mais rápidos, mas a saída passa de 1,0 (estoura); q8 no WebGPU é tão lento quanto o WASM.
const KOKORO_DTYPE = { webgpu: "fp32", wasm: "q8" };
const KOKORO_MODEL_FILE = { webgpu: "model.onnx", wasm: "model_quantized.onnx" };
const kokoroFileUrl = (device) => `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/onnx/${KOKORO_MODEL_FILE[device]}`;
// Adaptadores por software (CPU emulando GPU) são mais lentos que o WASM.
const SOFTWARE_GPU = /swiftshader|llvmpipe|lavapipe|softpipe|basic render/i;
const PIPER_MODULE_URL = `https://esm.sh/@mintplex-labs/piper-tts-web@1.0.5?deps=onnxruntime-web@${ORT_VERSION}`;
const PIPER_WASM_BASE = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
// O ORT do Piper vem do jsdelivr, no mesmo build de /ort (bytes idênticos, conferido por sha256).
// Servido pelo Metro em desenvolvimento, o .wasm de 11 MB levava minutos; pelo CDN, menos de 1 s.
const ORT_WASM_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
// O mesmo módulo do ORT que o piper-tts-web importa pelo esm.sh (mesma URL = mesma instância).
const PIPER_ORT_MODULE_URL = `https://esm.sh/onnxruntime-web@${ORT_VERSION}/es2022/wasm.mjs`;
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

// <fast-en-voices>
export const PIPER_EN_VOICES = {
  "en_US-lessac-medium": { lang: "en", name: "Lessac", gender: "female", accent: "US", sampleRate: 22050 },
  "en_US-ryan-medium": { lang: "en", name: "Ryan", gender: "male", accent: "US", sampleRate: 22050 },
  "en_GB-cori-medium": { lang: "en", name: "Cori", gender: "female", accent: "GB", sampleRate: 22050 },
  "en_GB-alan-medium": { lang: "en", name: "Alan", gender: "male", accent: "GB", sampleRate: 22050 },
};
// </fast-en-voices>

let kokoroPromise = null;
let kokoroInfo = null; // { device, dtype } do Kokoro carregado
let kokoroDevicePref = "auto"; // CONFIG: auto | webgpu | wasm
const kokoroFiles = new Map();
let piperModulePromise = null;
const piperSessions = new Map();
// Vozes que já rodaram uma vez desde o carregamento (a primeira inferência inclui compilação e o
// download do estilo da voz, então não serve para medir a velocidade).
const warmed = new Set();

const queue = [];
const waiting = new Map();
let running = false;
let current = null; // job em execução (DROP pode pará-lo entre um trecho e outro)
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

function piperInfo(voice) {
  if (!voice) return null;
  return PIPER_VOICES[voice] || PIPER_EN_VOICES[voice] || null;
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
    const info = piperInfo(payload.voice);
    if (info && (!lang || info.lang === lang)) return { engine, voice: payload.voice };
    const fallback = DEFAULT_VOICE_BY_LANG[lang];
    if (fallback && PIPER_VOICES[fallback]) return { engine, voice: fallback };
    throw new Error(`no-piper-voice:${lang}`);
  }
  throw new Error(`unsupported-engine:${engine || lang}`);
}

async function gpuAdapter() {
  try {
    if (!self.navigator || !navigator.gpu) return null;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const info = adapter.info || {};
    return {
      vendor: String(info.vendor || ""),
      architecture: String(info.architecture || ""),
      fallback: Boolean(info.isFallbackAdapter || adapter.isFallbackAdapter),
    };
  } catch {
    return null;
  }
}

// WebGPU só com adaptador de verdade (não o de software); CONFIG pode forçar um dos dois.
async function pickKokoroDevice() {
  if (kokoroDevicePref === "wasm") return { device: "wasm", gpu: null };
  const gpu = await gpuAdapter();
  if (!gpu) return { device: "wasm", gpu: null };
  if (kokoroDevicePref === "webgpu") return { device: "webgpu", gpu };
  if (gpu.fallback || SOFTWARE_GPU.test(`${gpu.vendor} ${gpu.architecture}`)) return { device: "wasm", gpu };
  return { device: "webgpu", gpu };
}

// Áudio utilizável: tem amostras, nenhuma NaN/infinita e não é silêncio.
function audioLooksValid(samples) {
  if (!samples || !samples.length) return false;
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index];
    if (!Number.isFinite(value)) return false;
    const magnitude = Math.abs(value);
    if (magnitude > peak) peak = magnitude;
  }
  return peak > 0.005;
}

function kokoroProgress(info) {
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
}

function loadKokoro() {
  if (!kokoroPromise) {
    const promise = (async () => {
      const { KokoroTTS } = await import(KOKORO_MODULE_URL);
      const attempt = async (device) => {
        kokoroFiles.clear();
        const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
          dtype: KOKORO_DTYPE[device],
          device,
          progress_callback: kokoroProgress,
        });
        // Confere a saída antes de usar: driver ruim pode devolver NaN ou silêncio no WebGPU.
        // Também compila o grafo (no WebGPU a primeira inferência leva vários segundos).
        const probe = await tts.generate(WARM_TEXT, { voice: DEFAULT_VOICE_BY_LANG.en, speed: 1 });
        if (!audioLooksValid(probe.audio)) throw new Error(`kokoro-${device}-invalid-output`);
        warmed.add(`kokoro:${DEFAULT_VOICE_BY_LANG.en}`);
        return tts;
      };
      const pick = await pickKokoroDevice();
      let device = pick.device;
      let tts;
      try {
        tts = await attempt(device);
      } catch (error) {
        if (device !== "webgpu") throw error;
        post({ type: "MODEL_FALLBACK", engine: "kokoro", voice: null, from: "webgpu", device: "wasm", error: errorText(error, "webgpu-failed") });
        device = "wasm";
        tts = await attempt(device);
      }
      kokoroInfo = { device, dtype: KOKORO_DTYPE[device] };
      post({ type: "MODEL_READY", engine: "kokoro", voice: null, device, dtype: KOKORO_DTYPE[device], gpu: pick.gpu });
      return tts;
    })();
    kokoroPromise = promise;
    promise.catch(() => {
      if (kokoroPromise === promise) kokoroPromise = null;
    });
  }
  return kokoroPromise;
}

// O WebGPU caiu no meio do uso (dispositivo perdido, erro do driver): descarta e volta ao WASM.
function dropKokoroGpu(error) {
  for (const key of [...warmed]) {
    if (key.startsWith("kokoro:")) warmed.delete(key);
  }
  kokoroPromise = null;
  kokoroInfo = null;
  kokoroDevicePref = "wasm";
  post({ type: "MODEL_FALLBACK", engine: "kokoro", voice: null, from: "webgpu", device: "wasm", error: errorText(error, "webgpu-failed") });
}

// <legacy-phonemes>
// Modelos Piper antigos (piper 0.2.0: as vozes low/x_low do catálogo) têm 130 símbolos; o fonemizador
// do piper-tts-web usa a tabela nova (até 151), sem olhar a do modelo, e a inferência quebra em
// palavras comuns ("Geschichte", "bonjour"). A tabela antiga é prefixo exato da nova: o que passa do
// limite são dígitos, diacríticos combinantes e marcas de entonação, que o fonemizador antigo pulava.
// Única exceção: "ç" saía pré-composto (id 40); o novo manda "c" (16) + cedilha combinante (140).
function remapLegacyPhonemeIds(ids, maxId) {
  const PAD = 0;
  const C = 16;
  const C_CEDILLA = 40;
  const COMBINING_CEDILLA = 140;
  const out = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (id <= maxId) {
      out.push(id);
      continue;
    }
    if (id === COMBINING_CEDILLA && C_CEDILLA <= maxId) {
      let last = out.length - 1;
      while (last >= 0 && out[last] === PAD) last -= 1;
      if (last >= 0 && out[last] === C) out[last] = C_CEDILLA;
    }
    // Cada fonema vem seguido de um PAD: some junto com o fonema descartado.
    if (ids[index + 1] === PAD && out[out.length - 1] === PAD) index += 1;
  }
  return out;
}
// </legacy-phonemes>

// Se o ORT recusar ids fora da tabela do modelo, refaz uma vez com a tabela antiga.
let piperOrtPatch = null;
function patchPiperOrt() {
  if (!piperOrtPatch) {
    piperOrtPatch = import(PIPER_ORT_MODULE_URL)
      .then((module) => {
        const ort = module.default || module;
        const proto = ort && ort.InferenceSession && ort.InferenceSession.prototype;
        if (!proto || proto.__prosaLegacyPhonemes) return;
        const run = proto.run;
        proto.run = async function runWithLegacyPhonemes(feeds, ...rest) {
          try {
            return await run.call(this, feeds, ...rest);
          } catch (error) {
            const match = /inclusive range \[-?\d+,\s*(\d+)\]/.exec(errorText(error, ""));
            if (!match || !feeds || !feeds.input || !feeds.input_lengths) throw error;
            const ids = remapLegacyPhonemeIds(Array.from(feeds.input.data, Number), Number(match[1]));
            const fixed = {
              ...feeds,
              input: new ort.Tensor("int64", ids, [1, ids.length]),
              input_lengths: new ort.Tensor("int64", [ids.length]),
            };
            return run.call(this, fixed, ...rest);
          }
        };
        proto.__prosaLegacyPhonemes = true;
      })
      .catch(() => undefined);
  }
  return piperOrtPatch;
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

function loadPiper(voiceId) {
  const existing = piperSessions.get(voiceId);
  if (existing) {
    piperSessions.delete(voiceId);
    piperSessions.set(voiceId, existing);
    return existing;
  }
  const promise = (async () => {
    const [{ TtsSession }] = await Promise.all([loadPiperModule(), patchPiperOrt()]);
    // O TtsSession guarda um singleton e devolve o PRIMEIRO modelo para qualquer voiceId.
    // Zerar antes de criar garante um modelo por voz (o construtor roda na mesma volta síncrona).
    TtsSession._instance = null;
    const session = await TtsSession.create({
      voiceId,
      wasmPaths: {
        onnxWasm: ORT_WASM_BASE,
        piperData: `${PIPER_WASM_BASE}.data`,
        piperWasm: `${PIPER_WASM_BASE}.wasm`,
      },
      progress: (info) => {
        if (!info || !info.url || String(info.url).startsWith("tts://")) return;
        post({ type: "MODEL_PROGRESS", engine: "piper", voice: voiceId, loaded: info.loaded || 0, total: info.total || 0, file: info.url });
      },
    });
    TtsSession._instance = null;
    post({ type: "MODEL_READY", engine: "piper", voice: voiceId, device: "wasm" });
    return session;
  })();
  piperSessions.set(voiceId, promise);
  promise.catch(() => {
    if (piperSessions.get(voiceId) === promise) piperSessions.delete(voiceId);
  });
  while (piperSessions.size > PIPER_SESSION_LIMIT) {
    const oldest = piperSessions.keys().next().value;
    piperSessions.delete(oldest);
    warmed.delete(`piper:${oldest}`);
  }
  return promise;
}

function loadModel(engine, voice) {
  return engine === "kokoro" ? loadKokoro() : loadPiper(voice);
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

// Uma inferência, com o tempo gasto nela (sem download), o dispositivo e se a voz estava fria.
async function inferChunk(engine, voice, text) {
  const key = `${engine}:${voice}`;
  const cold = !warmed.has(key);
  if (engine === "kokoro") {
    const tts = await loadKokoro();
    const device = kokoroInfo ? kokoroInfo.device : "wasm";
    const started = performance.now();
    let out;
    try {
      // Velocidade sempre 1: a velocidade de escuta é aplicada uma vez só, no <audio> com preservesPitch.
      out = await tts.generate(text, { voice, speed: 1 });
      if (device === "webgpu" && !audioLooksValid(out.audio)) throw new Error("kokoro-webgpu-invalid-output");
    } catch (error) {
      if (device !== "webgpu") throw error;
      dropKokoroGpu(error);
      return inferChunk(engine, voice, text);
    }
    const inferMs = performance.now() - started;
    warmed.add(key);
    return { samples: out.audio, sampleRate: out.sampling_rate || 24000, inferMs, cold, device };
  }
  const session = await loadPiper(voice);
  const started = performance.now();
  const blob = await session.predict(text);
  const decoded = wavToFloat32(await blob.arrayBuffer());
  const inferMs = performance.now() - started;
  warmed.add(key);
  return { samples: decoded.samples, sampleRate: decoded.sampleRate, inferMs, cold, device: "wasm" };
}

// A inferência no WASM ocupa a thread do worker por segundos; entre um trecho e outro, dar a vez às
// tarefas de rede (o download de outro modelo, como a voz rápida, não pode ficar parado).
function yieldToEvents() {
  return new Promise((resolve) => setTimeout(resolve, 0));
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
      current = job;
      try {
        await job.run();
      } catch (error) {
        post({ type: "ERROR", id: job.id, error: errorText(error, "synthesis-failed") });
      } finally {
        current = null;
      }
      await yieldToEvents();
    }
  } finally {
    running = false;
  }
}

// Carrega o modelo fora da fila e só então enfileira (a menos que o pedido tenha saído com DROP).
function whenLoaded(job, target, failure) {
  waiting.set(job.id, job);
  loadModel(target.engine, target.voice).then(
    () => {
      if (job.dropped) return;
      enqueue(job);
    },
    (error) => {
      waiting.delete(job.id);
      if (job.dropped) return;
      post({ type: "ERROR", id: job.id, error: errorText(error, failure) });
    },
  );
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
      let device = "wasm";
      for (let index = 0; index < texts.length; index += 1) {
        if (index > 0) await yieldToEvents();
        if (job.dropped) throw new Error("dropped");
        const out = await inferChunk(target.engine, target.voice, texts[index]);
        const data = ownBuffer(out.samples);
        sampleRate = out.sampleRate;
        device = out.device;
        post(
          {
            type: "SYNTH_PART",
            id: message.id,
            index,
            audioData: data,
            samplingRate: out.sampleRate,
            inferMs: Math.round(out.inferMs),
            cold: out.cold,
            device: out.device,
          },
          [data.buffer],
        );
      }
      post({
        type: "SYNTHESIZED",
        id: message.id,
        engine: target.engine,
        voice: target.voice,
        samplingRate: sampleRate,
        parts: texts.length,
        latencyMs: Math.round(performance.now() - started),
        device,
      });
    },
  };
  whenLoaded(job, target, "model-load-failed");
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
  // Um trecho curto busca o estilo da voz (Kokoro) ou o fonemizador (Piper) e aquece a sessão.
  // Prioridade de "agora": é curto e quem espera (download, troca para a voz rápida) não pode ficar
  // atrás de uma fila de pré-carga.
  whenLoaded(
    {
      id: message.id,
      priority: 0,
      seq: sequence++,
      run: async () => {
        const out = await inferChunk(target.engine, target.voice, WARM_TEXT);
        post({ type: "PRELOADED", id: message.id, engine: target.engine, voice: target.voice, device: out.device });
      },
    },
    target,
    "model-load-failed",
  );
}

// Mede a velocidade: aquece a voz se preciso e cronometra uma frase (o áudio não volta).
function bench(message) {
  const payload = message.payload || {};
  let target;
  try {
    target = resolveVoice(payload);
  } catch (error) {
    post({ type: "ERROR", id: message.id, error: errorText(error, "model-load-failed") });
    return;
  }
  const text = String(payload.text || "").trim() || WARM_TEXT;
  whenLoaded(
    {
      id: message.id,
      priority: 1,
      seq: sequence++,
      run: async () => {
        if (!warmed.has(`${target.engine}:${target.voice}`)) {
          await inferChunk(target.engine, target.voice, WARM_TEXT);
        }
        const out = await inferChunk(target.engine, target.voice, text);
        post({
          type: "BENCHED",
          id: message.id,
          engine: target.engine,
          voice: target.voice,
          device: out.device,
          inferMs: Math.round(out.inferMs),
          audioMs: Math.round((out.samples.length / out.sampleRate) * 1000),
          samplingRate: out.sampleRate,
          cold: out.cold,
        });
      },
    },
    target,
    "model-load-failed",
  );
}

// Tira da fila a pré-carga que ficou para trás numa troca de voz; a que está rodando para no fim do
// trecho atual.
function drop(message) {
  const ids = new Set(Array.isArray(message.payload && message.payload.ids) ? message.payload.ids : []);
  if (ids.size === 0) return;
  if (current && ids.has(current.id)) {
    current.dropped = true;
    ids.delete(current.id);
  }
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const job = queue[index];
    if (ids.has(job.id)) {
      queue.splice(index, 1);
      waiting.delete(job.id);
      post({ type: "ERROR", id: job.id, error: "dropped" });
      ids.delete(job.id);
    }
  }
  for (const id of ids) {
    const job = waiting.get(id);
    if (job) {
      job.dropped = true;
      waiting.delete(id);
      post({ type: "ERROR", id, error: "dropped" });
    }
  }
}

function configure(message) {
  const wanted = message.payload && message.payload.kokoroDevice;
  if (wanted !== "auto" && wanted !== "webgpu" && wanted !== "wasm") return;
  kokoroDevicePref = wanted;
  // Já carregado em outro dispositivo: o próximo pedido carrega de novo.
  if (kokoroInfo && wanted !== "auto" && kokoroInfo.device !== wanted) {
    kokoroPromise = null;
    kokoroInfo = null;
    for (const key of [...warmed]) {
      if (key.startsWith("kokoro:")) warmed.delete(key);
    }
  }
}

async function inspect(message) {
  const piperStored = [];
  let kokoroCached = false;
  let kokoroDevice = kokoroInfo ? kokoroInfo.device : "wasm";
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle("piper", { create: true });
    for await (const name of dir.keys()) {
      const id = name.endsWith(".onnx") ? name.slice(0, -5) : "";
      if (id && piperInfo(id)) piperStored.push(id);
    }
  } catch {
    // OPFS indisponível: nada guardado.
  }
  try {
    if (!kokoroInfo) kokoroDevice = (await pickKokoroDevice()).device;
    const cache = await caches.open("transformers-cache");
    kokoroCached = Boolean(await cache.match(kokoroFileUrl(kokoroDevice)));
  } catch {
    kokoroCached = false;
  }
  post({ type: "INSPECTED", id: message.id, piperStored, kokoroCached, kokoroDevice });
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
    case "BENCH":
      bench(message);
      return;
    case "PRIORITIZE": {
      const job = waiting.get(message.id);
      if (job) job.priority = 0;
      return;
    }
    case "DROP":
      drop(message);
      return;
    case "CONFIG":
      configure(message);
      return;
    case "INSPECT":
      void inspect(message);
      return;
    default:
      post({ type: "ERROR", id: message.id, error: `unknown-message:${message.type}` });
  }
};
