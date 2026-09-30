import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { MeasureBoard } from "@/components/home/measure-panel";
import { BadgeGallery } from "@/components/home/badge-gallery";
import { NicheMatrix } from "@/components/home/niche-matrix";
import { RetentionBoard } from "@/components/home/retention-board";
import { RetentionHeatmap } from "@/components/home/retention-heatmap";
import { VocabDonut } from "@/components/home/vocab-donut";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { writeClipboard } from "@/lib/clipboard";
import { useCopy } from "@/lib/i18n";
import { isoDate, useProgress } from "@/lib/progress";
import { useProgressReady } from "@/lib/query";
import { useSession } from "@/lib/session";
import { useTheme } from "@/theme/ThemeContext";

export default function MemoryScreen() {
  const session = useSession();
  const ready = useProgressReady();
  const progress = useProgress();
  const copy = useCopy();
  const { palette } = useTheme();
  const today = isoDate();
  const learning = progress.cards.filter((card) => card.status !== "mastered").length;
  const mastered = progress.cards.filter((card) => card.status === "mastered").length;
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return progress.history;
    }
    return progress.history.filter((item) => `${item.title} ${item.topic} ${item.date}`.toLowerCase().includes(needle));
  }, [progress.history, query]);

  if (!session) {
    return <Redirect href="/account" />;
  }

  async function exportVocab() {
    if (progress.cards.length === 0) {
      setNote(copy.nothingToExport);
      return;
    }
    const lines = progress.cards.map((card) => `${card.front_phrase}\t${card.back_translation}\t${card.context_sentence}`);
    const ok = await writeClipboard(lines.join("\n"));
    setNote(ok ? copy.vocabCopied : copy.nothingToExport);
  }

  return (
    <AppFrame>
      <View className="gap-12">
        <PageMasthead kicker={copy.memoryKicker} title={copy.memoryTitle} dek={copy.memoryDek} />
        <AreaHint area="memory" />
        {ready ? (
          <>
            <MeasureBoard targetLang={session.user.target_lang} />
            <RetentionHeatmap cards={progress.cards} />
            <RetentionBoard cards={progress.cards} historyDates={progress.history.map((item) => item.date)} lastLessonDate={progress.lastLessonDate} />
            <View>
              <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.wordsInDeck}</Text>
              {progress.cards.length === 0 ? (
                <Text className="mt-4 text-base leading-7 text-muted">{copy.emptyDeck}</Text>
              ) : (
                <View className="mt-4 flex-row flex-wrap" style={{ gap: 12 }}>
                  {[...progress.cards].slice(-24).reverse().map((card) => (
                    <View key={card.id} className="rounded-[20px] border border-line bg-card px-4 py-3" style={{ flexGrow: 1, flexBasis: 240 }}>
                      <Text className="font-label text-base text-ink">{card.front_phrase}</Text>
                      <Text className="mt-1 text-sm leading-5 text-muted">{card.back_translation}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View className="gap-12 lg:flex-row lg:items-start lg:gap-16">
              <View className="lg:w-80">
                <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.vocabulary}</Text>
                <View className="mt-4">
                  <VocabDonut learning={learning} mastered={mastered} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void exportVocab()}
                  className="mt-4 min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line px-5"
                >
                  <Text className="font-label text-base text-ink">{copy.exportVocab}</Text>
                </Pressable>
                {note ? <Text className="mt-2 text-sm text-moss">{note}</Text> : null}
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.history}</Text>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  accessibilityLabel={copy.searchMemory}
                  placeholder={copy.searchMemory}
                  placeholderTextColor={palette.onSurfaceVariant}
                  className="mt-3 min-h-12 rounded-2xl border border-line bg-card px-4 text-base text-ink"
                />
                {filtered.length === 0 ? (
                  <Text className="mt-4 text-base leading-7 text-muted">{copy.firstLessonHere}</Text>
                ) : (
                  filtered.map((item) => (
                    <View key={`${item.date}-${item.topic}`} className="mt-3">
                      <ActionRow
                        title={item.title}
                        detail={`${item.date} · ${item.topic}`}
                        onPress={() => {
                          if (!progress.pro && item.date !== today) {
                            router.push("/paywall");
                            return;
                          }
                          router.push({ pathname: "/daily", params: { topic: item.topic, date: item.date } });
                        }}
                      />
                    </View>
                  ))
                )}
                {progress.pro ? null : (
                  <View className="mt-4">
                    <ActionRow title={copy.previousLessons} detail={copy.previousLessonsDetail} onPress={() => router.push("/paywall")} />
                  </View>
                )}
              </View>
            </View>
            <NicheMatrix history={progress.history} />
            <View>
              <Text className="font-label text-xs uppercase tracking-widest text-muted">{copy.badges}</Text>
              <View className="mt-6">
                <BadgeGallery unlocked={progress.badges} />
              </View>
            </View>
          </>
        ) : (
          <View className="h-12 w-48 rounded-full bg-line" />
        )}
      </View>
    </AppFrame>
  );
}
