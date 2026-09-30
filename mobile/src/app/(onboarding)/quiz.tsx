import { Redirect, router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { ChunkButton } from "@/components/shell/chunk-button";
import { CognatePreview } from "@/components/onboarding/cognate-preview";
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

function isLevel(value: string): value is Level {
  return isCourseLevel(value);
}

function readDraft(): { tracks: StudyTrack[]; interests: string[]; goal: string; level: Level | null } {
  const empty = { tracks: [{ target_lang: "en" as const, through_lang: "pt" as const, level: "A2" as const, active: true }], interests: [] as string[], goal: "", level: null as Level | null };
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
        const track = item as { target_lang?: string; through_lang?: string; level?: string; active?: boolean };
        if (!track.target_lang || !track.through_lang || !isStudyLang(track.target_lang) || !isThroughLang(track.through_lang)) {
          return [];
        }
        if (track.target_lang === track.through_lang) {
          return [];
        }
        return [{
          target_lang: track.target_lang,
          through_lang: track.through_lang,
          level: track.level && isLevel(track.level) ? track.level : "A2",
          active: track.active === true,
        }];
      });
      if (tracks.length > 0) {
        if (!tracks.some((track) => track.active)) {
          tracks[0] = { ...tracks[0], active: true };
        }
        return { tracks, interests, goal, level };
      }
    }
    if (parsed.lang && isStudyLang(parsed.lang)) {
      return { tracks: [{ target_lang: parsed.lang, through_lang: "pt", level: "A2", active: true }], interests, goal, level };
    }
    return { ...empty, interests, goal, level };
  } catch {
    return empty;
  }
}

