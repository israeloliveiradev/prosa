import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BadgeGallery } from "@/components/home/badge-gallery";
import { NicheMatrix } from "@/components/home/niche-matrix";
import { RetentionBoard } from "@/components/home/retention-board";
import { RetentionHeatmap } from "@/components/home/retention-heatmap";
import { VocabDonut } from "@/components/home/vocab-donut";
import { AppFrame } from "@/components/shell/app-frame";
import { isoDate, useProgress } from "@/lib/progress";
import { useProgressReady } from "@/lib/query";

export default function MemoryScreen() {
  const ready = useProgressReady();
  const progress = useProgress();
  const today = isoDate();
  const learning = progress.cards.filter((card) => card.status !== "mastered").length;
  const mastered = progress.cards.filter((card) => card.status === "mastered").length;

  return (
    <AppFrame>
      <View className="gap-12">
        <View>
          <Text className="font-displayItalic text-display text-ink">Memória</Text>
          <Text className="mt-3 max-w-xl text-lg leading-7 text-muted">O que já ficou, o que está em risco e as prosas anteriores.</Text>
        </View>
        {ready ? (
          <>
            <RetentionHeatmap cards={progress.cards} />
            <RetentionBoard cards={progress.cards} historyDates={progress.history.map((item) => item.date)} lastLessonDate={progress.lastLessonDate} />
            <View className="gap-12 lg:flex-row lg:items-start lg:gap-16">
              <View className="lg:w-80">
                <Text className="font-label text-xs uppercase tracking-widest text-muted">Vocabulário</Text>
                <View className="mt-4">
                  <VocabDonut learning={learning} mastered={mastered} />
                </View>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-label text-xs uppercase tracking-widest text-muted">Histórico</Text>
                {progress.history.length === 0 ? (
                  <Text className="mt-4 text-base leading-7 text-muted">A primeira prosa entra aqui, com data e tema.</Text>
                ) : (
                  progress.history.map((item) => (
                    <Pressable
                      key={`${item.date}-${item.topic}`}
                      accessibilityRole="button"
                      onPress={() => {
                        if (!progress.pro && item.date !== today) {
                          router.push("/paywall");
                          return;
                        }
                        router.push({ pathname: "/daily", params: { topic: item.topic, date: item.date } });
                      }}
                      className="min-h-14 cursor-pointer justify-center border-b border-line py-3"
                    >
                      <Text className="font-display text-xl text-ink">{item.title}</Text>
                      <Text className="mt-1 text-sm text-muted">
                        {item.date} · {item.topic}
                      </Text>
                    </Pressable>
                  ))
                )}
                {progress.pro ? null : (
                  <Pressable accessibilityRole="button" onPress={() => router.push("/paywall")} className="mt-4 min-h-12 cursor-pointer justify-center">
                    <Text className="font-label text-base text-ember">Lições anteriores ficam na Prosa Pro</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <NicheMatrix history={progress.history} />
            <View>
              <Text className="font-label text-xs uppercase tracking-widest text-muted">Selos</Text>
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
