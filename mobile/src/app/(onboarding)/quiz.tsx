import { Redirect, router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, TextInput, View, ScrollView } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { Flag } from "@/components/shell/flag";
import { useTheme } from "@/theme/ThemeContext";
import { listStudyTracks, submitOnboarding } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { kv } from "@/lib/kv";
import {
  CEFR_LEVELS,
  STUDY_LANGUAGES,
  THROUGH_LANGUAGES,
  isCourseLevel,
  isStudyLang,
  isThroughLang,
  languageName,
  trackLabel,
  type CourseLevel,
  type StudyTrack,
} from "@/lib/languages";
import { bindProgressLang } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";
import { NEWS_THEMES } from "@/lib/themes";

const INTERESTS = NEWS_THEMES;
const DRAFT_KEY = "prosa.onboarding.v1";
const LEVELS = CEFR_LEVELS;
type Level = CourseLevel;
type SessionMode = "lite_20" | "pro_40" | "sprint_60";

const TOTAL_STEPS = 4;

function isLevel(value: string): value is Level {
  return isCourseLevel(value);
}

function readDraft(): {
  tracks: StudyTrack[];
  interests: string[];
  goal: string;
  level: Level | null;
  durationMode: SessionMode;
} {
  const empty = {
    tracks: [{ target_lang: "en" as const, through_lang: "pt" as const, level: "A2" as const, active: true }],
    interests: [] as string[],
    goal: "",
    level: null as Level | null,
    durationMode: "lite_20" as SessionMode,
  };
  const raw = kv.getString(DRAFT_KEY);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as {
      lang?: string;
      tracks?: unknown;
      interests?: unknown;
      goal?: string;
      level?: string;
      durationMode?: string;
    };
    const interests = Array.isArray(parsed.interests)
      ? parsed.interests.filter((item): item is string => typeof item === "string" && (INTERESTS as readonly string[]).includes(item))
      : [];
    const goal = typeof parsed.goal === "string" ? parsed.goal : "";
    const level = parsed.level && isLevel(parsed.level) ? parsed.level : null;
    const durationMode: SessionMode =
      parsed.durationMode === "pro_40" || parsed.durationMode === "sprint_60"
        ? parsed.durationMode
        : "lite_20";

    if (Array.isArray(parsed.tracks)) {
      const tracks = parsed.tracks.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const track = item as { target_lang?: string; through_lang?: string; level?: string; active?: boolean };
        if (!track.target_lang || !track.through_lang || !isStudyLang(track.target_lang) || !isThroughLang(track.through_lang)) return [];
        if (track.target_lang === track.through_lang) return [];
        return [{
          target_lang: track.target_lang,
          through_lang: track.through_lang,
          level: track.level && isLevel(track.level) ? track.level : "A2",
          active: track.active === true,
        }];
      });
      if (tracks.length > 0) {
        if (!tracks.some((t) => t.active)) tracks[0] = { ...tracks[0], active: true };
        return { tracks, interests, goal, level, durationMode };
      }
    }
    return { ...empty, interests, goal, level, durationMode };
  } catch {
    return empty;
  }
}

