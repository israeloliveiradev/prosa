import { AudioService, type PlaybackHandle } from "@/services/audio/AudioService";

export type { PlaybackHandle };

export function stopNarration(): void {
  AudioService.stopAndUnload();
}

export function narrationToken(): number {
  return AudioService.token();
}

export function highlightIndex(
  elapsedMs: number,
  durationMs: number,
  tokenCount: number,
  marks: Array<{ offsetMs: number }>,
): number {
  if (tokenCount <= 1) {
    return 0;
  }
  if (marks.length > 1) {
    let active = 0;
    for (let index = 0; index < marks.length; index += 1) {
      if (marks[index].offsetMs <= elapsedMs) {
        active = index;
      } else {
        break;
      }
    }
    return Math.min(tokenCount - 1, Math.round((active / (marks.length - 1)) * (tokenCount - 1)));
  }
  if (durationMs > 0) {
    return Math.min(tokenCount - 1, Math.floor((elapsedMs / durationMs) * tokenCount));
  }
  return 0;
}

export function startNeuralPlayback(
  url: string,
  rate: number,
  onTime: (elapsedMs: number, durationMs: number) => void,
  onEnd: () => void,
): PlaybackHandle {
  return AudioService.play(url, rate, onTime, onEnd);
}
