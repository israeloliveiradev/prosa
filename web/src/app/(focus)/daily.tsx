import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { dailyRunKey, loadDailyRun, saveDailyRun } from "@/components/session/daily-run-store";
import { FluencyStage } from "@/components/session/fluency-stage";
import { HandsFreePlayer } from "@/components/session/hands-free-player";
import { JournalStage } from "@/components/session/journal-stage";
import { ListenStage, type ListenResult } from "@/components/session/listen-stage";
import { NoteStage } from "@/components/session/note-stage";
import { ReadingStage } from "@/components/session/reading-stage";
import { ReconstructionStage } from "@/components/session/reconstruction-stage";
import { SessionHeader, usePhaseLabel } from "@/components/session/session-header";
import { IconArrow } from "@/components/session/session-icons";
import { ShadowStage } from "@/components/session/shadow-stage";
import { SrsStage } from "@/components/session/srs-stage";
import { StageFrame } from "@/components/session/stage-frame";
import { Notice, StageCard } from "@/components/session/stage-kit";
import { StageRecap } from "@/components/session/stage-recap";
import { WordSheet } from "@/components/session/word-sheet";
import { TactileButton } from "@/components/tactile/tactile-button";
import type { SessionState } from "@/lib/session";
import {
  fetchCourseProfile,
  fetchSrsCards,
  generateLesson,
  generatePersonalized,
  postProfileSignals,
  prefetchSpeech,
} from "@/lib/api";
import { mindForPhase, mindRole, useCast } from "@/lib/cast";
import { fill, SESSION_COPY } from "@/lib/copy/session";
import { useAreaCopy } from "@/lib/copy/area";
import { fluencyDay } from "@/lib/fluency-432";
import { allSentences, handsFreeIntro } from "@/lib/hands-free";
import { tap } from "@/lib/haptics";
import { useCopy, useLocale } from "@/lib/i18n";
import {
  cardFromTap,
  cardInDeck,
  cardsFromLesson,
  chooseTopic,
  displayWord,
  findVocabulary,
  readingFloorSeconds,
  sentencesOf,
  sessionDate,
  throughForSentence,
  tokenize,
} from "@/lib/lesson";
import { narratorVoice } from "@/lib/narrator";
import {
  completeReconstruction,
  dropForeignGlosses,
  enqueueReview,
  getProgress,
  isoDate,
  markSessionComplete,
  mergeServerCards,
  noteCognateLesson,
  persistDeck,
  recordJournal,
  recordSpeaking,
  recordStudyTime,
  rememberLesson,
  reviewQueue,
  useProgress,
} from "@/lib/progress";
import { useProgressReady } from "@/lib/query";
import { reconstructionDue } from "@/lib/reconstruction";
import {
  SESSION_PHASES,
  SESSION_SECONDS,
  completePhase,
  countDue,
  createDailyRun,
  frontierPhase,
  listeningGap,
  nextPhase,
  phaseCriterionMet,
  phaseSpans,
  phaseStatus,
  recordRating,
  runMatches,
  sessionPhases,
  type DailyRun,
  type GateContext,
  type PhaseStatus,
  type SessionPhase,
  type SessionPhaseId,
} from "@/lib/session-clock";
import { useSession } from "@/lib/session";
import type { ReviewQuality } from "@/lib/sm2";
import { cardsForThrough } from "@/lib/through-lang";
import type { ClockHint, CourseProfile, JournalEvaluation, LessonPayload, ReconstructionReport, RepairCard, SessionCard } from "@/lib/types";
import { awardXp } from "@/lib/xp";
import { AudioService } from "@/services/audio/AudioService";
import { useTheme } from "@/theme/ThemeContext";

/** Sessão diária real: revisão → ouvir → ler → falar → escrever → fecho, em sequência. */
export default function DailyRoute() {
  const session = useSession();
  if (!session) {
    return <Redirect href="/account" />;
  }
  return <DailySession session={session} />;
}

function cardKey(card: Pick<SessionCard, "front_phrase">): string {
  return card.front_phrase.trim().toLowerCase();
}

const EMPTY_RUN: Pick<DailyRun, "completed"> = { completed: [] };

