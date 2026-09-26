import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { VoicePicker } from "@/components/session/voice-picker";
import { fetchAdaptedNews, speakStory, type AdaptedNews } from "@/lib/api";
import { bytesToBase64 } from "@/lib/audio-cache";
import { tap } from "@/lib/haptics";
import { cardsFromLesson, findVocabulary, normalizeWord, sentenceAt, tokenize } from "@/lib/lesson";
import { narratorVoice } from "@/lib/narrator";
import { isoDate, persistDeck, rememberLesson, useProgress } from "@/lib/progress";
import { kv } from "@/lib/kv";
import { useSession } from "@/lib/session";
import { highlightIndex, narrationToken, startNeuralPlayback } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

type NewsLibrary = {
  date: string;
  target_lang: string;
  stories: Record<string, AdaptedNews>;
};

const GENERAL = "Geral";
const BANDS = [
  { id: "A2", label: "Simples" },
  { id: "B1", label: "Médio" },
  { id: "C1", label: "Avançado" },
] as const;

type NewsBand = (typeof BANDS)[number]["id"];

function bandFor(level: string): NewsBand {
  if (level === "C1" || level === "C2") {
    return "C1";
  }
  if (level === "B1" || level === "B2") {
    return "B1";
  }
  return "A2";
}

function feedKey(interest: string, index: number, level: string): string {
  return `${interest}|${index}|${level}`;
}

function storageKey(userId: string): string {
  return `prosa.news.v1.${userId}`;
}

function readLibrary(userId: string, targetLang: string): NewsLibrary {
  const empty = { date: isoDate(), target_lang: targetLang, stories: {} };
  const raw = kv.getString(storageKey(userId));
  if (!raw) {
    return empty;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<NewsLibrary>;
    if (parsed.date !== isoDate() || parsed.target_lang !== targetLang || !parsed.stories || typeof parsed.stories !== "object") {
      return empty;
    }
    return { date: parsed.date, target_lang: parsed.target_lang, stories: parsed.stories };
  } catch {
    return empty;
  }
}

function newsMessage(message: string): string {
  if (message.includes("News feed")) {
    return "A notícia não chegou agora.";
  }
  if (message.includes("Model request failed") || message.includes("não voltou")) {
    return "A adaptação não saiu.";
  }
  return message;
}

