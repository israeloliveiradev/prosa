// Prosa — voz no aparelho.
//
// Kokoro-82M (inglês, 24 kHz; WebGPU quando há, senão WASM) e Piper (de, fr, es, it, ru, pt e as
// vozes rápidas em inglês) rodam num Web Worker (/workers/ttsWorker.js). O PCM volta para cá, vira
// WAV (lib/wav.ts) e uma blob: URL que o
// AudioService toca com <audio> (preservesPitch). Japonês usa Web Speech (ja-JP): o clipe é uma
// pseudo-URL `speech:` que o AudioService toca por aqui — este arquivo é o único que usa
// speechSynthesis.
//
// Velocidade: cada trecho do Kokoro traz o tempo de inferência; o guarda (services/audio/speedGuard)
// mede o fator de tempo real e, se o Kokoro for mais lento que a fala neste aparelho, baixa uma voz
// Piper em inglês e passa a narração para ela (o aluno pode escolher no seletor de voz).
//
// Robustez: pedidos iguais em voo viram a mesma promessa; clipes ficam num LRU em memória (a
// URL é revogada ao sair) e no IndexedDB (sobrevivem ao F5); uma blob: URL antiga é refeita a
// partir do texto registrado. A velocidade de escuta é aplicada uma vez só, na reprodução.
//
// Este módulo não importa react-native: o cliente da API (lib/api.ts) depende dele e continua
// importável nos testes de Node.

import { mindById } from "@/design/minds";
import {
  ClipLru,
  audioCacheKey,
  clearStoredClips,
  clipRefForUrl,
  forgetClipUrls,
  loadStoredClip,
  rememberClipUrl,
  saveStoredClip,
  type ClipWord,
  type LruEntry,
} from "@/lib/audio-cache";
import { voiceCopy } from "@/lib/copy/voice";
import { concatFloat32, encodeWav, readWavInfo } from "@/lib/wav";
import { FAST_EN_DEFAULT, FAST_EN_MENTOR_VOICES, fastEquivalent, isFastEnglishVoice } from "@/services/audio/fastVoices";
import {
  currentEnglishEngine,
  currentVerdict,
  recordSpeedSample,
  setAutoFast,
  setSpeedPreference as storeSpeedPreference,
  shouldSwitchToFast,
  speedState,
  subscribeSpeed,
  type EnglishEngine,
  type KokoroDevice,
  type SpeedVerdict,
  type VoiceSpeedPreference,
} from "@/services/audio/speedGuard";
import {
  DEFAULT_VOICE_BY_LANG,
  ENGINE_BY_LANG,
  KOKORO_MENTOR_VOICES,
  KOKORO_VOICES,
  PIPER_MENTOR_VOICES,
  PIPER_VOICES,
  type TtsEngine,
  type WorkerRequest,
  type WorkerResponse,
} from "@/workers/ttsWorker";

export type { TtsEngine } from "@/workers/ttsWorker";
export type { EnglishEngine, KokoroDevice, SpeedVerdict, VoiceSpeedPreference } from "@/services/audio/speedGuard";

const WORKER_URL = "/workers/ttsWorker.js?v=8";
/** Frase do teste de velocidade (~4 s de fala): longa o bastante para medir, curta para não pesar. */
const BENCH_TEXT = "The museum opens at nine, so we still have time for breakfast.";
const WEBSPEECH_PREFIX = "webspeech:";
const SPEECH_URL_PREFIX = "speech:";
const CLIP_REF_PREFIX = "prosa-clip:";
const MEMORY_CLIPS = 48;
const MEMORY_BYTES = 96 * 1024 * 1024;
const EVENT_LIMIT = 500;

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export type SpeechErrorCode =
  | "unsupported-language"
  | "engine-unavailable"
  | "download-failed"
  | "synthesis-failed"
  | "no-japanese-voice"
  | "empty-text";

export class SpeechError extends Error {
  constructor(
    readonly code: SpeechErrorCode,
    readonly detail?: string,
  ) {
    super(speechErrorMessage(code));
    this.name = "SpeechError";
  }
}

export function speechErrorMessage(code: SpeechErrorCode): string {
  const copy = voiceCopy();
  switch (code) {
    case "unsupported-language":
      return copy.unsupportedLanguage;
    case "engine-unavailable":
      return copy.engineUnavailable;
    case "download-failed":
      return copy.downloadFailed;
    case "no-japanese-voice":
      return copy.noJapaneseVoice;
    default:
      return copy.synthesisFailed;
  }
}

function workerErrorCode(raw: string | undefined): SpeechErrorCode {
  const text = (raw ?? "").toLowerCase();
  if (text === "empty-text") {
    return "empty-text";
  }
  if (/model-load|fetch|network|import|load failed|404|dynamically imported|cors/.test(text)) {
    return "download-failed";
  }
  return "synthesis-failed";
}

/** Campos que o worker v5 acrescenta ao protocolo de src/workers/ttsWorker.ts. */
type WorkerReply = Omit<WorkerResponse, "type"> & {
  type: WorkerResponse["type"] | "BENCHED" | "MODEL_FALLBACK";
  /** Onde a inferência rodou (Kokoro: webgpu ou wasm; Piper: sempre wasm). */
  device?: KokoroDevice;
  dtype?: string;
  /** Tempo de inferência do trecho (sem download do modelo). */
  inferMs?: number;
  /** Primeira inferência desta voz desde o carregamento (não serve para medir velocidade). */
  cold?: boolean;
  audioMs?: number;
  kokoroDevice?: KokoroDevice;
};

type WorkerCommand = {
  type: WorkerRequest["type"] | "BENCH" | "DROP" | "CONFIG";
  payload?: WorkerRequest["payload"] & { text?: string; ids?: string[]; kokoroDevice?: "auto" | KokoroDevice };
};

export interface PartTiming {
  inferMs?: number;
  cold?: boolean;
  device?: KokoroDevice;
}

// ---------------------------------------------------------------------------
// Funções puras (testadas em tests/unit/speech-*.test.ts)
// ---------------------------------------------------------------------------

export function speechLang(lang: string): string {
  return lang.trim().toLowerCase().slice(0, 2);
}

export interface ResolvedVoice {
  lang: string;
  engine: TtsEngine;
  voice: string;
}

export function isVoiceFor(lang: string, voice: string): boolean {
  const code = speechLang(lang);
  if (code === "en" && isFastEnglishVoice(voice)) {
    return true;
  }
  const engine = ENGINE_BY_LANG[code];
  if (engine === "kokoro") {
    return Object.prototype.hasOwnProperty.call(KOKORO_VOICES, voice);
  }
  if (engine === "piper") {
    return PIPER_VOICES[voice]?.lang === code;
  }
  if (engine === "webspeech") {
    return voice.startsWith(WEBSPEECH_PREFIX);
  }
  return false;
}

/**
 * Motor e voz para um idioma: a voz pedida (se for do idioma), a do mentor, ou a padrão.
 * Em inglês, `english` diz qual motor narra: no rápido ("piper"), uma voz Kokoro pedida vira a voz
 * Piper do mesmo gênero e sotaque. Uma voz Piper em inglês pedida explicitamente vale sempre.
 */
export function resolveVoice(lang: string, voice?: string | null, mentorId?: string | null, english: EnglishEngine = "kokoro"): ResolvedVoice {
  const code = speechLang(lang);
  const engine = ENGINE_BY_LANG[code];
  if (!engine) {
    throw new SpeechError("unsupported-language", code);
  }
  if (code === "en") {
    if (voice && isFastEnglishVoice(voice)) {
      return { lang: code, engine: "piper", voice };
    }
    if (english === "piper") {
      const fromVoice = voice && Object.prototype.hasOwnProperty.call(KOKORO_VOICES, voice) ? fastEquivalent(voice) : null;
      const fromMentor = mentorId ? FAST_EN_MENTOR_VOICES[mentorId] : undefined;
      return { lang: code, engine: "piper", voice: fromVoice ?? fromMentor ?? FAST_EN_DEFAULT };
    }
  }
  if (voice && isVoiceFor(code, voice)) {
    return { lang: code, engine, voice };
  }
  if (mentorId) {
    const mapped = engine === "kokoro" ? KOKORO_MENTOR_VOICES[mentorId]?.[code] : PIPER_MENTOR_VOICES[mentorId]?.[code];
    if (mapped && isVoiceFor(code, mapped)) {
      return { lang: code, engine, voice: mapped };
    }
  }
  const fallback = DEFAULT_VOICE_BY_LANG[code];
  if (!fallback) {
    throw new SpeechError("unsupported-language", code);
  }
  return { lang: code, engine, voice: fallback };
}

export interface TextSpan {
  text: string;
  start: number;
  end: number;
}

const HAS_SPEECH = /[\p{L}\p{N}]/u;
const BOUNDARY = /[.!?…]+["'”’»)\]]*(?=\s|$)|[。！？]+[」』）"”]*|\n+/g;
const CLAUSE = /[,;:—–、，；：]+\s*/g;

function trimmed(text: string, start: number, end: number): TextSpan | null {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s] ?? "")) {
    s += 1;
  }
  while (e > s && /\s/.test(text[e - 1] ?? "")) {
    e -= 1;
  }
  return e > s ? { text: text.slice(s, e), start: s, end: e } : null;
}

function splitAt(text: string, span: TextSpan, pattern: RegExp, maxChars: number): TextSpan[] {
  const cuts: number[] = [];
  const local = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of span.text.matchAll(local)) {
    cuts.push(span.start + (match.index ?? 0) + match[0].length);
  }
  const out: TextSpan[] = [];
  let start = span.start;
  let lastCut = span.start;
  for (const cut of [...cuts, span.end]) {
    if (cut - start > maxChars && lastCut > start) {
      const piece = trimmed(text, start, lastCut);
      if (piece) {
        out.push(piece);
      }
      start = lastCut;
    }
    lastCut = cut;
  }
  const rest = trimmed(text, start, span.end);
  if (rest) {
    out.push(rest);
  }
  return out;
}

