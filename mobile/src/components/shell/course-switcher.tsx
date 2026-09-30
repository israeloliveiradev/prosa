import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Flag } from "@/components/shell/flag";
import { activateStudyTrack, listStudyTracks, type StudyTrackChoice } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import {
  CEFR_LEVELS,
  STUDY_LANGUAGES,
  THROUGH_LANGUAGES,
  languageName,
  throughForTarget,
  type CourseLevel,
} from "@/lib/languages";
import { dropForeignGlosses, laneStats, switchProgressLang } from "@/lib/progress";
import { rememberProfile, useSession } from "@/lib/session";

function asLevel(value: string | undefined, fallback: CourseLevel): CourseLevel {
  return CEFR_LEVELS.includes((value ?? "") as CourseLevel) ? (value as CourseLevel) : fallback;
}

export function CourseSwitcher() {
  const copy = useCopy();
  const session = useSession();
  const [tracks, setTracks] = useState<StudyTrackChoice[]>([]);
  const [adding, setAdding] = useState(false);
  const [draftTarget, setDraftTarget] = useState("es");
  const [draftThrough, setDraftThrough] = useState("pt");
  const [draftLevel, setDraftLevel] = useState<CourseLevel>("A2");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setTracks([]);
      return;
    }
    try {
      const next = await listStudyTracks(session.token);
      if (next.length > 0) {
        setTracks(next);
        return;
      }
      setTracks([
        {
          target_lang: session.user.target_lang,
          through_lang: session.user.native_lang,
          level: session.user.level,
          active: true,
        },
      ]);
    } catch {
      setTracks([
        {
          target_lang: session.user.target_lang,
          through_lang: session.user.native_lang,
          level: session.user.level,
          active: true,
        },
      ]);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!adding || typeof window === "undefined") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAdding(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding]);

  if (!session) {
    return null;
  }

  const token = session.token;
  const current = session.user.target_lang;
  const currentLevel = session.user.level;
  const currentThrough = session.user.native_lang;
  const enrolled = new Set(tracks.map((track) => track.target_lang));
  const openLangs = STUDY_LANGUAGES.filter((item) => !enrolled.has(item.id));

  async function apply(track: { target_lang: string; through_lang: string; level?: string }) {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const saved = await activateStudyTrack(token, track);
      rememberProfile({
        target_lang: saved.target_lang,
        native_lang: saved.through_lang,
        level: asLevel(saved.level, currentLevel),
      });
      switchProgressLang(saved.target_lang);
      dropForeignGlosses(saved.through_lang);
      await load();
      void tap("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.pairFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="gap-5">
      <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.yourCourses}</Text>
      <View className="gap-2">
        {tracks.map((track) => {
          const selected = track.target_lang === current;
          const stats = laneStats(track.target_lang);
          return (
            <Pressable
              key={track.target_lang}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: pending }}
              disabled={pending}
              onPress={() => void apply(track)}
              className={`min-h-16 cursor-pointer flex-row items-center gap-3 rounded-[20px] px-3 ${selected ? "bg-emberSoft" : "border border-line bg-paper"}`}
            >
              <Flag code={track.target_lang} size={32} />
              <View className="min-w-0 flex-1">
                <Text className="font-label text-base text-ink">{languageName(track.target_lang)}</Text>
                <Text className="text-sm text-muted">
                  {track.level} · {copy.through} {languageName(track.through_lang).toLowerCase()}
                </Text>
              </View>
              <Text className="font-label text-sm text-muted">
                {stats.words} {stats.words === 1 ? copy.courseWord : copy.courseWords}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {openLangs.length > 0 ? (
        adding ? (
          <View className="gap-4 rounded-[20px] border border-line bg-paper px-3 py-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAdding(false);
                setError(null);
                void tap("light");
              }}
              className="min-h-11 cursor-pointer flex-row items-center self-start"
            >
              <Text className="font-label text-sm text-ember">{copy.backToLanguages}</Text>
            </Pressable>
            <Text className="font-label text-sm text-muted">{copy.addCourse}</Text>
            <View className="flex-row flex-wrap gap-2">
              {openLangs.map((item) => {
                const selected = item.id === draftTarget;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setDraftTarget(item.id);
                      setDraftThrough(throughForTarget(item.id, draftThrough));
                    }}
                    className={`min-h-12 cursor-pointer flex-row items-center gap-2 rounded-full px-3 ${selected ? "bg-ember" : "border border-line bg-card"}`}
                  >
                    <Flag code={item.id} size={22} />
                    <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{languageName(item.id)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.through}</Text>
            <View className="flex-row flex-wrap gap-2">
              {THROUGH_LANGUAGES.filter((item) => item.id !== draftTarget).map((item) => {
                const selected = item.id === draftThrough;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setDraftThrough(item.id)}
                    className={`min-h-12 cursor-pointer flex-row items-center gap-2 rounded-full px-3 ${selected ? "bg-ink" : "border border-line bg-card"}`}
                  >
                    <Flag code={item.id} size={20} />
                    <Text className={`font-label text-sm ${selected ? "text-card" : "text-ink"}`}>{languageName(item.id)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.courseLevel}</Text>
            <View className="flex-row flex-wrap gap-2">
              {CEFR_LEVELS.map((item) => {
                const selected = item === draftLevel;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setDraftLevel(item)}
                    className={`h-12 w-14 cursor-pointer items-center justify-center rounded-full ${selected ? "bg-ember" : "border border-line bg-card"}`}
                  >
                    <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => {
                void apply({ target_lang: draftTarget, through_lang: draftThrough, level: draftLevel }).then(() => {
                  setAdding(false);
                  const leftover = openLangs.filter((item) => item.id !== draftTarget);
                  setDraftTarget(leftover[0]?.id ?? "de");
                });
              }}
              className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-ember px-5"
            >
              <Text className="font-label text-base text-onEmber">{copy.startCourse}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const first = openLangs[0];
              if (first) {
                setDraftTarget(first.id);
                setDraftThrough(throughForTarget(first.id, currentThrough));
              }
              setAdding(true);
              void tap("light");
            }}
            className="min-h-12 cursor-pointer flex-row items-center justify-center gap-2 rounded-full border border-ink px-5"
          >
            <Text className="font-label text-xl text-ink">+</Text>
            <Text className="font-label text-base text-ink">{copy.addCourse}</Text>
          </Pressable>
        )
      ) : null}

      <View>
        <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.through}</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {THROUGH_LANGUAGES.filter((item) => item.id !== current).map((item) => {
            const selected = item.id === currentThrough;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: pending }}
                disabled={pending}
                onPress={() => void apply({ target_lang: current, through_lang: item.id, level: currentLevel })}
                className={`min-h-12 cursor-pointer flex-row items-center gap-2 rounded-full px-3 ${selected ? "bg-ink" : "border border-line bg-paper"}`}
              >
                <Flag code={item.id} size={20} />
                <Text className={`font-label text-sm ${selected ? "text-card" : "text-ink"}`}>{languageName(item.id)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/placement" as Href)}
        className="min-h-12 cursor-pointer items-center justify-center rounded-full bg-ember px-5"
      >
        <Text className="font-label text-base text-onEmber">{copy.placeStart}</Text>
      </Pressable>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: manual }}
          onPress={() => setManual((open) => !open)}
          className="min-h-11 cursor-pointer justify-center"
        >
          <Text className="font-label text-xs uppercase tracking-widest text-muted">
            {manual ? copy.courseLevel : copy.placeHintKnown}
          </Text>
        </Pressable>
        {manual ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {CEFR_LEVELS.map((item) => {
              const selected = item === currentLevel;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: pending }}
                  disabled={pending}
                  onPress={() => void apply({ target_lang: current, through_lang: currentThrough, level: item })}
                  className={`h-12 w-14 cursor-pointer items-center justify-center rounded-full ${selected ? "bg-ember" : "border border-line bg-paper"}`}
                >
                  <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-roseInk">
          {error}
        </Text>
      ) : null}
      <Text className="text-sm leading-6 text-muted">{copy.courseHint}</Text>
    </View>
  );
}
