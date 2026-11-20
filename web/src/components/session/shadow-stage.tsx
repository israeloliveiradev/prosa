import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { HvptRound } from "@/components/session/hvpt-round";
import { ListenPace } from "@/components/session/listen-pace";
import { IconMic, IconPlay } from "@/components/session/session-icons";
import { SoundNotes } from "@/components/session/sound-notes";
import { Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { VoicePicker } from "@/components/session/voice-picker";
import { TactileButton } from "@/components/tactile/tactile-button";
import { analyzeShadowing, speakStory } from "@/lib/api";
import { areaCopy, useAreaCopy } from "@/lib/copy/area";
import { SESSION_COPY, type SessionCopy } from "@/lib/copy/session";
import { tap } from "@/lib/haptics";
import { copy as copyAt, getLocale, useCopy } from "@/lib/i18n";
import { listenRate } from "@/lib/listen-rate";
import { localDate } from "@/lib/listen-pace";
import { narratorVoice } from "@/lib/narrator";
import { contrastForDay } from "@/lib/pronunciation-contrasts";
import type { CadenceBar, ShadowingResult } from "@/lib/types";
import { narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

export function ShadowStage({
  sentences,
  language,
  throughLang = "pt",
  onScored,
  onTrouble,
}: {
  sentences: string[];
  language: string;
  throughLang?: string;
  onScored?: (score: number) => void;
  /** O microfone foi negado ou a avaliação falhou: a tela pode oferecer uma saída honesta. */
  onTrouble?: () => void;
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
  const local = useAreaCopy(SESSION_COPY);
  const { palette } = useTheme();
  const contrast = contrastForDay(throughLang, language, localDate());

  useEffect(() => {
    pulse.value = recording ? withRepeat(withTiming(1, { duration: 700 }), -1, true) : withTiming(0, { duration: 180 });
  }, [pulse, recording]);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  function fail(message: string) {
    setError(message);
    onTrouble?.();
  }

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
      playbackRef.current = startNeuralPlayback(
        spoken.audioUrl,
        listenRate(),
        () => undefined,
        () => {
          playbackRef.current = null;
        },
        (message) => {
          playbackRef.current = null;
          setError(message);
        },
      );
    } catch {
      if (narrationToken() === generation) {
        setError(local.voiceFailed);
      }
    }
  }

  async function score(uri: string) {
    const report = await analyzeShadowing(uri, sentence, language);
    setResult(report);
    onScored?.(report.accuracy_score);
    const drifts = report.bars?.some((bar) => bar.drift) ?? false;
    void tap(drifts || (report.cadence_match ?? 100) < 70 ? "heavy" : report.accuracy_score >= 80 ? "success" : "medium");
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
          throw new Error(local.recordingLost);
        }
        clipRef.current = uri;
        await score(uri);
      } catch (caught) {
        fail(speechError(caught instanceof Error ? caught.message : local.scoreFailed));
      } finally {
        setScoring(false);
      }
      return;
    }

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        fail(local.micNeeded);
        return;
      }
      setResult(null);
      setError(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      void tap("light");
    } catch {
      fail(local.micNeeded);
    }
  }

  async function retryScore() {
    const uri = clipRef.current;
    if (!uri || scoring || recording) {
      return;
    }
    setScoring(true);
    setError(null);
    try {
      await score(uri);
    } catch (caught) {
      fail(speechError(caught instanceof Error ? caught.message : local.scoreFailed));
    } finally {
      setScoring(false);
    }
  }

  return (
    <View className="gap-4">
      {contrast ? <HvptRound contrast={contrast} language={language} /> : null}
      <StageCard>
        <Kicker>{ui.speech}</Kicker>
        <Text className="mt-2 font-serif text-2xl leading-9 text-ink">{sentence}</Text>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {sentences.map((item, index) => {
            const selected = index === sentenceIndex;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`${ui.phrase} ${index + 1}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  setSentenceIndex(index);
                  setResult(null);
                  setError(null);
                  clipRef.current = null;
                }}
                className="h-11 w-11 cursor-pointer items-center justify-center rounded-xl"
                style={{
                  backgroundColor: selected ? palette.primary : palette.card,
                  borderWidth: 1.5,
                  borderColor: selected ? palette.primary : palette.border,
                  borderBottomWidth: 4,
                  borderBottomColor: selected ? palette.primaryEdge : palette.control,
                }}
              >
                <Text className="font-sans text-sm font-extrabold" style={{ color: selected ? palette.onPrimary : palette.ink }}>
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <VoicePicker language={language} />
        <ListenPace />
        <View className="mt-4 flex-row flex-wrap gap-2">
          <TactileButton
            variant="secondary"
            size="lg"
            onPress={() => void play()}
            icon={<IconPlay color={palette.primary} size={15} />}
            label={ui.listen}
          />
          <TactileButton
            variant={recording ? "crimson" : "amber"}
            size="lg"
            disabled={scoring}
            onPress={() => void toggleRecording()}
            icon={<IconMic color={recording ? palette.onPrimary : "#2A1700"} size={16} />}
            label={scoring ? ui.scoring : recording ? ui.stopAndScore : ui.recordPronunciation}
          />
        </View>
        <View className="mt-4 h-14 flex-row items-center justify-center gap-1.5">
          {Array.from({ length: 12 }, (_, index) => (
            <WaveBar key={index} index={index} pulse={pulse} active={recording} />
          ))}
        </View>
        {error ? (
          <View>
            <Notice>{error}</Notice>
            {clipRef.current && !recording ? (
              <View className="mt-2 flex-row">
                <TactileButton variant="secondary" size="sm" disabled={scoring} onPress={() => void retryScore()} label={scoring ? ui.scoring : ui.tryAgain} />
              </View>
            ) : null}
          </View>
        ) : null}
      </StageCard>
      {result ? (
        <StageCard>
          <Kicker tone="muted">{ui.accuracy}</Kicker>
          <Text className="mt-1 font-display text-4xl font-extrabold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
            {result.accuracy_score}
          </Text>
          {result.sounds && result.sounds.length > 0 ? <SoundNotes notes={result.sounds} /> : null}
          <Text className="mt-2 font-sans text-base text-muted">
            {ui.cadence} {result.cadence_match ?? result.pitch_rhythm_match ?? 0}
          </Text>
          {result.bars && result.bars.length > 0 ? <CadenceRadar bars={result.bars} /> : null}
          <Text className="mt-3 font-sans text-base leading-6 text-ink">{result.transcription || ui.noSpeech}</Text>
          {result.mispronounced_words.length > 0 ? (
            <Text className="mt-3 font-sans text-base leading-6 text-muted">
              {ui.toImprove}: {result.mispronounced_words.join(", ")}
            </Text>
          ) : (
            <Text className="mt-3 font-sans text-base leading-6" style={{ color: palette.pillPositiveInk }}>
              {ui.wordsMatched}
            </Text>
          )}
        </StageCard>
      ) : null}
    </View>
  );
}

function cadenceNote(note: CadenceBar["note"], local: SessionCopy): string {
  if (note === "apressou") {
    return local.cadenceRushed;
  }
  if (note === "alongou") {
    return local.cadenceStretched;
  }
  return local.cadenceOnTime;
}

function CadenceRadar({ bars }: { bars: NonNullable<ShadowingResult["bars"]> }) {
  const ui = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const { palette } = useTheme();
  const notes = bars.filter((bar) => bar.drift).map((bar) => cadenceNote(bar.note, local));
  const unique = notes.filter((note, index) => notes.indexOf(note) === index);
  const summary = unique.length === 0 ? ui.onTime : `${ui.offTime}: ${unique.join(", ")}.`;
  return (
    <View accessibilityLabel={`${ui.cadence}. ${summary}`} className="mt-4">
      <Text className="font-sans text-sm font-bold text-muted">{ui.reference}</Text>
      <View className="mt-2 h-12 flex-row items-end gap-1">
        {bars.map((bar, index) => (
          <View key={`ref-${index}`} className="flex-1 rounded-full" style={{ height: Math.max(8, bar.reference * 0.48), backgroundColor: palette.accentSoft }} />
        ))}
      </View>
      <Text className="mt-3 font-sans text-sm font-bold text-muted">{ui.you}</Text>
      <View className="mt-2 h-12 flex-row items-end gap-1">
        {bars.map((bar, index) => (
          <View
            key={`you-${index}`}
            accessibilityLabel={cadenceNote(bar.note, local)}
            className="flex-1 rounded-full"
            style={{ height: Math.max(8, bar.spoken * 0.48), backgroundColor: bar.drift ? palette.pillNegativeBg : palette.pillPositiveBg }}
          />
        ))}
      </View>
      <Text className="mt-2 font-sans text-sm text-muted">{summary}</Text>
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
  const local = areaCopy(SESSION_COPY, getLocale());
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
  return message || local.scoreFailed;
}
