import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { SoundNotes } from "@/components/session/sound-notes";
import { analyzeShadowing, speakStory } from "@/lib/api";
import { getLocale, useCopy } from "@/lib/i18n";
import { localDate } from "@/lib/listen-pace";
import { voicesFor } from "@/lib/narrator";
import { hvptTrials, trialWord, type PronunciationContrast } from "@/lib/pronunciation-contrasts";
import { tap } from "@/lib/haptics";
import type { SoundNote } from "@/lib/types";
import { narrationToken, startNeuralPlayback } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";

export function HvptRound({
  contrast,
  language,
}: {
  contrast: PronunciationContrast;
  language: string;
}) {
  const ui = useCopy();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const locale = getLocale();
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
    <View className="mb-8 rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{contrast.name[locale]}</Text>
      {phase === "hear" ? (
        <View>
          <Text className="mt-2 text-lg leading-7 text-ink">{ui.hvptQuestion}</Text>
          {voice ? (
            <Text className="mt-1 text-sm text-muted">{ui.hvptVoice.replace("{name}", voice.name)}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void play();
            }}
            className="mt-4 min-h-12 items-center justify-center rounded-full bg-ink px-4"
          >
            <Text className="text-base font-semibold text-card">{ui.listenPlay}</Text>
          </Pressable>
          <View className="mt-3 flex-row gap-2">
            {([0, 1] as const).map((side) => {
              const word = side === 0 ? pair.a : pair.b;
              const answered = choice !== null;
              const tone = !answered ? "bg-line" : side === trial.side ? "bg-mossSoft" : side === choice ? "bg-roseSoft" : "bg-line";
              return (
                <Pressable
                  key={word}
                  accessibilityRole="button"
                  accessibilityState={{ selected: choice === side, disabled: answered }}
                  disabled={answered}
                  onPress={() => pick(side)}
                  className={`min-h-12 flex-1 items-center justify-center rounded-full px-3 ${tone}`}
                >
                  <Text className="text-base font-semibold text-ink">{word}</Text>
                </Pressable>
              );
            })}
          </View>
          {choice !== null ? (
            <View className="mt-3 gap-3">
              <Text accessibilityLiveRegion="polite" className={`text-base ${choice === trial.side ? "text-moss" : "text-roseInk"}`}>
                {choice === trial.side ? ui.hvptRight : ui.hvptWrong}
              </Text>
              <Pressable accessibilityRole="button" onPress={next} className="min-h-12 items-center justify-center self-start rounded-full border border-line px-5">
                <Text className="text-base font-semibold text-ink">{ui.listenNext}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <Text className="mt-2 text-base leading-6 text-muted">{contrast.hint[locale]}</Text>
          <Text className="font-displayItalic mt-3 text-headline leading-10 text-ink">
            {ui.hvptProduce} {produceWord}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: scoring, disabled: scoring }}
            disabled={scoring}
            onPress={() => {
              void toggleRecording();
            }}
            className={`mt-4 min-h-12 items-center justify-center rounded-full px-4 ${recording ? "bg-roseSoft" : "bg-ember"}`}
          >
            <Text className={`text-base font-semibold ${recording ? "text-roseInk" : "text-onEmber"}`}>
              {scoring ? ui.scoring : recording ? ui.stopAndScore : ui.recordPronunciation}
            </Text>
          </Pressable>
          {score !== null ? (
            <Text accessibilityLiveRegion="polite" className="mt-3 text-base text-ink">
              {ui.hvptScore.replace("{score}", String(score))}
            </Text>
          ) : null}
          <SoundNotes notes={sounds} />
        </View>
      )}
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
