// Prosa — aquecimento da voz do idioma-alvo.
//
// Assim que o aluno escolhe o par de idiomas no onboarding, a voz do idioma-alvo começa a baixar
// em segundo plano (enquanto ele faz o nivelamento), para a primeira lição já ter voz.
// Em inglês, sem medida ainda: baixa o Kokoro, mede a velocidade dele neste aparelho e, se for
// mais lento que a fala, baixa também a voz rápida (Piper) e a narração passa para ela.
// Japonês usa a voz do sistema: não há nada para baixar.
// Com a economia de dados do navegador ligada, nada baixa sozinho (fica para a primeira escuta).

import { currentVerdict, speedState } from "@/services/audio/speedGuard";
import { speechLang, speechService, type ModelProgress } from "@/services/speechService";
import { ENGINE_BY_LANG } from "@/workers/ttsWorker";

export type WarmupPhase =
  /** Nada começou. */
  | "idle"
  /** Baixando e carregando o modelo da voz. */
  | "downloading"
  /** O modelo já está no aparelho: só carregando. */
  | "preparing"
  /** Medindo a velocidade da voz natural (inglês). */
  | "measuring"
  /** A voz natural é lenta aqui: baixando a voz rápida (inglês). */
  | "switching"
  | "ready"
  /** Voz do sistema (japonês): nada a baixar. */
  | "system"
  /** Economia de dados ligada: baixa na primeira escuta. */
  | "deferred"
  | "error"
  /** O navegador não roda a voz no aparelho. */
  | "unsupported";

export interface WarmupState {
  lang: string;
  phase: WarmupPhase;
  loaded: number;
  total: number;
}

const states = new Map<string, WarmupState>();
const running = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // um assinante com erro não derruba os outros
    }
  }
}

function update(lang: string, phase: WarmupPhase, progress?: { loaded: number; total: number }): void {
  const previous = states.get(lang);
  const samePhase = previous?.phase === phase;
  // O download avisa muitas vezes por segundo: só muda a tela quando o percentual inteiro muda.
  if (samePhase && progress && previous && previous.total === progress.total && progress.total > 0) {
    const before = Math.floor((previous.loaded / previous.total) * 100);
    const after = Math.floor((progress.loaded / progress.total) * 100);
    if (before === after) {
      return;
    }
  }
  states.set(lang, {
    lang,
    phase,
    loaded: progress?.loaded ?? (samePhase ? (previous?.loaded ?? 0) : 0),
    total: progress?.total ?? (samePhase ? (previous?.total ?? 0) : 0),
  });
  notify();
}

const idle = new Map<string, WarmupState>();

/** Estado atual (o mesmo objeto até mudar: serve de snapshot para useSyncExternalStore). */
export function voiceWarmupState(lang: string): WarmupState {
  const code = speechLang(lang);
  const known = states.get(code);
  if (known) {
    return known;
  }
  let empty = idle.get(code);
  if (!empty) {
    empty = { lang: code, phase: "idle", loaded: 0, total: 0 };
    idle.set(code, empty);
  }
  return empty;
}

export function subscribeVoiceWarmup(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function saveDataOn(): boolean {
  const connection = (globalThis as { navigator?: { connection?: { saveData?: boolean } } }).navigator?.connection;
  return connection?.saveData === true;
}

/**
 * Começa (uma vez por idioma) a baixar e aquecer a voz que vai narrar as lições.
 * `voice` é a voz do narrador para o idioma (a escolhida neste aparelho, ou a padrão).
 */
export function startVoiceWarmup(lang: string, voice?: string | null, options: { force?: boolean } = {}): Promise<void> {
  const code = speechLang(lang);
  const engine = ENGINE_BY_LANG[code];
  const current = states.get(code)?.phase;
  const active = running.get(code);
  if (active) {
    return active;
  }
  if (current === "ready" || current === "system") {
    return Promise.resolve();
  }
  if (!engine) {
    return Promise.resolve();
  }
  if (engine === "webspeech") {
    update(code, "system");
    return Promise.resolve();
  }
  if (!speechService.isSupported()) {
    update(code, "unsupported");
    return Promise.resolve();
  }
  if (!options.force && saveDataOn()) {
    update(code, "deferred");
    return Promise.resolve();
  }
  let phase: WarmupPhase = "downloading";
  const onProgress = (progress: ModelProgress) => update(code, phase, { loaded: progress.loaded, total: progress.total });
  // Guardado no aparelho = só carregar (o progresso do cache não é download).
  const loadPhase = (target: string | null | undefined): WarmupPhase => (speechService.modelState(code, target).stored ? "preparing" : "downloading");
  const run = (async () => {
    update(code, phase);
    // Saber o que já está guardado (sem segurar o download se o worker demorar a responder).
    await Promise.race([speechService.inspect(), new Promise<void>((resolve) => setTimeout(resolve, 1_500))]);
    if (code !== "en") {
      phase = loadPhase(voice);
      update(code, phase);
      await speechService.downloadModels(onProgress, { lang: code, voice });
      return;
    }
    const preference = speedState().preference;
    const slowKnown = preference === "auto" && currentVerdict()?.slow === true;
    if (speechService.englishEngine() === "kokoro" && !slowKnown) {
      phase = loadPhase(voice);
      update(code, phase);
      await speechService.downloadModels(onProgress, { lang: "en", voice, english: "kokoro" });
      if (preference === "auto" && currentVerdict() === null) {
        phase = "measuring";
        update(code, phase);
        try {
          await speechService.benchmark();
        } catch {
          // A voz já está no aparelho; a medida fica para as primeiras frases da lição.
        }
      }
    }
    const switching = speechService.switchToFastIfSlow();
    if (switching) {
      phase = "switching";
      update(code, phase);
      await speechService.downloadModels(onProgress, { lang: "en", voice: speechService.fastVoice() });
      await switching;
      return;
    }
    if (speechService.englishEngine() === "piper") {
      phase = loadPhase(speechService.fastVoice());
      update(code, phase);
      await speechService.downloadModels(onProgress, { lang: "en", voice: speechService.fastVoice() });
    }
  })().then(
    () => update(code, "ready"),
    () => update(code, "error"),
  );
  const tracked = run.finally(() => {
    if (running.get(code) === tracked) {
      running.delete(code);
    }
  });
  running.set(code, tracked);
  return tracked;
}
