import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { GlassSheet } from "@/components/session/glass-sheet";
import { GrammarSheet } from "@/components/session/grammar-sheet";
import { ListenPace } from "@/components/session/listen-pace";
import { NewsDictogloss } from "@/components/home/news-dictogloss";
import { classifyFailure, fill, type FailureKind } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { fetchAdaptedNews, pushNewCard, speakStory, type AdaptedNews } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import {
  READING,
  defaultNewsLevel,
  newsBandsFor,
  newsThemeList,
  themeLabel,
  type NewsLevel,
  type ReadingCopy,
} from "@/lib/copy/reading";
import { tap } from "@/lib/haptics";
import { copy as appCopy, LOCALE_BCP47, useLocale, type DisplayLocale } from "@/lib/i18n";
import { kv } from "@/lib/kv";
import { cardsFromLesson, findVocabulary, normalizeWord, sentenceAt, tokenize } from "@/lib/lesson";
import { listenRate } from "@/lib/listen-rate";
import { narratorVoice } from "@/lib/narrator";
import { isoDate, persistDeck, rememberLesson, useProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { cardsForThrough, spanishGlossLeak } from "@/lib/through-lang";
import { highlightIndex, narrationToken } from "@/lib/voice";
import { AudioService } from "@/services/audio/AudioService";

type NewsLibrary = {
  date: string;
  target_lang: string;
  native_lang: string;
  stories: Record<string, AdaptedNews>;
};

const INK = "#111C2D";
const MUTED = "#64748B";

function feedKey(interest: string, index: number, level: string): string {
  return `${interest}|${index}|${level}`;
}

function storageKey(userId: string): string {
  return `prosa.news.v4.${userId}`;
}

function emptyLibrary(targetLang: string, nativeLang: string): NewsLibrary {
  return { date: isoDate(), target_lang: targetLang, native_lang: nativeLang, stories: {} };
}

/** Biblioteca do dia guardada no aparelho (sobrevive ao F5); de outro dia ou outro par, começa vazia. */
function readLibrary(userId: string, targetLang: string, nativeLang: string): NewsLibrary {
  const raw = kv.getString(storageKey(userId));
  if (!raw) {
    return emptyLibrary(targetLang, nativeLang);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<NewsLibrary>;
    if (
      parsed.date !== isoDate() ||
      parsed.target_lang !== targetLang ||
      parsed.native_lang !== nativeLang ||
      !parsed.stories ||
      typeof parsed.stories !== "object"
    ) {
      return emptyLibrary(targetLang, nativeLang);
    }
    return { date: parsed.date, target_lang: parsed.target_lang, native_lang: parsed.native_lang, stories: parsed.stories };
  } catch {
    return emptyLibrary(targetLang, nativeLang);
  }
}

function saveLibrary(userId: string, library: NewsLibrary): void {
  kv.set(storageKey(userId), JSON.stringify(library));
}

function formatPublished(value: string | undefined, locale: DisplayLocale): string {
  const at = value ? Date.parse(value) : Number.NaN;
  const date = Number.isNaN(at) ? new Date() : new Date(at);
  try {
    return date.toLocaleDateString(LOCALE_BCP47[locale], { day: "numeric", month: "long" });
  } catch {
    return isoDate();
  }
}

function failureOf(caught: unknown): FailureKind {
  const ui = appCopy();
  return classifyFailure(caught, [ui.modelBusy, ui.lessonFailed, ui.generationOff, ui.adaptFailed], [ui.apiDown]);
}

function failureText(kind: FailureKind, t: ReadingCopy): string {
  if (kind === "network") {
    return t.errorNetwork;
  }
  if (kind === "feed") {
    return t.errorFeed;
  }
  if (kind === "ai") {
    return t.errorAi;
  }
  return t.errorOther;
}

function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 ${
        selected ? "bg-[#0D9488]" : "border-[#E2E8F0] bg-white"
      }`}
      style={{ borderColor: selected ? "#0F766E" : "#E2E8F0", boxShadow: selected ? "0 3px 0 #0F766E" : "0 3px 0 #E2E8F0" } as ViewStyle}
    >
      <Text numberOfLines={1} className={`text-sm font-bold ${selected ? "text-white" : "text-[#111C2D]"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Leitura do dia: notícias reais (POST /api/v1/news/fetch-adapted) reescritas no nível do aluno,
 * com tradução no idioma de apoio, vocabulário, voz no aparelho, toque na palavra,
 * "estudar esta matéria" (vira a lição de hoje) e o ditado de ouvido.
 */
export function DailyNews() {
  const session = useSession();
  const progress = useProgress();
  const locale = useLocale();
  const t = useAreaCopy(READING);
  const [library, setLibrary] = useState<NewsLibrary | null>(null);
  const [interest, setInterest] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [pending, setPending] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [voiceLoadingKey, setVoiceLoadingKey] = useState<string | null>(null);
  const [spoken, setSpoken] = useState(0);
  const [picked, setPicked] = useState<{ token: string; key: string } | null>(null);
  const [translationKey, setTranslationKey] = useState<string | null>(null);
  const [grammarSentence, setGrammarSentence] = useState<string | null>(null);
  const [band, setBand] = useState<NewsLevel>("A2");
  const [error, setError] = useState<FailureKind | null>(null);
  const [audioErrorKey, setAudioErrorKey] = useState<string | null>(null);
  const [earKey, setEarKey] = useState<string | null>(null);
  const lastTap = useRef({ at: 0, sentence: "" });
  const opened = useRef("");
  const userId = session?.user?.id;
  const targetLang = session?.user?.target_lang;
  const nativeLang = session?.user?.native_lang ?? "pt";
  const accountLevel = session?.user?.level ?? "A2";
  const themes = newsThemeList(session?.user?.interests);
  const themeKey = themes.join("|");
  const chips = interest && !themes.includes(interest) ? [interest, ...themes] : themes;

  useEffect(() => {
    if (!userId || !targetLang) {
      setLibrary(null);
      return;
    }
    setLibrary(readLibrary(userId, targetLang, nativeLang));
    setInterest((current) => (current.trim().length > 1 ? current : (themeKey.split("|")[0] ?? "")));
    return () => {
      AudioService.stopAndUnload();
    };
  }, [userId, targetLang, nativeLang, themeKey]);

  useEffect(() => {
    setBand(defaultNewsLevel(accountLevel));
  }, [accountLevel]);

  useEffect(() => {
    if (!session || !library || !userId || !targetLang || !interest) {
      return;
    }
    const key = `${userId}:${isoDate()}:${interest}:${band}:${targetLang}:${nativeLang}`;
    const existing = library.stories[feedKey(interest, 0, band)];
    if (existing && Array.isArray(existing.vocabulary)) {
      opened.current = key;
      setPending(false);
      return;
    }
    if (opened.current === key) {
      return;
    }
    opened.current = key;
    setPending(true);
    setError(null);
    // Sem `voice`: o campo do servidor só aceita vozes neurais dele; a narração aqui toca no aparelho (speakStory).
    // A resposta vale enquanto este pedido (tema, nível, par de idiomas) continuar sendo o atual; re-renderizações
    // da sessão não cancelam o pedido.
    void fetchAdaptedNews(session.token, interest, undefined, 0, band)
      .then((news) => {
        setLibrary((current) => {
          const base = current ?? emptyLibrary(targetLang, nativeLang);
          const next = { ...base, date: isoDate(), stories: { ...base.stories, [feedKey(interest, 0, band)]: news } };
          saveLibrary(userId, next);
          return next;
        });
      })
      .catch((caught: unknown) => {
        if (opened.current === key) {
          setError(failureOf(caught));
        }
      })
      .finally(() => {
        if (opened.current === key) {
          setPending(false);
        }
      });
  }, [band, interest, library, nativeLang, session, targetLang, userId]);

  if (!session || !userId || !targetLang || !library) {
    return null;
  }

  const token = session.token;
  const plan = session.user.plan;
  const readerId = userId;
  const language = targetLang;
  const shelf = library;
  const bands = newsBandsFor(accountLevel);

  function storyAt(index: number): AdaptedNews | null {
    const keyed = shelf.stories[feedKey(interest, index, band)];
    return keyed && Array.isArray(keyed.vocabulary) ? keyed : null;
  }

  const feed = [0, 1, 2]
    .map((index) => ({ index, key: feedKey(interest, index, band), story: storyAt(index) }))
    .filter((item): item is { index: number; key: string; story: AdaptedNews } => item.story !== null);
  const nextIndex = [0, 1, 2].find((index) => storyAt(index) === null);
  const pickedStory = picked ? feed.find((item) => item.key === picked.key)?.story : undefined;
  const pickedEntry = picked && pickedStory ? findVocabulary(pickedStory.vocabulary ?? [], picked.token) : undefined;
  const translationStory = translationKey ? feed.find((item) => item.key === translationKey)?.story : undefined;

  function stopAudio() {
    AudioService.stopAndUnload();
    setPlayingKey(null);
    setVoiceLoadingKey(null);
    setSpoken(0);
  }

  function choose(next: string) {
    if (next === interest) {
      return;
    }
    stopAudio();
    setPicked(null);
    setEarKey(null);
    setError(null);
    setInterest(next);
    void tap("light");
  }

  function selectBand(next: NewsLevel) {
    if (next === band) {
      return;
    }
    stopAudio();
    setEarKey(null);
    setError(null);
    setBand(next);
    void tap("light");
  }

  function retry() {
    if (feed.length > 0 && nextIndex !== undefined) {
      void load(nextIndex);
      return;
    }
    opened.current = "";
    setError(null);
    setLibrary((current) => (current ? { ...current } : current));
  }

  function refresh() {
    stopAudio();
    setEarKey(null);
    opened.current = "";
    const next = { ...shelf, date: isoDate(), stories: { ...shelf.stories } };
    for (const index of [0, 1, 2]) {
      delete next.stories[feedKey(interest, index, band)];
    }
    saveLibrary(readerId, next);
    setLibrary(next);
  }

  async function load(index: number) {
    void tap("light");
    setPending(true);
    setError(null);
    try {
      const news = await fetchAdaptedNews(token, interest, undefined, index, band);
      const next = { ...shelf, date: isoDate(), stories: { ...shelf.stories, [feedKey(interest, index, band)]: news } };
      saveLibrary(readerId, next);
      setLibrary(next);
    } catch (caught) {
      setError(failureOf(caught));
    } finally {
      setPending(false);
    }
  }

  function keepWord(entry: { word: string; translation: string; example_sentence: string }) {
    const saved = progress.cards.some((card) => card.front_phrase.toLowerCase() === entry.word.toLowerCase());
    if (saved || (nativeLang === "pt" && spanishGlossLeak(entry.translation))) {
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
    pushNewCard({ front_phrase: entry.word, back_translation: entry.translation, context_sentence: entry.example_sentence });
    void tap("success");
  }

  function study(story: AdaptedNews) {
    const today = isoDate();
    const topic = story.title.trim().slice(0, 120);
    const pro = progress.pro || plan === "pro";
    if (!pro && progress.lessonDate === today && progress.topic && progress.topic !== topic) {
      router.push("/paywall");
      return;
    }
    stopAudio();
    const lesson = {
      title: story.title,
      story_text: story.story_text,
      translation: story.translation,
      vocabulary: story.vocabulary ?? [],
      journal_prompt: story.journal_prompt,
    };
    rememberLesson(today, topic, lesson, cardsForThrough(cardsFromLesson(lesson), nativeLang), {
      targetLang: language,
      throughLang: nativeLang,
      level: accountLevel,
    });
    void tap("medium");
    router.push({ pathname: "/daily", params: { topic } });
  }

  async function listen(story: AdaptedNews, key: string) {
    if (playingKey === key || voiceLoadingKey === key) {
      stopAudio();
      return;
    }
    AudioService.stopAndUnload();
    const generation = narrationToken();
    const tokens = tokenize(story.story_text);
    setAudioErrorKey(null);
    setPlayingKey(null);
    setSpoken(0);
    setVoiceLoadingKey(key);
    try {
      const spokenStory = await speakStory(story.story_text, language, narratorVoice(language));
      if (narrationToken() !== generation) {
        return;
      }
      setVoiceLoadingKey(null);
      setPlayingKey(key);
      AudioService.play(
        spokenStory.audioUrl,
        listenRate(),
        (elapsedMs, durationMs) => {
          setSpoken(highlightIndex(elapsedMs, durationMs, tokens.length, spokenStory.words));
        },
        () => {
          setPlayingKey(null);
          setSpoken(0);
        },
        () => {
          setPlayingKey(null);
          setSpoken(0);
          setAudioErrorKey(key);
        },
      );
    } catch {
      if (narrationToken() === generation) {
        setVoiceLoadingKey(null);
        setPlayingKey(null);
        setAudioErrorKey(key);
      }
    }
  }

  function pressWord(story: AdaptedNews, key: string, word: string, wordIndex: number) {
    const sentence = sentenceAt(story.story_text, wordIndex);
    const now = Date.now();
    if (lastTap.current.sentence === sentence && now - lastTap.current.at < 320) {
      lastTap.current = { at: 0, sentence: "" };
      stopAudio();
      setPicked(null);
      setGrammarSentence(sentence);
      return;
    }
    lastTap.current = { at: now, sentence };
    setPicked({ token: word, key });
  }

  function openCustom() {
    const next = customTheme.trim().slice(0, 80);
    if (next.length < 2) {
      return;
    }
    choose(next);
  }

  return (
    <View className="gap-6">
      <TactileCard className="p-5" animateEntry={false}>
        <View>
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.themesLabel}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t.themesLabel} className="mt-3 flex-row flex-wrap gap-2">
            {chips.map((item) => (
              <Chip key={item} label={themeLabel(item, t)} selected={item === interest} onPress={() => choose(item)} />
            ))}
          </View>
          <View className="mt-5 flex-row flex-wrap items-end gap-3">
            <View className="flex-1" style={{ minWidth: 220 }}>
              <Text className="mb-2 text-sm font-semibold text-[#3D4947]">{t.customLabel}</Text>
              <TextInput
                value={customTheme}
                onChangeText={setCustomTheme}
                accessibilityLabel={t.customLabel}
                placeholder={t.customPlaceholder}
                placeholderTextColor={MUTED}
                maxLength={80}
                onSubmitEditing={openCustom}
                className="min-h-12 rounded-xl border border-[#E2E8F0] bg-[#FDFBF7] px-4 text-base text-[#111C2D]"
              />
            </View>
            <TactileButton
              label={t.customOpen}
              variant="secondary"
              disabled={customTheme.trim().length < 2 || pending}
              onPress={openCustom}
            />
          </View>
          <Text className="mt-5 text-sm font-semibold text-[#3D4947]">{t.levelLabel}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t.levelLabel} className="mt-2 flex-row flex-wrap gap-2">
            {bands.map((item) => {
              const relation = item.relation === "easier" ? t.levelEasier : item.relation === "harder" ? t.levelHarder : t.levelYours;
              return (
                <Chip
                  key={item.id}
                  label={`${item.id} · ${relation}`}
                  selected={item.id === band}
                  onPress={() => selectBand(item.id)}
                />
              );
            })}
          </View>
        </View>
      </TactileCard>

      {pending && feed.length === 0 ? (
        <TactileCard className="p-6" animateEntry={false}>
          <View>
            <Text accessibilityLiveRegion="polite" className="text-base leading-7 text-[#3D4947]">
              {t.loading}
            </Text>
          </View>
        </TactileCard>
      ) : null}

      {error ? (
        <View
          accessibilityRole="alert"
          className="gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5"
        >
          <Text className="text-base font-extrabold" style={{ color: "#9F1239" }}>
            {t.errorTitle}
          </Text>
          <Text className="text-base leading-6" style={{ color: "#9F1239" }}>
            {failureText(error, t)}
          </Text>
          <View className="self-start">
            <TactileButton label={t.retry} variant="crimson" disabled={pending} onPress={retry} />
          </View>
        </View>
      ) : null}

      {feed.map(({ story, key }) => {
        const words = story.vocabulary ?? [];
        const playing = playingKey === key;
        const voiceLoading = voiceLoadingKey === key;
        const tokens = tokenize(story.story_text);
        return (
          <TactileCard key={key} className="p-6" animateEntry={false}>
            <View>
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">
                {`${formatPublished(story.published, locale)} · ${band}`}
              </Text>
              <Text className="mt-2 font-display text-2xl font-extrabold leading-8 text-[#111C2D]">{story.title}</Text>
              {earKey === key ? (
                <NewsDictogloss
                  story={story}
                  language={language}
                  through={nativeLang}
                  level={accountLevel}
                  token={token}
                  onClose={() => setEarKey(null)}
                />
              ) : (
                <>
                  <Text className="mt-2 text-sm text-[#64748B]">
                    {words.length === 1 ? t.wordsOne : fill(t.wordsMany, { n: words.length })}
                    {"  ·  "}
                    {t.tapHint}
                  </Text>
                  <View className="mt-4 flex-row flex-wrap">
                    {tokens.map((word, wordIndex) => {
                      const known = Boolean(findVocabulary(words, word));
                      const current = playing && wordIndex === spoken;
                      return (
                        <Pressable
                          key={`${key}-${wordIndex}`}
                          accessibilityRole="button"
                          accessibilityLabel={current ? `${word}, ${t.currentWordA11y}` : known ? `${word}, ${t.vocabWordA11y}` : word}
                          accessibilityHint={t.wordHintA11y}
                          onPress={() => pressWord(story, key, word, wordIndex)}
                          className="mb-1 mr-1 cursor-pointer justify-center rounded-md"
                          style={{ minHeight: 40, paddingHorizontal: 2, backgroundColor: current ? "#CCFBF1" : "transparent" }}
                        >
                          <Text
                            className={`font-reading leading-8 text-[#111C2D] ${known ? "underline decoration-[#0D9488]" : ""}`}
                            style={{ fontSize: 19 }}
                          >
                            {word}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {words.length > 0 ? (
                    <View className="mt-4">
                      <Text className="text-sm font-semibold text-[#3D4947]">{t.vocabTitle}</Text>
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {words.map((entry) => {
                          const saved = progress.cards.some((card) => card.front_phrase.toLowerCase() === entry.word.toLowerCase());
                          return (
                            <Pressable
                              key={entry.word}
                              accessibilityRole="button"
                              accessibilityLabel={`${saved ? t.savedWord : t.saveWord}: ${entry.word}, ${entry.translation}`}
                              accessibilityState={{ disabled: saved }}
                              disabled={saved}
                              onPress={() => keepWord(entry)}
                              className={`min-h-11 cursor-pointer justify-center rounded-xl border px-3 py-1.5 ${
                                saved ? "border-[#E2E8F0] bg-[#F5F0E8]" : "border-[#E2E8F0] bg-white"
                              }`}
                              style={{ boxShadow: saved ? "none" : "0 2px 0 #E2E8F0" } as ViewStyle}
                            >
                              <Text className="text-sm font-bold text-[#111C2D]">{entry.word}</Text>
                              <Text className="text-xs text-[#64748B]">
                                {`${entry.translation} · ${saved ? t.savedWord : t.saveWord}`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                  <View className="mt-5 flex-row flex-wrap items-center gap-3">
                    <TactileButton
                      label={voiceLoading ? t.audioLoading : playing ? t.stop : t.listen}
                      variant="secondary"
                      onPress={() => void listen(story, key)}
                    />
                    <TactileButton label={t.translation} variant="secondary" onPress={() => setTranslationKey(key)} />
                    <TactileButton
                      label={t.dictoglossOpen}
                      variant="secondary"
                      onPress={() => {
                        stopAudio();
                        setEarKey(key);
                      }}
                    />
                    <TactileButton testID="news-study" label={t.study} variant="primary" onPress={() => study(story)} />
                  </View>
                  <Text className="mt-2 text-xs text-[#64748B]">{t.studyHint}</Text>
                  <ListenPace />
                  {audioErrorKey === key ? (
                    <Text accessibilityRole="alert" className="mt-3 text-sm leading-5 text-rose-700">
                      {t.audioFailed}
                    </Text>
                  ) : null}
                </>
              )}
              {story.source_depth ? (
                <View
                  testID={`news-depth-${story.source_depth}`}
                  className="mt-4 self-start rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: story.source_depth === "summary" ? "#FEF3C7" : "#E6F4F1" }}
                >
                  <Text className="text-xs font-bold" style={{ color: story.source_depth === "summary" ? "#78350F" : "#00685F" }}>
                    {story.source_depth === "summary" ? t.depthSummary : t.depthFull}
                  </Text>
                </View>
              ) : null}
              {story.source_url ? (
                <Pressable
                  testID="news-source-link"
                  accessibilityRole="link"
                  accessibilityLabel={`${t.source}: ${story.source_title}`}
                  onPress={() => void Linking.openURL(story.source_url as string)}
                  className="mt-3 min-h-11 cursor-pointer justify-center self-start"
                >
                  <Text className="text-sm text-[#64748B]">
                    {`${t.source}: `}
                    <Text className="font-semibold text-[#0F766E] underline">{story.source_title || story.source_url}</Text>
                  </Text>
                </Pressable>
              ) : (
                <Text testID="news-source-missing" className="mt-3 text-sm text-[#64748B]">
                  {story.source_title ? `${t.source}: ${story.source_title}` : t.sourceMissing}
                </Text>
              )}
            </View>
          </TactileCard>
        );
      })}

      {feed.length > 0 ? (
        <View className="gap-3">
          {pending ? (
            <Text accessibilityLiveRegion="polite" className="text-sm leading-6 text-[#3D4947]">
              {t.loading}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-3">
            {nextIndex !== undefined ? (
              <TactileButton label={t.more} variant="primary" disabled={pending} onPress={() => void load(nextIndex)} />
            ) : null}
            <TactileButton label={t.refresh} variant="secondary" disabled={pending} onPress={refresh} />
          </View>
        </View>
      ) : null}

      <GlassSheet visible={translationStory !== undefined} onClose={() => setTranslationKey(null)} label={t.translationTitle}>
        <Text className="mt-3 text-lg leading-8" style={{ color: INK }}>
          {translationStory?.translation ?? ""}
        </Text>
      </GlassSheet>
      <GlassSheet visible={picked !== null} onClose={() => setPicked(null)} label={t.wordTitle}>
        <Text className="mt-2 font-display text-3xl font-extrabold" style={{ color: INK }}>
          {pickedEntry?.word ?? picked?.token ?? ""}
        </Text>
        {pickedEntry ? (
          <>
            <Text className="mt-3 text-xl" style={{ color: INK }}>
              {pickedEntry.translation}
            </Text>
            <Text className="mt-3 text-base leading-6" style={{ color: MUTED }}>
              {pickedEntry.example_sentence}
            </Text>
          </>
        ) : (
          <Text className="mt-3 text-base leading-6" style={{ color: MUTED }}>
            {t.wordMissing}
          </Text>
        )}
      </GlassSheet>
      <GrammarSheet sentence={grammarSentence} language={language} onClose={() => setGrammarSentence(null)} />
    </View>
  );
}