function hardSplit(text: string, span: TextSpan, maxChars: number): TextSpan[] {
  const out: TextSpan[] = [];
  for (let start = span.start; start < span.end; start += maxChars) {
    const piece = trimmed(text, start, Math.min(span.end, start + maxChars));
    if (piece) {
      out.push(piece);
    }
  }
  return out;
}

/**
 * Corta o texto em trechos para o motor: frases, depois orações, depois palavras.
 * Cada trecho guarda a posição no texto original (para estimar o tempo das palavras).
 * Trechos sem letra nem número (só pontuação) ficam de fora da síntese.
 */
export function splitSpeechChunks(text: string, maxChars = 220, mergeChars = 90): TextSpan[] {
  const sentences: TextSpan[] = [];
  let start = 0;
  for (const match of text.matchAll(BOUNDARY)) {
    const end = (match.index ?? 0) + match[0].length;
    const piece = trimmed(text, start, end);
    if (piece) {
      sentences.push(piece);
    }
    start = end;
  }
  const tail = trimmed(text, start, text.length);
  if (tail) {
    sentences.push(tail);
  }
  const fitted: TextSpan[] = [];
  for (const sentence of sentences) {
    if (sentence.text.length <= maxChars) {
      fitted.push(sentence);
      continue;
    }
    for (const clause of splitAt(text, sentence, CLAUSE, maxChars)) {
      if (clause.text.length <= maxChars) {
        fitted.push(clause);
        continue;
      }
      for (const words of splitAt(text, clause, /\s+/g, maxChars)) {
        fitted.push(...(words.text.length <= maxChars ? [words] : hardSplit(text, words, maxChars)));
      }
    }
  }
  const merged: TextSpan[] = [];
  for (const span of fitted) {
    const previous = merged[merged.length - 1];
    if (previous && span.end - previous.start <= mergeChars) {
      merged[merged.length - 1] = { text: text.slice(previous.start, span.end), start: previous.start, end: span.end };
    } else {
      merged.push(span);
    }
  }
  return merged.filter((span) => HAS_SPEECH.test(span.text));
}

const CJK = /[぀-ヿ㐀-鿿豈-﫿]/;

/** Palavras com posição: por espaço; em japonês, pelo Intl.Segmenter. */
export function wordSpans(text: string, lang: string): TextSpan[] {
  const code = speechLang(lang);
  if ((code === "ja" || code === "zh") && CJK.test(text)) {
    const Segmenter = (Intl as { Segmenter?: new (locale: string, options: { granularity: "word" }) => { segment: (input: string) => Iterable<{ segment: string; index: number; isWordLike?: boolean }> } }).Segmenter;
    if (Segmenter) {
      const out: TextSpan[] = [];
      for (const part of new Segmenter(code, { granularity: "word" }).segment(text)) {
        if (part.isWordLike) {
          out.push({ text: part.segment, start: part.index, end: part.index + part.segment.length });
        }
      }
      if (out.length > 0) {
        return out;
      }
    }
    const out: TextSpan[] = [];
    for (const match of text.matchAll(/[\p{L}\p{N}]+/gu)) {
      const index = match.index ?? 0;
      out.push({ text: match[0], start: index, end: index + match[0].length });
    }
    return out;
  }
  const out: TextSpan[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const index = match.index ?? 0;
    out.push({ text: match[0], start: index, end: index + match[0].length });
  }
  return out;
}

export interface ChunkTiming {
  /** Início do trecho no clipe. */
  startMs: number;
  /** Duração do trecho no clipe. */
  durationMs: number;
  /** Fala de fato (sem o silêncio das pontas), relativa ao início do trecho. */
  voicedStartMs?: number;
  voicedEndMs?: number;
}

export type TimedWord = ClipWord & { charIndex: number };

/**
 * Tempo de cada palavra, proporcional aos caracteres dentro do trecho em que ela cai
 * (descontando o silêncio das pontas quando ele é conhecido). Bom o bastante para o
 * destaque palavra a palavra (`highlightIndex`).
 */
export function estimateWordMarks(text: string, lang: string, chunks: readonly TextSpan[], timings: readonly ChunkTiming[]): TimedWord[] {
  const words = wordSpans(text, lang);
  if (chunks.length === 0 || timings.length === 0) {
    return words.map((word) => ({ text: word.text, offsetMs: 0, charIndex: word.start }));
  }
  const out: TimedWord[] = [];
  let cursor = 0;
  let last = 0;
  for (const word of words) {
    while (cursor < chunks.length - 1 && word.start >= (chunks[cursor]?.end ?? 0)) {
      cursor += 1;
    }
    const chunk = chunks[cursor];
    const timing = timings[cursor];
    let offset: number;
    if (!chunk || !timing) {
      offset = last;
    } else if (word.start < chunk.start) {
      offset = timing.startMs + (timing.voicedStartMs ?? 0);
    } else if (word.start >= chunk.end) {
      offset = timing.startMs + (timing.voicedEndMs ?? timing.durationMs);
    } else {
      const voicedStart = timing.voicedStartMs ?? 0;
      const voicedEnd = timing.voicedEndMs ?? timing.durationMs;
      const fraction = (word.start - chunk.start) / Math.max(1, chunk.end - chunk.start);
      offset = timing.startMs + voicedStart + fraction * Math.max(0, voicedEnd - voicedStart);
    }
    last = Math.max(last, Math.round(offset));
    out.push({ text: word.text, offsetMs: last, charIndex: word.start });
  }
  return out;
}

/** Onde a fala começa e termina num trecho de PCM (ignora o silêncio das pontas). */
export function voicedBounds(samples: Float32Array, sampleRate: number, threshold = 0.02): { startMs: number; endMs: number } {
  let first = -1;
  let lastIndex = -1;
  for (let index = 0; index < samples.length; index += 1) {
    if (Math.abs(samples[index] ?? 0) >= threshold) {
      if (first < 0) {
        first = index;
      }
      lastIndex = index;
    }
  }
  const totalMs = (samples.length / sampleRate) * 1000;
  if (first < 0 || sampleRate <= 0) {
    return { startMs: 0, endMs: totalMs };
  }
  return { startMs: (first / sampleRate) * 1000, endMs: ((lastIndex + 1) / sampleRate) * 1000 };
}

