import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ListenPace } from "@/components/session/listen-pace";
import { speakStory } from "@/lib/api";
import { buildDictation, dictationMatches } from "@/lib/dictation";
import { listenRate } from "@/lib/listen-rate";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { narratorVoice, useNarratorVoice, voicesFor } from "@/lib/narrator";
import { listenChecks } from "@/lib/session-clock";
import { startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

export function ListenStage({
  story,
  translation,
  language,
  vocabulary,
}: {
  story: string;
  translation: string;
  language: string;
  vocabulary: Array<{ word: string }>;
}) {
  const copy = useCopy();
  const voiceId = useNarratorVoice(language);
  const voiceName = voicesFor(language).find((voice) => voice.id === voiceId)?.name ?? "";
  const checks = listenChecks(story, translation);
  const playback = useRef<PlaybackHandle | null>(null);
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const question = heard ? checks[cursor] : undefined;
  const questionsFinished = checks.length === 0 ? heard : heard && cursor === checks.length - 1 && picked !== null;
  const dictation = buildDictation(story, vocabulary);

  useEffect(() => {
    return () => {
      playback.current?.stop();
      AudioService.stopAndUnload();
    };
  }, []);

  async function play(text: string, markHeard: boolean) {
    setError(null);
    setPlaying(true);
    try {
      const spoken = await speakStory(text, language, narratorVoice(language));
      playback.current?.stop();
      playback.current = startNeuralPlayback(
        spoken.audioUrl,
        listenRate(),
        () => undefined,
        () => {
          setPlaying(false);
          if (markHeard) {
            setHeard(true);
          }
        },
        () => {
          setPlaying(false);
          setError(copy.neuralVoiceFailed);
        },
      );
    } catch (caught) {
      setPlaying(false);
      setError(caught instanceof Error ? caught.message : copy.neuralVoiceFailed);
    }
  }

  return (
    <View className="mt-6">
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.listenPhase}</Text>
      <Text className="font-displayItalic mt-2 text-headline leading-10 text-ink">{copy.listenTitle}</Text>
      {voiceName ? <Text className="mt-3 font-label text-sm text-muted">{`${copy.listenVoiceToday} · ${voiceName}`}</Text> : null}
      <ListenPace />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: playing }}
        disabled={playing}
        onPress={() => {
          void play(story, true);
        }}
        className={`mt-5 min-h-12 items-center justify-center self-start rounded-full px-6 ${playing ? "bg-line" : "bg-ember"}`}
      >
        <Text className={`text-base font-semibold ${playing ? "text-muted" : "text-onEmber"}`}>
          {playing ? copy.listenPlay : heard ? copy.listenAgain : copy.listenPlay}
        </Text>
      </Pressable>
      {heard ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setHeard(true)}
          className="mt-3 min-h-12 items-center justify-center self-start rounded-full bg-line px-6"
        >
          <Text className="text-base font-semibold text-ink">{copy.listenHeard}</Text>
        </Pressable>
      )}
      {error ? (
        <Text accessibilityRole="alert" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
      {questionsFinished && dictation.gaps.length > 0 ? <DictationGaps story={story} vocabulary={vocabulary} /> : null}
      {questionsFinished && dictation.gaps.length === 0 ? <Text className="mt-6 text-base leading-7 text-muted">{copy.listenOpen}</Text> : null}
      {question ? (
        <View className="mt-6">
          <Text className="font-label text-sm text-ink">{copy.listenQuestion}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={playing}
            onPress={() => {
              void play(question.audio, false);
            }}
            className="mt-3 min-h-12 items-center justify-center self-start rounded-full bg-line px-6"
          >
            <Text className="text-base font-semibold text-ink">{copy.listenAgain}</Text>
          </Pressable>
          <View className="mt-4 gap-2">
            {question.options.map((option, index) => {
              const chosen = picked === index;
              const right = picked !== null && index === question.answer;
              return (
                <Pressable
                  key={`${index}-${option}`}
                  accessibilityRole="button"
                  disabled={picked !== null}
                  onPress={() => {
                    setPicked(index);
                    void tap(index === question.answer ? "success" : "medium");
                  }}
                  className={`min-h-12 justify-center rounded-[20px] px-4 py-3 ${right ? "bg-mossSoft" : chosen ? "bg-roseSoft" : "bg-card"}`}
                >
                  <Text className="text-base leading-6 text-ink">{option}</Text>
                </Pressable>
              );
            })}
          </View>
          {picked !== null && cursor < checks.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCursor((current) => current + 1);
                setPicked(null);
              }}
              className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
            >
              <Text className="text-base font-semibold text-onEmber">{copy.listenNext}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function DictationGaps({ story, vocabulary }: { story: string; vocabulary: Array<{ word: string }> }) {
  const copy = useCopy();
  const { palette } = useTheme();
  const built = useMemo(() => buildDictation(story, vocabulary), [story, vocabulary]);
  const [answers, setAnswers] = useState<string[]>(() => built.gaps.map(() => ""));
  const [checked, setChecked] = useState(false);
  const right = built.gaps.filter((gap, index) => dictationMatches(answers[index] ?? "", gap.expected)).length;

  return (
    <View className="mt-6">
      <Text className="font-label text-sm text-ink">{copy.dictationTitle}</Text>
      <View className="mt-4 flex-row flex-wrap items-end">
        {built.pieces.map((piece, index) => {
          if (piece.kind === "word" || piece.gap === undefined) {
            return (
              <Text key={`word-${index}`} className="mb-2 mr-1 text-lg leading-8 text-ink">
                {piece.text}
              </Text>
            );
          }
          const gap = piece.gap;
          const ok = dictationMatches(answers[gap] ?? "", piece.text);
          return (
            <View key={`gap-${gap}`} className="mb-2 mr-1">
              <TextInput
                value={answers[gap] ?? ""}
                onChangeText={(value) => {
                  setChecked(false);
                  setAnswers((current) => current.map((item, itemIndex) => (itemIndex === gap ? value : item)));
                }}
                accessibilityLabel={`${copy.dictationGap} ${gap + 1}`}
                placeholder="···"
                placeholderTextColor={palette.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                className={`min-h-12 min-w-24 rounded-2xl border border-line px-3 text-lg text-ink ${checked && ok ? "bg-mossSoft" : checked ? "bg-roseSoft" : "bg-card"}`}
              />
              {checked && !ok ? <Text className="mt-1 text-sm text-muted">{piece.text}</Text> : null}
            </View>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setChecked(true);
          void tap(right === built.gaps.length ? "success" : "medium");
        }}
        className="mt-4 min-h-12 items-center justify-center self-start rounded-full bg-ember px-6"
      >
        <Text className="text-base font-semibold text-onEmber">{copy.dictationCheck}</Text>
      </Pressable>
      {checked ? (
        <Text className="mt-3 text-base text-ink">{copy.dictationScore.replace("{right}", String(right)).replace("{total}", String(built.gaps.length))}</Text>
      ) : null}
    </View>
  );
}
