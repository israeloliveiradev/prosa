import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { WelcomeSheet } from "@/components/guide/welcome-sheet";
import { StreakFlame } from "@/components/home/streak-flame";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { ChunkButton } from "@/components/shell/chunk-button";
import { mindCopy, useCast } from "@/lib/cast";
import { givenName, getLocale, useCopy } from "@/lib/i18n";
import { languageName } from "@/lib/languages";
import { applyRemoteFreeze, isoDate, useProgress } from "@/lib/progress";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { keepWords } from "@/lib/text";
import { useTheme } from "@/theme/ThemeContext";

export default function HomeScreen() {
  const { palette } = useTheme();
  const copy = useCopy();
  const locale = getLocale();
  const { people } = useCast();
  const readyLine = `${people[0]?.name} lê, ${people[1]?.name} guarda, ${people[2]?.name} fala e ${people[3]?.name} escreve.`;
  const ready = useProgressReady();
  const session = useSession();
  const progress = useProgress();
  const [topic, setTopic] = useState("");
  const today = isoDate();
  const continuing = progress.lessonDate === today && progress.topic;
  const lessonToday = progress.lessonDate === today ? 100 : 0;
  const memory = progress.cards.length === 0 ? 0 : Math.round((progress.cards.filter((card) => card.status === "mastered").length / progress.cards.length) * 100);
  const speech = progress.badges.includes("clear_voice") ? 100 : 0;
  const journal = progress.badges.includes("journal_kept") ? 100 : 0;
  const ratios = [lessonToday, memory, speech, journal];
  const targetName = languageName(session?.user.target_lang ?? "en");
  const freezeRemote = session?.user.streak_freeze_count;
  const name = session ? givenName(session.user.email, session.user.display_name) : "você";

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

  return (
    <AppFrame>
      {ready ? <WelcomeSheet /> : null}
      <View className="gap-8">
        <View className="flex-row flex-wrap items-end justify-between gap-6">
          <View className="min-w-0 flex-1">
            <Text className="font-label text-sm text-ember">{copy.todayKicker}</Text>
            <Text className="font-displayItalic mt-2 text-display text-ink">{copy.greeting(name)}</Text>
          </View>
          {ready ? <StreakFlame days={progress.streakCount} freezes={progress.streakFreezeCount} /> : <View className="h-16 w-16 rounded-full bg-line" />}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={continuing ? copy.continueToday : copy.startToday}
          onPress={start}
          className="cursor-pointer overflow-hidden rounded-[28px] bg-ember px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8"
        >
          <View className="min-w-0 flex-1">
            <Text className="font-label text-sm text-onEmber">{targetName}</Text>
            <Text className="font-displayItalic mt-2 text-headline text-onEmber">{copy.todayTitle}</Text>
            <Text className="mt-3 max-w-xl text-base leading-7 text-onEmber">{keepWords(locale === "en" ? `${people[0]?.name} reads, ${people[1]?.name} keeps, ${people[2]?.name} speaks and ${people[3]?.name} writes.` : readyLine)}</Text>
            <View className="mt-6 self-start rounded-full bg-card px-6 py-3">
              <Text className="font-label text-base text-ember">{continuing ? copy.continueToday : copy.startToday}</Text>
            </View>
          </View>
          <View className="mt-6 items-center justify-center rounded-[32px] bg-card p-3 md:mt-0">
            <Figure who={people[0]?.id ?? "einstein"} size={132} />
          </View>
        </Pressable>

        <View className="gap-3 md:flex-row">
          <HomeTile title={copy.navMemory} detail={copy.reviewEmpty} href="/memory" />
          <HomeTile title={copy.navNews} detail="O boletim de hoje, no assunto da conta." href="/news" />
          <HomeTile title={copy.navPractice} detail="Duelo de 120 segundos ou uma cena no tom do lugar." href="/practice" />
        </View>

        <View className="rounded-[28px] border border-line bg-card px-5 py-6">
          <View className="flex-row flex-wrap">
            {people.map((person, index) => {
              const text = mindCopy(person, locale);
              return (
                <Pressable
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${person.name}, ${text.role}`}
                  onPress={() => router.push("/settings")}
                  className="w-1/2 cursor-pointer p-3 lg:w-1/4"
                >
                  <Text className="font-label text-xs text-ember">0{index + 1}</Text>
                  <View className="mt-3">
                    <Figure who={person.id} size={88} />
                  </View>
                  <Text className="mt-3 font-displayItalic text-2xl text-ink">{person.name}</Text>
                  <Text className="mt-1 text-sm text-muted">{keepWords(text.role)}</Text>
                  <View className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
                    <View className="h-full rounded-full bg-ember" style={{ width: `${ratios[index]}%` }} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {ready && progress.pro ? (
          <View className="max-w-md">
            <Text className="font-label text-sm text-muted">Tema de hoje</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              accessibilityLabel="Tema de hoje"
              placeholder="Por exemplo, pedir um café"
              placeholderTextColor={palette.onSurfaceVariant}
              className="mt-2 min-h-14 rounded-2xl border border-line bg-card px-5 text-base text-ink"
            />
          </View>
        ) : ready ? (
          <ActionRow title="Tema personalizado" detail="Escolher o tema do dia entra na Prosa Pro." onPress={() => router.push("/paywall")} />
        ) : null}

        {ready ? <ChunkButton label={continuing ? copy.continueToday : copy.startToday} onPress={start} className="w-full max-w-md" /> : null}
      </View>
    </AppFrame>
  );
}

function HomeTile({ title, detail, href }: { title: string; detail: string; href: "/memory" | "/news" | "/practice" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push(href)}
      className="min-h-36 flex-1 cursor-pointer rounded-[28px] border border-line bg-card px-5 py-5"
    >
      <Text className="font-displayItalic text-3xl text-ink">{title}</Text>
      <Text className="mt-3 text-base leading-6 text-muted">{detail}</Text>
    </Pressable>
  );
}
