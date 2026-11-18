import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { evaluateJournal, transcribeSpeech } from "@/lib/api";
import { fluencyLaps, fluencyScore, recurringSlips, type FluencyScore } from "@/lib/fluency-432";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { stopIfRecording } from "@/lib/stop-recorder";
import type { LessonRequest, RepairCard } from "@/lib/types";

const laps = fluencyLaps();

export function FluencyStage({
  title,
  story,
  language,
  nativeLang,
  level,
  onScored,
  onCards,
}: {
  title: string;
  story: string;
  language: string;
  nativeLang: string;
  level: LessonRequest["level"];
  onScored?: (wpm: number) => void;
  onCards?: (cards: RepairCard[]) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const session = useSession();
  const ui = useCopy();
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<FluencyScore[]>([]);
  const [slips, setSlips] = useState<string[] | null>(null);
  const started = useRef(0);
  const spokenLaps = useRef<string[]>([]);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const lap = laps[index] ?? laps[0];

  useEffect(() => {
    return () => {
      void stopIfRecording(recorderRef.current);
    };
  }, []);

  if (!lap) {
    return null;
  }

  async function toggle() {
    if (pending || slips) {
      return;
    }
    if (recording) {
      setRecording(false);
      setPending(true);
      setError(null);
      try {
        await stopIfRecording(recorder);
        const uri = recorder.uri;
        if (!uri) {
          throw new Error(ui.hvptVoiceFailed);
        }
        const spoken = await transcribeSpeech(uri, language);
        const score = fluencyScore(spoken, Date.now() - started.current);
        setScores((current) => [...current, score]);
        onScored?.(score.wpm);
        spokenLaps.current.push(spoken.trim());
        if (index + 1 >= laps.length) {
          await finish();
          void tap("success");
        } else {
          setIndex(index + 1);
          void tap("medium");
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : ui.hvptVoiceFailed);
      } finally {
        setPending(false);
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError(ui.hvptMic);
      return;
    }
    setError(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    started.current = Date.now();
    setRecording(true);
    void tap("light");
  }

  async function finish() {
    const spoken = spokenLaps.current.filter((item) => item.length > 0).join("\n\n");
    if (!spoken) {
      setSlips([]);
      return;
    }
    const evaluation = await evaluateJournal({
      text: spoken,
      journal_prompt: title,
      target_lang: language,
      native_lang: nativeLang,
      level,
      attempt: 1,
      token: session?.token,
    });
    if (evaluation.cards && evaluation.cards.length > 0) {
      onCards?.(evaluation.cards);
    }
    setSlips(recurringSlips(evaluation.corrections, spoken));
  }

  return (
    <View className="mb-8 rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{ui.speech}</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">{ui.fluencyTitle}</Text>
      <Text className="mt-2 text-base leading-6 text-muted">{ui.fluencyHint}</Text>
      <Text className="mt-3 text-base text-ink">
        {ui.fluencyLap.replace("{lap}", String(index + 1)).replace("{minutes}", String(lap.seconds / 60))}
      </Text>
      <Text className="mt-2 text-base leading-7 text-ink">{story}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: pending, disabled: pending || Boolean(slips) }}
        disabled={pending || Boolean(slips)}
        onPress={() => {
          void toggle();
        }}
        className={`mt-4 min-h-12 items-center justify-center rounded-full px-4 ${recording ? "bg-roseSoft" : "bg-ember"}`}
      >
        <Text className={`text-base font-semibold ${recording ? "text-roseInk" : "text-onEmber"}`}>
          {pending ? ui.scoring : recording ? ui.fluencyStop : slips ? ui.fluencyRepair : index === 0 ? ui.fluencyStart : ui.fluencyNext}
        </Text>
      </Pressable>
      {scores.length > 0 ? (
        <View className="mt-4 gap-2">
          {scores.map((score, offset) => (
            <Text key={offset} className="text-base text-ink">
              {offset + 1}. {ui.fluencyWpm.replace("{wpm}", String(score.wpm))} · {ui.fluencyPauses.replace("{count}", String(score.pauses))}
            </Text>
          ))}
        </View>
      ) : null}
      {slips ? (
        <View className="mt-4 gap-2">
          <Text className="font-label text-sm text-muted">{ui.fluencyRepair}</Text>
          {slips.length === 0 ? (
            <Text className="text-base text-moss">{ui.fluencyEmpty}</Text>
          ) : (
            slips.map((slip) => (
              <Text key={slip} className="text-base leading-6 text-ink">
                {slip}
              </Text>
            ))
          )}
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