function DailySession({ session }: { session: SessionState }) {
  const { palette } = useTheme();
  const copy = useCopy();
  const local = useAreaCopy(SESSION_COPY);
  const locale = useLocale();
  const phaseLabel = usePhaseLabel();
  const cast = useCast();
  const params = useLocalSearchParams<{ topic?: string; date?: string; personalized?: string; unit?: string }>();
  const user = session.user;
  const token = session.token;
  const target = user.target_lang ?? "en";
  const through = user.native_lang ?? "pt";
  const level = user.level ?? "A2";
  const interests = useMemo(() => user.interests ?? [], [user.interests]);
  const today = isoDate();
  const date = sessionDate(params.date, today);
  const ready = useProgressReady();
  const progress = useProgress();
  const topic = chooseTopic({
    param: typeof params.topic === "string" ? params.topic : null,
    cached: progress.lessonDate === date ? progress.topic : null,
    interests,
    date,
  });
  const personalized = params.personalized === "1";
  // A trilha manda ?unit=<id>; a API de lição ainda não recebe unit_id, então guardamos na sessão para depois.
  const unitId = typeof params.unit === "string" && params.unit.trim() ? params.unit.trim() : null;
  const savedLesson =
    (progress.lessonDate === date && progress.topic === topic ? progress.cachedLesson : null) ??
    progress.history.find((item) => item.date === date && item.topic === topic)?.lesson ??
    null;
  const pro = user.plan === "pro" || progress.pro;
  const allowed = pro || (date === today && (progress.lessonDate !== today || Boolean(savedLesson)));

  const query = useQuery({
    queryKey: ["lesson", date, topic, target, through, level, personalized ? user.id : "shared"],
    queryFn: (): Promise<LessonPayload> => {
      if (personalized) {
        return generatePersonalized(token, topic);
      }
      const cognate = level === "A1" && getProgress().cognateKeys.length < 5;
      const request = {
        target_lang: target,
        native_lang: through,
        level,
        topic,
        ...(interests.length > 0 ? { interests: interests.slice(0, 12) } : {}),
        ...(cognate ? { cognate: true } : {}),
      };
      return generateLesson(request, token);
    },
    enabled: ready && allowed && !savedLesson,
    initialData: savedLesson ?? undefined,
    networkMode: "offlineFirst",
    retry: 1,
    retryDelay: 800,
    staleTime: Infinity,
  });
  const lesson: LessonPayload | null = query.data ?? savedLesson ?? null;

  const runKey = dailyRunKey(user.id, target);
  const [run, setRun] = useState<DailyRun | null>(null);
  const runRef = useRef<DailyRun | null>(null);
  runRef.current = run;
  const [viewing, setViewing] = useState<SessionPhaseId>("review");
  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [deckReady, setDeckReady] = useState(false);
  const [phases, setPhases] = useState<SessionPhase[]>(() => sessionPhases({ dueCount: 0 }));
  const [course, setCourse] = useState<CourseProfile | null>(null);
  const [picked, setPicked] = useState<{ token: string; sentence: string } | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [xpFlash, setXpFlash] = useState(0);
  const [speechTrouble, setSpeechTrouble] = useState(false);
  const [readSeconds, setReadSeconds] = useState(0);
  const [endSeen, setEndSeen] = useState(false);
  const seeded = useRef("");
  const reviewTouched = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollBox = useRef({ offset: 0, viewport: 0, content: 0 });
  const dueReverse = reconstructionDue(progress.reconstruction, today);
  const [pinnedReverse, setPinnedReverse] = useState(dueReverse);

  const update = useCallback(
    (change: (current: DailyRun) => DailyRun) => {
      setRun((current) => (current ? change(current) : current));
    },
    [setRun],
  );

  /* Sessão salva: retoma a do mesmo dia/tema/lição, senão começa uma nova. */
  useEffect(() => {
    if (!lesson) {
      return;
    }
    const key = { date, topic, title: lesson.title };
    if (runMatches(runRef.current, key)) {
      return;
    }
    const stored = loadDailyRun(runKey);
    const next = runMatches(stored, key) ? stored : createDailyRun({ ...key, unitId });
    setRun(next);
    setViewing(frontierPhase(next));
  }, [date, lesson, runKey, topic, unitId]);

  useEffect(() => {
    if (run) {
      saveDailyRun(runKey, run);
    }
  }, [run, runKey]);

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
    if (xpFlash <= 0) {
      return;
    }
    const timer = setTimeout(() => setXpFlash(0), 2400);
    return () => clearTimeout(timer);
  }, [xpFlash]);

  const planClock = useCallback((cards: SessionCard[], hint?: ClockHint | null) => {
    setPhases(
      sessionPhases({
        dueCount: countDue(cards),
        listeningGap: hint?.listeningGap ?? listeningGap(getProgress().skills),
        slowStart: hint?.slowStart,
      }),
    );
  }, [setPhases]);

  /* Monta a fila de revisão (FSRS local + servidor) e o plano de tempo do curso. */
  const runLoaded = Boolean(run);
  useEffect(() => {
    if (!ready || !lesson || !runLoaded) {
      return;
    }
    const key = `${date}:${topic}:${lesson.title}:${target}:${through}`;
    if (seeded.current === key) {
      return;
    }
    seeded.current = key;
    reviewTouched.current = false;
    const rated = new Set(runRef.current?.rated ?? []);
    const lessonCards = cardsForThrough(cardsFromLesson(lesson), through);
    dropForeignGlosses(through);
    const queue = reviewQueue(lessonCards, getProgress().cards, Date.now(), through);
    rememberLesson(date, topic, lesson, queue, { targetLang: target, throughLang: through, level });
    if (lesson.anchors?.some((item) => item.kind === "true")) {
      noteCognateLesson(date, topic);
    }
    setDeck(queue.filter((card) => !rated.has(cardKey(card))));
    setDeckReady(true);
    planClock(getProgress().cards);
    let live = true;
    void fetchSrsCards(token)
      .then((remote) => {
        if (!live) {
          return;
        }
        persistDeck(mergeServerCards(getProgress().cards, remote));
        dropForeignGlosses(through);
        const clean = getProgress().cards;
        if (!reviewTouched.current) {
          const ratedNow = new Set(runRef.current?.rated ?? []);
          setDeck(reviewQueue(lessonCards, clean, Date.now(), through).filter((card) => !ratedNow.has(cardKey(card))));
        }
        planClock(clean);
      })
      .catch(() => undefined);
    void fetchCourseProfile(token, target)
      .then((remote) => {
        if (!live) {
          return;
        }
        setCourse(remote);
        planClock(getProgress().cards, remote.clock);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [date, lesson, level, planClock, ready, runLoaded, target, through, token, topic]);

  /* Relógio real: conta só com a lição aberta, a aba visível e a sessão por concluir. */
  const running = Boolean(lesson && run && !run.finished);
  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      setRun((current) => (current && !current.finished ? { ...current, elapsed: current.elapsed + 1 } : current));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  /* Tempo real de estudo para Hoje (minutos do dia): grava o total decorrido a cada 30 s. */
  const elapsedNow = run?.elapsed ?? 0;
  useEffect(() => {
    if (elapsedNow > 0 && elapsedNow % 30 === 0) {
      recordStudyTime(elapsedNow, { key: `daily:${date}` });
    }
  }, [date, elapsedNow]);

  useEffect(() => {
    if (!lesson) {
      return;
    }
    prefetchSpeech(allSentences(lesson.story_text), target, narratorVoice(target));
    prefetchSpeech([handsFreeIntro(through, lesson.title)], through, narratorVoice(through));
  }, [lesson, target, through]);

  useEffect(() => {
    return () => {
      AudioService.stopAndUnload();
    };
  }, []);

  const frontier = run ? frontierPhase(run) : "review";
  const remaining = deck.filter((card) => !(run?.rated ?? []).includes(cardKey(card)));
  const gate: GateContext = { reviewLeft: deckReady ? remaining.length : Math.max(1, remaining.length) };
  const criterionMet = run ? phaseCriterionMet(run, frontier, gate) : false;
  const words = useMemo(() => (lesson ? tokenize(lesson.story_text).length : 0), [lesson]);
  const readingDone = run?.reading.done ?? false;

  /* Leitura: tempo mínimo na etapa + fim do texto visível, ou a narração inteira. */
  useEffect(() => {
    if (viewing !== "reading" || frontier !== "reading" || readingDone) {
      return;
    }
    const timer = setInterval(() => setReadSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [frontier, readingDone, viewing]);

  useEffect(() => {
    if (!readingDone && frontier === "reading" && endSeen && readSeconds >= readingFloorSeconds(words)) {
      update((current) => ({ ...current, reading: { ...current.reading, done: true } }));
    }
  }, [endSeen, frontier, readSeconds, readingDone, update, words]);

  const checkEnd = useCallback(() => {
    const box = scrollBox.current;
    if (box.viewport <= 0 || box.content <= 0) {
      return;
    }
    if (box.offset + box.viewport >= box.content - 120) {
      setEndSeen(true);
    }
  }, [setEndSeen]);

  useEffect(() => {
    if (viewing === "reading") {
      setEndSeen(false);
      requestAnimationFrame(checkEnd);
    }
  }, [checkEnd, viewing]);

  function goTo(id: SessionPhaseId) {
    if (!run || phaseStatus(run, id) === "locked") {
      return;
    }
    if (!AudioService.hasSequence()) {
      AudioService.stopAndUnload();
    }
    setViewing(id);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function advance() {
    if (!run) {
      return;
    }
    if (viewing !== frontier) {
      goTo(frontier);
      return;
    }
    if (frontier === "note" || !phaseCriterionMet(run, frontier, gate)) {
      return;
    }
    const skippedSpeech = frontier === "shadow" && run.shadow.best === null && run.shadow.wpm === null;
    const gained = skippedSpeech ? 0 : awardXp("phase", `${date}:${frontier}`);
    update((current) => ({ ...completePhase(current, frontier, gate), xp: current.xp + gained }));
    if (gained > 0) {
      setXpFlash(gained);
    }
    void tap("medium");
    AudioService.stopAndUnload();
    const next = nextPhase(frontier);
    if (next) {
      setViewing(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }

  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable || element.tagName === "BUTTON")) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        advanceRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onDeck(next: SessionCard[], graded: SessionCard, quality: ReviewQuality) {
    setDeck(next);
    persistDeck(next);
    enqueueReview(graded, quality);
    reviewTouched.current = true;
    const key = cardKey(graded);
    const fresh = !(runRef.current?.rated ?? []).includes(key);
    const gained = fresh ? awardXp("card", `${date}:${key}`) : 0;
    update((current) => ({ ...recordRating(current, key, quality), xp: current.xp + gained }));
  }

  const onListenDone = useCallback(
    (result: ListenResult) => {
      update((current) => (current.listen ? current : { ...current, listen: result }));
    },
    [update],
  );

  const pickedWord = picked ? displayWord(picked.token) : "";
  const entry = lesson && picked ? findVocabulary(lesson.vocabulary, picked.token) : undefined;
  const wordFace = entry?.word ?? pickedWord;
  const wordGloss = entry?.translation ?? (lesson && picked ? throughForSentence(lesson.story_text, lesson.translation, picked.sentence) : "");
  const wordSentence = entry?.example_sentence ?? picked?.sentence ?? "";
  const saved = Boolean(picked && (cardInDeck(deck, wordFace) || cardInDeck(progress.cards, wordFace)));

  function keepRepairCards(cards: RepairCard[]) {
    const due = new Date().toISOString();
    const next = cards
      .filter((card) => !cardInDeck(deck, card.front_phrase) && !cardInDeck(getProgress().cards, card.front_phrase))
      .map((card) => ({
        ...cardFromTap({ word: card.front_phrase, translation: card.back_translation, sentence: card.context_sentence }),
        due,
      }));
    if (next.length > 0) {
      persistDeck(next);
    }
  }

  function saveChunk(phrase: string, translation: string, sentence: string) {
    if (!phrase || !translation || cardInDeck(deck, phrase) || cardInDeck(getProgress().cards, phrase)) {
      return;
    }
    persistDeck([cardFromTap({ word: phrase, translation, sentence })]);
    update((current) => ({ ...current, savedWords: current.savedWords + 1 }));
    void tap("success");
    setSaveNote(copy.savedChunk);
  }

  function saveWord() {
    if (!lesson || !picked || saved || !pickedWord) {
      return;
    }
    persistDeck([
      cardFromTap({
        word: wordFace,
        translation: wordGloss || throughForSentence(lesson.story_text, lesson.translation, picked.sentence),
        sentence: wordSentence || picked.sentence,
      }),
    ]);
    update((current) => ({ ...current, savedWords: current.savedWords + 1 }));
    void tap("success");
    setPicked(null);
    setSaveNote(copy.savedToDeck);
  }

  function onSpeechScored(score: number) {
    // Nota 0 = não ouvimos voz (ou nada reconhecido): não conta como tentativa nem paga XP.
    if (!(score > 0)) {
      return;
    }
    recordSpeaking(score);
    const gained = awardXp("speech", date);
    update((current) => ({
      ...current,
      shadow: { ...current.shadow, best: Math.max(current.shadow.best ?? 0, Math.round(score)) },
      xp: current.xp + gained,
    }));
  }

  function onFluencyScored(wpm: number) {
    update((current) => ({ ...current, shadow: { ...current.shadow, wpm: Math.max(current.shadow.wpm ?? 0, Math.round(wpm)) } }));
    void postProfileSignals(token, target, { fluency_wpm: wpm }).catch(() => undefined);
  }

  function onJournal(evaluation: JournalEvaluation) {
    recordJournal();
    update((current) => ({ ...current, journal: { score: evaluation.score } }));
  }

  function onRebuild(report: ReconstructionReport) {
    completeReconstruction(today);
    const gained = awardXp("reconstruction", date);
    if (gained > 0) {
      setXpFlash(gained);
    }
    update((current) => ({ ...current, rebuild: { score: report.score }, xp: current.xp + gained }));
  }

  function finishSession() {
    if (!run || run.finished || frontier !== "note") {
      return;
    }
    markSessionComplete(today);
    recordStudyTime(run.elapsed, { key: `daily:${date}` });
    const gained = awardXp("phase", `${date}:note`);
    if (gained > 0) {
      setXpFlash(gained);
    }
    void tap("success");
    update((current) => ({ ...completePhase({ ...current, finished: true }, "note", gate), xp: current.xp + gained }));
  }

  function exit() {
    AudioService.stopAndUnload();
    router.replace("/");
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollBox.current.offset = event.nativeEvent.contentOffset.y;
    scrollBox.current.viewport = event.nativeEvent.layoutMeasurement.height;
    scrollBox.current.content = event.nativeEvent.contentSize.height;
    if (viewing === "reading") {
      checkEnd();
    }
  }

  const statuses = Object.fromEntries(SESSION_PHASES.map((id) => [id, phaseStatus(run ?? EMPTY_RUN, id)])) as Record<SessionPhaseId, PhaseStatus>;
  const spans = phaseSpans(phases);
  const retrying = query.isFetching && Boolean(query.error);
  const loading = !lesson && (!ready || (allowed && !query.error));
  const blocked = ready && !allowed && !lesson;
  const mind = mindForPhase(viewing, cast.picks);
  const stepIndex = SESSION_PHASES.indexOf(viewing);
  const intro = {
    review: local.introReview,
    listen: local.introListen,
    reading: local.introReading,
    shadow: local.introShadow,
    journal: local.introJournal,
    note: local.introNote,
  }[viewing];
  const gateText =
    frontier === "review"
      ? fill(local.gateReview, { left: gate.reviewLeft })
      : frontier === "listen"
        ? local.gateListen
        : frontier === "reading"
          ? local.gateReading
          : frontier === "shadow"
            ? local.gateShadow
            : pinnedReverse
              ? local.gateJournalOrRebuild
              : local.gateJournal;
  const nextId = nextPhase(frontier);

  return (
    <View className="flex-1" style={{ backgroundColor: palette.frame }}>
      <SessionHeader
        statuses={statuses}
        viewing={viewing}
        spans={spans}
        elapsed={run?.elapsed ?? 0}
        total={SESSION_SECONDS}
        onSelect={goTo}
        onExit={exit}
      />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={64}
        onScroll={onScroll}
        onLayout={(event: LayoutChangeEvent) => {
          scrollBox.current.viewport = event.nativeEvent.layout.height;
          if (viewing === "reading") {
            checkEnd();
          }
        }}
        onContentSizeChange={(_, height) => {
          scrollBox.current.content = height;
          if (viewing === "reading") {
            checkEnd();
          }
        }}
      >
        <View className="mx-auto w-full max-w-3xl px-4 py-5 md:px-8 md:py-8">
          {loading ? (
            <StageCard>
              <View className="gap-3">
                <View className="h-7 w-2/3 rounded-full" style={{ backgroundColor: palette.raised }} />
                <View className="h-4 w-full rounded-full" style={{ backgroundColor: palette.raised }} />
                <View className="h-4 w-5/6 rounded-full" style={{ backgroundColor: palette.raised }} />
              </View>
              <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} />
              <Text className="mt-3 text-center font-sans text-base font-semibold text-ink">{copy.preparingLesson}</Text>
              <Text className="mt-1 text-center font-sans text-sm text-muted">{local.preparingSlow}</Text>
            </StageCard>
          ) : null}

          {blocked ? (
            <StageCard>
              <Text className="font-display text-2xl leading-8 font-extrabold text-ink">{copy.freeLessonUsed}</Text>
              <Text className="mt-3 font-sans text-base leading-7 text-muted">{copy.freeLessonUsedDek}</Text>
              <View className="mt-5 flex-row">
                <TactileButton variant="primary" size="lg" onPress={() => router.replace("/daily")} label={copy.continueTodays} />
              </View>
            </StageCard>
          ) : null}

          {query.error && !lesson ? (
            <StageCard>
              <Text className="font-display text-2xl leading-8 font-extrabold text-ink">{copy.lessonDidNotOpen}</Text>
              <Notice>{query.error instanceof Error ? query.error.message : copy.couldNotOpenLesson}</Notice>
              <View className="mt-5 flex-row gap-2">
                <TactileButton
                  variant="primary"
                  size="lg"
                  disabled={retrying}
                  onPress={() => void query.refetch()}
                  label={retrying ? copy.retrying : copy.tryAgain}
                />
                <TactileButton variant="secondary" size="lg" onPress={exit} label={local.backHome} />
              </View>
            </StageCard>
          ) : null}

          {lesson && run ? (
            <StageFrame
              mindId={mind.id}
              mindName={mind.name}
              mindRole={mindRole(mind.slot, locale)}
              kicker={`${fill(local.stepOf, { n: stepIndex + 1, total: SESSION_PHASES.length })} · ${phaseLabel(viewing)}`}
              instruction={intro}
              planned={fill(local.planned, { min: Math.max(1, Math.round(spans[viewing] / 60)) })}
            >
              {viewing !== frontier ? (
                <View className="gap-4">
                  <StageRecap phase={viewing} run={run} />
                  {viewing === "reading" ? (
                    <ReadingStage
                      lesson={lesson}
                      language={target}
                      active
                      isChunkSaved={(phrase) => cardInDeck(deck, phrase) || cardInDeck(progress.cards, phrase)}
                      onSaveChunk={saveChunk}
                      onOpenWord={(wordToken, sentence) => {
                        if (displayWord(wordToken)) {
                          setPicked({ token: wordToken, sentence });
                        }
                      }}
                    />
                  ) : null}
                  {viewing === "listen" ? (
                    <StageCard>
                      <Text className="font-serif text-lg leading-8 text-ink">{lesson.story_text}</Text>
                    </StageCard>
                  ) : null}
                  <View className="flex-row">
                    <TactileButton
                      variant="primary"
                      size="lg"
                      onPress={() => goTo(frontier)}
                      rightIcon={<IconArrow color={palette.onPrimary} />}
                      label={fill(local.backToNow, { phase: phaseLabel(frontier) })}
                    />
                  </View>
                </View>
              ) : null}

              <View style={viewing === frontier ? undefined : { display: "none" }}>
                {frontier === "review" ? (
                  gate.reviewLeft > 0 ? (
                    <SrsStage cards={deck} onChange={onDeck} />
                  ) : (
                    <StageRecap phase="review" run={run} />
                  )
                ) : null}

                {frontier === "listen" ? (
                  <ListenStage
                    story={lesson.story_text}
                    translation={lesson.translation}
                    language={target}
                    vocabulary={lesson.vocabulary}
                    onDone={onListenDone}
                  />
                ) : null}

                {frontier === "reading" ? (
                  <View className="gap-4">
                    <AreaHint area="prosa" />
                    {saveNote ? <Notice tone="success">{saveNote}</Notice> : null}
                    <ReadingStage
                      lesson={lesson}
                      language={target}
                      active={viewing === "reading"}
                      isChunkSaved={(phrase) => cardInDeck(deck, phrase) || cardInDeck(progress.cards, phrase)}
                      onSaveChunk={saveChunk}
                      onAudioEnd={() => update((current) => ({ ...current, reading: { ...current.reading, done: true } }))}
                      onOpenWord={(wordToken, sentence) => {
                        if (!displayWord(wordToken)) {
                          return;
                        }
                        setSaveNote(null);
                        update((current) => ({ ...current, reading: { ...current.reading, tapped: current.reading.tapped + 1 } }));
                        setPicked({ token: wordToken, sentence });
                      }}
                    />
                    <HandsFreePlayer
                      title={lesson.title}
                      story={lesson.story_text}
                      targetLang={target}
                      throughLang={through}
                      showStart
                      onEngage={() => AudioService.stopAndUnload()}
                    />
                  </View>
                ) : null}

                {frontier === "shadow" ? (
                  <View className="gap-4">
                    {fluencyDay(date) ? (
                      <FluencyStage
                        title={lesson.title}
                        story={lesson.story_text}
                        language={target}
                        nativeLang={through}
                        level={level}
                        onScored={onFluencyScored}
                        onCards={keepRepairCards}
                        onTrouble={() => setSpeechTrouble(true)}
                      />
                    ) : null}
                    <ShadowStage
                      sentences={sentencesOf(lesson.story_text)}
                      language={target}
                      throughLang={through}
                      onScored={onSpeechScored}
                      onTrouble={() => setSpeechTrouble(true)}
                    />
                    {speechTrouble && !run.shadow.skipped && run.shadow.best === null && run.shadow.wpm === null ? (
                      <View className="flex-row">
                        <TactileButton
                          variant="ghost"
                          size="md"
                          onPress={() => update((current) => ({ ...current, shadow: { ...current.shadow, skipped: true } }))}
                          label={local.skipSpeech}
                        />
                      </View>
                    ) : null}
                    {run.shadow.skipped && run.shadow.best === null && run.shadow.wpm === null ? (
                      <Notice tone="info">{local.speechSkipped}</Notice>
                    ) : null}
                  </View>
                ) : null}

                {frontier === "journal" ? (
                  <View className="gap-4">
                    {pinnedReverse ? (
                      <ReconstructionStage anchor={pinnedReverse} onCompleted={onRebuild} onCards={keepRepairCards} />
                    ) : progress.reconstruction?.date === today ? (
                      <Text className="font-sans text-base leading-7 text-muted">{copy.reconstructionNote}</Text>
                    ) : null}
                    <JournalStage
                      prompt={lesson.journal_prompt}
                      targetLang={target}
                      nativeLang={through}
                      level={level}
                      onEvaluated={onJournal}
                      onCards={keepRepairCards}
                    />
                  </View>
                ) : null}

                {frontier === "note" ? (
                  <NoteStage
                    summary={{
                      ratings: run.ratings,
                      elapsed: run.elapsed,
                      tapped: run.reading.tapped,
                      savedWords: run.savedWords,
                      speechBest: run.shadow.best,
                      fluencyWpm: run.shadow.wpm,
                      speechSkipped: run.shadow.skipped,
                      journalScore: run.journal?.score ?? null,
                      rebuildScore: run.rebuild?.score ?? null,
                      xp: run.xp,
                    }}
                    streak={progress.streakCount}
                    finished={run.finished}
                    note={course?.note}
                    clock={course?.clock}
                    weeklyAim={course?.profile.weekly_aim}
                    onAim={async (aim) => {
                      const next = await postProfileSignals(token, target, { weekly_aim: aim });
                      setCourse(next);
                    }}
                    onFinish={finishSession}
                    onHome={exit}
                    onTalk={() => {
                      AudioService.stopAndUnload();
                      router.push("/talk");
                    }}
                  />
                ) : null}

                {frontier !== "note" ? (
                  <View
                    className="mt-6 gap-3 rounded-2xl px-4 py-4"
                    style={{
                      backgroundColor: criterionMet ? palette.pillPositiveBg : palette.raised,
                      borderWidth: 1.5,
                      borderColor: criterionMet ? palette.positive : palette.border,
                      borderBottomWidth: 4,
                    }}
                  >
                    <Text
                      accessibilityLiveRegion="polite"
                      className="font-sans text-sm font-semibold leading-5"
                      style={{ color: criterionMet ? palette.pillPositiveInk : palette.muted }}
                    >
                      {criterionMet ? local.gateMet : gateText}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-3">
                      <TactileButton
                        variant="primary"
                        size="lg"
                        disabled={!criterionMet}
                        onPress={advance}
                        rightIcon={<IconArrow color={palette.onPrimary} />}
                        label={nextId ? fill(local.continueTo, { phase: phaseLabel(nextId) }) : local.finishSave}
                      />
                      {xpFlash > 0 ? (
                        <Text accessibilityLiveRegion="polite" className="font-sans text-base font-extrabold text-accentInk">
                          {fill(local.xpGained, { xp: xpFlash })}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            </StageFrame>
          ) : null}
        </View>
      </ScrollView>
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
    </View>
  );
}
