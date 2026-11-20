import { useEffect, useMemo, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ListenPace } from "@/components/session/listen-pace";
import { IconPause, IconPlay } from "@/components/session/session-icons";
import { ChoiceTile, Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { TactileButton } from "@/components/tactile/tactile-button";
import { speakStory } from "@/lib/api";
import { SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { buildDictation, dictationMatches } from "@/lib/dictation";
import { listenRate } from "@/lib/listen-rate";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { narratorVoice, useNarratorVoice, voicesFor } from "@/lib/narrator";
import { listenChecks } from "@/lib/session-clock";
import { narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

export interface ListenResult {
  right: number;
  total: number;
}

export function ListenStage({
  story,
  translation,
  language,
  vocabulary,
  onDone,
}: {
  story: string;
  translation: string;
  language: string;
  vocabulary: Array<{ word: string }>;
  /** Chamado uma vez, quando a compreensão foi respondida (ou a história ouvida, se não há pergunta). */
  onDone?: (result: ListenResult) => void;
}) {
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const { palette } = useTheme();
  const voiceId = useNarratorVoice(language);
  const voiceName = voicesFor(language).find((voice) => voice.id === voiceId)?.name ?? "";
  const checks = useMemo(() => listenChecks(story, translation), [story, translation]);
  const playback = useRef<PlaybackHandle | null>(null);
  const reported = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [heard, setHeard] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const question = heard ? checks[cursor] : undefined;
  const questionsFinished = checks.length === 0 ? heard : heard && cursor === checks.length - 1 && picked !== null;
  const dictation = useMemo(() => buildDictation(story, vocabulary), [story, vocabulary]);

  useEffect(() => {
    return () => {
      playback.current?.stop();
      AudioService.stopAndUnload();
    };
  }, []);

  useEffect(() => {
    if (questionsFinished && !reported.current) {
      reported.current = true;
      onDone?.({ right, total: checks.length });
    }
  }, [checks.length, onDone, questionsFinished, right]);

  function stop() {
    playback.current?.stop();
    playback.current = null;
    AudioService.stopAndUnload();
    setPlaying(false);
    setLoading(false);
  }

  async function play(text: string, markHeard: boolean) {
    stop();
    const generation = narrationToken();
    setError(null);
    setLoading(true);
    try {
      const spoken = await speakStory(text, language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      setLoading(false);
      setPlaying(true);
      playback.current = startNeuralPlayback(
        spoken.audioUrl,
        listenRate(),
        () => undefined,
        () => {
          playback.current = null;
          setPlaying(false);
          if (markHeard) {
            setHeard(true);
          }
        },
        () => {
          playback.current = null;
          setPlaying(false);
          setError(local.voiceFailed);
        },
      );
    } catch (caught) {
      if (narrationToken() === generation) {
        setLoading(false);
        setPlaying(false);
        setError(caught instanceof Error ? caught.message : local.voiceFailed);
      }
    }
  }

  return (
    <View className="gap-4">
      <StageCard>
        <Kicker>{copy.listenPhase}</Kicker>
        <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{copy.listenTitle}</Text>
        {voiceName ? <Text className="mt-2 font-sans text-sm text-muted">{`${copy.listenVoiceToday} · ${voiceName}`}</Text> : null}
        <ListenPace />
        <View className="mt-5 flex-row flex-wrap gap-2">
          <TactileButton
            variant="primary"
            size="lg"
            disabled={loading}
            onPress={() => (playing ? stop() : void play(story, true))}
            icon={playing ? <IconPause color={palette.onPrimary} /> : <IconPlay color={palette.onPrimary} />}
            label={playing ? copy.pauseAudio : heard ? copy.listenAgain : copy.listenPlay}
          />
          {heard ? null : <TactileButton variant="secondary" size="lg" onPress={() => setHeard(true)} label={copy.listenHeard} />}
        </View>
        {loading ? <Text className="mt-3 font-sans text-sm text-muted">{local.voiceLoading}</Text> : null}
        {error ? <Notice>{error}</Notice> : null}
      </StageCard>
      {question ? (
        <StageCard>
          <Kicker tone="muted">{copy.listenQuestion}</Kicker>
          <View className="mt-3 flex-row">
            <TactileButton
              variant="secondary"
              size="sm"
              disabled={loading}
              onPress={() => void play(question.audio, false)}
              icon={<IconPlay color={palette.primary} size={14} />}
              label={copy.listenAgain}
            />
          </View>
          <View className="mt-4 gap-2">
            {question.options.map((option, index) => {
              const answered = picked !== null;
              const state = !answered ? "idle" : index === question.answer ? "right" : picked === index ? "wrong" : "idle";
              return (
                <ChoiceTile
                  key={`${index}-${option}`}
                  label={option}
                  state={state}
                  disabled={answered}
                  onPress={() => {
                    setPicked(index);
                    if (index === question.answer) {
                      setRight((value) => value + 1);
                    }
                    void tap(index === question.answer ? "success" : "medium");
                  }}
                />
              );
            })}
          </View>
          {picked !== null && cursor < checks.length - 1 ? (
            <View className="mt-4 flex-row">
              <TactileButton
                variant="primary"
                size="md"
                onPress={() => {
                  setCursor((current) => current + 1);
                  setPicked(null);
                }}
                label={copy.listenNext}
              />
            </View>
          ) : null}
        </StageCard>
      ) : null}
      {questionsFinished && dictation.gaps.length > 0 ? <DictationGaps story={story} vocabulary={vocabulary} /> : null}
      {questionsFinished && dictation.gaps.length === 0 ? (
        <Text className="font-sans text-base leading-7 text-muted">{copy.listenOpen}</Text>
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
    <StageCard>
      <Kicker tone="muted">{copy.dictationTitle}</Kicker>
      <View className="mt-4 flex-row flex-wrap items-end">
        {built.pieces.map((piece, index) => {
          if (piece.kind === "word" || piece.gap === undefined) {
            return (
              <Text key={`word-${index}`} className="mb-2 mr-1 font-serif text-lg leading-8 text-ink">
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
                placeholderTextColor={palette.faint}
                autoCapitalize="none"
                autoCorrect={false}
                className="min-h-11 min-w-24 rounded-xl px-3 font-sans text-lg text-ink"
                style={{
                  backgroundColor: checked ? (ok ? palette.pillPositiveBg : palette.pillNegativeBg) : palette.card,
                  borderWidth: 2,
                  borderColor: checked ? (ok ? palette.positive : palette.negative) : palette.border,
                }}
              />
              {checked && !ok ? <Text className="mt-1 font-sans text-sm text-muted">{piece.text}</Text> : null}
            </View>
          );
        })}
      </View>
      <View className="mt-4 flex-row">
        <TactileButton
          variant="primary"
          size="md"
          onPress={() => {
            setChecked(true);
            void tap(right === built.gaps.length ? "success" : "medium");
          }}
          label={copy.dictationCheck}
        />
      </View>
      {checked ? (
        <Text accessibilityLiveRegion="polite" className="mt-3 font-sans text-base font-semibold text-ink">
          {copy.dictationScore.replace("{right}", String(right)).replace("{total}", String(built.gaps.length))}
        </Text>
      ) : null}
    </StageCard>
  );
}
