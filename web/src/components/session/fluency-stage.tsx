import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { IconMic } from "@/components/session/session-icons";
import { Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
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
  onTrouble,
}: {
  title: string;
  story: string;
  language: string;
  nativeLang: string;
  level: LessonRequest["level"];
  onScored?: (wpm: number) => void;
  onCards?: (cards: RepairCard[]) => void;
  onTrouble?: () => void;
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
        onTrouble?.();
      } finally {
        setPending(false);
      }
      return;
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(ui.hvptMic);
        onTrouble?.();
        return;
      }
      setError(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      started.current = Date.now();
      setRecording(true);
      void tap("light");
    } catch {
      setError(ui.hvptMic);
      onTrouble?.();
    }
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
    <StageCard tone="raised">
      <Kicker tone="accent">{ui.speech}</Kicker>
      <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{ui.fluencyTitle}</Text>
      <Text className="mt-2 font-sans text-base leading-6 text-muted">{ui.fluencyHint}</Text>
      <Text className="mt-3 font-sans text-base font-semibold text-ink">
        {ui.fluencyLap.replace("{lap}", String(index + 1)).replace("{minutes}", String(lap.seconds / 60))}
      </Text>
      <Text className="mt-2 font-serif text-lg leading-8 text-ink">{story}</Text>
      <View className="mt-4 flex-row">
        <TactileButton
          variant={recording ? "crimson" : "amber"}
          size="lg"
          disabled={pending || Boolean(slips)}
          onPress={() => void toggle()}
          icon={<IconMic color={recording ? "#FFFFFF" : "#2A1700"} size={16} />}
          label={pending ? ui.scoring : recording ? ui.fluencyStop : slips ? ui.fluencyRepair : index === 0 ? ui.fluencyStart : ui.fluencyNext}
        />
      </View>
      {scores.length > 0 ? (
        <View className="mt-4 gap-2">
          {scores.map((score, offset) => (
            <Text key={offset} className="font-sans text-base text-ink" style={{ fontVariant: ["tabular-nums"] }}>
              {offset + 1}. {ui.fluencyWpm.replace("{wpm}", String(score.wpm))} · {ui.fluencyPauses.replace("{count}", String(score.pauses))}
            </Text>
          ))}
        </View>
      ) : null}
      {slips ? (
        <View className="mt-4 gap-2">
          <Kicker tone="muted">{ui.fluencyRepair}</Kicker>
          {slips.length === 0 ? (
            <Text className="font-sans text-base text-ink">{ui.fluencyEmpty}</Text>
          ) : (
            slips.map((slip) => (
              <Text key={slip} className="font-sans text-base leading-6 text-ink">
                {slip}
              </Text>
            ))
          )}
        </View>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
    </StageCard>
  );
}
