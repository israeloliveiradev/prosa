import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { HandsFreePlayer } from "@/components/session/hands-free-player";
import { JournalStage } from "@/components/session/journal-stage";
import { ReconstructionStage } from "@/components/session/reconstruction-stage";
import { ProgressBar } from "@/components/session/progress-bar";
import { ReadingStage } from "@/components/session/reading-stage";
import { ShadowStage } from "@/components/session/shadow-stage";
import { SrsStage } from "@/components/session/srs-stage";
import { WordSheet } from "@/components/session/word-sheet";
import { Figure } from "@/components/cast/figure";
import { AppFrame } from "@/components/shell/app-frame";
import { mindCopy, mindForPhase } from "@/lib/cast";
import { getLocale } from "@/lib/i18n";
import { keepWords } from "@/lib/text";
import { useTheme } from "@/theme/ThemeContext";
import { ChunkButton } from "@/components/shell/chunk-button";
import { generateLesson, generatePersonalized, prefetchSpeech } from "@/lib/api";
import { allSentences, handsFreeIntro } from "@/lib/hands-free";
import { narratorVoice } from "@/lib/narrator";
import { useSession } from "@/lib/session";
import { tap } from "@/lib/haptics";
import { AudioService } from "@/services/audio/AudioService";
import {
  PHASES,
  SESSION_SECONDS,
  cardsFromLesson,
  findVocabulary,
  formatClock,
  normalizeWord,
  phaseForElapsed,
  sentencesOf,
} from "@/lib/lesson";
import {
  cardsForLesson,
  enqueueReview,
  getProgress,
  isoDate,
  markSessionComplete,
  noteCognateLesson,
  persistDeck,
  recordJournal,
  recordSpeaking,
  rememberLesson,
  completeReconstruction,
  useProgress,
} from "@/lib/progress";
import { reconstructionDue } from "@/lib/reconstruction";
import { useProgressReady } from "@/lib/query";
import type { ReviewQuality } from "@/lib/sm2";
import type { PhaseId, SessionCard } from "@/lib/types";

