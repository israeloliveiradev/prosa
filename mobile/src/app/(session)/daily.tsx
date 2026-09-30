import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { HandsFreePlayer } from "@/components/session/hands-free-player";
import { JournalStage } from "@/components/session/journal-stage";
import { ListenStage } from "@/components/session/listen-stage";
import { NoteStage } from "@/components/session/note-stage";
import { ReconstructionStage } from "@/components/session/reconstruction-stage";
import { ProgressBar } from "@/components/session/progress-bar";
import { ReadingStage } from "@/components/session/reading-stage";
import { FluencyStage } from "@/components/session/fluency-stage";
import { ShadowStage } from "@/components/session/shadow-stage";
import { SrsStage } from "@/components/session/srs-stage";
import { WordSheet } from "@/components/session/word-sheet";
import { Figure } from "@/components/cast/figure";
import { AppFrame } from "@/components/shell/app-frame";
import { mindCopy, mindForPhase } from "@/lib/cast";
import { getLocale, phaseName, useCopy } from "@/lib/i18n";
import { writeClipboard } from "@/lib/clipboard";
import { usePrefs } from "@/lib/prefs";
import { keepWords } from "@/lib/text";
import { useTheme } from "@/theme/ThemeContext";
import { ChunkButton } from "@/components/shell/chunk-button";
import { fetchCourseProfile, fetchSrsCards, generateLesson, generatePersonalized, postProfileSignals, prefetchSpeech } from "@/lib/api";
import { fluencyDay } from "@/lib/fluency-432";
import { allSentences, handsFreeIntro } from "@/lib/hands-free";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { tap } from "@/lib/haptics";
import { AudioService } from "@/services/audio/AudioService";
import {
  PHASES,
  SESSION_SECONDS,
  cardFromTap,
  cardInDeck,
  cardsFromLesson,
  displayWord,
  findVocabulary,
  formatClock,
  phaseForElapsed,
  sentencesOf,
  throughForSentence,
} from "@/lib/lesson";
import { countDue, listeningGap, sessionPhases, type SessionPhase } from "@/lib/session-clock";
import type { ClockHint, CourseProfile } from "@/lib/types";
import {
  dropForeignGlosses,
  enqueueReview,
  getProgress,
  mergeServerCards,
  isoDate,
  markSessionComplete,
  noteCognateLesson,
  persistDeck,
  reviewQueue,
  recordJournal,
  recordSpeaking,
  rememberLesson,
  completeReconstruction,
  useProgress,
} from "@/lib/progress";
import { reconstructionDue } from "@/lib/reconstruction";
import { cardsForThrough } from "@/lib/through-lang";
import { useProgressReady } from "@/lib/query";
import type { ReviewQuality } from "@/lib/sm2";
import type { PhaseId, SessionCard } from "@/lib/types";

