import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { HvptRound } from "@/components/session/hvpt-round";
import { ListenPace } from "@/components/session/listen-pace";
import { SoundNotes } from "@/components/session/sound-notes";
import { analyzeShadowing, speakStory } from "@/lib/api";
import { listenRate } from "@/lib/listen-rate";
import { localDate } from "@/lib/listen-pace";
import { contrastForDay } from "@/lib/pronunciation-contrasts";
import { useCopy, copy as copyAt } from "@/lib/i18n";
import { tap } from "@/lib/haptics";
import { narratorVoice } from "@/lib/narrator";
import type { ShadowingResult } from "@/lib/types";
import { narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";
import { VoicePicker } from "@/components/session/voice-picker";

export function ShadowStage({
  sentences,
  language,
  throughLang = "pt",
  onScored,
}: {
  sentences: string[];
  language: string;
  throughLang?: string;
  onScored?: (score: number) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ShadowingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const clipRef = useRef<string | null>(null);
  const sentence = sentences[sentenceIndex] ?? "";
  const pulse = useSharedValue(0);
  const ui = useCopy();
  const contrast = contrastForDay(throughLang, language, localDate());

  useEffect(() => {
    pulse.value = recording ? withRepeat(withTiming(1, { duration: 700 }), -1, true) : withTiming(0, { duration: 180 });
  }, [pulse, recording]);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  async function play() {
    AudioService.stopAndUnload();
    const generation = narrationToken();
    playbackRef.current = null;
    setError(null);
    try {
      const spoken = await speakStory(sentence, language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      playbackRef.current = startNeuralPlayback(spoken.audioUrl, listenRate(), () => undefined, () => {
        playbackRef.current = null;
      }, (message) => {
        playbackRef.current = null;
        setError(message);
      });
    } catch {
      if (narrationToken() === generation) {
        setError("A voz neural não abriu. Tente de novo.");
      }
    }
  }

  async function toggleRecording() {
    if (scoring) {
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
          throw new Error("A gravação não foi salva.");
        }
        clipRef.current = uri;
        const report = await analyzeShadowing(uri, sentence, language);
        setResult(report);
        onScored?.(report.accuracy_score);
        const drifts = report.bars?.some((bar) => bar.drift) ?? false;
        void tap(drifts || (report.cadence_match ?? 100) < 70 ? "heavy" : report.accuracy_score >= 80 ? "success" : "medium");
      } catch (caught) {
        setError(speechError(caught instanceof Error ? caught.message : "Não foi possível avaliar a fala."));
      } finally {
        setScoring(false);
      }
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Precisamos do microfone para ouvir sua pronúncia.");
      return;
    }
    setResult(null);
    setError(null);
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
    void tap("light");
  }

  async function retryScore() {
    const uri = clipRef.current;
    if (!uri || scoring || recording) {
      return;
    }
    setScoring(true);
    setError(null);
    try {
      const report = await analyzeShadowing(uri, sentence, language);
      setResult(report);
      onScored?.(report.accuracy_score);
      const drifts = report.bars?.some((bar) => bar.drift) ?? false;
      void tap(drifts || (report.cadence_match ?? 100) < 70 ? "heavy" : report.accuracy_score >= 80 ? "success" : "medium");
    } catch (caught) {
      setError(speechError(caught instanceof Error ? caught.message : "Não foi possível avaliar a fala."));
    } finally {
      setScoring(false);
    }
  }

  return (
    <View>
      {contrast ? <HvptRound contrast={contrast} language={language} /> : null}
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{ui.speech}</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">{sentence}</Text>
      <View className="mt-4 flex-row gap-2">
        {sentences.map((item, index) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${ui.phrase} ${index + 1}`}
            onPress={() => {
              setSentenceIndex(index);
              setResult(null);
              setError(null);
              clipRef.current = null;
            }}
            className={`min-h-11 min-w-11 items-center justify-center rounded-full px-3 ${index === sentenceIndex ? "bg-ink" : "bg-line"}`}
          >
            <Text className={`text-sm font-semibold ${index === sentenceIndex ? "text-card" : "text-ink"}`}>{index + 1}</Text>
          </Pressable>
        ))}
      </View>
      <VoicePicker language={language} />
      <ListenPace />
      <View className="mt-4 flex-row gap-2">
        <Pressable accessibilityRole="button" onPress={() => { void play(); }} className="min-h-12 flex-1 items-center justify-center rounded-full bg-ink px-4">
          <Text className="text-base font-semibold text-card">{ui.listen}</Text>
        </Pressable>
      </View>
      <View className="mt-5 h-16 flex-row items-center justify-center gap-1.5">
        {Array.from({ length: 12 }, (_, index) => (
          <WaveBar key={index} index={index} pulse={pulse} active={recording} />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: scoring, disabled: scoring }}
        disabled={scoring}
        onPress={() => {
          void toggleRecording();
        }}
        className={`min-h-12 items-center justify-center rounded-full px-4 ${recording ? "bg-roseSoft" : "bg-ember"}`}
      >
        <Text className={`text-base font-semibold ${recording ? "text-roseInk" : "text-onEmber"}`}>
          {scoring ? ui.scoring : recording ? ui.stopAndScore : ui.recordPronunciation}
        </Text>
      </Pressable>
      {error ? (
        <View className="mt-3 gap-2">
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-base text-roseInk">
            {error}
          </Text>
          {clipRef.current && !recording ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: scoring, disabled: scoring }}
              disabled={scoring}
              onPress={() => void retryScore()}
              className="min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line bg-card px-5"
            >
              <Text className="font-label text-base text-ink">{scoring ? ui.scoring : ui.tryAgain}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {result ? (
        <View className="mt-6 rounded-[28px] border border-line bg-card px-5 py-5">
          <Text className="font-label text-sm text-muted">{ui.accuracy}</Text>
          <Text className="font-display mt-1 text-display text-ink">{result.accuracy_score}</Text>
          {result.sounds && result.sounds.length > 0 ? <SoundNotes notes={result.sounds} /> : null}
          <Text className="mt-2 text-base text-muted">{ui.cadence} {result.cadence_match ?? result.pitch_rhythm_match ?? 0}</Text>
          {result.bars && result.bars.length > 0 ? <CadenceRadar bars={result.bars} /> : null}
          <Text className="mt-3 text-base leading-6 text-ink">{result.transcription || ui.noSpeech}</Text>
          {result.mispronounced_words.length > 0 ? (
            <Text className="mt-3 text-base leading-6 text-muted">{ui.toImprove}: {result.mispronounced_words.join(", ")}</Text>
          ) : (
            <Text className="mt-3 text-base leading-6 text-moss">{ui.wordsMatched}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function CadenceRadar({ bars }: { bars: NonNullable<ShadowingResult["bars"]> }) {
  const ui = useCopy();
  const notes = bars.filter((bar) => bar.drift).map((bar) => bar.note);
  const unique = notes.filter((note, index) => notes.indexOf(note) === index);
  const summary = unique.length === 0 ? ui.onTime : `${ui.offTime}: ${unique.join(", ")}.`;
  return (
    <View accessibilityLabel={`${ui.cadence}. ${summary}`} className="mt-4">
      <Text className="font-label text-sm text-muted">{ui.reference}</Text>
      <View className="mt-2 h-12 flex-row items-end gap-1">
        {bars.map((bar, index) => (
          <View key={`ref-${index}`} className="flex-1 rounded-full bg-emberSoft" style={{ height: Math.max(8, bar.reference * 0.48) }} />
        ))}
      </View>
      <Text className="mt-3 font-label text-sm text-muted">{ui.you}</Text>
      <View className="mt-2 h-12 flex-row items-end gap-1">
        {bars.map((bar, index) => (
          <View
            key={`you-${index}`}
            accessibilityLabel={bar.note}
            className={`flex-1 rounded-full ${bar.drift ? "bg-roseSoft" : "bg-mossSoft"}`}
            style={{ height: Math.max(8, bar.spoken * 0.48) }}
          />
        ))}
      </View>
      <Text className="mt-2 text-sm text-muted">{summary}</Text>
    </View>
  );
}

function WaveBar({ index, pulse, active }: { index: number; pulse: SharedValue<number>; active: boolean }) {
  const { palette } = useTheme();
  const style = useAnimatedStyle(() => {
    const wave = Math.abs(Math.sin(pulse.value * Math.PI + index * 0.45));
    return {
      height: active ? 10 + wave * 38 : 8,
      opacity: active ? 0.45 + wave * 0.55 : 0.35,
    };
  });
  return <Animated.View style={[{ width: 3, borderRadius: 999, backgroundColor: palette.primary }, style]} />;
}

function speechError(message: string): string {
  const ui = copyAt();
  if (
    message.includes("busy") ||
    message.includes("high demand") ||
    message.includes("UNAVAILABLE") ||
    message.includes("A prosa não saiu") ||
    message.includes("A lição não saiu") ||
    message.includes("ocupado")
  ) {
    return ui.earBusy;
  }
  if (message.includes("Unsupported audio") || message.includes("audio file is required")) {
    return ui.recordingIncomplete;
  }
  return message;
}
