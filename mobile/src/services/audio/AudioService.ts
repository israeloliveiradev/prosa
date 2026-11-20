import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { Platform } from "react-native";
import { voiceCopy } from "@/lib/copy/voice";
import {
  isSpeechUrl,
  keepPitch,
  parseSpeechUrl,
  readClipReference,
  speakWithWebSpeech,
  speechService,
  type ClipReference,
} from "@/services/speechService";

export interface PlaybackHandle {
  stop: () => void;
}

/**
 * Manipulador de "stream" de narração. A narração agora sai inteira do aparelho: `push` recebe a
 * referência do clipe (ver `clipReferenceBytes`) ou bytes de áudio crus; `end` começa a tocar.
 */
export interface MpegStreamHandle extends PlaybackHandle {
  push: (bytes: Uint8Array) => void;
  end: () => void;
  fail: (message: string) => void;
}

export interface SequenceItem {
  kind: "audio" | "gap";
  url?: string;
  ms?: number;
  unit: number;
  title: string;
}

export interface SequenceUpdate {
  title: string;
  unit: number;
  done: boolean;
  paused: boolean;
  error?: string;
}

type Release = () => void;
type ClipEnd = (reason: "end" | "skip" | "stop") => void;

interface WebAudio {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
  defaultPlaybackRate: number;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface MediaSessionLike {
  metadata: unknown;
  playbackState: "none" | "paused" | "playing";
  setActionHandler: (action: string, handler: (() => void) | null) => void;
}

const TICK_MS = 80;

class AudioController {
  private generation = 0;
  private sequenceId = 0;
  private release: Release | null = null;
  private clipDone: ClipEnd | null = null;
  private clipPause: (() => void) | null = null;
  private clipResume: (() => void) | null = null;
  private paused = false;
  private currentUnit = 0;
  private skipUnit: number | null = null;
  private pauseGate: (() => void) | null = null;
  private audioModeReady = false;

  private sequenceLive = false;
  private sequenceItems: SequenceItem[] = [];
  private sequenceOpen = false;
  private moreGate: (() => void) | null = null;

  token(): number {
    return this.generation;
  }

  hasSequence(): boolean {
    return this.sequenceLive;
  }

  stopAndUnload(): void {
    this.generation += 1;
    this.sequenceId += 1;
    this.paused = false;
    this.skipUnit = null;
    this.sequenceLive = false;
    this.sequenceOpen = false;
    this.sequenceItems = [];
    this.finishClip("stop");
    this.releaseCurrent();
    this.openPauseGate();
    this.openMoreGate();
    this.clearMediaSession();
  }

  play(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    onError?: (message: string) => void,
  ): PlaybackHandle {
    this.sequenceId += 1;
    this.sequenceLive = false;
    this.finishClip("stop");
    this.releaseCurrent();
    const release = this.bind(url, rate, onTime, onEnd, null, onError);
    this.release = release;
    return {
      stop: () => {
        if (this.release === release) {
          this.release = null;
        }
        release();
      },
    };
  }

  startMpegStream(
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    onError?: (message: string) => void,
  ): MpegStreamHandle {
    this.sequenceId += 1;
    this.sequenceLive = false;
    this.finishClip("stop");
    this.releaseCurrent();
    return this.bindClipStream(rate, onTime, onEnd, onError);
  }

  startSequence(items: SequenceItem[], onUpdate: (update: SequenceUpdate) => void, options?: { open?: boolean }): void {
    this.stopAndUnload();
    this.sequenceLive = true;
    this.sequenceOpen = options?.open ?? false;
    this.sequenceItems = items.slice();
    const sequenceId = this.sequenceId;
    void this.runSequence(sequenceId, onUpdate);
  }

  extendSequence(items: SequenceItem[]): void {
    this.sequenceItems.push(...items);
    this.openMoreGate();
  }

  sealSequence(): void {
    this.sequenceOpen = false;
    this.openMoreGate();
  }

  pauseSequence(): void {
    this.paused = true;
    this.clipPause?.();
    this.publishMedia("paused");
  }

  resumeSequence(): void {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.clipResume?.();
    this.openPauseGate();
    this.publishMedia("playing");
  }

  repeatUnit(unit: number): void {
    this.skipUnit = unit;
    if (this.paused) {
      this.resumeSequence();
    }
    this.finishClip("skip");
    this.releaseCurrent();
  }

  nextSequence(): void {
    this.skipUnit = this.currentUnit + 1;
    if (this.paused) {
      this.resumeSequence();
    }
    this.finishClip("skip");
    this.releaseCurrent();
  }

