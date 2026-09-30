import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { Platform } from "react-native";

export interface PlaybackHandle {
  stop: () => void;
}

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
  playbackRate: number;
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
    const release =
      Platform.OS === "web"
        ? this.bindWeb(url, rate, onTime, onEnd, null, onError)
        : this.bindNative(url, rate, onTime, onEnd, null, onError);
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
    if (Platform.OS === "web" && mpegSourceSupported()) {
      return this.bindMediaSource(rate, onTime, onEnd, onError);
    }
    return this.bindBufferedMpeg(rate, onTime, onEnd, onError);
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
      onUpdate({ title: "Fim", unit: this.currentUnit, done: true, paused: false });
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
      const release =
        Platform.OS === "web"
          ? this.bindWeb(url, 1, () => undefined, onEnd, title, onError)
          : this.bindNative(url, 1, () => undefined, onEnd, title, onError);
      this.release = release;
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

  private bindMediaSource(
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    onError?: (message: string) => void,
  ): MpegStreamHandle {
    const MediaSourceCtor = (globalThis as { MediaSource?: { new (): MediaSource; isTypeSupported?: (type: string) => boolean } }).MediaSource;
    const Factory = (globalThis as { Audio?: new (src: string) => WebAudio }).Audio;
    if (!MediaSourceCtor || !Factory) {
      return this.bindBufferedMpeg(rate, onTime, onEnd, onError);
    }
    const mediaSource = new MediaSourceCtor();
    const objectUrl = URL.createObjectURL(mediaSource);
    const audio = new Factory(objectUrl);
    audio.playbackRate = rate;
    const queue: Uint8Array[] = [];
    let sourceBuffer: { updating: boolean; appendBuffer: (data: BufferSource) => void; addEventListener: (type: string, listener: () => void) => void } | null = null;
    let streamEnded = false;
    let failed = false;
    let started = false;
    let released = false;

    const pump = () => {
      if (!sourceBuffer || sourceBuffer.updating || failed || released) {
        return;
      }
      const next = queue.shift();
      if (next && next.byteLength > 0) {
        try {
          const copy = new Uint8Array(next.byteLength);
          copy.set(next);
          sourceBuffer.appendBuffer(copy);
        } catch {
          onError?.("O áudio neural não abriu.");
        }
        return;
      }
      if (streamEnded && mediaSource.readyState === "open") {
        try {
          mediaSource.endOfStream();
        } catch {
          return;
        }
      }
    };

    const update = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      onTime(audio.currentTime * 1000, duration * 1000);
    };
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", onEnd);

    mediaSource.addEventListener("sourceopen", () => {
      try {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        sourceBuffer.addEventListener("updateend", () => {
          if (!started) {
            started = true;
            void audio.play().catch(() => {
              onError?.("O navegador recusou o áudio.");
            });
          }
          pump();
        });
        pump();
      } catch {
        onError?.("O áudio neural não abriu.");
      }
    });

    const stop = () => {
      if (released) {
        return;
      }
      released = true;
      failed = true;
      queue.length = 0;
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("ended", onEnd);
      try {
        if (mediaSource.readyState === "open") {
          mediaSource.endOfStream();
        }
      } catch {
        /* already closed */
      }
      URL.revokeObjectURL(objectUrl);
    };

    this.release = stop;
    return {
      push: (bytes) => {
        if (released || failed || bytes.byteLength === 0) {
          return;
        }
        queue.push(bytes);
        pump();
      },
      end: () => {
        streamEnded = true;
        pump();
      },
      fail: (message) => {
        if (released) {
          return;
        }
        failed = true;
        onError?.(message);
      },
      stop: () => {
        if (this.release === stop) {
          this.release = null;
        }
        stop();
      },
    };
  }

  private bindBufferedMpeg(
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    onError?: (message: string) => void,
  ): MpegStreamHandle {
    const parts: Uint8Array[] = [];
    let released = false;
    let inner: Release | null = null;
    const stop = () => {
      if (released) {
        return;
      }
      released = true;
      inner?.();
      inner = null;
    };
    this.release = stop;
    return {
      push: (bytes) => {
        if (!released && bytes.byteLength > 0) {
          parts.push(bytes);
        }
      },
      end: () => {
        if (released) {
          return;
        }
        const blob = new Blob(parts as BlobPart[], { type: "audio/mpeg" });
        if (blob.size === 0) {
          onError?.("O áudio neural não abriu.");
          return;
        }
        const url = URL.createObjectURL(blob);
        inner =
          Platform.OS === "web"
            ? this.bindWeb(url, rate, onTime, () => {
                URL.revokeObjectURL(url);
                onEnd();
              }, null, onError)
            : this.bindNative(url, rate, onTime, () => {
                URL.revokeObjectURL(url);
                onEnd();
              }, null, onError);
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
    const Factory = (globalThis as { Audio?: new (src: string) => WebAudio }).Audio;
    if (!Factory) {
      throw new Error("Áudio indisponível neste aparelho.");
    }
    const audio = new Factory(url);
    audio.playbackRate = rate;
    const update = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      onTime(audio.currentTime * 1000, duration * 1000);
    };
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", onEnd);
    const pending = audio.play();
    void pending.catch(() => {
      onError?.("O navegador recusou o áudio.");
    });
    if (lockTitle) {
      this.clipPause = () => audio.pause();
      this.clipResume = () => {
        void audio.play().catch(() => {
          onError?.("O navegador recusou o áudio.");
        });
      };
      this.publishMedia("playing", lockTitle);
    }
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("ended", onEnd);
    };
  }

  private bindNative(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
    onError?: (message: string) => void,
  ): Release {
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

function mpegSourceSupported(): boolean {
  const MediaSourceCtor = (globalThis as { MediaSource?: { isTypeSupported?: (type: string) => boolean } }).MediaSource;
  return MediaSourceCtor?.isTypeSupported?.("audio/mpeg") === true;
}

function mediaSession(): MediaSessionLike | null {
  const navigator = (globalThis as { navigator?: { mediaSession?: MediaSessionLike } }).navigator;
  return navigator?.mediaSession ?? null;
}

export const AudioService = new AudioController();
