import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { StreakFlame } from "@/components/home/streak-flame";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { CAST } from "@/design/cast";
import { useTheme } from "@/theme/ThemeContext";
import { activateStudyTrack, listStudyTracks, type StudyTrackChoice } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { languageName, trackLabel } from "@/lib/languages";
import { isoDate, useProgress } from "@/lib/progress";
import { useProgressReady } from "@/lib/query";
import { rememberProfile, useSession } from "@/lib/session";

export default function HomeScreen() {
  const { palette } = useTheme();
  const ready = useProgressReady();
  const session = useSession();
  const progress = useProgress();
  const [topic, setTopic] = useState("");
  const today = isoDate();
  const continuing = progress.lessonDate === today && progress.topic;
  const learning = progress.cards.filter((card) => card.status !== "mastered").length;
  const mastered = progress.cards.filter((card) => card.status === "mastered").length;
  const lessonToday = progress.lessonDate === today ? 100 : 0;
  const memory = progress.cards.length === 0 ? 0 : Math.round((mastered / progress.cards.length) * 100);
  const speech = progress.badges.includes("clear_voice") ? 100 : 0;
  const journal = progress.badges.includes("journal_kept") ? 100 : 0;
  const ratios = [lessonToday, memory, speech, journal];
  const targetName = languageName(session?.user.target_lang ?? "en");
  const throughName = languageName(session?.user.native_lang ?? "pt");

  function start() {
    void tap("medium");
    if (!progress.pro && topic.trim() && !continuing) {
      router.push("/paywall");
      return;
    }
    const nextTopic = progress.pro && topic.trim() ? topic.trim() : continuing ? progress.topic : undefined;
    router.push(nextTopic ? { pathname: "/daily", params: { topic: nextTopic } } : "/daily");
  }

  return (
    <AppFrame>
      <View className="gap-12 lg:gap-16">
        <View className="gap-6 md:flex-row md:items-end md:justify-between">
          <View className="min-w-0 flex-1">
            <Text className="font-displayItalic text-display text-ink">Vinte minutos.</Text>
            <Text className="mt-3 max-w-xl text-lg leading-7 text-muted">Clara lê, Bento guarda, Nuno fala e Lia escreve. Uma prosa, nessa ordem.</Text>
          </View>
          {ready ? <StreakFlame days={progress.streakCount} freezes={progress.streakFreezeCount} /> : <View className="h-16 w-16 rounded-full bg-line" />}
        </View>

        <View className="flex-row flex-wrap">
          {CAST.map((person, index) => (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              accessibilityLabel={`${person.name}, ${person.role}, progresso ${ratios[index]} por cento`}
              onPress={() => {
                if (ready) {
                  start();
                }
              }}
              className="w-full cursor-pointer p-2 md:w-1/2 lg:w-1/4"
            >
              <View className="items-center rounded-3xl border border-line bg-card px-4 py-5" style={{ boxShadow: "0 10px 28px rgba(0,0,0,0.07)" }}>
                <Figure who={person.id} size={108} />
                <Text className="mt-2 text-center font-displayItalic text-3xl text-ink">{person.name}</Text>
                <Text className="mt-1 text-center font-label text-xs text-moss">{person.role}</Text>
                <Text className="mt-2 text-center text-sm leading-5 text-muted">{person.line}</Text>
                <Text className="mt-4 font-label text-xs text-ember">Parte {index + 1}</Text>
                <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand">
                  <View className="h-full rounded-full bg-ember" style={{ width: `${ratios[index]}%` }} />
                </View>
                <Text className="mt-2 text-sm text-muted">Progresso {ratios[index]}%</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {ready ? (
          <>
            <StudySwitcher />
            <View className="items-center gap-6">
              <ChunkButton
                label={continuing ? "Continuar a prosa" : `Aprender: ${targetName} (${throughName})`}
                onPress={start}
                className="w-full max-w-md"
              />
              {progress.pro ? (
                <View className="w-full max-w-md">
                  <Text className="font-label text-sm text-muted">Tema de hoje</Text>
                  <TextInput
                    value={topic}
                    onChangeText={setTopic}
                    accessibilityLabel="Tema de hoje"
                    placeholder="Por exemplo, pedir um café"
                    placeholderTextColor={palette.onSurfaceVariant}
                    className="mt-2 min-h-14 rounded-full bg-card px-5 text-base text-ink"
                  />
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => router.push("/paywall")} className="min-h-12 cursor-pointer justify-center">
                  <Text className="font-label text-base text-ink">Tema personalizado</Text>
                  <Text className="text-sm text-muted">Entra na Prosa Pro</Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <View className="gap-3">
            <View className="h-12 w-48 rounded-full bg-line" />
            <View className="h-px bg-line" />
          </View>
        )}
      </View>
    </AppFrame>
  );
}

function StudySwitcher() {
  const session = useSession();
  const progress = useProgress();
  const [tracks, setTracks] = useState<StudyTrackChoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setTracks([]);
      return;
    }
    void listStudyTracks(session.token)
      .then(setTracks)
      .catch(() => setTracks([]));
  }, [session]);

  if (!session || tracks.length === 0) {
    return null;
  }

  return (
    <View>
      <Text className="font-label text-sm text-muted">Idioma de hoje</Text>
      <View accessibilityRole="radiogroup" className="mt-3 flex-row flex-wrap gap-2">
        {tracks.map((track) => {
          const active = session.user.target_lang === track.target_lang && session.user.native_lang === track.through_lang;
          const label = trackLabel(track);
          return (
            <Pressable
              key={`${track.target_lang}-${track.through_lang}`}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: active, checked: active }}
              onPress={() => {
                if (!(progress.pro || session.user.plan === "pro") && !active) {
                  router.push("/paywall");
                  return;
                }
                void activateStudyTrack(session.token, track)
                  .then(() => {
                    rememberProfile({ target_lang: track.target_lang, native_lang: track.through_lang });
                    void tap("light");
                    setError(null);
                  })
                  .catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : "Não foi possível trocar o idioma.");
                  });
              }}
              className={`min-h-14 items-center justify-center rounded-full px-5 ${active ? "bg-ember" : "border border-line bg-card"}`}
            >
              <Text numberOfLines={1} className={`font-label text-base ${active ? "text-onEmber" : "text-ink"}`}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="mt-2 text-base text-roseInk">{error}</Text> : null}
    </View>
  );
}
