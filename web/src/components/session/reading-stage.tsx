import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ListenPace } from "@/components/session/listen-pace";
import { prefetchSpeech, speakStoryStream } from "@/lib/api";
import { listenRate } from "@/lib/listen-rate";
import type { ChunkEntry } from "@/lib/chunks";
import { findVocabulary, normalizeWord, sentenceAt, tokenize } from "@/lib/lesson";
import { narratorVoice } from "@/lib/narrator";
import type { LessonPayload } from "@/lib/types";
import { highlightIndex, narrationToken, startNeuralStream, type PlaybackHandle } from "@/lib/voice";
import { sentenceRanges } from "@/lib/hands-free";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";
import { GlassSheet } from "@/components/session/glass-sheet";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { VoicePicker } from "@/components/session/voice-picker";
import { ChunkButton } from "@/components/shell/chunk-button";
import { writeClipboard } from "@/lib/clipboard";
import { getLocale, useCopy } from "@/lib/i18n";

export function ReadingStage({
  lesson,
  language,
  active,
  onOpenWord,
  isChunkSaved,
  onSaveChunk,
}: {
  lesson: LessonPayload;
  language: string;
  active: boolean;
  onOpenWord: (token: string, sentence: string) => void;
  isChunkSaved?: (phrase: string) => boolean;
  onSaveChunk?: (phrase: string, translation: string, sentence: string) => void;
}) {
  const { palette } = useTheme();
  const copy = useCopy();
  const locale = getLocale();
  const [copied, setCopied] = useState(false);
  const words = tokenize(lesson.story_text);
  const ranges = sentenceRanges(lesson.story_text);
  const anchors = lesson.anchors ?? [];
  const trueWords = new Set(anchors.filter((item) => item.kind === "true").map((item) => normalizeWord(item.word)));
  const falseFriends = anchors.filter((item) => item.kind === "false");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const indexRef = useRef(0);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastTap = useRef({ at: 0, sentence: "" });

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    AudioService.stopAndUnload();
    playbackRef.current = null;
    setPlaying(false);
  }

  useEffect(() => {
    const voice = narratorVoice(language);
    prefetchSpeech([lesson.story_text], language, voice);
  }, [language, lesson.story_text]);

  async function play() {
    stop();
    const generation = narrationToken();
    indexRef.current = 0;
    setIndex(0);
    setPlaying(true);
    setError(null);
    const voice = narratorVoice(language);
    const abort = new AbortController();
    abortRef.current = abort;
    const marks: Array<{ offsetMs: number }> = [];
    try {
      await new Promise<void>((resolve, reject) => {
        abort.signal.addEventListener("abort", () => resolve(), { once: true });
        const stream = startNeuralStream(
          listenRate(),
          (elapsedMs, durationMs) => {
            const next = highlightIndex(elapsedMs, durationMs, words.length, marks);
            indexRef.current = next;
            setIndex(next);
          },
          () => {
            playbackRef.current = null;
            resolve();
          },
          (message) => {
            playbackRef.current = null;
            reject(new Error(message));
          },
        );
        playbackRef.current = stream;
        void speakStoryStream(
          lesson.story_text,
          language,
          voice,
          {
            onAudio: (bytes) => stream.push(bytes),
            onWord: (word) => {
              marks.push(word);
            },
            onDone: () => stream.end(),
          },
          abort.signal,
        ).catch(reject);
      });
      if (abort.signal.aborted || narrationToken() !== generation) {
        return;
      }
      indexRef.current = words.length;
      setIndex(words.length);
      setPlaying(false);
    } catch {
      if (!abort.signal.aborted && narrationToken() === generation) {
        setPlaying(false);
        setError(copy.neuralVoiceFailed);
      }
    } finally {
      if (abortRef.current === abort) {
        abortRef.current = null;
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
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">{copy.reading}</Text>
      <Text className="font-displayItalic mt-2 text-headline text-ink">{lesson.title}</Text>
      {trueWords.size > 0 ? (
        <Text className="mt-3 text-base leading-7 text-muted">{copy.knownWords}</Text>
      ) : null}
      <Text className="mt-3 text-base leading-7 text-muted">{copy.wordTapHint}</Text>
      <View className="mt-8 border-t border-ink pt-6">
      <View className="flex-row flex-wrap">
        {words.map((token, wordIndex) => {
          const known = Boolean(findVocabulary(lesson.vocabulary, token));
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
              className="mb-1 mr-1 min-h-12 justify-center rounded-lg px-1.5"
              style={{ backgroundColor: current ? palette.primaryContainer : "transparent" }}
            >
              <Text className={`text-xl leading-9 ${current || known || cognate ? "font-semibold text-ink" : "text-ink"} ${known || cognate ? "underline decoration-ember" : ""}`}>
                {token}
              </Text>
            </Pressable>
          );
        })}
      </View>
      </View>
      {falseFriends.length > 0 ? (
        <View className="mt-4">
          <Text className="font-label text-sm text-ink">{copy.falseFriends}</Text>
          {falseFriends.slice(0, 6).map((item) => (
            <Text key={item.word} className="mt-2 text-base leading-6 text-muted">
              {locale === "en"
                ? `${item.word} looks like ${item.familiar}, but it means ${item.gloss}.`
                : `${item.word} parece ${item.familiar}, mas quer dizer ${item.gloss}.`}
            </Text>
          ))}
        </View>
      ) : null}
      <ListenPace />
      <View className="mt-5 flex-row flex-wrap gap-2">
        <ChunkButton label={playing ? copy.pauseAudio : copy.listenStory} onPress={() => (playing ? stop() : void play())} tone="ink" />
        <ChunkButton label={copy.seeTranslation} onPress={() => setPassageOpen(true)} tone="ghost" />
        <ChunkButton
          label={copied ? copy.storyCopied : copy.copyStory}
          onPress={() => {
            void writeClipboard(lesson.story_text).then((ok) => {
              if (ok) {
                setCopied(true);
              }
            });
          }}
          tone="ghost"
        />
      </View>
      <VoicePicker language={language} onPreview={stop} />
      {error ? (
        <Text accessibilityRole="alert" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
      <GlassSheet visible={passageOpen} onClose={() => setPassageOpen(false)} label={copy.translationOfStory}>
        <Text className="mt-3 text-lg leading-8 text-ink">{lesson.translation}</Text>
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