export default function OnboardingQuiz() {
  const { palette } = useTheme();
  const copy = useCopy();
  const session = useSession();
  const [tracks, setTracks] = useState<StudyTrack[]>([{ target_lang: "en", through_lang: "pt", level: "A2", active: true }]);
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

  useEffect(() => {
    if (!session) {
      return;
    }
    if (session.user.interests && session.user.interests.length > 0) {
      setInterests(session.user.interests);
    }
    setLevel(session.user.level);
    void listStudyTracks(session.token)
      .then((rows) => {
        const mapped = (rows.length > 0 ? rows : [{ target_lang: session.user.target_lang, through_lang: session.user.native_lang, level: session.user.level, active: true }]).flatMap((item) => {
          if (!isStudyLang(item.target_lang) || !isThroughLang(item.through_lang) || item.target_lang === item.through_lang) {
            return [];
          }
          return [{
            target_lang: item.target_lang,
            through_lang: item.through_lang,
            level: isLevel(item.level) ? item.level : session.user.level,
            active: item.active,
          }];
        });
        if (mapped.length > 0) {
          if (!mapped.some((track) => track.active)) {
            mapped[0] = { ...mapped[0], active: true };
          }
          setTracks(mapped);
        }
      })
      .catch(() => {
        if (isStudyLang(session.user.target_lang) && isThroughLang(session.user.native_lang) && session.user.target_lang !== session.user.native_lang) {
          setTracks([{ target_lang: session.user.target_lang, through_lang: session.user.native_lang, level: session.user.level, active: true }]);
        }
      });
  }, [session?.user.id]);

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
        setError(copy.quizEight);
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
      setError(copy.quizPickOne);
      return;
    }
    const keys = tracks.map((track) => `${track.target_lang}:${track.through_lang}`);
    if (new Set(keys).size !== keys.length) {
      setError(copy.quizPairsDiffer);
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

  return (
    <AppFrame>
      <PageMasthead
        kicker={copy.quizKicker}
        title={copy.quizTitle}
        dek={copy.quizDek}
      />

      {creating ? <CreatingPulse still={reduceMotion} /> : null}

      {!creating && topics.length === 0 ? (
        <View className="mt-10 gap-10">
          <View className="gap-6">
            <Text className="font-label text-sm text-muted">{copy.quizLanguages}</Text>
            {tracks.map((track, index) => (
              <View key={track.target_lang} className="gap-4 rounded-[28px] border border-line bg-card px-4 py-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    <Flag code={track.target_lang} size={32} />
                    <Text className="font-display text-2xl text-ink">{trackLabel(track)}</Text>
                  </View>
                  {tracks.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${copy.removeTrack} ${trackLabel(track)}`}
                      onPress={() => updateTracks(tracks.filter((_, itemIndex) => itemIndex !== index))}
                      className="min-h-12 cursor-pointer items-center justify-center rounded-full border border-line px-4"
                    >
                      <Text className="font-label text-base text-ink">{copy.removeTrack}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text className="font-label text-sm text-muted">{copy.study}</Text>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {STUDY_LANGUAGES.map((item) => {
                    const active = item.id === track.target_lang;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`${copy.study} ${languageName(item.id)}`}
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
                          {languageName(item.id)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="font-label text-sm text-muted">{copy.through}</Text>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {THROUGH_LANGUAGES.filter((item) => item.id !== track.target_lang).map((item) => {
                    const active = item.id === track.through_lang;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`${copy.through} ${languageName(item.id)}`}
                        accessibilityState={{ selected: active, checked: active }}
                        onPress={() => {
                          updateTracks(tracks.map((current, itemIndex) => (itemIndex === index ? { ...current, through_lang: item.id } : current)));
                          void tap("light");
                        }}
                        style={selectedGlow(active)}
                        className={`min-h-14 items-center justify-center rounded-full px-5 ${active ? "bg-ink" : "border border-line bg-paper"}`}
                      >
                        <Text numberOfLines={1} className={`font-label text-base ${active ? "text-card" : "text-ink"}`}>
                          {languageName(item.id)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text className="font-label text-sm text-muted">{copy.courseLevel}</Text>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {LEVELS.map((item) => {
                    const active = item === (track.level ?? "A2");
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityLabel={`${copy.courseLevel} ${item}`}
                        accessibilityState={{ selected: active, checked: active }}
                        onPress={() => {
                          updateTracks(tracks.map((current, itemIndex) => (itemIndex === index ? { ...current, level: item } : current)));
                          void tap("light");
                        }}
                        style={selectedGlow(active)}
                        className={`h-12 w-14 items-center justify-center rounded-full ${active ? "bg-ember" : "border border-line bg-paper"}`}
                      >
                        <Text className={`font-label text-sm ${active ? "text-onEmber" : "text-ink"}`}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={`${copy.useThisToday}: ${trackLabel(track)}`}
                  accessibilityState={{ selected: track.active, checked: track.active }}
                  onPress={() => updateTracks(tracks.map((current, itemIndex) => ({ ...current, active: itemIndex === index })))}
                  className={`min-h-12 cursor-pointer items-center justify-center self-start rounded-full px-5 ${track.active ? "bg-ember" : "border border-line bg-paper"}`}
                >
                  <Text className={`font-label text-base ${track.active ? "text-onEmber" : "text-ink"}`}>
                    {track.active ? copy.thisIsToday : copy.useThisToday}
                  </Text>
                </Pressable>
              </View>
            ))}
            {tracks.length < 7 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const used = new Set(tracks.map((track) => track.target_lang));
                  const target = STUDY_LANGUAGES.find((item) => !used.has(item.id))?.id ?? "de";
                  const through = tracks.find((track) => track.active)?.through_lang ?? "pt";
                  updateTracks([
                    ...tracks,
                    { target_lang: target, through_lang: target === through ? (target === "en" ? "pt" : "en") : through, level: "A2", active: false },
                  ]);
                  void tap("light");
                }}
                className="min-h-14 cursor-pointer items-center justify-center self-start rounded-full border border-ink px-6"
              >
                <Text className="font-label text-base text-ink">{copy.addLanguage}</Text>
              </Pressable>
            ) : null}
          </View>

          <View>
            <Text className="font-label text-sm text-muted">{copy.levelLabel}</Text>
            <View accessibilityRole="radiogroup" className="mt-3 flex-row flex-wrap gap-2">
              {LEVELS.map((item) => {
                const active = item === level;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={`${copy.levelLabel} ${item}`}
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
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/placement" as Href)}
              className="mt-4 min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-ink px-5"
            >
              <Text className="font-label text-base text-ink">{copy.quizUnknownLevel}</Text>
            </Pressable>
          </View>

          {level === "A1" ? (
            <CognatePreview
              through={tracks.find((track) => track.active)?.through_lang ?? "pt"}
              target={tracks.find((track) => track.active)?.target_lang ?? "en"}
            />
          ) : null}

          <View>
            <Text className="font-label text-sm text-muted">{copy.interests}</Text>
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
            <Text className="mb-2 font-label text-sm text-muted">{copy.goal}</Text>
            <TextInput
              value={goal}
              onChangeText={(value) => {
                setGoal(value);
                saveDraft({ tracks, interests, goal: value, level });
              }}
              accessibilityLabel={copy.goal}
              placeholder={copy.goalPlaceholder}
              placeholderTextColor={palette.onSurfaceVariant}
              className="min-h-14 rounded-full bg-card px-5 text-base text-ink"
            />
          </View>

          {error ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" className="text-base text-roseInk">
              {error}
            </Text>
          ) : null}
          <ChunkButton label={session ? copy.createMyTopics : copy.signInToCreateTopics} onPress={() => void create()} className="w-full lg:w-auto lg:self-start" />
          {session ? null : <Text className="text-sm leading-5 text-muted">{copy.stayOnDevice}</Text>}
        </View>
      ) : null}

      {!creating && topics.length > 0 ? (
        <View className="mt-10">
          <Text className="font-label text-sm text-muted">{copy.topicsForToday}</Text>
          <View className="mt-4">
            {topics.map((topic) => (
              <View key={topic} className="mt-3">
                <ActionRow title={topic} detail={copy.startWithTopic} label={`${copy.startWith} ${topic}`} onPress={() => openTopic(topic)} />
              </View>
            ))}
          </View>
          <ChunkButton label={copy.startLesson} onPress={() => openTopic(topics[0] ?? "everyday life")} className="mt-8 w-full lg:w-auto" />
          <ChunkButton label={copy.backToLanguages} tone="ghost" onPress={() => setTopics([])} className="mt-3 w-full lg:w-auto" />
        </View>
      ) : null}
    </AppFrame>
  );
}

function CreatingPulse({ still }: { still: boolean }) {
  const copy = useCopy();
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
        <Text className="font-displayItalic text-headline text-ink">{copy.creatingTopics}</Text>
      </Animated.View>
      <Text className="mt-4 max-w-xl text-base leading-7 text-muted">{copy.creatingTopicsDek}</Text>
    </View>
  );
}