export default function DailySession() {
  const { palette } = useTheme();
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
    queryKey: ["lesson", date, topic, profile.target_lang, personalized ? session?.user.id : "shared"],
    queryFn: () => {
      const stored = getProgress();
      const cognate = profile.level === "A1" && stored.cognateKeys.length < 5 && !session;
      return personalized && session
        ? generatePersonalized(session.token, topic)
        : generateLesson({ ...profile, topic, ...(cognate ? { cognate: true } : {}) }, session?.token);
    },
    enabled: ready && allowed && !savedLesson,
    initialData: savedLesson ?? undefined,
    networkMode: "offlineFirst",
    staleTime: Infinity,
  });
  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<PhaseId>("reading");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const stageRef = useRef<PhaseId>("reading");
  const clockStarted = useRef(false);
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
    if (!ready || !lesson) {
      return;
    }
    const key = `${date}:${topic}:${lesson.title}`;
    if (seeded.current === key) {
      return;
    }
    seeded.current = key;
    const stored = getProgress();
    const nextDeck = cardsForLesson(cardsFromLesson(lesson), stored.cards);
    rememberLesson(date, topic, lesson, nextDeck, {
      targetLang: profile.target_lang,
      throughLang: profile.native_lang,
      level: profile.level,
    });
    if (!session && lesson.anchors?.some((item) => item.kind === "true")) {
      noteCognateLesson(date, topic);
    }
    setDeck(nextDeck);
  }, [date, lesson, ready, topic]);

  useEffect(() => {
    if (!lesson || elapsed >= SESSION_SECONDS) {
      return;
    }
    const timer = setInterval(() => {
      setElapsed((value) => Math.min(SESSION_SECONDS, value + 1));
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
    const next = phaseForElapsed(elapsed);
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
  }, [elapsed]);

  function continuePhase() {
    AudioService.stopAndUnload();
    const next = PHASES.find((phase) => phase.start > elapsed);
    setElapsed(next ? next.start : SESSION_SECONDS);
  }

  function onDeck(next: SessionCard[], graded: SessionCard, quality: ReviewQuality) {
    setDeck(next);
    persistDeck(next);
    enqueueReview(graded, quality);
  }

  const entry = lesson && selectedToken ? findVocabulary(lesson.vocabulary, selectedToken) : undefined;
  const saved = entry ? deck.some((card) => normalizeWord(card.front_phrase) === normalizeWord(entry.word)) : false;

  function saveWord() {
    if (!entry || saved) {
      return;
    }
    void tap("success");
    setDeck((current) => {
      const next = [
        ...current,
        {
          id: `saved-${normalizeWord(entry.word)}`,
          front_phrase: entry.word,
          back_translation: entry.translation,
          context_sentence: entry.example_sentence,
          repetition_count: 0,
          interval_days: 0,
          ease_factor: 2.5,
          status: "learning" as const,
        },
      ];
      persistDeck(next);
      return next;
    });
    setSelectedToken(null);
  }

  const loading = !ready || (allowed && !lesson && (query.isPending || query.isFetching));
  const blocked = ready && !allowed;

  return (
    <AppFrame scroll={false}>
      <View className="min-h-0 flex-1 flex-row">
        <ScrollView className="min-w-0 flex-1" contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
          <View className="px-5 py-4 md:mx-auto md:w-full md:max-w-3xl md:px-8 md:py-6">
            <ProgressBar elapsed={elapsed} />
            {loading ? (
              <View className="mt-10 gap-3">
                <View className="h-8 w-2/3 rounded-full bg-line" />
                <View className="h-4 w-full rounded-full bg-line" />
                <View className="h-4 w-5/6 rounded-full bg-line" />
                <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} />
                <Text className="text-center font-sans text-base text-muted">Preparando a prosa de hoje</Text>
              </View>
            ) : null}
            {blocked ? (
              <View className="mt-10 border-t border-ink pt-6">
                <Text className="font-displayItalic text-headline text-ink">A prosa grátis de hoje já foi aberta</Text>
                <Text className="mt-3 max-w-xl text-base leading-7 text-muted">Outro tema e novas lições no mesmo dia ficam na Prosa Pro.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace(progress.topic ? { pathname: "/daily", params: { topic: progress.topic } } : "/daily")}
                  className="mt-6 min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6"
                >
                  <Text className="font-label text-base text-onEmber">Continuar a de hoje</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push("/paywall")} className="mt-3 min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line px-6">
                  <Text className="font-label text-base text-ink">Ver Prosa Pro</Text>
                </Pressable>
              </View>
            ) : null}
            {query.error && !lesson ? (
              <View className="mt-10">
                <Text className="font-displayItalic text-headline text-ink">A lição não abriu</Text>
                <Text className="mt-3 text-base leading-7 text-muted">{query.error instanceof Error ? query.error.message : "Não foi possível abrir a lição."}</Text>
                <Pressable accessibilityRole="button" onPress={() => void query.refetch()} className="mt-6 min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6">
                  <Text className="font-label text-base text-onEmber">Tentar de novo</Text>
                </Pressable>
              </View>
            ) : null}
            {lesson && stage === "reading" ? (
              <View className="mt-6">
                <AreaHint area="prosa" />
                <ReadingStage lesson={lesson} language={profile.target_lang} active={stage === "reading"} onOpenWord={setSelectedToken} />
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
            {lesson && stage === "shadow" ? (
              <View className="mt-6">
                <ShadowStage sentences={sentencesOf(lesson.story_text)} language={profile.target_lang} onScored={recordSpeaking} />
              </View>
            ) : null}
            {lesson && stage === "journal" ? (
              <View className="mt-6">
                {pinnedReverse ? (
                  <ReconstructionStage anchor={pinnedReverse} onCompleted={() => completeReconstruction(today)} />
                ) : progress.reconstruction?.date === today ? (
                  <Text className="mb-8 text-base leading-7 text-muted">
                    No terceiro dia esta tradução volta sozinha, sem a história, para você reescrever.
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
                  }}
                />
                {elapsed >= SESSION_SECONDS ? (
                  <View className="mt-6 items-center">
                    <Text className="text-center font-label text-base text-moss">Vinte minutos completos.</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        AudioService.stopAndUnload();
                        router.push(session ? "/duel" : "/account");
                      }}
                      className="mt-4 min-h-12 items-center justify-center rounded-full bg-ember px-6"
                    >
                      <Text className="text-base font-semibold text-onEmber">Duelo de 120 segundos</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            {lesson && elapsed < SESSION_SECONDS ? (
              <ChunkButton className="mt-8 w-full" label={`Continuar · ${formatClock(elapsed)}`} onPress={continuePhase} tone="ghost" />
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
              {PHASES.map((phase) => {
                const active = stage === phase.id;
                return (
                  <View key={phase.id} className="min-h-12 flex-row items-center justify-between border-b border-line">
                    <Text className={`font-label text-sm ${active ? "text-ink" : "text-muted"}`}>{phase.label}</Text>
                    <Text className="text-xs uppercase tracking-widest text-muted">{active ? "Agora" : ""}</Text>
                  </View>
                );
              })}
            </View>
          </View>
      </View>
      <WordSheet token={selectedToken} entry={entry} saved={saved} onClose={() => setSelectedToken(null)} onSave={saveWord} />
    </AppFrame>
  );
}

