import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { speakStory } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { allSentences, HANDS_FREE_GAP_MS, handsFreeIntro, handsFreeLabel, handsFreeSteps } from "@/lib/hands-free";
import { narratorVoice } from "@/lib/narrator";
import { AudioService, type SequenceItem } from "@/services/audio/AudioService";

export function HandsFreePlayer({
  title,
  story,
  targetLang,
  throughLang,
  showStart,
  onEngage,
}: {
  title: string;
  story: string;
  targetLang: string;
  throughLang: string;
  showStart: boolean;
  onEngage: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "preparing" | "live" | "done">("idle");
  const [paused, setPaused] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  useEffect(() => {
    return () => {
      run.current += 1;
    };
  }, [story]);

  async function start() {
    const id = run.current + 1;
    run.current = id;
    onEngage();
    setPhase("preparing");
    setPaused(false);
    setError(null);
    setLabel("Preparando o viva-voz");
    try {
      const sentences = allSentences(story);
      const intro = await speakStory(handsFreeIntro(throughLang, title), throughLang, narratorVoice(throughLang));
      const clips = await mapPool(sentences, 3, (sentence) => speakStory(sentence, targetLang, narratorVoice(targetLang)));
      if (run.current !== id) {
        return;
      }
      const total = sentences.length;
      const steps = handsFreeSteps(sentences.length);
      const items: SequenceItem[] = steps.map((step) => {
        if (step.kind === "gap") {
          return { kind: "gap", ms: HANDS_FREE_GAP_MS, unit: step.unit, title: handsFreeLabel(step.kind, step.unit, total) };
        }
        const url = step.kind === "intro" ? intro.audioUrl : clips[step.sentence]?.audioUrl;
        return { kind: "audio", url: url ?? "", unit: step.unit, title: handsFreeLabel(step.kind, step.unit, total) };
      });
      if (items.some((item) => item.kind === "audio" && !item.url)) {
        throw new Error("A voz não devolveu o áudio.");
      }
      setPhase("live");
      AudioService.startSequence(items, (update) => {
        if (run.current !== id) {
          return;
        }
        setLabel(update.title);
        setPaused(update.paused);
        if (update.done) {
          setPhase("done");
          setPaused(false);
        }
        if (update.title.startsWith("Sua vez")) {
          void tap("medium");
        }
      });
    } catch (caught) {
      if (run.current !== id) {
        return;
      }
      AudioService.stopAndUnload();
      setPhase("idle");
      setError(caught instanceof Error ? caught.message : "O viva-voz não abriu.");
    }
  }

  if ((phase === "idle" || phase === "done") && !showStart) {
    return null;
  }

  return (
    <View className="mt-4">
      {(phase === "idle" || phase === "done") && showStart ? (
        <Pressable accessibilityRole="button" onPress={() => void start()} className="min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line px-6">
          <Text className="text-base font-semibold text-ink">{phase === "done" ? "Ouvir de novo, sem a tela" : "Viva-voz"}</Text>
        </Pressable>
      ) : null}
      {phase === "preparing" ? <Text className="text-base text-muted">{label}</Text> : null}
      {phase === "live" ? (
        <View>
          <Text accessibilityLiveRegion="polite" className="text-base text-ink">
            {paused ? `Pausado · ${label}` : label}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (paused) {
                  AudioService.resumeSequence();
                  setPaused(false);
                } else {
                  AudioService.pauseSequence();
                  setPaused(true);
                }
              }}
              className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-ember px-5"
            >
              <Text className="text-base font-semibold text-onEmber">{paused ? "Continuar" : "Pausar"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => AudioService.nextSequence()} className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-line px-5">
              <Text className="text-base font-semibold text-ink">Próxima</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                AudioService.stopAndUnload();
                setPhase("idle");
                setPaused(false);
              }}
              className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-line px-5"
            >
              <Text className="text-base font-semibold text-ink">Encerrar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {error ? <Text className="mt-3 text-base text-roseInk">{error}</Text> : null}
    </View>
  );
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await worker(item);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}
