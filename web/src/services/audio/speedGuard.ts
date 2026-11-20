// Prosa — guarda de velocidade da voz em inglês.
//
// O Kokoro (voz natural) roda no aparelho: pela placa de vídeo (WebGPU) quando há, senão no
// processador (WASM, uma thread). Em muitos aparelhos o WASM gera a fala mais devagar do que ela
// toca (fator de tempo real > 1): o aluno espera entre as frases. O guarda mede o fator real das
// primeiras sínteses (tempo de inferência ÷ duração do áudio, sem a primeira de cada voz, que
// inclui compilação e download do estilo) e, se passar de 1,1, troca a narração em inglês por uma
// voz Piper (rápida) — só depois que ela estiver baixada, para não deixar o aluno sem voz.
//
// A medida e a escolha ficam neste aparelho (kv). O aluno pode forçar "natural" ou "rápida".
// As funções puras abaixo são testadas em `tests/unit/voice-speed.test.ts`.

import { kv } from "@/lib/kv";

export type KokoroDevice = "webgpu" | "wasm";
export type VoiceSpeedPreference = "auto" | "natural" | "fast";
export type EnglishEngine = "kokoro" | "piper";

export interface RtfSample {
  device: KokoroDevice;
  /** Duração do áudio gerado. */
  audioMs: number;
  /** Tempo de inferência (sem download do modelo). */
  inferMs: number;
  at: number;
}

export interface SpeedVerdict {
  device: KokoroDevice;
  /** Segundos de cálculo por segundo de fala (1 = tempo real). */
  rtf: number;
  slow: boolean;
  audioMs: number;
  samples: number;
}

/** Acima disto a voz natural atrasa a leitura (margem de 10% sobre o tempo real). */
export const SLOW_RTF = 1.1;
/** Trechos muito curtos medem mais a sobrecarga do que a voz. */
export const MIN_SAMPLE_AUDIO_MS = 500;
/** Áudio somado necessário para um veredito. */
export const MIN_VERDICT_AUDIO_MS = 2_000;
export const MAX_SAMPLES = 8;

const STORAGE_KEY = "prosa.voice.speed.v1";

function validSample(sample: RtfSample): boolean {
  return (
    (sample.device === "webgpu" || sample.device === "wasm") &&
    Number.isFinite(sample.audioMs) &&
    Number.isFinite(sample.inferMs) &&
    sample.audioMs >= MIN_SAMPLE_AUDIO_MS &&
    sample.inferMs > 0
  );
}

/** Acrescenta uma medida e guarda só as últimas `max` (as inválidas ficam de fora). */
export function addSample(samples: readonly RtfSample[], sample: RtfSample, max = MAX_SAMPLES): RtfSample[] {
  if (!validSample(sample)) {
    return [...samples];
  }
  return [...samples, sample].slice(-max);
}

/**
 * Veredito das medidas de um dispositivo (por padrão, o da medida mais recente): soma do tempo de
 * inferência ÷ soma da duração do áudio. Sem áudio suficiente, ainda não há veredito (null).
 */
export function speedVerdict(samples: readonly RtfSample[], device?: KokoroDevice | null): SpeedVerdict | null {
  const valid = samples.filter(validSample);
  const target = device ?? valid[valid.length - 1]?.device;
  if (!target) {
    return null;
  }
  const mine = valid.filter((sample) => sample.device === target);
  const audioMs = mine.reduce((sum, sample) => sum + sample.audioMs, 0);
  if (audioMs < MIN_VERDICT_AUDIO_MS) {
    return null;
  }
  const inferMs = mine.reduce((sum, sample) => sum + sample.inferMs, 0);
  const rtf = Math.round((inferMs / audioMs) * 100) / 100;
  return { device: target, rtf, slow: rtf > SLOW_RTF, audioMs: Math.round(audioMs), samples: mine.length };
}