export default function DailySession() {
  const { palette } = useTheme();
  const copy = useCopy();
  const prefs = usePrefs();
  const params = useLocalSearchParams<{ topic?: string; date?: string; personalized?: string }>();
  const session = useSession();
  const profile = {
    target_lang: session?.user.target_lang ?? "en",
    native_lang: session?.user.native_lang ?? "pt",
    level: session?.user.level ?? "A2",
  } as const;
  const topic = (typeof params.topic === "string" ? params.topic : "ordering coffee").trim() || "ordering coffee";
  const personalized = params.personalized === "1" && Boolean(session);
  const today = isoDate();
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const ready = useProgressReady();
  const progress = useProgress();
  const savedLesson =
    (progress.lessonDate === date && progress.topic === topic ? progress.cachedLesson : null) ??
    progress.history.find((item) => item.date === date && item.topic === topic)?.lesson ??
    null;
  const allowed = progress.pro || (date === today && (progress.lessonDate !== today || Boolean(savedLesson)));
  const query = useQuery({
    queryKey: ["lesson", date, topic, profile.target_lang, profile.native_lang, personalized ? session?.user.id : "shared"],
    queryFn: () => {
      const stored = getProgress();
      const cognate = profile.level === "A1" && stored.cognateKeys.length < 5;
      return personalized && session
        ? generatePersonalized(session.token, topic)
        : generateLesson({ ...profile, topic, ...(cognate ? { cognate: true } : {}) }, session?.token);
    },
    enabled: Boolean(session) && ready && allowed && !savedLesson,
    initialData: savedLesson ?? undefined,
    networkMode: "offlineFirst",
    retry: 1,
    retryDelay: 800,
    staleTime: Infinity,
  });
  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [phases, setPhases] = useState<SessionPhase[]>(PHASES);
  const [stage, setStage] = useState<PhaseId>("review");
  const [marks, setMarks] = useState({ reviewed: 0, missed: 0, tapped: 0, spoke: false, wrote: false });
  const [picked, setPicked] = useState<{ token: string; sentence: string } | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseProfile | null>(null);
  const stageRef = useRef<PhaseId>("review");
  const clockStarted = useRef(false);
  const clockSet = useRef(false);
  const elapsedRef = useRef(0);
  const seeded = useRef("");
  const lesson = query.data ?? null;
  const person = mindForPhase(stage);
  const personText = mindCopy(person, getLocale());
  const dueReverse = reconstructionDue(progress.reconstruction, today);
  const [pinnedReverse, setPinnedReverse] = useState(dueReverse);

  useEffect(() => {
    if (dueReverse) {
      setPinnedReverse(dueReverse);
    }
  }, [dueReverse]);

  useEffect(() => {
    if (!saveNote) {
      return;
    }
    const timer = setTimeout(() => setSaveNote(null), 3200);
    return () => clearTimeout(timer);
  }, [saveNote]);

  useEffect(() => {
    if (!ready || !lesson) {
      return;
    }
    const key = `${date}:${topic}:${lesson.title}:${profile.target_lang}:${profile.native_lang}`;
    if (seeded.current === key) {
      return;
    }
    seeded.current = key;
    const stored = getProgress();
    const lessonCards = cardsForThrough(cardsFromLesson(lesson), profile.native_lang);
    dropForeignGlosses(profile.native_lang);
    const nextDeck = reviewQueue(lessonCards, getProgress().cards, Date.now(), profile.native_lang);
    rememberLesson(date, topic, lesson, nextDeck, {
      targetLang: profile.target_lang,
      throughLang: profile.native_lang,
      level: profile.level,
    });
    if (lesson.anchors?.some((item) => item.kind === "true")) {
      noteCognateLesson(date, topic);
    }
    setDeck(nextDeck);
    lockClock(stored.cards);
    const token = session?.token;
    if (!token) {
      return;
    }
    let live = true;
    void fetchSrsCards(token)
      .then((remote) => {
        if (!live) {
          return;
        }
        const merged = mergeServerCards(getProgress().cards, remote);
        persistDeck(merged);
        dropForeignGlosses(profile.native_lang);
        const clean = getProgress().cards;
        setDeck(reviewQueue(lessonCards, clean, Date.now(), profile.native_lang));
        lockClock(clean);
      })
      .catch(() => undefined);
    void fetchCourseProfile(token, profile.target_lang)
      .then((remote) => {
        if (!live) {
          return;
        }
        setCourse(remote);
        lockClock(getProgress().cards, remote.clock);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [date, lesson, ready, session?.token, topic, profile.target_lang, profile.native_lang]);

  useEffect(() => {
    if (!lesson || elapsed >= SESSION_SECONDS) {
      return;
    }
    const timer = setInterval(() => {
      setElapsed((value) => {
        const next = Math.min(SESSION_SECONDS, value + 1);
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lesson, elapsed >= SESSION_SECONDS]);

  useEffect(() => {
    if (elapsed >= SESSION_SECONDS && lesson) {
      markSessionComplete(today);
    }
  }, [elapsed, lesson, today]);

  useEffect(() => {
    if (!lesson) {
      return;
    }
    prefetchSpeech(allSentences(lesson.story_text), profile.target_lang, narratorVoice(profile.target_lang));
    prefetchSpeech([handsFreeIntro(profile.native_lang, lesson.title)], profile.native_lang, narratorVoice(profile.native_lang));
  }, [lesson, profile.native_lang, profile.target_lang]);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  useEffect(() => {
    const next = phaseForElapsed(elapsed, phases);
    if (stageRef.current === next) {
      clockStarted.current = true;
      return;
    }
    if (clockStarted.current) {
      if (!AudioService.hasSequence()) {
        AudioService.stopAndUnload();
      }
      void tap("medium");
    }
    clockStarted.current = true;
    stageRef.current = next;
    setStage(next);
  }, [elapsed, phases]);

  function lockClock(cards: SessionCard[], hint?: ClockHint | null) {
    if (clockSet.current && elapsedRef.current > 20) {
      return;
    }
    clockSet.current = true;
    const gap = hint?.listeningGap ?? listeningGap(getProgress().skills);
    setPhases(sessionPhases({ dueCount: countDue(cards), listeningGap: gap, slowStart: hint?.slowStart }));
  }

  function continuePhase() {
    AudioService.stopAndUnload();
    const next = phases.find((phase) => phase.start > elapsed);
    const at = next ? next.start : SESSION_SECONDS;
    elapsedRef.current = at;
    setElapsed(at);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        continuePhase();
      }
      if (event.key.toLowerCase() === "c" && lesson) {
        event.preventDefault();
        void writeClipboard(lesson.story_text);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [elapsed, lesson, phases]);

  function onDeck(next: SessionCard[], graded: SessionCard, quality: ReviewQuality) {
    setDeck(next);
    persistDeck(next);
    enqueueReview(graded, quality);
    setMarks((current) => ({
      ...current,
      reviewed: current.reviewed + 1,
      missed: current.missed + (quality === 0 ? 1 : 0),
    }));
  }

  const pickedWord = picked ? displayWord(picked.token) : "";
  const entry = lesson && picked ? findVocabulary(lesson.vocabulary, picked.token) : undefined;
  const wordFace = entry?.word ?? pickedWord;
  const wordGloss = entry?.translation ?? (lesson && picked ? throughForSentence(lesson.story_text, lesson.translation, picked.sentence) : "");
  const wordSentence = entry?.example_sentence ?? picked?.sentence ?? "";
  const saved = Boolean(picked && (cardInDeck(deck, wordFace) || cardInDeck(progress.cards, wordFace)));

  function keepRepairCards(cards: Array<{ front_phrase: string; back_translation: string; context_sentence: string }>) {
    const due = new Date().toISOString();
    const next = cards
      .filter((card) => !cardInDeck(deck, card.front_phrase) && !cardInDeck(getProgress().cards, card.front_phrase))
      .map((card) => ({
        ...cardFromTap({ word: card.front_phrase, translation: card.back_translation, sentence: card.context_sentence }),
        due,
      }));
    if (next.length === 0) {
      return;
    }
    persistDeck(next);
    setDeck((current) => {
      const merged = [...current];
      for (const card of next) {
        if (!cardInDeck(merged, card.front_phrase)) {
          merged.push(card);
        }
      }
      return merged;
    });
  }

  function saveChunk(phrase: string, translation: string, sentence: string) {
    if (!phrase || !translation || cardInDeck(deck, phrase) || cardInDeck(progress.cards, phrase)) {
      return;
    }
    const card = cardFromTap({ word: phrase, translation, sentence });
    void tap("success");
    persistDeck([card]);
    setDeck((current) => (cardInDeck(current, card.front_phrase) ? current : [...current, card]));
    setSaveNote(copy.savedChunk);
  }

  function saveWord() {
    if (!lesson || !picked || saved || !pickedWord) {
      return;
    }
    const card = cardFromTap({
      word: wordFace,
      translation: wordGloss || throughForSentence(lesson.story_text, lesson.translation, picked.sentence),
      sentence: wordSentence || picked.sentence,
    });
    void tap("success");
    persistDeck([card]);
    setDeck((current) => (cardInDeck(current, card.front_phrase) ? current : [...current, card]));
    setPicked(null);
    setSaveNote(copy.savedToDeck);
  }

  const retrying = query.isFetching && Boolean(query.error);
  const loading = !ready || (allowed && !lesson && !query.error && (query.isPending || query.isFetching));
  const blocked = ready && !allowed;

  if (!session) {
    return <Redirect href="/account" />;
  }

  return (
    <AppFrame scroll={false} compact={prefs.focusLesson}>
      <View className="min-h-0 flex-1 flex-row">
        <ScrollView className="min-w-0 flex-1" contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
          <View className="px-5 py-4 md:mx-auto md:w-full md:max-w-3xl md:px-8 md:py-6">
            <ProgressBar elapsed={elapsed} phases={phases} />
            {loading ? (
              <View className="mt-10 gap-3">
                <View className="h-8 w-2/3 rounded-full bg-line" />
                <View className="h-4 w-full rounded-full bg-line" />
                <View className="h-4 w-5/6 rounded-full bg-line" />
                <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} />
                <Text className="text-center font-sans text-base text-muted">{copy.preparingLesson}</Text>
              </View>
            ) : null}
            {blocked ? (
              <View className="mt-10 border-t border-ink pt-6">
                <Text className="font-displayItalic text-headline text-ink">{copy.freeLessonUsed}</Text>
                <Text className="mt-3 max-w-xl text-base leading-7 text-muted">{copy.freeLessonUsedDek}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace(progress.topic ? { pathname: "/daily", params: { topic: progress.topic } } : "/daily")}
                  className="mt-6 min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6"
                >
                  <Text className="font-label text-base text-onEmber">{copy.continueTodays}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push("/paywall")} className="mt-3 min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line px-6">
                  <Text className="font-label text-base text-ink">{copy.seePro}</Text>
                </Pressable>
              </View>
            ) : null}
            {query.error && !lesson ? (
              <View className="mt-10">
                <Text className="font-displayItalic text-headline text-ink">{copy.lessonDidNotOpen}</Text>
                <Text className="mt-3 max-w-xl text-base leading-7 text-muted">
                  {keepWords(query.error instanceof Error ? lessonError(query.error.message, copy) : copy.couldNotOpenLesson)}
                </Text>
                {retrying ? <ActivityIndicator color={palette.primary} style={{ marginTop: 16 }} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: retrying, disabled: retrying }}
                  disabled={retrying}
                  onPress={() => void query.refetch()}
                  className="mt-6 min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6"
                >
                  <Text className="font-label text-base text-onEmber">{retrying ? copy.retrying : copy.tryAgain}</Text>
                </Pressable>
              </View>
            ) : null}
            {lesson && stage === "reading" ? (
              <View className="mt-6">
                <AreaHint area="prosa" />
                {saveNote ? <Text className="mb-3 text-base text-moss">{saveNote}</Text> : null}
                <ReadingStage
                  lesson={lesson}
                  language={profile.target_lang}
                  active={stage === "reading"}
                  isChunkSaved={(phrase) => cardInDeck(deck, phrase) || cardInDeck(progress.cards, phrase)}
                  onSaveChunk={saveChunk}
                  onOpenWord={(token, sentence) => {
                    if (!displayWord(token)) {
                      return;
                    }
                    setSaveNote(null);
                    setMarks((current) => ({ ...current, tapped: current.tapped + 1 }));
                    setPicked({ token, sentence });
                  }}
                />
              </View>
            ) : null}
            {lesson ? (
              <HandsFreePlayer
                title={lesson.title}
                story={lesson.story_text}
                targetLang={profile.target_lang}
                throughLang={profile.native_lang}
                showStart={stage === "reading"}
                onEngage={() => AudioService.stopAndUnload()}
              />
            ) : null}
            {lesson && stage === "review" ? (
              <View className="mt-6">
                <SrsStage cards={deck} onChange={onDeck} />
              </View>
            ) : null}
            {lesson && stage === "listen" ? (
              <ListenStage
                story={lesson.story_text}
                translation={lesson.translation}
                language={profile.target_lang}
                vocabulary={lesson.vocabulary}
              />
            ) : null}
            {lesson && stage === "shadow" ? (
              <View className="mt-6">
                {fluencyDay(date) ? (
                  <FluencyStage
                    title={lesson.title}
                    story={lesson.story_text}
                    language={profile.target_lang}
                    nativeLang={profile.native_lang}
                    level={profile.level}
                    onScored={(wpm) => {
                      recordSpeaking(wpm);
                      setMarks((current) => ({ ...current, spoke: true }));
                      if (session?.token) {
                        void postProfileSignals(session.token, profile.target_lang, { fluency_wpm: wpm });
                      }
                    }}
                    onCards={keepRepairCards}
                  />
                ) : null}
                <ShadowStage
                  sentences={sentencesOf(lesson.story_text)}
                  language={profile.target_lang}
                  throughLang={profile.native_lang}
                  onScored={(score) => {
                    recordSpeaking(score);
                    setMarks((current) => ({ ...current, spoke: true }));
                  }}
                />
              </View>
            ) : null}
            {lesson && stage === "journal" ? (
              <View className="mt-6">
                {pinnedReverse ? (
                  <ReconstructionStage anchor={pinnedReverse} onCompleted={() => completeReconstruction(today)} onCards={keepRepairCards} />
                ) : progress.reconstruction?.date === today ? (
                  <Text className="mb-8 text-base leading-7 text-muted">
                    {copy.reconstructionNote}
                  </Text>
                ) : null}
                <JournalStage
                  prompt={lesson.journal_prompt}
                  targetLang={profile.target_lang}
                  nativeLang={profile.native_lang}
                  level={profile.level}
                  onEvaluated={() => {
                    recordJournal();
                    markSessionComplete(today);
                    setMarks((current) => ({ ...current, wrote: true }));
                  }}
                  onCards={keepRepairCards}
                />
              </View>
            ) : null}
            {lesson && stage === "note" ? (
              <NoteStage
                reviewed={marks.reviewed}
                missed={marks.missed}
                tapped={marks.tapped}
                spoke={marks.spoke}
                wrote={marks.wrote}
                done={elapsed >= SESSION_SECONDS}
                note={course?.note}
                clock={course?.clock}
                weeklyAim={course?.profile.weekly_aim}
                onAim={(aim) => {
                  const token = session?.token;
                  if (!token || !aim) {
                    return;
                  }
                  void postProfileSignals(token, profile.target_lang, { weekly_aim: aim })
                    .then(setCourse)
                    .catch(() => undefined);
                }}
                onDuel={() => {
                  AudioService.stopAndUnload();
                  router.push("/duel");
                }}
                onTalk={() => {
                  AudioService.stopAndUnload();
                  router.push("/prose");
                }}
              />
            ) : null}
            {lesson && elapsed < SESSION_SECONDS ? (
              <View>
                <ChunkButton className="mt-8 w-full" label={`${copy.continueClock} · ${formatClock(elapsed)}`} onPress={continuePhase} tone="ghost" />
                <Text className="mt-3 text-center text-sm text-muted">{copy.shortcuts}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => prefs.setFocusLesson(!prefs.focusLesson)}
                  className="mt-3 min-h-12 cursor-pointer items-center justify-center"
                >
                  <Text className="font-label text-sm text-ember">{prefs.focusLesson ? copy.focusOff : copy.focusOn}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View className="hidden w-72 border-l border-line bg-paper px-8 py-10 lg:flex">
            <View>
              <Figure who={person.id} size={148} />
              <Text className="mt-4 font-displayItalic text-3xl text-ink">{person.name}</Text>
              <Text className="mt-1 font-label text-xs uppercase tracking-widest text-ember">{keepWords(personText.role)}</Text>
              <Text className="mt-3 text-sm leading-5 text-muted">{keepWords(personText.line)}</Text>
            </View>
            <View className="mt-8 border-t border-line pt-4">
              {phases.map((phase) => {
                const active = stage === phase.id;
                return (
                  <View key={phase.id} className="min-h-12 flex-row items-center justify-between border-b border-line">
                    <Text className={`font-label text-sm ${active ? "text-ink" : "text-muted"}`}>{phaseName(phase.id)}</Text>
                    <Text className="text-xs uppercase tracking-widest text-muted">{active ? copy.now : ""}</Text>
                  </View>
                );
              })}
            </View>
          </View>
      </View>
      <WordSheet
        token={picked?.token ?? null}
        word={wordFace}
        translation={wordGloss}
        sentence={wordSentence}
        extra={!entry}
        saved={saved}
        onClose={() => setPicked(null)}
        onSave={saveWord}
      />
    </AppFrame>
  );
}

function lessonError(message: string, copy: ReturnType<typeof useCopy>): string {
  if (message.includes("Model request failed") || message.includes("empty structured") || message.includes("not valid JSON")) {
    return copy.lessonFailed;
  }
  if (message.includes("busy")) {
    return copy.modelBusy;
  }
  if (message.includes("unavailable")) {
    return copy.generationOff;
  }
  return message;
}

