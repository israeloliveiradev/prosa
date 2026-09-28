import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { CognatePreview } from "@/components/onboarding/cognate-preview";
import { useTheme } from "@/theme/ThemeContext";
import { submitOnboarding } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { kv } from "@/lib/kv";
import {
  STUDY_LANGUAGES,
  THROUGH_LANGUAGES,
  trackLabel,
  type StudyLang,
  type StudyTrack,
  type ThroughLang,
} from "@/lib/languages";
import { useProgress } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";
import { NEWS_THEMES } from "@/lib/themes";

const INTERESTS = NEWS_THEMES;

const DRAFT_KEY = "prosa.onboarding.v1";

function isStudyLang(value: string): value is StudyLang {
  return STUDY_LANGUAGES.some((item) => item.id === value);
}

function isThroughLang(value: string): value is ThroughLang {
  return THROUGH_LANGUAGES.some((item) => item.id === value);
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Level = (typeof LEVELS)[number];

function isLevel(value: string): value is Level {
  return LEVELS.some((level) => level === value);
}

function readDraft(): { tracks: StudyTrack[]; interests: string[]; goal: string; level: Level | null } {
  const empty = { tracks: [{ target_lang: "en" as const, through_lang: "pt" as const, active: true }], interests: [] as string[], goal: "", level: null as Level | null };
  const raw = kv.getString(DRAFT_KEY);
  if (!raw) {
    return empty;
  }
  try {
    const parsed = JSON.parse(raw) as { lang?: string; tracks?: unknown; interests?: unknown; goal?: string; level?: string };
    const interests = Array.isArray(parsed.interests)
      ? parsed.interests.filter((item): item is string => typeof item === "string" && (INTERESTS as readonly string[]).includes(item))
      : [];
    const goal = typeof parsed.goal === "string" ? parsed.goal : "";
    const level = parsed.level && isLevel(parsed.level) ? parsed.level : null;
    if (Array.isArray(parsed.tracks)) {
      const tracks = parsed.tracks.flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }
        const track = item as { target_lang?: string; through_lang?: string; active?: boolean };
        if (!track.target_lang || !track.through_lang || !isStudyLang(track.target_lang) || !isThroughLang(track.through_lang)) {
          return [];
        }
        if (track.target_lang === track.through_lang) {
          return [];
        }
        return [{ target_lang: track.target_lang, through_lang: track.through_lang, active: track.active === true }];
      });
      if (tracks.length > 0) {
        if (!tracks.some((track) => track.active)) {
          tracks[0] = { ...tracks[0], active: true };
        }
        return { tracks, interests, goal, level };
      }
    }
    if (parsed.lang && isStudyLang(parsed.lang)) {
      return { tracks: [{ target_lang: parsed.lang, through_lang: "pt", active: true }], interests, goal, level };
    }
    return { ...empty, interests, goal, level };
  } catch {
    return empty;
  }
}

