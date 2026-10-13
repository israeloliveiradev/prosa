import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { DayTrail } from "@/components/home/day-trail";
import { TodayCard } from "@/components/home/today-card";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { mindCopy, useCast } from "@/lib/cast";
import { givenName, getLocale, useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { applyRemoteFreeze, isoDate, useProgress } from "@/lib/progress";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";

export default function HomeScreen() {
  const session = useSession();
  if (!session) {
    return <Redirect href="/account" />;
  }
  return <SignedHome />;
}

function SignedHome() {
  const copy = useCopy();
  const locale = getLocale();
  const { people } = useCast();
  const ready = useProgressReady();
  const session = useSession();
  const progress = useProgress();
  const [topic, setTopic] = useState("");

  const today = isoDate();
  const continuing = progress.lessonDate === today && Boolean(progress.topic);
  const isTodayDone = progress.lessonDate === today && !continuing;

  const targetName = languageName(session?.user.target_lang ?? "en");
  const nativeName = languageName(session?.user.native_lang ?? "pt");
  const name = session ? givenName(session.user.email, session.user.display_name) : "";
  const freezeRemote = session?.user.streak_freeze_count;

  useEffect(() => {
    if (typeof freezeRemote === "number") {
      applyRemoteFreeze(freezeRemote);
    }
  }, [freezeRemote]);

  function start() {
    if (!progress.pro && topic.trim() && !continuing) {
      router.push("/paywall");
      return;
    }
    const nextTopic = progress.pro && topic.trim() ? topic.trim() : continuing ? progress.topic : undefined;
    router.push(nextTopic ? { pathname: "/daily", params: { topic: nextTopic } } : "/daily");
  }

  // Aside contextual projetado no RightRail: As 4 mentes pedagógicas
  const asideContent = (
    <Card variant="base" padding="md" className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-label text-xs uppercase tracking-wider text-muted">Elenco Pedagógico</Text>
        <Pressable onPress={() => router.push("/settings")}>
          <Text className="font-label text-xs text-primary">Alterar</Text>
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between pt-1">
        {people.slice(0, 4).map((person) => {
          const mind = mindCopy(person, locale);
          return (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              onPress={() => router.push("/settings")}
              className="items-center gap-1 cursor-pointer hover:opacity-80"
            >
              <View className="w-12 h-12 rounded-2xl bg-sunken items-center justify-center border border-line">
                <Figure who={person.id} size={42} />
              </View>
              <Text className="font-label text-[11px] text-ink" numberOfLines={1}>
                {person.name.split(" ")[0]}
              </Text>
              <Text className="text-[9px] text-muted -mt-1" numberOfLines={1}>
                {mind.role.split(" ")[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );

  return (
    <Page
      title={copy.greeting(name)}
      subtitle={`${targetName} via ${nativeName} • Nível ${session?.user.level ?? "A2"} • Sessão Diária`}
      aside={asideContent}
    >
      <View className="gap-8">
        {/* 1. Hero Card: Ação Principal da Home */}
        <TodayCard
          progress={progress}
          isTodayDone={isTodayDone}
          continuing={Boolean(continuing)}
          topic={topic}
          onChangeTopic={setTopic}
          onStart={start}
        />

        {/* 2. Trilha Vertical de Aprendizado Gamificada */}
        <DayTrail progress={progress} isTodayDone={isTodayDone} />
      </View>
    </Page>
  );
}