  private async runSequence(sequenceId: number, onUpdate: (update: SequenceUpdate) => void): Promise<void> {
    await this.prepareBackground();
    let index = 0;
    while (this.sequenceId === sequenceId) {
      const items = this.sequenceItems;
      if (this.skipUnit != null) {
        const unit = this.skipUnit;
        this.skipUnit = null;
        const found = items.findIndex((item) => item.unit === unit);
        index = found < 0 ? items.length : found;
        continue;
      }
      const item = items[index];
      if (!item) {
        if (!this.sequenceOpen) {
          break;
        }
        await new Promise<void>((resolve) => {
          this.moreGate = resolve;
        });
        continue;
      }
      this.currentUnit = item.unit;
      onUpdate({ title: item.title, unit: item.unit, done: false, paused: this.paused });
      this.publishMedia(this.paused ? "paused" : "playing", item.title);
      if (item.kind === "gap") {
        const alive = await this.waitGap(item.ms ?? 4_000, sequenceId);
        if (!alive) {
          return;
        }
        index += 1;
        continue;
      }
      const reason = await this.playUntilEnd(item.url ?? "", sequenceId, item.title, onUpdate);
      if (reason === "stop" || this.sequenceId !== sequenceId) {
        return;
      }
      if (reason === "skip") {
        continue;
      }
      index += 1;
    }
    if (this.sequenceId === sequenceId) {
      this.sequenceLive = false;
      this.sequenceOpen = false;
      onUpdate({ title: voiceCopy().sequenceEnd, unit: this.currentUnit, done: true, paused: false });
      this.clearMediaSession();
    }
  }

  private playUntilEnd(
    url: string,
    sequenceId: number,
    title: string,
    onUpdate: (update: SequenceUpdate) => void,
  ): Promise<"end" | "skip" | "stop"> {
    this.releaseCurrent();
    return new Promise((resolve) => {
      this.clipDone = resolve;
      const onEnd = () => {
        if (this.sequenceId !== sequenceId) {
          this.finishClip("stop");
          return;
        }
        this.finishClip("end");
      };
      const onError = (message: string) => {
        onUpdate({ title, unit: this.currentUnit, done: false, paused: this.paused, error: message });
        this.finishClip("stop");
      };
      this.release = this.bind(url, 1, () => undefined, onEnd, title, onError);
    });
  }

  private finishClip(reason: "end" | "skip" | "stop"): void {
    const done = this.clipDone;
    this.clipDone = null;
    done?.(reason);
  }

  private async waitGap(ms: number, sequenceId: number): Promise<boolean> {
    let left = ms;
    while (left > 0) {
      if (this.sequenceId !== sequenceId) {
        return false;
      }
      if (this.skipUnit != null) {
        return true;
      }
      if (this.paused) {
        await new Promise<void>((resolve) => {
          this.pauseGate = resolve;
        });
        continue;
      }
      const slice = Math.min(left, 200);
      await new Promise((resolve) => {
        setTimeout(resolve, slice);
      });
      left -= slice;
    }
    return this.sequenceId === sequenceId;
  }

  private openPauseGate(): void {
    const gate = this.pauseGate;
    this.pauseGate = null;
    gate?.();
  }

  private openMoreGate(): void {
    const gate = this.moreGate;
    this.moreGate = null;
    gate?.();
  }

  private async prepareBackground(): Promise<void> {
    if (this.audioModeReady || Platform.OS === "web") {
      return;
    }
    this.audioModeReady = true;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
        shouldPlayInBackground: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      this.audioModeReady = false;
    }
  }

  private publishMedia(state: "playing" | "paused", title = "Prosa"): void {
    const session = mediaSession();
    if (!session) {
      return;
    }
    const Metadata = (globalThis as { MediaMetadata?: new (init: { title: string; artist: string }) => unknown }).MediaMetadata;
    if (Metadata) {
      session.metadata = new Metadata({ title, artist: "Prosa" });
    }
    session.playbackState = state;
    session.setActionHandler("play", () => this.resumeSequence());
    session.setActionHandler("pause", () => this.pauseSequence());
    session.setActionHandler("nexttrack", () => this.nextSequence());
  }

  private clearMediaSession(): void {
    const session = mediaSession();
    if (!session) {
      return;
    }
    session.playbackState = "none";
    session.metadata = null;
    session.setActionHandler("play", null);
    session.setActionHandler("pause", null);
    session.setActionHandler("nexttrack", null);
  }

  private releaseCurrent(): void {
    const release = this.release;
    this.release = null;
    this.clipPause = null;
    this.clipResume = null;
    if (!release) {
      return;
    }
    try {
      release();
    } catch {
      return;
    }
  }

