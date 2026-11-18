import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { prefetchSpeech, speakStories, speakStory, transcribeSpeech } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { allSentences, HANDS_FREE_GAP_MS, handsFreeHeld, handsFreeIntro, handsFreeSteps } from "@/lib/hands-free";
import { handsFreeLabel } from "@/lib/hands-free-label";
import { useCopy } from "@/lib/i18n";
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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<"idle" | "preparing" | "live" | "done">("idle");
  const [paused, setPaused] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState("");
  const run = useRef(0);
  const clips = useRef<string[]>([]);
  const capturing = useRef(false);
  const ui = useCopy();

  useEffect(() => {
    const sentences = allSentences(story);
    prefetchSpeech([handsFreeIntro(throughLang, title)], throughLang, narratorVoice(throughLang));
    prefetchSpeech(sentences, targetLang, narratorVoice(targetLang));
    return () => {
      run.current += 1;
      capturing.current = false;
    };
  }, [story, title, targetLang, throughLang]);

  async function start() {
    const id = run.current + 1;
    run.current = id;
    onEngage();
    setPhase("preparing");
    setPaused(false);
    setError(null);
    setCheck("");
    setLabel(ui.handsFreePreparing);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error(ui.hvptMic);
      }
      const sentences = allSentences(story);
      clips.current = sentences;
      const throughVoice = narratorVoice(throughLang);
      const targetVoice = narratorVoice(targetLang);
      const restPromise = sentences.length > 1 ? speakStories(sentences.slice(1), targetLang, targetVoice) : Promise.resolve([]);
      const [intro, first] = await Promise.all([
        speakStory(handsFreeIntro(throughLang, title), throughLang, throughVoice),
        sentences[0] ? speakStory(sentences[0], targetLang, targetVoice) : Promise.resolve(null),
      ]);
      if (run.current !== id) {
        return;
      }
      const total = sentences.length;
      const firstItems = itemsFor(0, total, intro.audioUrl, first?.audioUrl);
      setPhase("live");
      AudioService.startSequence(firstItems, (update) => {
        if (run.current !== id) {
          return;
        }
        setLabel(update.title);
        setPaused(update.paused);
        if (update.error) {
          setError(update.error);
        }
        if (update.done) {
          capturing.current = false;
          setPhase("done");
          setPaused(false);
        }
        if (update.title.startsWith(ui.yourTurn)) {
          void tap("medium");
          void capture(id, update.unit);
        }
      }, { open: sentences.length > 1 });
      if (sentences.length > 1) {
        const rest = await restPromise;
        if (run.current !== id) {
          return;
        }
        if (rest.some((clip) => !clip.audioUrl)) {
          throw new Error(ui.handsFreeVoiceFailed);
        }
        const extra: SequenceItem[] = [];
        rest.forEach((clip, offset) => {
          extra.push(...itemsFor(offset + 1, total, "", clip.audioUrl));
        });
        AudioService.extendSequence(extra);
        AudioService.sealSequence();
      }
    } catch (caught) {
      if (run.current !== id) {
        return;
      }
      AudioService.stopAndUnload();
      capturing.current = false;
      setPhase("idle");
      setError(caught instanceof Error ? caught.message : ui.handsFreeDidNotOpen);
    }
  }

  async function capture(id: number, unit: number) {
    if (capturing.current || run.current !== id) {
      return;
    }
    capturing.current = true;
    setCheck("");
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      await hold(HANDS_FREE_GAP_MS - 200);
      if (run.current !== id) {
        return;
      }
      await recorder.stop();
      const uri = recorder.uri;
      const sentence = clips.current[unit - 1] ?? "";
      if (!uri || !sentence) {
        throw new Error(ui.handsFreeDidNotOpen);
      }
      const spoken = await transcribeSpeech(uri, targetLang);
      if (run.current !== id) {
        return;
      }
      if (handsFreeHeld(sentence, spoken)) {
        setCheck(ui.handsFreeHeld);
        void tap("success");
        return;
      }
      setCheck(ui.handsFreeMissed);
      void tap("heavy");
      AudioService.repeatUnit(unit);
    } catch (caught) {
      if (run.current !== id) {
        return;
      }
      setError(caught instanceof Error ? caught.message : ui.handsFreeDidNotOpen);
    } finally {
      capturing.current = false;
    }
  }

  if ((phase === "idle" || phase === "done") && !showStart) {
    return null;
  }

  return (
    <View className="mt-4">
      {(phase === "idle" || phase === "done") && showStart ? (
        <Pressable accessibilityRole="button" onPress={() => void start()} className="min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line px-6">
          <Text className="text-base font-semibold text-ink">{phase === "done" ? ui.handsFreeListenAgain : ui.handsFreeStart}</Text>
        </Pressable>
      ) : null}
      {phase === "preparing" ? <Text className="text-base text-muted">{label}</Text> : null}
      {phase === "live" ? (
        <View>
          <Text accessibilityLiveRegion="polite" className="text-base text-ink">
            {paused ? `${ui.handsFreePaused} · ${label}` : label}
          </Text>
          {check ? (
            <Text accessibilityLiveRegion="polite" className="mt-2 text-base text-muted">
              {check}
            </Text>
          ) : null}
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
              <Text className="text-base font-semibold text-onEmber">{paused ? ui.continueClock : ui.pause}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => AudioService.nextSequence()} className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-line px-5">
              <Text className="text-base font-semibold text-ink">{ui.nextPhrase}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                AudioService.stopAndUnload();
                capturing.current = false;
                setPhase("idle");
                setPaused(false);
                setCheck("");
              }}
              className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-line px-5"
            >
              <Text className="text-base font-semibold text-ink">{ui.endHandsFree}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function itemsFor(sentence: number, total: number, introUrl: string, clipUrl?: string): SequenceItem[] {
  const steps = handsFreeSteps(total).filter((step) => (sentence === 0 ? step.unit <= 1 : step.sentence === sentence));
  return steps.map((step) => {
    if (step.kind === "gap") {
      return { kind: "gap" as const, ms: HANDS_FREE_GAP_MS, unit: step.unit, title: handsFreeLabel(step.kind, step.unit, total) };
    }
    const url = step.kind === "intro" ? introUrl : clipUrl ?? "";
    return { kind: "audio" as const, url, unit: step.unit, title: handsFreeLabel(step.kind, step.unit, total) };
  });
}

function hold(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}