/** Motor da narração em inglês: a escolha do aluno manda; no automático, o rápido só depois de pronto. */
export function englishEngineFor(preference: VoiceSpeedPreference, autoFast: boolean): EnglishEngine {
  if (preference === "natural") {
    return "kokoro";
  }
  if (preference === "fast") {
    return "piper";
  }
  return autoFast ? "piper" : "kokoro";
}

/** Hora de baixar a voz rápida e trocar: automático, natural medido lento e ainda sem a troca. */
export function shouldSwitchToFast(preference: VoiceSpeedPreference, verdict: SpeedVerdict | null, autoFast: boolean): boolean {
  return preference === "auto" && !autoFast && verdict?.slow === true;
}

// ---------------------------------------------------------------------------
// Estado deste aparelho
// ---------------------------------------------------------------------------

export interface SpeedState {
  preference: VoiceSpeedPreference;
  samples: RtfSample[];
  /** No automático, a voz rápida já foi baixada e a narração em inglês passou para ela. */
  autoFast: boolean;
}

const EMPTY: SpeedState = { preference: "auto", samples: [], autoFast: false };
const listeners = new Set<() => void>();
let state: SpeedState | null = null;

function parse(raw: string | undefined): SpeedState {
  if (!raw) {
    return { ...EMPTY, samples: [] };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SpeedState> | null;
    if (!parsed || typeof parsed !== "object") {
      return { ...EMPTY, samples: [] };
    }
    const preference = parsed.preference === "natural" || parsed.preference === "fast" ? parsed.preference : "auto";
    const samples = Array.isArray(parsed.samples)
      ? parsed.samples.filter((item): item is RtfSample => Boolean(item) && typeof item === "object" && validSample(item as RtfSample)).slice(-MAX_SAMPLES)
      : [];
    return { preference, samples, autoFast: parsed.autoFast === true };
  } catch {
    return { ...EMPTY, samples: [] };
  }
}

/** Estado salvo neste aparelho (lido uma vez; fora do navegador fica só em memória). */
export function speedState(): SpeedState {
  if (!state) {
    state = typeof window === "undefined" ? { ...EMPTY, samples: [] } : parse(kv.getString(STORAGE_KEY));
  }
  return state;
}

function commit(next: SpeedState): void {
  state = next;
  try {
    kv.set(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // armazenamento cheio ou bloqueado: vale nesta sessão
  }
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // um assinante com erro não derruba os outros
    }
  }
}

export function currentVerdict(device?: KokoroDevice | null): SpeedVerdict | null {
  return speedVerdict(speedState().samples, device);
}

export function currentEnglishEngine(): EnglishEngine {
  const current = speedState();
  return englishEngineFor(current.preference, current.autoFast);
}

/** Registra uma medida do Kokoro e devolve o veredito atualizado. */
export function recordSpeedSample(sample: RtfSample): SpeedVerdict | null {
  const current = speedState();
  if (!validSample(sample)) {
    return speedVerdict(current.samples, sample.device);
  }
  const samples = addSample(current.samples, sample);
  commit({ ...current, samples });
  return speedVerdict(samples, sample.device);
}

export function setSpeedPreference(preference: VoiceSpeedPreference): void {
  const current = speedState();
  if (current.preference === preference) {
    return;
  }
  // De volta ao automático: a troca vale só se a última medida ainda disser que o natural é lento.
  const autoFast = preference === "auto" ? current.autoFast && speedVerdict(current.samples)?.slow !== false : current.autoFast;
  commit({ ...current, preference, autoFast });
}

export function setAutoFast(autoFast: boolean): void {
  const current = speedState();
  if (current.autoFast !== autoFast) {
    commit({ ...current, autoFast });
  }
}

/** Apaga as medidas e a escolha (testes e "recomeçar"). */
export function resetSpeed(): void {
  commit({ ...EMPTY, samples: [] });
}

export function subscribeSpeed(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