/** Duração estimada da fala do sistema (Web Speech), em ms, na velocidade 1. */
export function estimateSpeechMs(text: string, lang: string): number {
  const code = speechLang(lang);
  const letters = (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const pauses = (text.match(/[.!?…。！？、，,;:]/g) ?? []).length;
  const perChar = code === "ja" || code === "zh" ? 160 : 65;
  return Math.max(400, Math.round(letters * perChar + pauses * 250));
}

export function isSpeechUrl(url: string): boolean {
  return url.startsWith(SPEECH_URL_PREFIX);
}

export function buildSpeechUrl(lang: string, voice: string, text: string): string {
  const params = new URLSearchParams({ voice, text });
  return `${SPEECH_URL_PREFIX}${speechLang(lang)}?${params.toString()}`;
}

export function parseSpeechUrl(url: string): { lang: string; voice: string; text: string } | null {
  if (!isSpeechUrl(url)) {
    return null;
  }
  const rest = url.slice(SPEECH_URL_PREFIX.length);
  const question = rest.indexOf("?");
  if (question < 0) {
    return null;
  }
  const params = new URLSearchParams(rest.slice(question + 1));
  const text = params.get("text") ?? "";
  if (!text.trim()) {
    return null;
  }
  return { lang: rest.slice(0, question), voice: params.get("voice") ?? `${WEBSPEECH_PREFIX}ja-JP`, text };
}

/** Um pedaço tocável da narração, passado pelo `onAudio` de `speakStoryStream`. */
export interface ClipReference {
  url: string;
  /** URL temporária (um trecho): quem toca revoga depois. */
  temp?: boolean;
  /** Linha do tempo estimada das palavras já entregues: o trecho ocupa [estStartMs, estEndMs). */
  estStartMs?: number;
  estEndMs?: number;
  estTotalMs?: number;
}

/**
 * Referência a um clipe pronto (WAV no aparelho ou `speech:`): o manipulador de stream do
 * AudioService reconhece o prefixo e toca a URL em vez de tratar os bytes como áudio.
 */
export function clipReferenceBytes(url: string, extra: Omit<ClipReference, "url"> = {}): Uint8Array {
  return new TextEncoder().encode(`${CLIP_REF_PREFIX}${JSON.stringify({ ...extra, url })}`);
}

export function readClipReference(bytes: Uint8Array): ClipReference | null {
  if (bytes.byteLength < CLIP_REF_PREFIX.length) {
    return null;
  }
  const head = new TextDecoder().decode(bytes.subarray(0, CLIP_REF_PREFIX.length));
  if (head !== CLIP_REF_PREFIX) {
    return null;
  }
  const body = new TextDecoder().decode(bytes.subarray(CLIP_REF_PREFIX.length));
  if (!body.startsWith("{")) {
    return body ? { url: body } : null;
  }
  try {
    const parsed = JSON.parse(body) as Partial<ClipReference>;
    if (typeof parsed.url !== "string" || !parsed.url) {
      return null;
    }
    const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
    return {
      url: parsed.url,
      temp: parsed.temp === true,
      estStartMs: num(parsed.estStartMs),
      estEndMs: num(parsed.estEndMs),
      estTotalMs: num(parsed.estTotalMs),
    };
  } catch {
    return null;
  }
}

/**
 * Linha do tempo dos trechos quando só os primeiros já foram sintetizados: os conhecidos usam a
 * duração real; os demais, a média de ms por caractere dos conhecidos.
 */
export function estimateTimeline(chunks: readonly TextSpan[], knownMs: readonly number[]): ChunkTiming[] {
  let knownChars = 0;
  let knownTotal = 0;
  knownMs.forEach((ms, index) => {
    knownChars += chunks[index]?.text.length ?? 0;
    knownTotal += ms;
  });
  const perChar = knownChars > 0 && knownTotal > 0 ? knownTotal / knownChars : 70;
  const out: ChunkTiming[] = [];
  let cursor = 0;
  chunks.forEach((chunk, index) => {
    const durationMs = knownMs[index] ?? chunk.text.length * perChar;
    out.push({ startMs: cursor, durationMs });
    cursor += durationMs;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Web Speech (só japonês)
// ---------------------------------------------------------------------------

export interface SystemVoice {
  id: string;
  name: string;
  lang: string;
  gender: "female" | "male" | null;
}

const KNOWN_SYSTEM_GENDERS: Array<[RegExp, "female" | "male"]> = [
  [/nanami|ayumi|haruka|sayaka|mayu|shiori|aoi|kyoko|o-ren|google 日本語/i, "female"],
  [/keita|ichiro|daichi|naoki|otoya|hattori/i, "male"],
];

function speechSynthesisApi(): SpeechSynthesis | null {
  const api = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  return api ?? null;
}

function systemVoiceName(voice: SpeechSynthesisVoice): string {
  const cleaned = voice.name
    .replace(/^(Microsoft|Google|Apple)\s+/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+Online\b/i, "")
    .trim();
  return cleaned || voice.name;
}

/** Vozes do sistema para um idioma (só usadas em japonês). */
export function systemVoices(lang: string): SystemVoice[] {
  const api = speechSynthesisApi();
  if (!api) {
    return [];
  }
  const code = speechLang(lang);
  return api
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(code))
    .map((voice) => ({
      id: `${WEBSPEECH_PREFIX}${voice.voiceURI}`,
      name: systemVoiceName(voice),
      lang: voice.lang,
      gender: KNOWN_SYSTEM_GENDERS.find(([pattern]) => pattern.test(voice.name))?.[1] ?? null,
    }));
}

/** Avisa quando a lista de vozes do sistema muda (o Chrome carrega a lista depois). */
export function onSystemVoicesChanged(listener: () => void): () => void {
  const api = speechSynthesisApi() as (SpeechSynthesis & EventTarget) | null;
  if (!api || typeof api.addEventListener !== "function") {
    return () => undefined;
  }
  api.addEventListener("voiceschanged", listener);
  return () => api.removeEventListener("voiceschanged", listener);
}

function waitForSystemVoices(api: SpeechSynthesis, timeoutMs: number): Promise<SpeechSynthesisVoice[]> {
  const ready = api.getVoices();
  if (ready.length > 0) {
    return Promise.resolve(ready);
  }
  return new Promise((resolve) => {
    const target = api as SpeechSynthesis & EventTarget;
    const done = () => {
      clearTimeout(timer);
      target.removeEventListener?.("voiceschanged", done);
      resolve(api.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    target.addEventListener?.("voiceschanged", done);
  });
}

export interface WebSpeechHandle {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

export interface WebSpeechHandlers {
  onStart?: () => void;
  /** Tempo de mídia (equivalente à velocidade 1) e duração estimada, em ms. */
  onProgress?: (mediaMs: number, durationMs: number, charIndex: number) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}

/** Fala com speechSynthesis. Usado só para japonês, pelo AudioService e pelo `speak` legado. */
export function speakWithWebSpeech(text: string, lang: string, voiceId: string, rate: number, handlers: WebSpeechHandlers): WebSpeechHandle {
  const api = speechSynthesisApi();
  let cancelled = false;
  let paused = false;
  let finished = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const utterances: SpeechSynthesisUtterance[] = [];
  const chunks = splitSpeechChunks(text, 160, 0);
  const totalMs = estimateSpeechMs(text, lang);
  const timings: ChunkTiming[] = [];
  let acc = 0;
  for (const chunk of chunks) {
    const ms = estimateSpeechMs(chunk.text, lang);
    timings.push({ startMs: acc, durationMs: ms });
    acc += ms;
  }
  const scale = acc > 0 ? totalMs / acc : 1;
  let chunkIndex = 0;
  let chunkStartedAt = 0;
  let pausedAt = 0;
  let pausedTotal = 0;
  let boundaryMs = 0;
  let boundaryChar = 0;

  const finish = (error?: string) => {
    if (finished) {
      return;
    }
    finished = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (error) {
      handlers.onError(error);
    } else {
      handlers.onProgress?.(totalMs, totalMs, text.length);
      handlers.onEnd();
    }
  };

  const tick = () => {
    if (paused || finished) {
      return;
    }
    const timing = timings[chunkIndex];
    if (!timing) {
      return;
    }
    const wall = (Date.now() - chunkStartedAt - pausedTotal) * rate;
    const within = Math.min(timing.durationMs, Math.max(wall, boundaryMs));
    handlers.onProgress?.(Math.min(totalMs, (timing.startMs + within) * scale), totalMs, boundaryChar);
  };

  if (!api || typeof (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance === "undefined") {
    setTimeout(() => finish(speechErrorMessage("engine-unavailable")), 0);
    return { pause: () => undefined, resume: () => undefined, cancel: () => undefined };
  }

  void waitForSystemVoices(api, 1_500).then((voices) => {
    if (cancelled) {
      return;
    }
    const code = speechLang(lang);
    const uri = voiceId.startsWith(WEBSPEECH_PREFIX) ? voiceId.slice(WEBSPEECH_PREFIX.length) : voiceId;
    const candidates = voices.filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(code));
    const voice = candidates.find((item) => item.voiceURI === uri) ?? candidates.find((item) => item.default) ?? candidates[0];
    if (!voice) {
      finish(speechErrorMessage("no-japanese-voice"));
      return;
    }
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.onstart = () => {
        if (cancelled) {
          return;
        }
        chunkIndex = index;
        chunkStartedAt = Date.now();
        pausedTotal = 0;
        boundaryMs = 0;
        if (index === 0) {
          handlers.onStart?.();
          timer = setInterval(tick, 100);
        }
      };
      utterance.onboundary = (event) => {
        const timing = timings[index];
        if (!timing) {
          return;
        }
        boundaryChar = chunk.start + event.charIndex;
        boundaryMs = (event.charIndex / Math.max(1, chunk.text.length)) * timing.durationMs;
      };
      utterance.onend = () => {
        if (!cancelled && index === chunks.length - 1) {
          finish();
        }
      };
      utterance.onerror = (event) => {
        if (cancelled || event.error === "interrupted" || event.error === "canceled") {
          return;
        }
        finish(speechErrorMessage("synthesis-failed"));
      };
      utterances.push(utterance);
      api.speak(utterance);
    });
    if (chunks.length === 0) {
      finish();
    }
  });

  return {
    pause: () => {
      if (finished || paused) {
        return;
      }
      paused = true;
      pausedAt = Date.now();
      api.pause();
    },
    resume: () => {
      if (finished || !paused) {
        return;
      }
      paused = false;
      pausedTotal += Date.now() - pausedAt;
      api.resume();
    },
    cancel: () => {
      if (cancelled) {
        return;
      }
      cancelled = true;
      finished = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (utterances.length > 0) {
        api.cancel();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface SpeechClip {
  key: string;
  url: string;
  text: string;
  lang: string;
  engine: TtsEngine;
  voice: string;
  words: TimedWord[];
  sampleRate: number;
  durationMs: number;
  bytes: number;
}

export type ClipSource = "memory" | "disk" | "inflight" | "synth";

export interface SpeechEvent {
  type:
    | "cache-hit"
    | "cache-miss"
    | "dedupe"
    | "synth-start"
    | "synth-end"
    | "evict"
    | "revive"
    | "model-progress"
    | "model-ready"
    | "model-fallback"
    | "speed-sample"
    | "engine-switch"
    | "error";
  at: number;
  key?: string;
  engine?: TtsEngine;
  voice?: string;
  lang?: string;
  source?: ClipSource;
  sampleRate?: number;
  durationMs?: number;
  ms?: number;
  chars?: number;
  parts?: number;
  loaded?: number;
  total?: number;
  error?: string;
  device?: KokoroDevice;
  rtf?: number;
}

export interface SpeechStats {
  synths: number;
  cacheHits: number;
  cacheMisses: number;
  dedupes: number;
  errors: number;
  evictions: number;
  revivals: number;
  clips: number;
  bytes: number;
}

export interface ModelProgress {
  lang: string;
  engine: TtsEngine;
  voice: string;
  loaded: number;
  total: number;
  /** 0–1, ou null quando o tamanho total ainda não é conhecido. */
  fraction: number | null;
}

export type ModelPhase = "idle" | "downloading" | "ready" | "error";

export interface ModelState {
  phase: ModelPhase;
  loaded: number;
  total: number;
  /** O modelo já está guardado no aparelho (não precisa baixar). */
  stored: boolean;
}

export interface SynthesisOptions {
  priority?: "now" | "prefetch";
  mentorId?: string;
}

/**
 * Retrato imutável do estado da voz, refeito a cada mudança (download, pronto, velocidade).
 * Componentes leem por `useSyncExternalStore(speechService.subscribe, speechService.snapshot)`:
 * com o React Compiler, ler o serviço direto no render fica memorizado e velho.
 */
export interface SpeechSnapshot {
  version: number;
  speed: SpeedInfo;
  /** A voz rápida em inglês que a narração usaria. */
  fastVoice: string;
  modelState: (lang: string, voice?: string | null) => ModelState;
}

/** O que o seletor de voz mostra sobre a velocidade da voz em inglês neste aparelho. */
export interface SpeedInfo {
  preference: VoiceSpeedPreference;
  /** Motor que narra o inglês agora. */
  engine: EnglishEngine;
  /** No automático, a troca para a voz rápida já aconteceu. */
  autoFast: boolean;
  /** Medida do Kokoro neste aparelho (null enquanto não há áudio suficiente). */
  verdict: SpeedVerdict | null;
  /** Onde o Kokoro roda (ou rodaria) neste aparelho; null antes de o worker responder. */
  kokoroDevice: KokoroDevice | null;
  /** A voz rápida está sendo baixada para a troca automática. */
  switching: boolean;
}

// --- API legada (telas antigas: speak/preload/warmup/status) ---------------

export type VoiceEngineMode = "instant" | "hybrid";

export interface SpeechOptions {
  lang?: string;
  speed?: number | "0.75x" | "0.8x" | "0.9x" | "1.0x" | "1.15x" | "1.2x";
  mentorId?: string;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onBoundary?: (ev: { charIndex: number; charLength?: number; name?: string }) => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export interface VoiceEngineStatus {
  mode: VoiceEngineMode;
  isKokoroReady: boolean;
  isPiperReady: boolean;
  /** Progresso real do download em andamento (0–100); 100 se algum modelo já está pronto. */
  downloadProgress: number;
  /** "idle" | "downloading" | "ready" | "error". */
  downloadStatus: string;
  cachedAudiosCount: number;
  cachedBytesApprox: number;
  isWarmingUp: boolean;
}

export interface ActivePlaybackInfo {
  isPlaying: boolean;
  engine: string;
  voice: string;
  mentorName: string;
  lang: string;
  samplingRate?: number;
}

const ENGINE_LABEL: Record<TtsEngine, string> = {
  kokoro: "Kokoro-82M",
  piper: "Piper",
  webspeech: "Web Speech",
};

function speedValue(speed: SpeechOptions["speed"]): number {
  if (typeof speed === "number" && Number.isFinite(speed) && speed > 0) {
    return speed;
  }
  if (typeof speed === "string") {
    const parsed = Number.parseFloat(speed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 1;
}

interface PendingRequest {
  parts: Float32Array[];
  sampleRate: number;
  resolve: (value: WorkerReply) => void;
  reject: (error: SpeechError) => void;
  onProgress?: (loaded: number, total: number) => void;
  onPart?: (index: number, samples: Float32Array, sampleRate: number, timing: PartTiming) => void;
}

interface InflightClip {
  promise: Promise<{ clip: SpeechClip; source: ClipSource }>;
  requestId: string | null;
  engine: TtsEngine;
  wantNow: boolean;
  text: string;
  lang: string;
  chunks: TextSpan[] | null;
  parts: Array<{ samples: Float32Array; sampleRate: number } | undefined>;
  partListeners: Set<() => void>;
}

/** Trecho tocável entregue em streaming (ver `synthesizeStreaming`). */
export interface ClipSegment {
  url: string;
  index: number;
  total: number;
  estStartMs: number;
  estEndMs: number;
  estTotalMs: number;
  /** Só no primeiro trecho: todas as palavras do texto na linha do tempo estimada. */
  words?: TimedWord[];
}

interface WebAudioLike {
  src: string;
  currentTime: number;
  duration: number;
  playbackRate: number;
  defaultPlaybackRate?: number;
  preservesPitch?: boolean;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

/** Mantém o tom ao mudar a velocidade do <audio>. */
export function keepPitch(audio: object): void {
  const target = audio as { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };
  target.preservesPitch = true;
  target.webkitPreservesPitch = true;
  target.mozPreservesPitch = true;
}

function modelKey(engine: TtsEngine, voice: string): string {
  return engine === "kokoro" ? "kokoro" : `${engine}:${voice}`;
}

// ---------------------------------------------------------------------------
// Serviço
// ---------------------------------------------------------------------------

class SpeechService {
  readonly events: SpeechEvent[] = [];
  private readonly counters = { synths: 0, cacheHits: 0, cacheMisses: 0, dedupes: 0, errors: 0, evictions: 0, revivals: 0 };
  private readonly clips = new ClipLru<SpeechClip>(MEMORY_CLIPS, MEMORY_BYTES, (entry) => this.evicted(entry));
  private readonly liveUrls = new Map<string, string>();
  private readonly inflight = new Map<string, InflightClip>();
  private readonly models = new Map<string, ModelState>();
  private readonly downloads = new Map<string, Promise<void>>();
  private readonly downloadListeners = new Map<string, Set<(progress: ModelProgress) => void>>();
  private readonly statusListeners = new Set<(status: VoiceEngineStatus) => void>();
  private readonly playbackListeners = new Set<(info: ActivePlaybackInfo) => void>();
  private readonly pending = new Map<string, PendingRequest>();
  private worker: Worker | null = null;
  private requestCounter = 0;
  private inspected: Promise<void> | null = null;
  private kokoroDevice: KokoroDevice | null = null;
  private kokoroDeviceOverride: "auto" | KokoroDevice = "auto";
  private fastSwitch: Promise<void> | null = null;
  private fastVoicePicker: () => string = () => FAST_EN_DEFAULT;
  private speedWatch: (() => void) | null = null;
  private lastLang = "en";
  private snapshotVersion = 0;
  private snapshotCache: SpeechSnapshot | null = null;
  private engineMode: VoiceEngineMode = "hybrid";
  private legacyToken = 0;
  private legacyStop: (() => void) | null = null;
  private activePlayback: ActivePlaybackInfo = {
    isPlaying: false,
    engine: ENGINE_LABEL.kokoro,
    voice: "",
    mentorName: "",
    lang: "en",
  };

  // --- Disponibilidade e worker -------------------------------------------

  /** O navegador consegue rodar o motor no aparelho (Web Worker + blob URLs). */
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      typeof Worker !== "undefined" &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function" &&
      typeof Blob !== "undefined"
    );
  }

  private ensureWorker(): Worker | null {
    if (this.worker) {
      return this.worker;
    }
    if (!this.isSupported()) {
      return null;
    }
    try {
      const worker = new Worker(WORKER_URL, { type: "module" });
      worker.onmessage = (event: MessageEvent<WorkerReply>) => this.onWorkerMessage(event.data);
      worker.onerror = (event) => {
        event.preventDefault?.();
        // Sem mensagem = o script do worker nem carregou (rede/servidor).
        const where = event.filename ? ` @${event.filename}:${event.lineno}` : "";
        this.failWorker(`worker:${event.message || "load-failed"}${where}`);
      };
      this.worker = worker;
      if (this.kokoroDeviceOverride !== "auto") {
        worker.postMessage({ type: "CONFIG", payload: { kokoroDevice: this.kokoroDeviceOverride } });
      }
      return worker;
    } catch (caught) {
      this.record({ type: "error", error: caught instanceof Error ? caught.message : "worker-create" });
      return null;
    }
  }

  private failWorker(detail: string): void {
    const pending = [...this.pending.values()];
    this.pending.clear();
    try {
      this.worker?.terminate();
    } catch {
      // já encerrado
    }
    this.worker = null;
    this.inspected = null;
    for (const request of pending) {
      request.reject(new SpeechError("download-failed", detail));
    }
    for (const [key, state] of this.models) {
      if (state.phase === "downloading") {
        this.models.set(key, { ...state, phase: "error" });
      }
    }
    this.record({ type: "error", error: detail });
    this.notifyStatus();
  }

  private send(request: WorkerCommand, onProgress?: (loaded: number, total: number) => void): { id: string; promise: Promise<WorkerReply> } {
    const worker = this.ensureWorker();
    const id = `${request.type.toLowerCase()}-${++this.requestCounter}`;
    if (!worker) {
      return { id, promise: Promise.reject(new SpeechError("engine-unavailable")) };
    }
    const promise = new Promise<WorkerReply>((resolve, reject) => {
      this.pending.set(id, { parts: [], sampleRate: 0, resolve, reject, onProgress });
    });
    worker.postMessage({ ...request, id, payload: { ...request.payload, origin: window.location.origin } });
    return { id, promise };
  }

  private onWorkerMessage(data: WorkerReply | undefined): void {
    if (!data) {
      return;
    }
    if (data.type === "MODEL_PROGRESS" && data.engine) {
      this.modelProgress(data.engine, data.voice ?? "", data.loaded ?? 0, data.total ?? 0);
      return;
    }
    if (data.type === "MODEL_READY" && data.engine) {
      const key = modelKey(data.engine, data.voice ?? "");
      const previous = this.models.get(key);
      this.models.set(key, { phase: "ready", loaded: previous?.total ?? 0, total: previous?.total ?? 0, stored: true });
      if (data.engine === "kokoro" && data.device) {
        this.kokoroDevice = data.device;
      }
      this.record({ type: "model-ready", engine: data.engine, voice: data.voice ?? undefined, device: data.device });
      this.notifyStatus();
      return;
    }
    if (data.type === "MODEL_FALLBACK" && data.engine) {
      // O WebGPU falhou: o Kokoro volta para o WASM (outro arquivo de modelo, outro download).
      if (data.engine === "kokoro") {
        this.kokoroDevice = data.device ?? "wasm";
        const state = this.models.get("kokoro");
        if (state?.phase === "ready") {
          this.models.set("kokoro", { phase: "downloading", loaded: 0, total: 0, stored: false });
        }
      }
      this.record({ type: "model-fallback", engine: data.engine, device: data.device, error: data.error });
      this.notifyStatus();
      return;
    }
    const request = data.id ? this.pending.get(data.id) : undefined;
    if (!request || !data.id) {
      return;
    }
    if (data.type === "SYNTH_PART" && data.audioData) {
      const index = data.index ?? request.parts.length;
      request.parts[index] = data.audioData;
      request.sampleRate = data.samplingRate ?? request.sampleRate;
      request.onPart?.(index, data.audioData, request.sampleRate, { inferMs: data.inferMs, cold: data.cold, device: data.device });
      return;
    }
    if (data.type === "ERROR") {
      this.pending.delete(data.id);
      request.reject(new SpeechError(workerErrorCode(data.error), data.error));
      return;
    }
    if (data.type === "SYNTHESIZED" || data.type === "PRELOADED" || data.type === "INSPECTED" || data.type === "BENCHED") {
      this.pending.delete(data.id);
      request.resolve(data);
    }
  }

  private modelProgress(engine: TtsEngine, voice: string, loaded: number, total: number): void {
    const key = modelKey(engine, voice);
    const previous = this.models.get(key);
    const before = previous && previous.total > 0 ? Math.floor((previous.loaded / previous.total) * 100) : -1;
    const next: ModelState = { phase: previous?.phase === "ready" ? "ready" : "downloading", loaded, total, stored: previous?.stored ?? false };
    this.models.set(key, next);
    for (const listener of this.downloadListeners.get(key) ?? []) {
      listener({ lang: this.lastLang, engine, voice, loaded, total, fraction: total > 0 ? Math.min(1, loaded / total) : null });
    }
    const after = total > 0 ? Math.floor((loaded / total) * 100) : -1;
    if (after !== before) {
      if (Math.floor(after / 10) !== Math.floor(before / 10)) {
        this.record({ type: "model-progress", engine, voice: voice || undefined, loaded, total });
      }
      this.notifyStatus();
    }
  }

  // --- Clipes ---------------------------------------------------------------

  /** Sintetiza (ou recupera do cache) um clipe com as palavras marcadas no tempo. */
  synthesize(text: string, lang: string, voice?: string | null, options: SynthesisOptions = {}): Promise<SpeechClip> {
    return this.synthesizeDetailed(text, lang, voice, options).then((result) => result.clip);
  }

  synthesizeDetailed(text: string, lang: string, voice?: string | null, options: SynthesisOptions = {}): Promise<{ clip: SpeechClip; source: ClipSource }> {
    const clean = text.trim();
    if (!clean) {
      return Promise.reject(new SpeechError("empty-text"));
    }
    let resolved: ResolvedVoice;
    try {
      resolved = resolveVoice(lang, voice, options.mentorId, this.englishEngine());
    } catch (caught) {
      return Promise.reject(caught);
    }
    this.lastLang = resolved.lang;
    const key = audioCacheKey(clean, resolved.lang, resolved.voice);
    const now = options.priority !== "prefetch";
    const cached = this.clips.get(key);
    if (cached) {
      this.counters.cacheHits += 1;
      this.record({ type: "cache-hit", key, engine: cached.engine, voice: cached.voice, lang: cached.lang, source: "memory", sampleRate: cached.sampleRate, durationMs: cached.durationMs });
      return Promise.resolve({ clip: cached, source: "memory" });
    }
    const running = this.inflight.get(key);
    if (running) {
      this.counters.dedupes += 1;
      this.record({ type: "dedupe", key, engine: resolved.engine, voice: resolved.voice, lang: resolved.lang });
      if (now && !running.wantNow) {
        running.wantNow = true;
        if (running.requestId) {
          this.worker?.postMessage({ type: "PRIORITIZE", id: running.requestId });
        }
      }
      return running.promise.then((result) => ({ clip: result.clip, source: "inflight" as const }));
    }
    this.counters.cacheMisses += 1;
    this.record({ type: "cache-miss", key, engine: resolved.engine, voice: resolved.voice, lang: resolved.lang, chars: clean.length });
    const entry: InflightClip = {
      promise: Promise.resolve(null as never),
      requestId: null,
      engine: resolved.engine,
      wantNow: now,
      text: clean,
      lang: resolved.lang,
      chunks: null,
      parts: [],
      partListeners: new Set(),
    };
    entry.promise = this.produce(key, clean, resolved, entry).finally(() => {
      if (this.inflight.get(key) === entry) {
        this.inflight.delete(key);
      }
    });
    this.inflight.set(key, entry);
    entry.promise.catch(() => undefined);
    return entry.promise;
  }

  private async produce(key: string, text: string, resolved: ResolvedVoice, entry: InflightClip): Promise<{ clip: SpeechClip; source: ClipSource }> {
    if (resolved.engine === "webspeech") {
      const durationMs = estimateSpeechMs(text, resolved.lang);
      const clip: SpeechClip = {
        key,
        url: buildSpeechUrl(resolved.lang, resolved.voice, text),
        text,
        lang: resolved.lang,
        engine: "webspeech",
        voice: resolved.voice,
        words: estimateWordMarks(text, resolved.lang, [{ text, start: 0, end: text.length }], [{ startMs: 0, durationMs }]),
        sampleRate: 0,
        durationMs,
        bytes: 0,
      };
      return { clip, source: "synth" };
    }
    if (!this.isSupported()) {
      throw new SpeechError("engine-unavailable");
    }
    const stored = await loadStoredClip(key);
    if (stored) {
      const url = URL.createObjectURL(stored.wav);
      const clip: SpeechClip = {
        key,
        url,
        text,
        lang: resolved.lang,
        engine: resolved.engine,
        voice: resolved.voice,
        words: stored.words.map((word) => ({ text: word.text, offsetMs: word.offsetMs, charIndex: (word as TimedWord).charIndex ?? 0 })),
        sampleRate: stored.sampleRate,
        durationMs: stored.durationMs,
        bytes: stored.bytes,
      };
      this.keep(clip);
      this.counters.cacheHits += 1;
      this.record({ type: "cache-hit", key, engine: clip.engine, voice: clip.voice, lang: clip.lang, source: "disk", sampleRate: clip.sampleRate, durationMs: clip.durationMs });
      return { clip, source: "disk" };
    }
    const chunks = splitSpeechChunks(text);
    if (chunks.length === 0) {
      throw new SpeechError("empty-text");
    }
    entry.chunks = chunks;
    const started = Date.now();
    this.counters.synths += 1;
    this.record({ type: "synth-start", key, engine: resolved.engine, voice: resolved.voice, lang: resolved.lang, chars: text.length, parts: chunks.length });
    const model = modelKey(resolved.engine, resolved.voice);
    if (this.models.get(model)?.phase !== "ready") {
      this.models.set(model, { phase: "downloading", loaded: 0, total: 0, stored: this.models.get(model)?.stored ?? false });
      this.notifyStatus();
    }
    const run = () => {
      const request = this.send({
        type: "SYNTHESIZE",
        payload: {
          engine: resolved.engine as Exclude<TtsEngine, "webspeech">,
          voice: resolved.voice,
          lang: resolved.lang,
          chunks: chunks.map((chunk) => chunk.text),
          priority: entry.wantNow ? 0 : 1,
        },
      });
      entry.requestId = request.id;
      const pending = this.pending.get(request.id);
      if (pending) {
        pending.onPart = (index, samples, sampleRate, timing) => {
          entry.parts[index] = { samples, sampleRate };
          if (sampleRate > 0) {
            this.recordTiming(resolved.engine, timing, (samples.length / sampleRate) * 1000);
          }
          for (const listener of [...entry.partListeners]) {
            listener();
          }
        };
      }
      return { pending, promise: request.promise };
    };
    let attempt = run();
    let pending = attempt.pending;
    let done: WorkerReply;
    try {
      try {
        done = await attempt.promise;
      } catch (first) {
        // O worker caiu (script não carregou, erro fora de promessa): um worker novo tenta uma vez.
        if (!(first instanceof SpeechError) || !first.detail?.startsWith("worker:")) {
          throw first;
        }
        attempt = run();
        pending = attempt.pending;
        done = await attempt.promise;
      }
    } catch (caught) {
      const error = caught instanceof SpeechError ? caught : new SpeechError("synthesis-failed", caught instanceof Error ? caught.message : undefined);
      // Pré-carga descartada numa troca de voz não é falha.
      if (error.detail !== "dropped") {
        this.counters.errors += 1;
      }
      this.record({ type: "error", key, engine: resolved.engine, voice: resolved.voice, lang: resolved.lang, error: error.detail ?? error.code });
      if (this.models.get(model)?.phase === "downloading") {
        this.models.set(model, { ...(this.models.get(model) as ModelState), phase: "error" });
        this.notifyStatus();
      }
      throw error;
    }
    const parts = (pending?.parts ?? []).filter((part): part is Float32Array => part instanceof Float32Array);
    const sampleRate = done.samplingRate || pending?.sampleRate || 0;
    if (parts.length !== chunks.length || sampleRate <= 0) {
      this.counters.errors += 1;
      this.record({ type: "error", key, error: "parts-missing" });
      throw new SpeechError("synthesis-failed", "parts-missing");
    }
    const timings: ChunkTiming[] = [];
    let cursor = 0;
    for (const part of parts) {
      const bounds = voicedBounds(part, sampleRate);
      const durationMs = (part.length / sampleRate) * 1000;
      timings.push({ startMs: cursor, durationMs, voicedStartMs: bounds.startMs, voicedEndMs: bounds.endMs });
      cursor += durationMs;
    }
    const wav = encodeWav(concatFloat32(parts), sampleRate);
    const header = readWavInfo(wav);
    const blob = new Blob([wav], { type: "audio/wav" });
    const clip: SpeechClip = {
      key,
      url: URL.createObjectURL(blob),
      text,
      lang: resolved.lang,
      engine: resolved.engine,
      voice: done.voice ?? resolved.voice,
      words: estimateWordMarks(text, resolved.lang, chunks, timings),
      sampleRate: header?.sampleRate ?? sampleRate,
      durationMs: header?.durationMs ?? Math.round(cursor),
      bytes: wav.byteLength,
    };
    this.keep(clip);
    this.record({
      type: "synth-end",
      key,
      engine: clip.engine,
      voice: clip.voice,
      lang: clip.lang,
      sampleRate: clip.sampleRate,
      durationMs: clip.durationMs,
      ms: Date.now() - started,
      chars: text.length,
      parts: parts.length,
    });
    void saveStoredClip({
      key,
      wav: blob,
      words: clip.words,
      engine: clip.engine,
      voice: clip.voice,
      lang: clip.lang,
      sampleRate: clip.sampleRate,
      durationMs: clip.durationMs,
      bytes: clip.bytes,
      usedAt: Date.now(),
    });
    return { clip, source: "synth" };
  }

  private keep(clip: SpeechClip): void {
    this.clips.set(clip.key, clip, clip.bytes);
    this.liveUrls.set(clip.url, clip.key);
    rememberClipUrl(clip.url, { key: clip.key, text: clip.text, lang: clip.lang, voice: clip.voice });
    this.notifyStatus();
  }

  private evicted(entry: LruEntry<SpeechClip>): void {
    this.liveUrls.delete(entry.value.url);
    try {
      URL.revokeObjectURL(entry.value.url);
    } catch {
      // já revogada
    }
    this.counters.evictions += 1;
    this.record({ type: "evict", key: entry.key, engine: entry.value.engine, voice: entry.value.voice });
  }

  /**
   * Como `synthesize`, mas entrega cada trecho assim que o worker o termina (para começar a tocar
   * um texto longo sem esperar o todo). O primeiro trecho traz as palavras de todo o texto numa
   * linha do tempo estimada (durações reais dos trechos prontos, o resto por caractere).
   * `streamed` diz se algum trecho saiu; se não (cache, disco, japonês), toque o clipe inteiro.
   */
  async synthesizeStreaming(
    text: string,
    lang: string,
    voice: string | null | undefined,
    onSegment: (segment: ClipSegment) => void,
  ): Promise<{ clip: SpeechClip; source: ClipSource; streamed: boolean }> {
    const promise = this.synthesizeDetailed(text, lang, voice);
    let entry: InflightClip | undefined;
    try {
      const resolved = resolveVoice(lang, voice, undefined, this.englishEngine());
      entry = this.inflight.get(audioCacheKey(text.trim(), resolved.lang, resolved.voice));
    } catch {
      entry = undefined;
    }
    let emitted = 0;
    let timeline: ChunkTiming[] | null = null;
    let total = 0;
    const emit = () => {
      const chunks = entry?.chunks;
      if (!entry || !chunks) {
        return;
      }
      while (emitted < chunks.length) {
        const part = entry.parts[emitted];
        if (!part) {
          return;
        }
        let words: TimedWord[] | undefined;
        if (!timeline) {
          const known: number[] = [];
          for (const item of entry.parts) {
            if (!item) {
              break;
            }
            known.push((item.samples.length / item.sampleRate) * 1000);
          }
          timeline = estimateTimeline(chunks, known);
          total = timeline.reduce((sum, timing) => sum + timing.durationMs, 0);
          words = estimateWordMarks(entry.text, entry.lang, chunks, timeline);
        }
        const timing = timeline[emitted] ?? { startMs: total, durationMs: 0 };
        const wav = encodeWav(part.samples, part.sampleRate);
        onSegment({
          url: URL.createObjectURL(new Blob([wav], { type: "audio/wav" })),
          index: emitted,
          total: chunks.length,
          estStartMs: Math.round(timing.startMs),
          estEndMs: Math.round(timing.startMs + timing.durationMs),
          estTotalMs: Math.round(total),
          ...(words ? { words } : {}),
        });
        emitted += 1;
      }
    };
    entry?.partListeners.add(emit);
    emit();
    try {
      const result = await promise;
      emit();
      return { ...result, streamed: emitted > 0 };
    } finally {
      entry?.partListeners.delete(emit);
    }
  }

  /** Vários textos na ordem (o worker sintetiza um por vez; o primeiro fica pronto primeiro). */
  synthesizeMany(texts: string[], lang: string, voice?: string | null, options: SynthesisOptions = {}): Promise<SpeechClip[]> {
    return Promise.all(texts.map((text) => this.synthesize(text, lang, voice, options)));
  }

  /** Pré-carrega em segundo plano; erros ficam só no registro de eventos. */
  prefetch(texts: string[], lang: string, voice?: string | null, options: Omit<SynthesisOptions, "priority"> = {}): void {
    // Trocando para a voz rápida: pré-carregar com o Kokoro lento só atrasaria a troca (mesma thread).
    if (this.fastSwitch && speechLang(lang) === "en" && this.englishEngine() === "kokoro" && !isFastEnglishVoice(voice)) {
      return;
    }
    for (const text of texts) {
      if (text.trim()) {
        void this.synthesize(text, lang, voice, { ...options, priority: "prefetch" }).catch(() => undefined);
      }
    }
  }

  isLiveUrl(url: string): boolean {
    return this.liveUrls.has(url);
  }

  /** A blob: URL foi gerada aqui, mas não vale mais (F5 ou saiu do cache). */
  needsRevival(url: string): boolean {
    return url.startsWith("blob:") && !this.liveUrls.has(url) && clipRefForUrl(url) !== null;
  }

  /** Refaz uma blob: URL antiga a partir do texto registrado (cache em disco ou nova síntese). */
  async reviveUrl(url: string): Promise<string | null> {
    const ref = clipRefForUrl(url);
    if (!ref) {
      return null;
    }
    const clip = await this.synthesize(ref.text, ref.lang, ref.voice);
    this.counters.revivals += 1;
    this.record({ type: "revive", key: clip.key, engine: clip.engine, voice: clip.voice, lang: clip.lang });
    return clip.url;
  }

  /** Segura a URL no cache enquanto toca. */
  retain(url: string): void {
    const key = this.liveUrls.get(url);
    if (key) {
      this.clips.pin(key);
    }
  }

  releaseUrl(url: string): void {
    const key = this.liveUrls.get(url);
    if (key) {
      this.clips.unpin(key);
    }
  }

  // --- Modelos -------------------------------------------------------------

  /** Pergunta ao worker o que já está guardado no aparelho (uma vez). */
  inspect(): Promise<void> {
    if (this.inspected) {
      return this.inspected;
    }
    if (!this.isSupported()) {
      return Promise.resolve();
    }
    this.inspected = this.send({ type: "INSPECT" })
      .promise.then((result) => {
        for (const voice of result.piperStored ?? []) {
          const key = modelKey("piper", voice);
          const state = this.models.get(key);
          this.models.set(key, { phase: state?.phase ?? "idle", loaded: state?.loaded ?? 0, total: state?.total ?? 0, stored: true });
        }
        if (result.kokoroCached) {
          const state = this.models.get("kokoro");
          this.models.set("kokoro", { phase: state?.phase ?? "idle", loaded: state?.loaded ?? 0, total: state?.total ?? 0, stored: true });
        }
        if (result.kokoroDevice && !this.kokoroDevice) {
          this.kokoroDevice = result.kokoroDevice;
        }
        this.notifyStatus();
      })
      .catch(() => {
        this.inspected = null;
      });
    return this.inspected;
  }

  /** Estado do modelo de uma voz (baixando, pronto, guardado no aparelho). */
  modelState(lang: string, voice?: string | null): ModelState {
    let resolved: ResolvedVoice;
    try {
      resolved = resolveVoice(lang, voice, undefined, this.englishEngine());
    } catch {
      return { phase: "error", loaded: 0, total: 0, stored: false };
    }
    if (resolved.engine === "webspeech") {
      return { phase: "ready", loaded: 0, total: 0, stored: true };
    }
    return this.models.get(modelKey(resolved.engine, resolved.voice)) ?? { phase: "idle", loaded: 0, total: 0, stored: false };
  }

  /**
   * Baixa e carrega o modelo (e a voz) de um idioma, com progresso real do worker.
   * Sem idioma, usa o último idioma pedido.
   */
  downloadModels(
    onProgress?: (progress: ModelProgress) => void,
    options: { lang?: string; voice?: string | null; mentorId?: string; english?: EnglishEngine } = {},
  ): Promise<void> {
    let resolved: ResolvedVoice;
    try {
      resolved = resolveVoice(options.lang ?? this.lastLang, options.voice, options.mentorId, options.english ?? this.englishEngine());
    } catch (caught) {
      return Promise.reject(caught);
    }
    this.lastLang = resolved.lang;
    if (resolved.engine === "webspeech") {
      const api = speechSynthesisApi();
      if (!api) {
        return Promise.reject(new SpeechError("engine-unavailable"));
      }
      return waitForSystemVoices(api, 1_500).then((voices) => {
        if (!voices.some((voice) => voice.lang.toLowerCase().startsWith(resolved.lang))) {
          throw new SpeechError("no-japanese-voice");
        }
        onProgress?.({ lang: resolved.lang, engine: "webspeech", voice: resolved.voice, loaded: 0, total: 0, fraction: 1 });
      });
    }
    const key = modelKey(resolved.engine, resolved.voice);
    const listener = onProgress
      ? (progress: ModelProgress) => onProgress({ ...progress, lang: resolved.lang, voice: resolved.voice })
      : null;
    if (listener) {
      const set = this.downloadListeners.get(key) ?? new Set();
      set.add(listener);
      this.downloadListeners.set(key, set);
    }
    let download = this.downloads.get(key);
    if (!download) {
      if (this.models.get(key)?.phase !== "ready") {
        this.models.set(key, { phase: "downloading", loaded: 0, total: 0, stored: this.models.get(key)?.stored ?? false });
        this.notifyStatus();
      }
      download = this.send({
        type: "PRELOAD",
        payload: { engine: resolved.engine as Exclude<TtsEngine, "webspeech">, voice: resolved.voice, lang: resolved.lang },
      }).promise.then(
        () => {
          const state = this.models.get(key);
          this.models.set(key, { phase: "ready", loaded: state?.total ?? 0, total: state?.total ?? 0, stored: true });
          this.notifyStatus();
        },
        (caught: unknown) => {
          const state = this.models.get(key);
          this.models.set(key, { phase: "error", loaded: state?.loaded ?? 0, total: state?.total ?? 0, stored: state?.stored ?? false });
          this.counters.errors += 1;
          this.record({ type: "error", engine: resolved.engine, voice: resolved.voice, error: caught instanceof SpeechError ? caught.detail ?? caught.code : "preload" });
          this.notifyStatus();
          throw caught instanceof SpeechError ? caught : new SpeechError("download-failed");
        },
      );
      const tracked = download.finally(() => {
        if (this.downloads.get(key) === tracked) {
          this.downloads.delete(key);
        }
      });
      tracked.catch(() => undefined);
      this.downloads.set(key, tracked);
      download = tracked;
    }
    return download.then(
      () => {
        if (listener) {
          this.downloadListeners.get(key)?.delete(listener);
          const state = this.models.get(key);
          listener({ lang: resolved.lang, engine: resolved.engine, voice: resolved.voice, loaded: state?.total ?? 0, total: state?.total ?? 0, fraction: 1 });
        }
      },
      (caught: unknown) => {
        if (listener) {
          this.downloadListeners.get(key)?.delete(listener);
        }
        throw caught;
      },
    );
  }

  // --- Velocidade da voz em inglês -----------------------------------------

  /** Motor que narra o inglês neste aparelho agora (ver services/audio/speedGuard). */
  englishEngine(): EnglishEngine {
    return currentEnglishEngine();
  }

  /** Quem escolhe a voz rápida da troca automática (o narrador registra a escolha do aluno). */
  setFastVoicePicker(picker: () => string): void {
    this.fastVoicePicker = picker;
  }

  /** A voz rápida que a narração em inglês usaria agora. */
  fastVoice(): string {
    try {
      const id = this.fastVoicePicker();
      return isFastEnglishVoice(id) ? id : FAST_EN_DEFAULT;
    } catch {
      return FAST_EN_DEFAULT;
    }
  }

  speedInfo(): SpeedInfo {
    const state = speedState();
    return {
      preference: state.preference,
      engine: this.englishEngine(),
      autoFast: state.autoFast,
      verdict: currentVerdict(this.kokoroDevice),
      kokoroDevice: this.kokoroDevice,
      switching: this.fastSwitch !== null,
    };
  }

  /** Escolha do aluno: automático, natural (Kokoro) ou rápida (Piper). Fica neste aparelho. */
  setSpeedPreference(preference: VoiceSpeedPreference): void {
    storeSpeedPreference(preference);
    if (this.englishEngine() === "piper") {
      this.dropQueuedKokoro();
    }
    if (preference === "auto") {
      void this.maybeSwitchToFast()?.catch(() => undefined);
    }
    this.notifyStatus();
  }

  /** A troca automática em andamento (download da voz rápida), se houver. */
  pendingFastSwitch(): Promise<void> | null {
    return this.fastSwitch;
  }

  /** Começa a troca automática se a voz natural já foi medida lenta (ou devolve a que está em andamento). */
  switchToFastIfSlow(): Promise<void> | null {
    return this.maybeSwitchToFast();
  }

  /**
   * Mede a voz natural neste aparelho: carrega o Kokoro (baixa se preciso), aquece a voz e
   * cronometra uma frase de ~4 s. A medida entra no guarda e pode disparar a troca automática.
   */
  async benchmark(): Promise<SpeedVerdict | null> {
    await this.downloadModels(undefined, { lang: "en", english: "kokoro" });
    const result = await this.send({
      type: "BENCH",
      payload: { engine: "kokoro", voice: DEFAULT_VOICE_BY_LANG.en, lang: "en", text: BENCH_TEXT },
    }).promise;
    if (result.device) {
      this.kokoroDevice = result.device;
    }
    this.recordTiming("kokoro", { inferMs: result.inferMs, cold: result.cold, device: result.device }, result.audioMs ?? 0);
    return currentVerdict(result.device ?? this.kokoroDevice);
  }

  /** Força o dispositivo do Kokoro (só para testes e medições; o padrão é automático). */
  configureKokoroDevice(device: "auto" | KokoroDevice): void {
    this.kokoroDeviceOverride = device;
    if (device !== "auto" && this.kokoroDevice && this.kokoroDevice !== device) {
      this.models.delete("kokoro");
      this.kokoroDevice = null;
    }
    this.worker?.postMessage({ type: "CONFIG", payload: { kokoroDevice: device } });
  }

  private recordTiming(engine: TtsEngine, timing: PartTiming, audioMs: number): void {
    if (engine !== "kokoro" || timing.cold || !timing.device || !timing.inferMs || !(audioMs > 0)) {
      return;
    }
    const verdict = recordSpeedSample({ device: timing.device, audioMs, inferMs: timing.inferMs, at: Date.now() });
    this.record({
      type: "speed-sample",
      engine: "kokoro",
      device: timing.device,
      ms: timing.inferMs,
      durationMs: Math.round(audioMs),
      rtf: verdict?.rtf ?? Math.round((timing.inferMs / audioMs) * 100) / 100,
    });
    void this.maybeSwitchToFast()?.catch(() => undefined);
  }

  /**
   * Natural medido lento, no automático: baixa a voz rápida e só então passa a narração para ela
   * (até lá o Kokoro continua falando, devagar, em vez de deixar o aluno sem voz).
   */
  private maybeSwitchToFast(): Promise<void> | null {
    if (this.fastSwitch) {
      return this.fastSwitch;
    }
    const state = speedState();
    const verdict = currentVerdict(this.kokoroDevice);
    if (!shouldSwitchToFast(state.preference, verdict, state.autoFast)) {
      return null;
    }
    const voice = this.fastVoice();
    // A pré-carga do Kokoro ocuparia o worker (WASM numa thread) e atrasaria o download da voz rápida.
    this.dropQueuedKokoro();
    const run = this.downloadModels(undefined, { lang: "en", voice }).then(() => {
      const now = speedState();
      // O aluno pode ter escolhido a voz natural enquanto baixava: a escolha dele manda.
      if (now.preference === "auto" && !now.autoFast) {
        setAutoFast(true);
        this.record({ type: "engine-switch", engine: "piper", voice, lang: "en", rtf: verdict?.rtf, device: verdict?.device });
        this.dropQueuedKokoro();
      }
    });
    const tracked = run.finally(() => {
      if (this.fastSwitch === tracked) {
        this.fastSwitch = null;
      }
      this.notifyStatus();
    });
    tracked.catch(() => undefined);
    this.fastSwitch = tracked;
    this.notifyStatus();
    return tracked;
  }

  /**
   * Descarta a pré-carga do Kokoro (a voz agora é outra): a que está na fila sai, a que está rodando
   * para no fim do trecho atual. O que alguém espera para tocar agora (wantNow) continua.
   */
  private dropQueuedKokoro(): void {
    const ids: string[] = [];
    for (const entry of this.inflight.values()) {
      if (entry.engine === "kokoro" && !entry.wantNow && entry.requestId) {
        ids.push(entry.requestId);
      }
    }
    if (ids.length > 0) {
      this.worker?.postMessage({ type: "DROP", payload: { ids } });
    }
  }

  // --- Estado, assinaturas e teste ------------------------------------------

  stats(): SpeechStats {
    return { ...this.counters, clips: this.clips.size, bytes: this.clips.bytes };
  }

  private record(event: Omit<SpeechEvent, "at">): void {
    this.events.push({ ...event, at: Date.now() });
    if (this.events.length > EVENT_LIMIT) {
      this.events.splice(0, this.events.length - EVENT_LIMIT);
    }
  }

  getStatus(): VoiceEngineStatus {
    const states = [...this.models.entries()];
    const downloading = states.find(([, state]) => state.phase === "downloading")?.[1];
    const anyReady = states.some(([, state]) => state.phase === "ready");
    const anyError = states.some(([, state]) => state.phase === "error");
    const progress = downloading
      ? downloading.total > 0
        ? Math.min(99, Math.floor((downloading.loaded / downloading.total) * 100))
        : 0
      : anyReady
        ? 100
        : 0;
    return {
      mode: this.engineMode,
      isKokoroReady: this.models.get("kokoro")?.phase === "ready",
      isPiperReady: states.some(([key, state]) => key.startsWith("piper:") && state.phase === "ready"),
      downloadProgress: progress,
      downloadStatus: downloading ? "downloading" : anyReady ? "ready" : anyError ? "error" : "idle",
      cachedAudiosCount: this.clips.size,
      cachedBytesApprox: this.clips.bytes,
      isWarmingUp: Boolean(downloading),
    };
  }

  subscribe(listener: (status: VoiceEngineStatus) => void): () => void {
    this.speedWatch ??= subscribeSpeed(() => this.notifyStatus());
    this.statusListeners.add(listener);
    listener(this.getStatus());
    void this.inspect();
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** Retrato atual (o mesmo objeto até a próxima mudança). */
  snapshot(): SpeechSnapshot {
    if (!this.snapshotCache) {
      this.snapshotVersion += 1;
      this.snapshotCache = {
        version: this.snapshotVersion,
        speed: this.speedInfo(),
        fastVoice: this.fastVoice(),
        modelState: (lang, voice) => this.modelState(lang, voice),
      };
    }
    return this.snapshotCache;
  }

  private notifyStatus(): void {
    this.snapshotCache = null;
    const status = this.getStatus();
    for (const listener of [...this.statusListeners]) {
      try {
        listener(status);
      } catch {
        // um assinante com erro não derruba os outros
      }
    }
  }

  subscribePlayback(listener: (info: ActivePlaybackInfo) => void): () => void {
    this.playbackListeners.add(listener);
    listener(this.activePlayback);
    return () => {
      this.playbackListeners.delete(listener);
    };
  }

  private notifyPlayback(info: ActivePlaybackInfo): void {
    this.activePlayback = { ...info };
    for (const listener of [...this.playbackListeners]) {
      try {
        listener(this.activePlayback);
      } catch {
        // idem
      }
    }
  }

  getActivePlayback(): ActivePlaybackInfo {
    return { ...this.activePlayback };
  }

  /** Só existe um modo: Kokoro/Piper no aparelho (Web Speech só em japonês). */
  getEngineMode(): VoiceEngineMode {
    return this.engineMode;
  }

  /** Mantido por compatibilidade; o modo não muda o motor (ver getEngineMode). */
  setEngineMode(mode: VoiceEngineMode): void {
    void mode;
    this.notifyStatus();
  }

  /** Esvazia os clipes (memória, disco e registro de URLs). Os modelos baixados ficam. */
  clearCache(): void {
    this.clips.clear();
    forgetClipUrls();
    void clearStoredClips();
    this.notifyStatus();
  }

  // --- API legada: speak/stop/preload/isCached/warmup ------------------------

  isCached(text: string, options: SpeechOptions = {}): boolean {
    try {
      const resolved = resolveVoice(options.lang ?? "en", undefined, options.mentorId, this.englishEngine());
      return this.clips.has(audioCacheKey(text.trim(), resolved.lang, resolved.voice));
    } catch {
      return false;
    }
  }

  preload(text: string, options: SpeechOptions = {}): void {
    this.prefetch([text], options.lang ?? "en", undefined, { mentorId: options.mentorId });
  }

  /** Carrega o modelo do idioma só se ele já estiver guardado no aparelho (não baixa nada). */
  async warmup(targetLang = "en", mentorId?: string): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }
    await this.inspect();
    let resolved: ResolvedVoice;
    try {
      resolved = resolveVoice(targetLang, undefined, mentorId, this.englishEngine());
    } catch {
      return false;
    }
    if (resolved.engine === "webspeech") {
      return true;
    }
    if (!this.models.get(modelKey(resolved.engine, resolved.voice))?.stored) {
      return false;
    }
    try {
      await this.downloadModels(undefined, { lang: resolved.lang, voice: resolved.voice });
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    this.legacyToken += 1;
    const stop = this.legacyStop;
    this.legacyStop = null;
    stop?.();
    if (this.activePlayback.isPlaying) {
      this.notifyPlayback({ ...this.activePlayback, isPlaying: false });
    }
  }

  /** Fala um texto (telas antigas). Mesma síntese/cache dos clipes; velocidade sem mudar o tom. */
  async speak(text: string, options: SpeechOptions = {}): Promise<boolean> {
    if (!text.trim()) {
      return false;
    }
    this.stop();
    const token = this.legacyToken;
    const rate = speedValue(options.speed);
    let clip: SpeechClip;
    try {
      clip = await this.synthesize(text, options.lang ?? "en", undefined, { mentorId: options.mentorId });
    } catch (caught) {
      options.onError?.(caught);
      options.onEnd?.();
      return false;
    }
    if (token !== this.legacyToken) {
      return false;
    }
    const mentorName = options.mentorId ? mindById(options.mentorId).name : "";
    this.notifyPlayback({ isPlaying: true, engine: ENGINE_LABEL[clip.engine], voice: clip.voice, mentorName, lang: clip.lang, samplingRate: clip.sampleRate || undefined });
    let boundary = 0;
    const emitBoundaries = (mediaMs: number) => {
      while (boundary < clip.words.length && (clip.words[boundary]?.offsetMs ?? Infinity) <= mediaMs) {
        const word = clip.words[boundary];
        if (word) {
          options.onBoundary?.({ charIndex: word.charIndex, charLength: word.text.length, name: "word" });
        }
        boundary += 1;
      }
    };
    let stopper: () => void = () => undefined;
    const ended = () => {
      if (this.legacyStop === stopper) {
        this.legacyStop = null;
      }
      this.notifyPlayback({ ...this.activePlayback, isPlaying: false });
    };
    if (clip.engine === "webspeech") {
      const handle = speakWithWebSpeech(clip.text, clip.lang, clip.voice, rate, {
        onStart: () => options.onStart?.(),
        onProgress: (mediaMs) => emitBoundaries(mediaMs),
        onEnd: () => {
          ended();
          options.onEnd?.();
        },
        onError: (message) => {
          ended();
          options.onError?.(new Error(message));
          options.onEnd?.();
        },
      });
      stopper = () => handle.cancel();
      this.legacyStop = stopper;
      return true;
    }
    const Factory = (globalThis as { Audio?: new (src: string) => WebAudioLike }).Audio;
    if (!Factory) {
      options.onError?.(new SpeechError("engine-unavailable"));
      options.onEnd?.();
      return false;
    }
    const audio = new Factory(clip.url);
    keepPitch(audio);
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    this.retain(clip.url);
    let released = false;
    const onTime = () => emitBoundaries(audio.currentTime * 1000);
    const cleanup = () => {
      if (released) {
        return;
      }
      released = true;
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onFailed);
      audio.pause();
      this.releaseUrl(clip.url);
    };
    const onEnded = () => {
      emitBoundaries(Infinity);
      cleanup();
      ended();
      options.onEnd?.();
    };
    const onFailed = () => {
      cleanup();
      ended();
      options.onError?.(new Error(voiceCopy().audioFailed));
      options.onEnd?.();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onFailed);
    stopper = cleanup;
    this.legacyStop = stopper;
    options.onStart?.();
    try {
      await audio.play();
    } catch {
      if (!released) {
        cleanup();
        ended();
        options.onError?.(new Error(voiceCopy().browserRefused));
        options.onEnd?.();
      }
      return false;
    }
    return true;
  }
}

export const speechService = new SpeechService();

// ---------------------------------------------------------------------------
// Gancho de teste: globalThis.__prosaSpeech (só em desenvolvimento ou E2E)
// ---------------------------------------------------------------------------

declare const __DEV__: boolean | undefined;

export interface SpeechTestHook {
  events: SpeechEvent[];
  readonly stats: SpeechStats;
  speak: (text: string, lang: string, voice?: string) => Promise<{
    engine: TtsEngine;
    voice: string;
    lang: string;
    sampleRate: number;
    headerSampleRate: number | null;
    durationMs: number;
    words: number;
    source: ClipSource;
    cacheHit: boolean;
    ms: number;
    url: string;
  }>;
  download: (lang: string, voice?: string) => Promise<void>;
  /** Mede o streaming: quando cada trecho chega e a linha do tempo estimada. */
  stream: (text: string, lang: string, voice?: string) => Promise<{
    streamed: boolean;
    source: ClipSource;
    totalMs: number;
    durationMs: number;
    words: number;
    segments: Array<{ index: number; total: number; atMs: number; estStartMs: number; estEndMs: number; estTotalMs: number; words: number }>;
  }>;
  modelState: (lang: string, voice?: string) => ModelState;
  /** Guarda de velocidade do inglês: preferência, motor atual, medida e dispositivo do Kokoro. */
  speed: () => SpeedInfo;
  setSpeedPreference: (preference: VoiceSpeedPreference) => void;
  /** Mede a voz natural (baixa e carrega o Kokoro se preciso). */
  benchmark: () => Promise<SpeedVerdict | null>;
  /** Força o dispositivo do Kokoro antes de carregar (medições de WebGPU x WASM). */
  configureKokoroDevice: (device: "auto" | KokoroDevice) => void;
  /** Espera a troca automática para a voz rápida, se estiver em andamento. */
  fastSwitch: () => Promise<void>;
  /** Pré-carga em segundo plano (como a lição faz). */
  prefetch: (texts: string[], lang: string, voice?: string) => void;
}

function installTestHook(): void {
  const dev = typeof __DEV__ !== "undefined" && Boolean(__DEV__);
  if (!dev && process.env.EXPO_PUBLIC_E2E !== "1") {
    return;
  }
  const hook: SpeechTestHook = {
    events: speechService.events,
    get stats() {
      return speechService.stats();
    },
    speak: async (text, lang, voice) => {
      const started = Date.now();
      const { clip, source } = await speechService.synthesizeDetailed(text, lang, voice);
      let headerSampleRate: number | null = null;
      if (clip.url.startsWith("blob:")) {
        const response = await fetch(clip.url);
        headerSampleRate = readWavInfo(await response.arrayBuffer())?.sampleRate ?? null;
      }
      return {
        engine: clip.engine,
        voice: clip.voice,
        lang: clip.lang,
        sampleRate: clip.sampleRate,
        headerSampleRate,
        durationMs: clip.durationMs,
        words: clip.words.length,
        source,
        cacheHit: source === "memory" || source === "disk",
        ms: Date.now() - started,
        url: clip.url,
      };
    },
    download: (lang, voice) => speechService.downloadModels(undefined, { lang, voice }),
    stream: async (text, lang, voice) => {
      const started = Date.now();
      const segments: Array<{ index: number; total: number; atMs: number; estStartMs: number; estEndMs: number; estTotalMs: number; words: number }> = [];
      const result = await speechService.synthesizeStreaming(text, lang, voice, (segment) => {
        segments.push({
          index: segment.index,
          total: segment.total,
          atMs: Date.now() - started,
          estStartMs: segment.estStartMs,
          estEndMs: segment.estEndMs,
          estTotalMs: segment.estTotalMs,
          words: segment.words?.length ?? 0,
        });
        URL.revokeObjectURL(segment.url);
      });
      return {
        streamed: result.streamed,
        source: result.source,
        totalMs: Date.now() - started,
        durationMs: result.clip.durationMs,
        words: result.clip.words.length,
        segments,
      };
    },
    modelState: (lang, voice) => speechService.modelState(lang, voice),
    speed: () => speechService.speedInfo(),
    setSpeedPreference: (preference) => speechService.setSpeedPreference(preference),
    benchmark: () => speechService.benchmark(),
    configureKokoroDevice: (device) => speechService.configureKokoroDevice(device),
    fastSwitch: () => speechService.pendingFastSwitch() ?? Promise.resolve(),
    prefetch: (texts, lang, voice) => speechService.prefetch(texts, lang, voice),
  };
  (globalThis as { __prosaSpeech?: SpeechTestHook }).__prosaSpeech = hook;
}

installTestHook();
