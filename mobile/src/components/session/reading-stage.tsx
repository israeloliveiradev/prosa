import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Speech from "expo-speech";
import { speakStory } from "@/lib/api";
import { findVocabulary, normalizeWord, sentenceAt, speechLocale, tokenize } from "@/lib/lesson";
import { narratorVoice } from "@/lib/narrator";
import type { LessonPayload } from "@/lib/types";
import { highlightIndex, narrationToken, startNeuralPlayback, type PlaybackHandle } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";
import { GlassSheet } from "@/components/session/glass-sheet";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { VoicePicker } from "@/components/session/voice-picker";

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
  const anchors = lesson.anchors ?? [];
  const trueWords = new Set(anchors.filter((item) => item.kind === "true").map((item) => normalizeWord(item.word)));
  const falseFriends = anchors.filter((item) => item.kind === "false");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState<string | null>(null);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const lastTap = useRef({ at: 0, sentence: "" });

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stop() {
    AudioService.stopAndUnload();
    Speech.stop();
    playbackRef.current = null;
    clearTimer();
    setPlaying(false);
  }

  function playWithDeviceVoice(start: number) {
    const slice = words.slice(start);
    timerRef.current = setInterval(() => {
      const next = Math.min(words.length - 1, indexRef.current + 1);
      indexRef.current = next;
      setIndex(next);
      if (next >= words.length - 1) {
        clearTimer();
      }
    }, 320);
    Speech.speak(slice.join(" "), {
      language: speechLocale(language),
      rate: 0.95,
      onDone: () => {
        clearTimer();
        indexRef.current = words.length;
        setIndex(words.length);
        setPlaying(false);
      },
      onStopped: () => {
        clearTimer();
        setPlaying(false);
      },
    });
  }

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
    try {
      const spoken = await speakStory(words.slice(start).join(" "), language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      playbackRef.current = startNeuralPlayback(spoken.audioUrl, 1, (elapsedMs, durationMs) => {
        const local = highlightIndex(elapsedMs, durationMs, words.length - start, spoken.words);
        const next = Math.min(words.length - 1, start + local);
        indexRef.current = next;
        setIndex(next);
      }, () => {
        indexRef.current = words.length;
        setIndex(words.length);
        setPlaying(false);
        playbackRef.current = null;
      });
    } catch {
      if (narrationToken() !== generation) {
        return;
      }
      playWithDeviceVoice(start);
    }
  }

  useEffect(() => {
    if (!active && !AudioService.hasSequence()) {
      stop();
    }
    return () => {
      if (!AudioService.hasSequence()) {
        AudioService.stopAndUnload();
        Speech.stop();
      }
      clearTimer();
    };
  }, [active]);

  return (
    <View>
      <Text className="font-label text-xs uppercase tracking-widest text-ember">Leitura</Text>
      <Text className="font-displayItalic mt-2 text-headline text-ink">{lesson.title}</Text>
      {trueWords.size > 0 ? (
        <Text className="mt-3 text-base leading-7 text-muted">As palavras sublinhadas parecem as que você já conhece.</Text>
      ) : null}
      <View className="mt-6 rounded-[28px] border border-line bg-card px-5 py-6">
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
      <Pressable accessibilityRole="button" onPress={() => setPassageOpen(true)} className="mt-4 min-h-12 justify-center">
        <Text className="font-label text-base text-ember">Ver a tradução</Text>
      </Pressable>
      <VoicePicker language={language} onPreview={stop} />
      <Pressable
        accessibilityRole="button"
        onPress={() => (playing ? stop() : play())}
        className="mt-6 min-h-12 items-center justify-center self-start rounded-full bg-ink px-6"
      >
        <Text className="text-base font-semibold text-card">{playing ? "Pausar áudio" : "Ouvir a história"}</Text>
      </Pressable>
      <GlassSheet visible={passageOpen} onClose={() => setPassageOpen(false)} label="Tradução da história">
        <Text className="mt-3 text-lg leading-8 text-ink">{lesson.translation}</Text>
      </GlassSheet>
      <GrammarSheet sentence={grammarSentence} language={language} onClose={() => setGrammarSentence(null)} />
    </View>
  );
}