export function DailyNews() {
  const session = useSession();
  const progress = useProgress();
  const { palette } = useTheme();
  const [library, setLibrary] = useState<NewsLibrary | null>(null);
  const [interest, setInterest] = useState(GENERAL);
  const [pending, setPending] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [spoken, setSpoken] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [passageOpen, setPassageOpen] = useState(false);
  const [grammarSentence, setGrammarSentence] = useState<string | null>(null);
  const [band, setBand] = useState<NewsBand>("A2");
  const [error, setError] = useState<string | null>(null);
  const lastTap = useRef({ at: 0, sentence: "" });
  const userId = session?.user.id;
  const targetLang = session?.user.target_lang;
  const interests = session?.user.interests?.filter((item) => item.trim().length > 0) ?? [];
  const choices = interests.length > 0 ? interests : [GENERAL];
  const choiceKey = choices.join("|");

  useEffect(() => {
    if (!userId || !targetLang) {
      setLibrary(null);
      return;
    }
    const stored = readLibrary(userId, targetLang);
    const names = choiceKey.split("|").filter((item) => item.length > 0);
    setLibrary(stored);
    setInterest((current) => (names.includes(current) ? current : names[0] ?? GENERAL));
    return () => {
      AudioService.stopAndUnload();
    };
  }, [userId, targetLang, choiceKey]);

  const accountLevel = session?.user.level ?? "A2";
  useEffect(() => {
    setBand(bandFor(accountLevel));
  }, [accountLevel]);

  if (!session || !userId || !targetLang || !library) {
    return null;
  }

  const token = session.token;
  const plan = session.user.plan;
  const readerId = userId;
  const language = targetLang;
  const shelf = library;
  function storyAt(index: number): AdaptedNews | null {
    const keyed = shelf.stories[feedKey(interest, index, band)];
    if (keyed && Array.isArray(keyed.vocabulary)) {
      return keyed;
    }
    if (index === 0 && band === accountLevel) {
      const legacy = shelf.stories[interest];
      if (legacy && Array.isArray(legacy.vocabulary)) {
        return legacy;
      }
    }
    return null;
  }
  const feed = [0, 1, 2]
    .map((index) => ({ index, key: feedKey(interest, index, band), story: storyAt(index) }))
    .filter((item): item is { index: number; key: string; story: AdaptedNews } => item.story !== null);
  const nextIndex = [0, 1, 2].find((index) => storyAt(index) === null);
  const pickedEntry = picked
    ? findVocabulary(
        feed.flatMap((item) => item.story.vocabulary ?? []),
        picked,
      )
    : undefined;

  function choose(next: string) {
    if (next === interest) {
      return;
    }
    AudioService.stopAndUnload();
    setPlayingKey(null);
    setSpoken(0);
    setPicked(null);
    setPassageOpen(false);
    setError(null);
    setInterest(next);
    void tap("light");
  }

  function selectBand(next: NewsBand) {
    if (next === band) {
      return;
    }
    AudioService.stopAndUnload();
    setPlayingKey(null);
    setSpoken(0);
    setError(null);
    setBand(next);
    void tap("light");
  }

  async function load(index: number) {
    void tap("light");
    setPending(true);
    setError(null);
    try {
      const voice = narratorVoice(language);
      const news = await fetchAdaptedNews(token, interest === GENERAL ? undefined : interest, voice, index, band);
      news.voiceId = voice;
      const next = { ...shelf, stories: { ...shelf.stories, [feedKey(interest, index, band)]: news } };
      kv.set(storageKey(readerId), JSON.stringify(next));
      setLibrary(next);
    } catch (caught) {
      setError(newsMessage(caught instanceof Error ? caught.message : "A notícia não chegou agora."));
    } finally {
      setPending(false);
    }
  }

  function keepWord(entry: { word: string; translation: string; example_sentence: string }) {
    const saved = progress.cards.some((card) => card.front_phrase.toLowerCase() === entry.word.toLowerCase());
    if (saved) {
      return;
    }
    persistDeck([
      {
        id: `news-${normalizeWord(entry.word)}`,
        front_phrase: entry.word,
        back_translation: entry.translation,
        context_sentence: entry.example_sentence,
        repetition_count: 0,
        interval_days: 0,
        ease_factor: 2.5,
        status: "learning",
      },
    ]);
    void tap("success");
  }

  function study(story: AdaptedNews) {
    const today = isoDate();
    const topic = story.title.trim().slice(0, 120) || "notícia";
    const pro = progress.pro || plan === "pro";
    if (!pro && progress.lessonDate === today && progress.topic && progress.topic !== topic) {
      router.push("/paywall");
      return;
    }
    AudioService.stopAndUnload();
    setPlayingKey(null);
    setSpoken(0);
    const lesson = {
      title: story.title,
      story_text: story.story_text,
      translation: story.translation,
      vocabulary: story.vocabulary ?? [],
      journal_prompt: story.journal_prompt || "O que esta notícia muda no seu dia?",
    };
    rememberLesson(today, topic, lesson, cardsFromLesson(lesson), {
      targetLang: targetLang ?? "en",
      throughLang: session?.user.native_lang ?? "pt",
      level: accountLevel,
    });
    void tap("medium");
    router.push({ pathname: "/daily", params: { topic } });
  }

  async function listen(story: AdaptedNews, key: string) {
    if (playingKey === key) {
      AudioService.stopAndUnload();
      setPlayingKey(null);
      setSpoken(0);
      return;
    }
    AudioService.stopAndUnload();
    const generation = narrationToken();
    const tokens = tokenize(story.story_text);
    const voice = narratorVoice(language);
    setSpoken(0);
    setPlayingKey(key);
    try {
      let audioUrl = story.audioUrl;
      let marks = story.words ?? [];
      if (story.voiceId !== voice) {
        const spoken = await speakStory(story.story_text, language, voice);
        if (narrationToken() !== generation) {
          return;
        }
        audioUrl = spoken.audioUrl;
        marks = spoken.words;
        const saved = { ...story, audioUrl, words: marks, voiceId: voice };
        const next = { ...shelf, stories: { ...shelf.stories, [key]: saved } };
        kv.set(storageKey(readerId), JSON.stringify(next));
        setLibrary(next);
      } else if (!audioUrl.startsWith("data:")) {
        const file = await fetch(audioUrl);
        if (file.ok) {
          audioUrl = `data:audio/mpeg;base64,${bytesToBase64(new Uint8Array(await file.arrayBuffer()))}`;
          const saved = { ...story, audioUrl, voiceId: voice };
          const next = { ...shelf, stories: { ...shelf.stories, [key]: saved } };
          kv.set(storageKey(readerId), JSON.stringify(next));
          setLibrary(next);
        }
      }
      if (narrationToken() !== generation) {
        return;
      }
      startNeuralPlayback(audioUrl, 1, (elapsedMs, durationMs) => {
        setSpoken(highlightIndex(elapsedMs, durationMs, tokens.length, marks));
      }, () => {
        setPlayingKey(null);
        setSpoken(0);
      });
    } catch {
      if (narrationToken() === generation) {
        setPlayingKey(null);
        setSpoken(0);
        setError("O áudio da notícia não abriu.");
      }
    }
  }

  return (
    <View>
      <Text className="font-label text-sm text-muted">Notícia</Text>
      {choices.length > 1 || choices[0] !== GENERAL ? (
        <View accessibilityRole="radiogroup" className="mt-3 flex-row flex-wrap gap-2">
          {choices.map((item) => {
            const selected = item === interest;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={item}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => choose(item)}
                className={`min-h-12 items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
              >
                <Text numberOfLines={1} className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <VoicePicker
        language={language}
        onPreview={() => {
          setPlayingKey(null);
          setSpoken(0);
        }}
      />
      <View accessibilityRole="radiogroup" accessibilityLabel="Nível da notícia" className="mt-4 flex-row flex-wrap gap-2">
        {BANDS.map((item) => {
          const selected = item.id === band;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={item.label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => selectBand(item.id)}
              className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
            >
              <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {feed.map(({ story, key }) => {
        const words = story.vocabulary ?? [];
        const playing = playingKey === key;
        return (
          <View key={key} className="mt-4 rounded-[28px] border border-line bg-card px-5 py-5" style={{ boxShadow: "0 10px 28px rgba(0,0,0,0.07)" }}>
            <Text className="font-display text-2xl text-ink">{story.title}</Text>
            <Text className="mt-2 text-sm text-muted">{words.length} {words.length === 1 ? "palavra nova" : "palavras novas"}</Text>
            <View className="mt-4 flex-row flex-wrap">
              {tokenize(story.story_text).map((token, wordIndex) => {
                const known = Boolean(findVocabulary(words, token));
                const current = playing && wordIndex === spoken;
                return (
                  <Pressable
                    key={`${key}-${token}-${wordIndex}`}
                    accessibilityRole="button"
                    accessibilityLabel={current ? `${token}, palavra atual` : known ? `${token}, palavra do vocabulário` : token}
                    accessibilityHint="Toque duas vezes para desmontar a frase."
                    onPress={() => {
                      const sentence = sentenceAt(story.story_text, wordIndex);
                      const now = Date.now();
                      if (lastTap.current.sentence === sentence && now - lastTap.current.at < 320) {
                        lastTap.current = { at: 0, sentence: "" };
                        AudioService.stopAndUnload();
                        setPlayingKey(null);
                        setSpoken(0);
                        setGrammarSentence(sentence);
                        return;
                      }
                      lastTap.current = { at: now, sentence };
                      setPicked(token);
                    }}
                    className="mb-1 mr-1 min-h-12 justify-center rounded-lg px-1"
                    style={{ backgroundColor: current ? palette.primaryContainer : "transparent" }}
                  >
                    <Text className={`text-lg leading-8 text-ink ${known ? "underline decoration-ember" : ""}`}>{token}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {words.map((entry) => {
                const saved = progress.cards.some((card) => card.front_phrase.toLowerCase() === entry.word.toLowerCase());
                return (
                  <Pressable
                    key={entry.word}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: saved }}
                    disabled={saved}
                    onPress={() => keepWord(entry)}
                    className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-4 ${saved ? "bg-line" : "bg-ember"}`}
                  >
                    <Text className={`font-label text-sm ${saved ? "text-ink" : "text-onEmber"}`}>{saved ? `${entry.word} no deck` : `Guardar ${entry.word}`}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-5 flex-row flex-wrap gap-2">
              <Pressable accessibilityRole="button" onPress={() => void listen(story, key)} className="min-h-12 items-center justify-center rounded-full bg-ink px-5">
                <Text className="font-label text-base text-card">{playing ? "Pausar áudio" : "Ouvir a notícia"}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setPassageOpen(true)} className="min-h-12 items-center justify-center rounded-full border border-line px-5">
                <Text className="font-label text-base text-ink">Ver a tradução</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => study(story)} className="min-h-12 items-center justify-center rounded-full bg-ember px-5">
                <Text className="font-label text-base text-onEmber">Estudar esta notícia</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="link" accessibilityLabel={story.source_title} onPress={() => void Linking.openURL(story.source_url)} className="mt-4 min-h-12 justify-center">
              <Text className="text-sm text-muted">{story.source_title}</Text>
            </Pressable>
          </View>
        );
      })}
      {nextIndex !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: pending, disabled: pending }}
          disabled={pending}
          onPress={() => void load(nextIndex)}
          className="mt-3 min-h-14 cursor-pointer justify-center"
        >
          {pending ? <ActivityIndicator color={palette.primary} /> : <Text className="font-label text-base text-ink">{feed.length === 0 ? `Ler a notícia de ${interest === GENERAL ? "hoje" : interest}` : "Próxima notícia"}</Text>}
          <Text className="text-sm text-muted">{feed.length === 0 ? "Uma matéria do dia, no nível escolhido." : "A próxima matéria do mesmo tema."}</Text>
        </Pressable>
      ) : null}
      <GlassSheet visible={passageOpen} onClose={() => setPassageOpen(false)} label="Tradução da notícia">
        <Text className="mt-3 text-lg leading-8 text-ink">{feed.map((item) => item.story.translation).join("\n\n")}</Text>
      </GlassSheet>
      <GlassSheet visible={picked !== null} onClose={() => setPicked(null)} label="Tradução">
        <Text className="font-display mt-2 text-3xl text-ink">{pickedEntry?.word ?? picked}</Text>
        {pickedEntry ? (
          <>
            <Text className="mt-3 text-xl text-ink">{pickedEntry.translation}</Text>
            <Text className="mt-3 text-base leading-6 text-muted">{pickedEntry.example_sentence}</Text>
          </>
        ) : (
          <Text className="mt-3 text-base leading-6 text-muted">Esta palavra não entrou no vocabulário de hoje.</Text>
        )}
      </GlassSheet>
      <GrammarSheet sentence={grammarSentence} language={language} onClose={() => setGrammarSentence(null)} />
      {error ? <Text className="mt-2 text-base text-roseInk">{error}</Text> : null}
    </View>
  );
}
