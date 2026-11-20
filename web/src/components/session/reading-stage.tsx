import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { ListenPace } from "@/components/session/listen-pace";
import { IconPause, IconPlay } from "@/components/session/session-icons";
import { Kicker, Notice, StageCard } from "@/components/session/stage-kit";
import { VoicePicker } from "@/components/session/voice-picker";
import { TactileButton } from "@/components/tactile/tactile-button";
import { prefetchSpeech, speakStory } from "@/lib/api";
import type { ChunkEntry } from "@/lib/chunks";
import { writeClipboard } from "@/lib/clipboard";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { useCopy } from "@/lib/i18n";
import { isLessonWord, normalizeWord, sentenceAt, tokenize } from "@/lib/lesson";
import { listenRate } from "@/lib/listen-rate";
import { narratorVoice } from "@/lib/narrator";
import type { LessonPayload } from "@/lib/types";
import { highlightIndex, narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

export function ReadingStage({
  lesson,
  language,
  active,
  onOpenWord,
  isChunkSaved,
  onSaveChunk,
  onAudioEnd,
}: {
  lesson: LessonPayload;
  language: string;
  active: boolean;
  onOpenWord: (token: string, sentence: string) => void;
  isChunkSaved?: (phrase: string) => boolean;
  onSaveChunk?: (phrase: string, translation: string, sentence: string) => void;
  /** A narração da história inteira tocou até o fim. */
  onAudioEnd?: () => void;
}) {
  const { palette } = useTheme();
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const [copied, setCopied] = useState(false);
  const words = useMemo(() => tokenize(lesson.story_text), [lesson.story_text]);
  const anchors = lesson.anchors ?? [];
  const trueWords = new Set(anchors.filter((item) => item.kind === "true").map((item) => normalizeWord(item.word)));
  const falseFriends = anchors.filter((item) => item.kind === "false");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const lastTap = useRef({ at: 0, sentence: "" });

  function stop() {
    playbackRef.current?.stop();
    playbackRef.current = null;
    AudioService.stopAndUnload();
    setPlaying(false);
    setLoading(false);
  }

  useEffect(() => {
    prefetchSpeech([lesson.story_text], language, narratorVoice(language));
  }, [language, lesson.story_text]);

  async function play() {
    stop();
    const generation = narrationToken();
    setIndex(0);
    setError(null);
    setLoading(true);
    try {
      const spoken = await speakStory(lesson.story_text, language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      setLoading(false);
      setPlaying(true);
      const marks = spoken.words;
      playbackRef.current = startNeuralPlayback(
        spoken.audioUrl,
        listenRate(),
        (elapsedMs, durationMs) => {
          setIndex(highlightIndex(elapsedMs, durationMs, words.length, marks));
        },
        () => {
          playbackRef.current = null;
          setIndex(words.length);
          setPlaying(false);
          onAudioEnd?.();
        },
        () => {
          playbackRef.current = null;
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

  useEffect(() => {
    if (!active && !AudioService.hasSequence()) {
      stop();
    }
    return () => {
      if (!AudioService.hasSequence()) {
        AudioService.stopAndUnload();
      }
    };
  }, [active]);

  return (
    <View className="gap-4">
      <StageCard>
        <Kicker>{copy.reading}</Kicker>
        <Text className="mt-2 font-display text-2xl leading-8 font-extrabold text-ink">{lesson.title}</Text>
        {trueWords.size > 0 ? <Text className="mt-2 font-sans text-sm leading-6 text-muted">{copy.knownWords}</Text> : null}
        <View className="mt-5 border-t pt-5" style={{ borderColor: palette.border }}>
          <View className="flex-row flex-wrap">
            {words.map((token, wordIndex) => {
              const known = isLessonWord(lesson.vocabulary, token);
              const cognate = trueWords.has(normalizeWord(token));
              const current = playing && wordIndex === index;
              return (
                <Pressable
                  key={`${token}-${wordIndex}`}
                  accessibilityRole="button"
                  accessibilityLabel={cognate ? `${token}, ${copy.cognateWord}` : known ? `${token}, ${copy.vocabWord}` : token}
                  accessibilityHint={copy.wordHint}
                  onPress={() => {
                    const sentence = sentenceAt(lesson.story_text, wordIndex);
                    const now = Date.now();
                    if (lastTap.current.sentence === sentence && now - lastTap.current.at < 320) {
                      lastTap.current = { at: 0, sentence: "" };
                      stop();
                      setGrammarSentence(sentence);
                      return;
                    }
                    lastTap.current = { at: now, sentence };
                    onOpenWord(token, sentence);
                  }}
                  className="mb-1 mr-0.5 min-h-11 cursor-pointer justify-center rounded-lg px-1"
                  style={{ backgroundColor: current ? palette.accentSoft : "transparent" }}
                >
                  <Text
                    className={`font-serif text-2xl leading-9 ${known || cognate ? "font-semibold" : ""} text-ink`}
                    style={known || cognate ? { textDecorationLine: "underline", textDecorationColor: palette.accent } : undefined}
                  >
                    {token}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {falseFriends.length > 0 ? (
          <View className="mt-4 rounded-xl px-4 py-3" style={{ backgroundColor: palette.pillWarningBg }}>
            <Text className="font-sans text-sm font-extrabold" style={{ color: palette.pillWarningInk }}>
              {copy.falseFriends}
            </Text>
            {falseFriends.slice(0, 6).map((item) => (
              <Text key={item.word} className="mt-1 font-sans text-sm leading-6" style={{ color: palette.pillWarningInk }}>
                {fill(local.falseFriend, { word: item.word, familiar: item.familiar, gloss: item.gloss })}
              </Text>
            ))}
          </View>
        ) : null}
      </StageCard>
      <StageCard tone="raised">
        <ListenPace />
        <View className="mt-4 flex-row flex-wrap gap-2">
          <TactileButton
            variant="primary"
            size="md"
            disabled={loading}
            onPress={() => (playing ? stop() : void play())}
            icon={playing ? <IconPause color={palette.onPrimary} size={14} /> : <IconPlay color={palette.onPrimary} size={14} />}
            label={playing ? copy.pauseAudio : copy.listenStory}
          />
          <TactileButton variant="secondary" size="md" onPress={() => setPassageOpen(true)} label={copy.seeTranslation} />
          <TactileButton
            variant="secondary"
            size="md"
            onPress={() => {
              void writeClipboard(lesson.story_text).then((ok) => {
                if (ok) {
                  setCopied(true);
                }
              });
            }}
            label={copied ? copy.storyCopied : copy.copyStory}
          />
        </View>
        {loading ? <Text className="mt-3 font-sans text-sm text-muted">{local.voiceLoading}</Text> : null}
        <VoicePicker language={language} onPreview={stop} />
        {error ? <Notice>{error}</Notice> : null}
      </StageCard>
      <GlassSheet visible={passageOpen} onClose={() => setPassageOpen(false)} label={copy.translationOfStory}>
        <Text className="mt-3 font-serif text-lg leading-8 text-ink">{lesson.translation}</Text>
      </GlassSheet>
      <GrammarSheet
        sentence={grammarSentence}
        language={language}
        vocabulary={lesson.vocabulary.map((entry): ChunkEntry => ({ word: entry.word, translation: entry.translation }))}
        isSaved={isChunkSaved}
        onSaveChunk={onSaveChunk}
        onClose={() => setGrammarSentence(null)}
      />
    </View>
  );
}