  private bind(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
    onError?: (message: string) => void,
  ): Release {
    return Platform.OS === "web"
      ? this.bindWeb(url, rate, onTime, onEnd, lockTitle, onError)
      : this.bindNative(url, rate, onTime, onEnd, lockTitle, onError);
  }

  /**
   * Toca a narração conforme ela chega. Cada referência de clipe (trecho WAV no aparelho, clipe
   * inteiro ou `speech:`) começa a tocar assim que chega e as seguintes entram em fila; `end` diz
   * que não vem mais nada. Com linha do tempo estimada (`estStartMs`/`estEndMs`), o tempo
   * informado é o dessa linha, para o destaque bater com as palavras já entregues.
   * Bytes crus (sem referência) viram um único arquivo ao fim.
   */
  private bindClipStream(
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    onError?: (message: string) => void,
  ): MpegStreamHandle {
    const parts: Uint8Array[] = [];
    const refs: ClipReference[] = [];
    let released = false;
    let ended = false;
    let playing = false;
    let cursor = 0;
    let offsetMs = 0;
    let inner: Release | null = null;
    let tempUrl: string | null = null;
    const revoke = (ref: ClipReference | undefined) => {
      if (ref?.temp) {
        URL.revokeObjectURL(ref.url);
      }
    };
    const stop = () => {
      if (released) {
        return;
      }
      released = true;
      inner?.();
      inner = null;
      revoke(refs[cursor - 1]);
      refs.slice(cursor).forEach(revoke);
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
        tempUrl = null;
      }
    };
    const playNext = () => {
      if (released) {
        return;
      }
      const ref = refs[cursor];
      if (!ref) {
        playing = false;
        if (ended) {
          onEnd();
        }
        return;
      }
      playing = true;
      cursor += 1;
      const base = offsetMs;
      let lastDuration = 0;
      const estimated = ref.estStartMs != null && ref.estEndMs != null;
      inner = this.bind(
        ref.url,
        rate,
        (elapsedMs, durationMs) => {
          lastDuration = durationMs;
          if (estimated) {
            const start = ref.estStartMs ?? 0;
            const span = (ref.estEndMs ?? start) - start;
            const fraction = durationMs > 0 ? Math.min(1, elapsedMs / durationMs) : 0;
            onTime(start + fraction * span, ref.estTotalMs ?? ref.estEndMs ?? 0);
          } else {
            onTime(base + elapsedMs, base + durationMs);
          }
        },
        () => {
          const finished = inner;
          inner = null;
          finished?.();
          revoke(ref);
          offsetMs = base + lastDuration;
          playNext();
        },
        null,
        onError,
      );
    };
    this.release = stop;
    return {
      push: (bytes) => {
        if (bytes.byteLength === 0) {
          return;
        }
        const ref = readClipReference(bytes);
        if (released) {
          revoke(ref ?? undefined);
          return;
        }
        if (ref) {
          refs.push(ref);
          if (!playing) {
            playNext();
          }
        } else {
          parts.push(bytes);
        }
      },
      end: () => {
        if (released || ended) {
          return;
        }
        ended = true;
        if (refs.length > 0) {
          if (!playing) {
            playNext();
          }
          return;
        }
        const blob = new Blob(parts as BlobPart[], { type: sniffAudioType(parts[0]) });
        if (blob.size === 0) {
          onError?.(voiceCopy().audioFailed);
          return;
        }
        const url = URL.createObjectURL(blob);
        tempUrl = url;
        inner = this.bind(
          url,
          rate,
          onTime,
          () => {
            if (tempUrl === url) {
              URL.revokeObjectURL(url);
              tempUrl = null;
            }
            onEnd();
          },
          null,
          onError,
        );
      },
      fail: (message) => {
        if (!released) {
          onError?.(message);
        }
      },
      stop: () => {
        if (this.release === stop) {
          this.release = null;
        }
        stop();
      },
    };
  }

  private bindWeb(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
    onError?: (message: string) => void,
  ): Release {
    if (isSpeechUrl(url)) {
      return this.bindSpeech(url, rate, onTime, onEnd, lockTitle, onError);
    }
    const Factory = (globalThis as { Audio?: new (src: string) => WebAudio }).Audio;
    if (!Factory) {
      throw new Error(voiceCopy().engineUnavailable);
    }
    let released = false;
    let inner: Release | null = null;
    const start = (source: string) => {
      if (released) {
        return;
      }
      inner = this.bindElement(Factory, source, rate, onTime, onEnd, lockTitle, onError);
    };
    if (speechService.needsRevival(url)) {
      // URL de um clipe de antes do F5 (ou que saiu do cache): refaz a partir do texto registrado.
      speechService.reviveUrl(url).then(
        (fresh) => {
          if (released) {
            return;
          }
          if (fresh) {
            start(fresh);
          } else {
            onError?.(voiceCopy().audioFailed);
          }
        },
        (caught: unknown) => {
          if (!released) {
            onError?.(caught instanceof Error ? caught.message : voiceCopy().audioFailed);
          }
        },
      );
    } else {
      start(url);
    }
    return () => {
      if (released) {
        return;
      }
      released = true;
      inner?.();
      inner = null;
    };
  }

  private bindElement(
    Factory: new (src: string) => WebAudio,
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
    onError?: (message: string) => void,
  ): Release {
    const audio = new Factory(url);
    // A velocidade de escuta muda só o andamento: o tom fica (nada de playbackRate em AudioBufferSourceNode).
    keepPitch(audio);
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    speechService.retain(url);
    let released = false;
    let failed = false;
    const update = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      onTime(audio.currentTime * 1000, duration * 1000);
    };
    const fail = (message: string) => {
      if (released || failed) {
        return;
      }
      failed = true;
      onError?.(message);
    };
    const onMediaError = () => fail(voiceCopy().audioFailed);
    const onEnded = () => {
      update();
      onEnd();
    };
    const ticker = setInterval(() => {
      if (!audio.paused) {
        update();
      }
    }, TICK_MS);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onMediaError);
    const startPlaying = () => {
      void audio.play().catch((caught: unknown) => {
        const name = (caught as { name?: string } | null)?.name;
        if (name === "AbortError") {
          return;
        }
        fail(name === "NotAllowedError" ? voiceCopy().browserRefused : voiceCopy().audioFailed);
      });
    };
    startPlaying();
    if (lockTitle) {
      this.clipPause = () => audio.pause();
      this.clipResume = startPlaying;
      this.publishMedia("playing", lockTitle);
    }
    return () => {
      if (released) {
        return;
      }
      released = true;
      clearInterval(ticker);
      audio.pause();
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onMediaError);
      audio.src = "";
      speechService.releaseUrl(url);
    };
  }

  /** Japonês: `speech:` toca com speechSynthesis (via speechService), com o mesmo contrato de tempo. */
  private bindSpeech(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
    onError?: (message: string) => void,
  ): Release {
    const parsed = parseSpeechUrl(url);
    if (!parsed) {
      setTimeout(() => onError?.(voiceCopy().audioFailed), 0);
      return () => undefined;
    }
    const handle = speakWithWebSpeech(parsed.text, parsed.lang, parsed.voice, rate, {
      onProgress: (mediaMs, durationMs) => onTime(mediaMs, durationMs),
      onEnd,
      onError: (message) => onError?.(message),
    });
    if (lockTitle) {
      this.clipPause = () => handle.pause();
      this.clipResume = () => handle.resume();
      this.publishMedia("playing", lockTitle);
    }
    return () => handle.cancel();
  }

  private bindNative(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
    onError?: (message: string) => void,
  ): Release {
    if (isSpeechUrl(url)) {
      setTimeout(() => onError?.(voiceCopy().engineUnavailable), 0);
      return () => undefined;
    }
    const player: AudioPlayer = createAudioPlayer(url);
    player.shouldCorrectPitch = true;
    player.playbackRate = rate;
    if (lockTitle) {
      player.setActiveForLockScreen(true, { title: lockTitle, artist: "Prosa" }, { showSeekForward: false, showSeekBackward: false });
      this.clipPause = () => player.pause();
      this.clipResume = () => player.play();
    }
    const subscription = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      onTime(status.currentTime * 1000, status.duration * 1000);
      if (status.didJustFinish) {
        onEnd();
      }
    });
    player.play();
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      subscription.remove();
      if (lockTitle) {
        player.clearLockScreenControls();
      }
      player.pause();
      player.remove();
    };
  }
}

/** Tipo do áudio pelos primeiros bytes (WAV, Ogg ou MPEG). */
export function sniffAudioType(bytes: Uint8Array | undefined): string {
  if (!bytes || bytes.byteLength < 4) {
    return "audio/mpeg";
  }
  const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  if (head === "RIFF") {
    return "audio/wav";
  }
  if (head === "OggS") {
    return "audio/ogg";
  }
  return "audio/mpeg";
}

function mediaSession(): MediaSessionLike | null {
  const navigator = (globalThis as { navigator?: { mediaSession?: MediaSessionLike } }).navigator;
  return navigator?.mediaSession ?? null;
}

export const AudioService = new AudioController();