export default function OnboardingQuiz() {
  const { palette } = useTheme();
  const session = useSession();
  const progress = useProgress();
  const [tracks, setTracks] = useState<StudyTrack[]>([{ target_lang: "en", through_lang: "pt", active: true }]);
  const [interests, setInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("A2");
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
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  function saveDraft(next: { tracks: StudyTrack[]; interests: string[]; goal: string; level: Level }) {
    kv.set(DRAFT_KEY, JSON.stringify(next));
  }

  function selectedGlow(active: boolean) {
    if (!active) {
      return undefined;
    }
    return {
      boxShadow: `0 8px 18px ${palette.primary}52`,
    };
  }

  function updateTracks(next: StudyTrack[]) {
    const withActive = next.some((track) => track.active) ? next : next.map((track, index) => ({ ...track, active: index === 0 }));
    setTracks(withActive);
    saveDraft({ tracks: withActive, interests, goal, level });
  }

  function toggleInterest(label: string) {
    setInterests((current) => {
      if (!current.includes(label) && current.length >= 8) {
        setError("Oito interesses já bastam.");
        return current;
      }
      setError(null);
      const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
      saveDraft({ tracks, interests: next, goal, level });
      return next;
    });
    void tap("light");
  }

  async function create() {
    if (interests.length === 0) {
      setError("Escolha ao menos um interesse.");
      return;
    }
    const keys = tracks.map((track) => `${track.target_lang}:${track.through_lang}`);
    if (new Set(keys).size !== keys.length) {
      setError("Cada combinação de idiomas precisa ser diferente.");
      return;
    }
    if (!session) {
      saveDraft({ tracks, interests, goal, level });
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
      setTopics(result.topics);
      void tap("success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível criar os temas.";
      if (message.includes("Prosa Pro")) {
        router.push("/paywall");
        return;
      }
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  function openTopic(topic: string) {
    void tap("medium");
    router.push({ pathname: "/daily", params: { topic, personalized: "1" } });
  }

  return (
    <AppFrame>
      <PageMasthead
        kicker="Começo"
        title="O que você quer ler."
        dek="Dá para estudar mais de um idioma, e estudar um através de outro. Alemão através do inglês, por exemplo. A prosa e a tradução seguem o par marcado para hoje."
      />

      {creating ? <CreatingPulse still={reduceMotion} /> : null}

      {!creating && topics.length === 0 ? (
        <View className="mt-10 gap-10">
          <View className="gap-6">
            <Text className="font-label text-sm text-muted">Idiomas</Text>
            {tracks.map((track, index) => (
              <View key={`${track.target_lang}-${track.through_lang}-${index}`} className="gap-4 rounded-[28px] border border-line bg-card px-4 py-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-display text-2xl text-ink">{trackLabel(track)}</Text>
                  {tracks.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Tirar ${trackLabel(track)}`}
                      onPress={() => updateTracks(tracks.filter((_, itemIndex) => itemIndex !== index))}
                      className="min-h-12 cursor-pointer items-center justify-center rounded-full border border-line px-4"
                    >
                      <Text className="font-label text-base text-ink">Tirar</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text className="font-label text-sm text-muted">Estudar</Text>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {STUDY_LANGUAGES.map((item) => {
                    const active = item.id === track.target_lang;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`Estudar ${item.name}`}
                        accessibilityState={{ selected: active, checked: active }}
                        onPress={() => {
                          const through = item.id === track.through_lang ? (item.id === "en" ? "pt" : "en") : track.through_lang;
                          updateTracks(tracks.map((current, itemIndex) => (itemIndex === index ? { ...current, target_lang: item.id, through_lang: through } : current)));
                          void tap("light");
                        }}
                        style={selectedGlow(active)}
                        className={`min-h-14 items-center justify-center rounded-full px-5 ${active ? "bg-ember" : "border border-line bg-paper"}`}
                      >
                        <Text numberOfLines={1} className={`font-label text-base ${active ? "text-onEmber" : "text-ink"}`}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="font-label text-sm text-muted">Através de</Text>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {THROUGH_LANGUAGES.filter((item) => item.id !== track.target_lang).map((item) => {
                    const active = item.id === track.through_lang;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`Através do ${item.name}`}
                        accessibilityState={{ selected: active, checked: active }}
                        onPress={() => {
                          updateTracks(tracks.map((current, itemIndex) => (itemIndex === index ? { ...current, through_lang: item.id } : current)));
                          void tap("light");
                        }}
                        style={selectedGlow(active)}
                        className={`min-h-14 items-center justify-center rounded-full px-5 ${active ? "bg-ink" : "border border-line bg-paper"}`}
                      >
                        <Text numberOfLines={1} className={`font-label text-base ${active ? "text-card" : "text-ink"}`}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={`Usar hoje: ${trackLabel(track)}`}
                  accessibilityState={{ selected: track.active, checked: track.active }}
                  onPress={() => updateTracks(tracks.map((current, itemIndex) => ({ ...current, active: itemIndex === index })))}
                  className={`min-h-12 cursor-pointer items-center justify-center self-start rounded-full px-5 ${track.active ? "bg-ember" : "border border-line bg-paper"}`}
                >
                  <Text className={`font-label text-base ${track.active ? "text-onEmber" : "text-ink"}`}>
                    {track.active ? "Este é o de hoje" : "Usar este hoje"}
                  </Text>
                </Pressable>
              </View>
            ))}
            {tracks.length < 7 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!(progress.pro || session?.user.plan === "pro")) {
                    router.push("/paywall");
                    return;
                  }
                  const used = new Set(tracks.map((track) => track.target_lang));
                  const target = STUDY_LANGUAGES.find((item) => !used.has(item.id))?.id ?? "de";
                  updateTracks([...tracks, { target_lang: target, through_lang: target === "en" ? "pt" : "en", active: false }]);
                  void tap("light");
                }}
                className="min-h-14 cursor-pointer items-center justify-center self-start rounded-full border border-ink px-6"
              >
                <Text className="font-label text-base text-ink">Adicionar outro idioma</Text>
              </Pressable>
            ) : null}
          </View>

          <View>
            <Text className="font-label text-sm text-muted">Nível</Text>
            <View accessibilityRole="radiogroup" className="mt-3 flex-row flex-wrap gap-2">
              {LEVELS.map((item) => {
                const active = item === level;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={`Nível ${item}`}
                    accessibilityState={{ selected: active, checked: active }}
                    onPress={() => {
                      setLevel(item);
                      saveDraft({ tracks, interests, goal, level: item });
                      void tap("light");
                    }}
                    style={selectedGlow(active)}
                    className={`h-12 w-14 items-center justify-center rounded-full ${active ? "bg-ember" : "border border-line bg-card"}`}
                  >
                    <Text className={`font-label text-sm ${active ? "text-onEmber" : "text-ink"}`}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {level === "A1" ? (
            <CognatePreview
              through={tracks.find((track) => track.active)?.through_lang ?? "pt"}
              target={tracks.find((track) => track.active)?.target_lang ?? "en"}
            />
          ) : null}

          <View>
            <Text className="font-label text-sm text-muted">Interesses</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {INTERESTS.map((label) => {
                const active = interests.includes(label);
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="checkbox"
                    accessibilityLabel={label}
                    accessibilityState={{ checked: active }}
                    onPress={() => toggleInterest(label)}
                    style={selectedGlow(active)}
                    className={`min-h-14 items-center justify-center rounded-full px-5 ${active ? "bg-ember" : "border border-line bg-card"}`}
                  >
                    <Text numberOfLines={1} className={`font-label text-base ${active ? "text-onEmber" : "text-ink"}`}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="mb-2 font-label text-sm text-muted">Objetivo</Text>
            <TextInput
              value={goal}
              onChangeText={(value) => {
                setGoal(value);
                saveDraft({ tracks, interests, goal: value, level });
              }}
              accessibilityLabel="Objetivo"
              placeholder="Por exemplo, falar no trabalho"
              placeholderTextColor={palette.onSurfaceVariant}
              className="min-h-14 rounded-full bg-card px-5 text-base text-ink"
            />
          </View>

          {error ? <Text className="text-base text-roseInk">{error}</Text> : null}
          <ChunkButton label={session ? "Criar meus temas" : "Entrar para criar os temas"} onPress={() => void create()} className="w-full lg:w-auto lg:self-start" />
          {session ? null : <Text className="text-sm leading-5 text-muted">A escolha fica neste aparelho até você entrar.</Text>}
        </View>
      ) : null}

      {!creating && topics.length > 0 ? (
        <View className="mt-10">
          <Text className="font-label text-sm text-muted">Temas para o idioma de hoje</Text>
          <View className="mt-4">
            {topics.map((topic) => (
              <View key={topic} className="mt-3">
                <ActionRow title={topic} detail="Começar a prosa com este tema." label={`Começar com ${topic}`} onPress={() => openTopic(topic)} />
              </View>
            ))}
          </View>
          <ChunkButton label="Começar a prosa" onPress={() => openTopic(topics[0] ?? "everyday life")} className="mt-8 w-full lg:w-auto" />
        </View>
      ) : null}
    </AppFrame>
  );
}

function CreatingPulse({ still }: { still: boolean }) {
  const shift = useSharedValue(0);
  useEffect(() => {
    if (still) {
      return;
    }
    shift.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [shift, still]);
  const style = useAnimatedStyle(() => ({ opacity: still ? 1 : 0.35 + shift.value * 0.65 }));
  return (
    <View className="mt-12 border-t border-ink pt-8">
      <Animated.View style={style}>
        <Text className="font-displayItalic text-headline text-ink">Criando seu ecossistema de aprendizado personalizado</Text>
      </Animated.View>
      <Text className="mt-4 max-w-xl text-base leading-7 text-muted">Os temas saem dos interesses e do idioma marcado para hoje.</Text>
    </View>
  );
}
