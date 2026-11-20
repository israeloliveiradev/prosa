import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { IconMic, IconPlay } from "@/components/session/session-icons";
import { SoundNotes } from "@/components/session/sound-notes";
import { ChoiceTile, Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
import { analyzeShadowing, speakStory } from "@/lib/api";
import { useCopy, useLocale } from "@/lib/i18n";
import { localDate } from "@/lib/listen-pace";
import { voicesFor } from "@/lib/narrator";
import { hvptTrials, trialWord, type PronunciationContrast } from "@/lib/pronunciation-contrasts";
import { tap } from "@/lib/haptics";
import type { SoundNote } from "@/lib/types";
import { narrationToken, startNeuralPlayback } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

export function HvptRound({
  contrast,
  language,
}: {
  contrast: PronunciationContrast;
  language: string;
}) {
  const ui = useCopy();
  const { palette } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const locale = useLocale();
  const date = localDate();
  const voices = voicesFor(language);
  const trials = hvptTrials(contrast, voices.length, date);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<0 | 1 | null>(null);
  const [phase, setPhase] = useState<"hear" | "produce">("hear");
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [sounds, setSounds] = useState<SoundNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const trial = trials[index] ?? trials[0];
  const pair = trial ? contrast.pairs[trial.pair] ?? contrast.pairs[0] : contrast.pairs[0];
  const voice = trial ? voices[trial.voice] ?? voices[0] : voices[0];
  const produceWord = pair?.a ?? "";

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  if (!trial || !pair) {
    return null;
  }

  async function play() {
    const word = trialWord(contrast, trial);
    if (!word) {
      return;
    }
    AudioService.stopAndUnload();
    const generation = narrationToken();
    setError(null);
    try {
      const spoken = await speakStory(word, language, voice?.id);
      if (narrationToken() !== generation) {
        return;
      }
      startNeuralPlayback(spoken.audioUrl, 1, () => undefined, () => undefined, (message) => {
        setError(message);
      });
    } catch {
      if (narrationToken() === generation) {
        setError(ui.hvptVoiceFailed);
      }
    }
  }

  function pick(side: 0 | 1) {
    if (choice !== null) {
      return;
    }
    setChoice(side);
    void tap(side === trial.side ? "success" : "heavy");
  }

  function next() {
    if (choice === null) {
      return;
    }
    if (index + 1 >= trials.length) {
      setPhase("produce");
      setError(null);
      return;
    }
    setIndex(index + 1);
    setChoice(null);
    setError(null);
  }

  async function toggleRecording() {
    if (scoring || !produceWord) {
      return;
    }
    if (recording) {
      setRecording(false);
      setScoring(true);
      setError(null);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) {
          throw new Error(ui.hvptVoiceFailed);
        }
        const report = await analyzeShadowing(uri, produceWord, language);
        setScore(report.accuracy_score);
        setSounds(report.sounds ?? []);
        void tap(report.accuracy_score >= 80 ? "success" : "medium");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : ui.hvptVoiceFailed);
      } finally {
        setScoring(false);
      }
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError(ui.hvptMic);
      return;
    }
    setScore(null);
    setSounds([]);
    setError(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    void tap("light");
  }

  return (
    <StageCard tone="raised">
      <Kicker tone="accent">{contrast.name[locale]}</Kicker>
      {phase === "hear" ? (
        <View>
          <Text className="mt-2 font-sans text-lg font-semibold leading-7 text-ink">{ui.hvptQuestion}</Text>
          {voice ? <Text className="mt-1 font-sans text-sm text-muted">{ui.hvptVoice.replace("{name}", voice.name)}</Text> : null}
          <View className="mt-4 flex-row">
            <TactileButton
              variant="primary"
              size="md"
              onPress={() => void play()}
              icon={<IconPlay color={palette.onPrimary} size={14} />}
              label={ui.listen}
            />
          </View>
          <View className="mt-3 flex-row gap-2">
            {([0, 1] as const).map((side) => {
              const word = side === 0 ? pair.a : pair.b;
              const answered = choice !== null;
              const state = !answered ? "idle" : side === trial.side ? "right" : side === choice ? "wrong" : "idle";
              return (
                <ChoiceTile key={word} label={word} state={state} disabled={answered} onPress={() => pick(side)} className="flex-1 items-center" />
              );
            })}
          </View>
          {choice !== null ? (
            <View className="mt-3 gap-3">
              <Text
                accessibilityLiveRegion="polite"
                className="font-sans text-base font-semibold"
                style={{ color: choice === trial.side ? palette.pillPositiveInk : palette.pillNegativeInk }}
              >
                {choice === trial.side ? ui.hvptRight : ui.hvptWrong}
              </Text>
              <View className="flex-row">
                <TactileButton variant="secondary" size="md" onPress={next} label={ui.listenNext} />
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <Text className="mt-2 font-sans text-base leading-6 text-muted">{contrast.hint[locale]}</Text>
          <Text className="mt-3 font-display text-2xl leading-8 font-extrabold text-ink">
            {ui.hvptProduce} {produceWord}
          </Text>
          <View className="mt-4 flex-row">
            <TactileButton
              variant={recording ? "crimson" : "amber"}
              size="md"
              disabled={scoring}
              onPress={() => void toggleRecording()}
              icon={<IconMic color={recording ? "#FFFFFF" : "#2A1700"} size={15} />}
              label={scoring ? ui.scoring : recording ? ui.stopAndScore : ui.recordPronunciation}
            />
          </View>
          {score !== null ? (
            <Text accessibilityLiveRegion="polite" className="mt-3 font-sans text-base font-semibold text-ink">
              {ui.hvptScore.replace("{score}", String(score))}
            </Text>
          ) : null}
          <SoundNotes notes={sounds} />
        </View>
      )}
      {error ? <Notice>{error}</Notice> : null}
    </StageCard>
  );
}
