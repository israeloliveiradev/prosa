import { router } from "expo-router";
import { Text, View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { BadgeGallery } from "@/components/home/badge-gallery";
import { NicheMatrix } from "@/components/home/niche-matrix";
import { RetentionBoard } from "@/components/home/retention-board";
import { RetentionHeatmap } from "@/components/home/retention-heatmap";
import { VocabDonut } from "@/components/home/vocab-donut";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
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
        <PageMasthead
          kicker="Arquivo"
          title="Memória"
          dek="As células em risco vêm primeiro. Depois o que está firmando e o arquivo das prosas."
        />
        <AreaHint area="memory" />
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
                    <ActionRow title="Lições anteriores" detail="O histórico completo entra na Prosa Pro." onPress={() => router.push("/paywall")} />
                  </View>
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