export default function OnboardingQuiz() {
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();

  const [currentStep, setCurrentStep] = useState(0); // 0: Idioma, 1: Nível, 2: Meta 360h, 3: Interesses
  const [tracks, setTracks] = useState<StudyTrack[]>([{ target_lang: "en", through_lang: "pt", level: "A2", active: true }]);
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("A2");
  const [durationMode, setDurationMode] = useState<SessionMode>("lite_20");
  const [creating, setCreating] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    setTracks(draft.tracks);
    setInterests(draft.interests);
    setGoal(draft.goal);
    setLevel(draft.level ?? session?.user.level ?? "A2");
    setDurationMode(draft.durationMode);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  function saveDraft(next: { tracks: StudyTrack[]; interests: string[]; goal: string; level: Level; durationMode: SessionMode }) {
    kv.set(DRAFT_KEY, JSON.stringify(next));
  }

  function updateTracks(next: StudyTrack[]) {
    const withActive = next.some((t) => t.active) ? next : next.map((t, i) => ({ ...t, active: i === 0 }));
    setTracks(withActive);
    saveDraft({ tracks: withActive, interests, goal, level, durationMode });
  }

  function toggleInterest(label: string) {
    setInterests((current) => {
      if (!current.includes(label) && current.length >= 8) {
        setError("Selecione até 8 interesses.");
        return current;
      }
      setError(null);
      const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
      saveDraft({ tracks, interests: next, goal, level, durationMode });
      return next;
    });
    void tap("light");
  }

  const handleNextStep = () => {
    void tap("medium");
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void create();
    }
  };

  const handlePrevStep = () => {
    void tap("light");
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  async function create() {
    if (interests.length === 0) {
      setError("Por favor, selecione pelo menos 1 interesse para personalizar suas lições.");
      return;
    }
    if (!session) {
      saveDraft({ tracks, interests, goal, level, durationMode });
      router.push("/account");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const result = await submitOnboarding(session.token, {
        interests,
        tracks,
        level,
        ...(goal.trim() ? { goal: goal.trim() } : {}),
      });
      rememberProfile({
        target_lang: result.target_lang,
        native_lang: result.native_lang,
        interests,
        level: result.level === "A1" || result.level === "A2" || result.level === "B1" || result.level === "B2" || result.level === "C1" || result.level === "C2" ? result.level : level,
      });
      bindProgressLang(result.target_lang);
      setTopics(result.topics);
      void tap("success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : copy.createTopicsFailed;
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  function openTopic(topic: string) {
    void tap("medium");
    router.push({ pathname: "/daily", params: { topic, personalized: "1" } });
  }

  if (!session) {
    return <Redirect href="/account" />;
  }

  const activeTrack = tracks[0] ?? { target_lang: "en", through_lang: "pt", level: "A2", active: true };

  return (
    <AppFrame>
      <View className="flex-1 justify-between bg-canvas px-4 py-6">
        {/* Top Header & Segmented Progress Bar (Duolingo Style) */}
        {!creating && topics.length === 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              {currentStep > 0 ? (
                <Pressable
                  onPress={handlePrevStep}
                  className="h-10 w-10 items-center justify-center rounded-full bg-card border border-line active:opacity-70"
                >
                  <Text className="text-lg font-bold text-ink">←</Text>
                </Pressable>
              ) : (
                <View className="h-10 w-10" />
              )}

              <Text className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                Passo {currentStep + 1} de {TOTAL_STEPS}
              </Text>

              <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Text className="text-base font-bold text-emerald-500">💬</Text>
              </View>
            </View>

            {/* Segmented Progress Indicator Bar */}
            <View className="flex-row gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
                <View
                  key={idx}
                  className={`h-2 flex-1 rounded-full ${
                    idx <= currentStep ? "bg-emerald-500" : "bg-line"
                  }`}
                />
              ))}
            </View>
          </View>
        )}

        {/* Loading Spinner / Pulse */}
        {creating ? <CreatingPulse still={reduceMotion} /> : null}

        {/* Step Content */}
        {!creating && topics.length === 0 && (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* STEP 0: LANGUAGE SELECTION */}
            {currentStep === 0 && (
              <Animated.View entering={FadeInRight} exiting={FadeOutLeft} className="gap-6">
                <View>
                  <Text className="font-display text-3xl font-extrabold text-ink">
                    Qual idioma você quer aprender?
                  </Text>
                  <Text className="mt-2 text-base text-muted">
                    Selecione a língua alvo para iniciar sua jornada de estudo.
                  </Text>
                </View>

                <View className="gap-3">
                  {STUDY_LANGUAGES.map((langItem) => {
                    const isSelected = activeTrack.target_lang === langItem.id;
                    return (
                      <Pressable
                        key={langItem.id}
                        onPress={() => {
                          const through = langItem.id === activeTrack.through_lang ? (langItem.id === "en" ? "pt" : "en") : activeTrack.through_lang;
                          updateTracks([{ target_lang: langItem.id, through_lang: through, level: activeTrack.level ?? "A2", active: true }]);
                          void tap("light");
                        }}
                        className={`flex-row items-center justify-between rounded-3xl p-5 border min-h-20 ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500 shadow-md"
                            : "bg-card border-line active:bg-cardHover"
                        }`}
                      >
                        <View className="flex-row items-center gap-4">
                          <Flag code={langItem.id} size={40} />
                          <Text className="text-xl font-bold text-ink">
                            {languageName(langItem.id)}
                          </Text>
                        </View>
                        <View
                          className={`h-7 w-7 rounded-full border items-center justify-center ${
                            isSelected ? "bg-emerald-500 border-emerald-500" : "border-line"
                          }`}
                        >
                          {isSelected && <Text className="text-xs font-bold text-white">✓</Text>}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* STEP 1: CEFR LEVEL SELECTION */}
            {currentStep === 1 && (
              <Animated.View entering={FadeInRight} exiting={FadeOutLeft} className="gap-6">
                <View>
                  <Text className="font-display text-3xl font-extrabold text-ink">
                    Qual seu conhecimento em {languageName(activeTrack.target_lang)}?
                  </Text>
                  <Text className="mt-2 text-base text-muted">
                    Ajustaremos a dificuldade do vocabulário para seu momento.
                  </Text>
                </View>

                <View className="gap-3">
                  {[
                    { code: "A1", name: "Iniciante Absoluto", desc: "Estou começando do zero nesta língua." },
                    { code: "A2", name: "Elementar", desc: "Entendo palavras simples e frases básicas." },
                    { code: "B1", name: "Intermediário", desc: "Consigo conversar em situações do dia a dia." },
                    { code: "B2", name: "Intermediário Avançado", desc: "Falo com boa autonomia e entendo nativos." },
                    { code: "C1", name: "Avançado", desc: "Compreendo textos complexos e mídias sem legenda." },
                  ].map((levelItem) => {
                    const isSelected = level === levelItem.code;
                    return (
                      <Pressable
                        key={levelItem.code}
                        onPress={() => {
                          setLevel(levelItem.code as Level);
                          saveDraft({ tracks, interests, goal, level: levelItem.code as Level, durationMode });
                          void tap("light");
                        }}
                        className={`rounded-3xl p-5 border min-h-20 ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500 shadow-md"
                            : "bg-card border-line active:bg-cardHover"
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-xs font-bold uppercase tracking-wider text-amber-500">
                            Nível {levelItem.code}
                          </Text>
                          {isSelected && <Text className="text-sm font-bold text-amber-500">✓ Selecionado</Text>}
                        </View>
                        <Text className="text-lg font-bold text-ink">{levelItem.name}</Text>
                        <Text className="mt-1 text-xs text-muted leading-5">{levelItem.desc}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => router.push("/placement" as Href)}
                  className="rounded-2xl border border-line bg-card p-4 items-center"
                >
                  <Text className="text-xs font-bold text-emerald-500">
                    Não tem certeza? Fazer Teste de Nivelamento Gratuito ➔
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* STEP 2: SESSION DURATION & 360H GOAL */}
            {currentStep === 2 && (
              <Animated.View entering={FadeInRight} exiting={FadeOutLeft} className="gap-6">
                <View>
                  <Text className="font-display text-3xl font-extrabold text-ink">
                    Qual sua meta diária de estudos?
                  </Text>
                  <Text className="mt-2 text-base text-muted">
                    Mantenha o ritmo ideal rumo à marca das 360 horas de fluência B2.
                  </Text>
                </View>

                <View className="gap-4">
                  {[
                    {
                      mode: "lite_20" as SessionMode,
                      badge: "⚡ 20 min / dia",
                      title: "Modo Lite (Manutenção)",
                      desc: "Excelente para criar a rotina diária sem sobrecarregar sua agenda.",
                    },
                    {
                      mode: "pro_40" as SessionMode,
                      badge: "🔥 40 min / dia",
                      title: "Modo Pro (Recomendado)",
                      desc: "Evolução acelerada combinando leitura, escuta e produção oral.",
                    },
                    {
                      mode: "sprint_60" as SessionMode,
                      badge: "🚀 60 min / dia",
                      title: "Polyglot Sprint",
                      desc: "Imersão máxima com treino de escrita conversação em 6 blocos.",
                    },
                  ].map((option) => {
                    const isSelected = durationMode === option.mode;
                    return (
                      <Pressable
                        key={option.mode}
                        onPress={() => {
                          setDurationMode(option.mode);
                          saveDraft({ tracks, interests, goal, level, durationMode: option.mode });
                          void tap("light");
                        }}
                        className={`rounded-3xl p-6 border min-h-24 ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500 shadow-md"
                            : "bg-card border-line active:bg-cardHover"
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-xs font-extrabold text-cyan-500 uppercase tracking-wider">
                            {option.badge}
                          </Text>
                          {isSelected && <Text className="text-sm font-bold text-cyan-500">✓ Ativo</Text>}
                        </View>
                        <Text className="text-xl font-bold text-ink">{option.title}</Text>
                        <Text className="mt-1 text-xs text-muted leading-5">{option.desc}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* STEP 3: INTERESTS & GOAL */}
            {currentStep === 3 && (
              <Animated.View entering={FadeInRight} exiting={FadeOutLeft} className="gap-6">
                <View>
                  <Text className="font-display text-3xl font-extrabold text-ink">
                    O que mais te interessa?
                  </Text>
                  <Text className="mt-2 text-base text-muted">
                    Selecione de 1 a 8 assuntos para gerarmos seus artigos e diálogos.
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-2.5">
                  {INTERESTS.map((label) => {
                    const active = interests.includes(label);
                    return (
                      <Pressable
                        key={label}
                        onPress={() => toggleInterest(label)}
                        className={`min-h-12 items-center justify-center rounded-2xl px-5 border ${
                          active
                            ? "bg-emerald-500 border-emerald-500"
                            : "bg-card border-line active:bg-cardHover"
                        }`}
                      >
                        <Text className={`text-sm font-bold ${active ? "text-white" : "text-ink"}`}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-2 rounded-3xl border border-line bg-card p-5">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Objetivo Pessoal (Opcional)
                  </Text>
                  <TextInput
                    value={goal}
                    onChangeText={(val) => {
                      setGoal(val);
                      saveDraft({ tracks, interests, goal: val, level, durationMode });
                    }}
                    placeholder="Ex: Fazer entrevistas de emprego em inglês..."
                    placeholderTextColor={palette.onSurfaceVariant}
                    className="min-h-12 text-sm text-ink"
                  />
                </View>

                {error ? (
                  <Text accessibilityRole="alert" className="text-sm font-semibold text-rose-500">
                    {error}
                  </Text>
                ) : null}
              </Animated.View>
            )}
          </ScrollView>
        )}

        {/* STEP RESULT / TOPICS GENERATED */}
        {!creating && topics.length > 0 && (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <Text className="font-display text-2xl font-bold text-ink">
                Sua Jornada Está Pronta! 🎉
              </Text>
              <Text className="text-sm text-muted mb-4">
                Criamos lições personalizadas com base nos seus interesses.
              </Text>

              {topics.map((t) => (
                <ActionRow
                  key={t}
                  title={t}
                  detail="Iniciar lição adaptativa"
                  label={`Iniciar ${t}`}
                  onPress={() => openTopic(t)}
                />
              ))}

              <Pressable
                onPress={() => openTopic(topics[0] ?? "everyday life")}
                className="mt-6 rounded-2xl bg-emerald-500 p-4 items-center"
              >
                <Text className="text-base font-extrabold text-white">COMEÇAR PRIMEIRA LIÇÃO ➔</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {/* Bottom Sticky Primary CTA Button (Duolingo Style) */}
        {!creating && topics.length === 0 && (
          <View className="pt-4 border-t border-line/50">
            <Pressable
              onPress={handleNextStep}
              className="min-h-16 w-full rounded-2xl bg-emerald-500 items-center justify-center active:opacity-90 shadow-lg"
            >
              <Text className="text-base font-extrabold tracking-wider text-white uppercase">
                {currentStep < TOTAL_STEPS - 1 ? "CONTINUAR ➔" : "CRIAR MINHAS LIÇÕES 🎉"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </AppFrame>
  );
}

function CreatingPulse({ still }: { still: boolean }) {
  const copy = useCopy();
  const shift = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    shift.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [shift, still]);
  const style = useAnimatedStyle(() => ({ opacity: still ? 1 : 0.35 + shift.value * 0.65 }));
  return (
    <View className="my-auto rounded-3xl border border-line bg-card p-8 items-center justify-center">
      <Animated.View style={style}>
        <Text className="font-display text-2xl font-bold text-emerald-500">{copy.creatingTopics}</Text>
      </Animated.View>

      <View className="mt-6 h-3 w-48 overflow-hidden rounded-full bg-line">
        <Animated.View className="h-full w-24 rounded-full bg-emerald-500" style={style} />
      </View>

      <Text className="mt-4 text-center text-sm leading-6 text-muted">{copy.creatingTopicsDek}</Text>
    </View>
  );
}
