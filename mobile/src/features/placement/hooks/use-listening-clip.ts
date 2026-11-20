import { useCallback, useEffect, useRef, useState } from "react";
import { speakStory } from "@/lib/api";
import { narratorVoice } from "@/lib/narrator";
import { AudioService, type PlaybackHandle } from "@/services/audio/AudioService";

export type ClipState = "idle" | "loading" | "playing" | "error";

/**
 * Áudio das perguntas de escuta: sintetiza `audio_text` no idioma alvo
 * (`speakStory`, motor no aparelho) e toca pelo `AudioService`.
 * Toca sozinho quando a pergunta aparece; `play` repete.
 */
export function useListeningClip(text: string | undefined, lang: string) {
  const [state, setState] = useState<ClipState>("idle");
  const [played, setPlayed] = useState(false);
  const handle = useRef<PlaybackHandle | null>(null);
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    handle.current?.stop();
    handle.current = null;
  }, []);

  const play = useCallback(async () => {
    if (!text) {
      return;
    }
    handle.current?.stop();
    handle.current = null;
    run.current += 1;
    const id = run.current;
    setState("loading");
    try {
      const spoken = await speakStory(text, lang, narratorVoice(lang));
      if (id !== run.current) {
        return;
      }
      if (!spoken.audioUrl) {
        setState("error");
        return;
      }
      setState("playing");
      setPlayed(true);
      handle.current = AudioService.play(
        spoken.audioUrl,
        1,
        () => undefined,
        () => {
          if (id === run.current) {
            setState("idle");
          }
        },
        () => {
          if (id === run.current) {
            setState("error");
          }
        },
      );
    } catch {
      if (id === run.current) {
        setState("error");
      }
    }
  }, [lang, text]);

  useEffect(() => {
    setPlayed(false);
    if (!text) {
      setState("idle");
      return undefined;
    }
    void play();
    return stop;
  }, [play, stop, text]);

  return { state, played, play, stop };
}
