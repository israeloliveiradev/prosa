import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { Platform } from "react-native";

export interface PlaybackHandle {
  stop: () => void;
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
    this.finishClip("stop");
    this.releaseCurrent();
    this.openPauseGate();
    this.clearMediaSession();
  }

  play(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
  ): PlaybackHandle {
    this.sequenceId += 1;
    this.sequenceLive = false;
    this.finishClip("stop");
    this.releaseCurrent();
    const release = Platform.OS === "web" ? this.bindWeb(url, rate, onTime, onEnd, null) : this.bindNative(url, rate, onTime, onEnd, null);
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

  startSequence(items: SequenceItem[], onUpdate: (update: SequenceUpdate) => void): void {
    this.stopAndUnload();
    this.sequenceLive = true;
    const sequenceId = this.sequenceId;
    void this.runSequence(items, sequenceId, onUpdate);
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

  nextSequence(): void {
    this.skipUnit = this.currentUnit + 1;
    if (this.paused) {
      this.resumeSequence();
    }
    this.finishClip("skip");
    this.releaseCurrent();
  }

  private async runSequence(items: SequenceItem[], sequenceId: number, onUpdate: (update: SequenceUpdate) => void): Promise<void> {
    await this.prepareBackground();
    let index = 0;
    while (index < items.length) {
      if (this.sequenceId !== sequenceId) {
        return;
      }
      if (this.skipUnit != null) {
        const unit = this.skipUnit;
        this.skipUnit = null;
        const found = items.findIndex((item) => item.unit === unit);
        index = found < 0 ? items.length : found;
        continue;
      }
      const item = items[index];
      if (!item) {
        break;
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
      const reason = await this.playUntilEnd(item.url ?? "", sequenceId, item.title);
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
      onUpdate({ title: "Fim", unit: this.currentUnit, done: true, paused: false });
      this.clearMediaSession();
    }
  }

  private playUntilEnd(url: string, sequenceId: number, title: string): Promise<"end" | "skip" | "stop"> {
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
      const release =
        Platform.OS === "web"
          ? this.bindWeb(url, 1, () => undefined, onEnd, title)
          : this.bindNative(url, 1, () => undefined, onEnd, title);
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

  private bindWeb(
    url: string,
    rate: number,
    onTime: (elapsedMs: number, durationMs: number) => void,
    onEnd: () => void,
    lockTitle: string | null,
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
    void pending.catch(() => undefined);
    if (lockTitle) {
      this.clipPause = () => audio.pause();
      this.clipResume = () => {
        void audio.play().catch(() => undefined);
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

function mediaSession(): MediaSessionLike | null {
  const navigator = (globalThis as { navigator?: { mediaSession?: MediaSessionLike } }).navigator;
  return navigator?.mediaSession ?? null;
}

export const AudioService = new AudioController();
