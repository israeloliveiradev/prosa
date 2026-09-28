import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { prefetchSpeech, speakStory } from "@/lib/api";
import { findVocabulary, normalizeWord, sentenceAt, tokenize } from "@/lib/lesson";
import { narratorVoice } from "@/lib/narrator";
import type { LessonPayload } from "@/lib/types";
import { highlightIndex, narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { sentenceRanges } from "@/lib/hands-free";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";
import { GlassSheet } from "@/components/session/glass-sheet";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { VoicePicker } from "@/components/session/voice-picker";
import { ChunkButton } from "@/components/shell/chunk-button";

export function ReadingStage({
  lesson,
  language,
  active,
  onOpenWord,
}: {
  lesson: LessonPayload;
  language: string;
  active: boolean;
  onOpenWord: (token: string) => void;
}) {
  const { palette } = useTheme();
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
  const lastTap = useRef({ at: 0, sentence: "" });

  function stop() {
    AudioService.stopAndUnload();
    playbackRef.current = null;
    setPlaying(false);
  }

  useEffect(() => {
    const voice = narratorVoice(language);
    prefetchSpeech(ranges.map((item) => item.text), language, voice);
  }, [language, lesson.story_text]);

  async function play() {
    const start = indexRef.current >= words.length ? 0 : indexRef.current;
    if (start === 0) {
      indexRef.current = 0;
      setIndex(0);
    }
    stop();
    const generation = narrationToken();
    if (start === 0) {
      indexRef.current = 0;
      setIndex(0);
    }
    setPlaying(true);
    setError(null);
    const from = Math.max(0, ranges.findIndex((item) => start < item.end));
    const voice = narratorVoice(language);
    prefetchSpeech(ranges.slice(from + 1).map((item) => item.text), language, voice);
    try {
      for (let cursor = from; cursor < ranges.length; cursor += 1) {
        const range = ranges[cursor];
        if (!range || narrationToken() !== generation) {
          return;
        }
        const spoken = await speakStory(range.text, language, voice);
        if (narrationToken() !== generation) {
          return;
        }
        await new Promise<void>((resolve, reject) => {
          playbackRef.current = startNeuralPlayback(
            spoken.audioUrl,
            1,
            (elapsedMs, durationMs) => {
              const local = highlightIndex(elapsedMs, durationMs, range.end - range.start, spoken.words);
              const next = Math.min(words.length - 1, range.start + local);
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
        });
      }
      if (narrationToken() !== generation) {
        return;
      }
      indexRef.current = words.length;
      setIndex(words.length);
      setPlaying(false);
    } catch {
      if (narrationToken() === generation) {
        setPlaying(false);
        setError("A voz neural não abriu. Tente de novo.");
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
      <Text className="font-label text-xs uppercase tracking-widest text-ember">Leitura</Text>
      <Text className="font-displayItalic mt-2 text-headline text-ink">{lesson.title}</Text>
      {trueWords.size > 0 ? (
        <Text className="mt-3 text-base leading-7 text-muted">As palavras sublinhadas parecem as que você já conhece.</Text>
      ) : null}
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
              accessibilityLabel={cognate ? `${token}, cognato` : known ? `${token}, palavra do vocabulário` : token}
              accessibilityHint="Toque duas vezes para desmontar a frase."
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
                onOpenWord(token);
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
          <Text className="font-label text-sm text-ink">Falsos amigos</Text>
          {falseFriends.slice(0, 6).map((item) => (
            <Text key={item.word} className="mt-2 text-base leading-6 text-muted">
              {item.word} parece {item.familiar}, mas quer dizer {item.gloss}.
            </Text>
          ))}
        </View>
      ) : null}
      <View className="mt-5 flex-row flex-wrap gap-2">
        <ChunkButton label={playing ? "Pausar áudio" : "Ouvir a história"} onPress={() => (playing ? stop() : void play())} tone="ink" />
        <ChunkButton label="Ver a tradução" onPress={() => setPassageOpen(true)} tone="ghost" />
      </View>
      <VoicePicker language={language} onPreview={stop} />
      {error ? (
        <Text accessibilityRole="alert" className="mt-3 text-base text-roseInk">
          {error}
        </Text>
      ) : null}
      <GlassSheet visible={passageOpen} onClose={() => setPassageOpen(false)} label="Tradução da história">
        <Text className="mt-3 text-lg leading-8 text-ink">{lesson.translation}</Text>
      </GlassSheet>
      <GrammarSheet sentence={grammarSentence} language={language} onClose={() => setGrammarSentence(null)} />
    </View>
  );
}
