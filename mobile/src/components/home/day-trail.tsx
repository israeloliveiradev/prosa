import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TrailNode } from "@/components/ui/trail-node";
import { reconstructionDue } from "@/lib/reconstruction";
import { isoDate, type LessonHistoryItem, type ProgressState } from "@/lib/progress";

export interface DayTrailProps {
  progress: ProgressState;
  isTodayDone: boolean;
}

export function DayTrail({ progress, isTodayDone }: DayTrailProps) {
  const [selectedHistory, setSelectedHistory] = useState<LessonHistoryItem | null>(null);
  const isReconDue = reconstructionDue(progress.reconstruction, isoDate());

  // Histórico ordenado cronologicamente invertido ou normal
  const history = progress.history.slice(-6); // últimas lições

  // Deslocamento horizontal alternado para efeito lúdico de zigue-zague (-40px, 0, 40px)
  const offsets = ["translate-x-0", "-translate-x-7", "translate-x-7", "-translate-x-5", "translate-x-5"];

  return (
    <View className="items-center py-6 gap-6 relative select-none">
      {/* Título da Trilha */}
      <View className="items-center mb-2">
        <View className="px-3 py-1 rounded-full bg-sunken mb-1">
          <Text className="font-label text-xs uppercase tracking-wider text-muted">
            Trilha de Sessões Diárias
          </Text>
        </View>
        <Text className="font-display text-xl font-bold text-ink">Sua Jornada na Prosa</Text>
      </View>

      {/* Nós do Histórico Concluído */}
      {history.map((item, index) => {
        const offsetClass = offsets[index % offsets.length];
        return (
          <View key={`${item.date}-${index}`} className={`${offsetClass}`}>
            <TrailNode
              state="done"
              title={item.topic}
              subtitle={item.date}
              onPress={() => setSelectedHistory(item)}
            />
          </View>
        );
      })}

      {/* Nó de HOJE */}
      <View className="my-1 scale-105">
        <TrailNode
          state={isTodayDone ? "done" : "today"}
          title={isTodayDone ? "Sessão Concluída" : "LIÇÃO DE HOJE"}
          subtitle={isTodayDone ? "Meta Batida" : "20 Minutos"}
          onPress={() => router.push("/daily")}
        />
      </View>

      {/* Nó Especial de Reconstrução (Dia 3) */}
      {isReconDue ? (
        <View className="translate-x-6">
          <TrailNode
            state="special"
            title="Reconstrução"
            subtitle="Dia 3 (Reescrita)"
            onPress={() => router.push("/daily")}
          />
        </View>
      ) : null}

      {/* Próximos Dias Bloqueados */}
      <View className="-translate-x-6">
        <TrailNode state="locked" title="Amanhã" subtitle="Bloqueado" />
      </View>
      <View className="translate-x-4">
        <TrailNode state="locked" title="Em 2 dias" subtitle="Bloqueado" />
      </View>

      {/* Sheet de Detalhes da Lição Concluída */}
      <Sheet
        open={Boolean(selectedHistory)}
        onClose={() => setSelectedHistory(null)}
        title={selectedHistory?.topic ?? "Lição Concluída"}
        footer={
          selectedHistory ? (
            <Button
              variant="primary"
              fullWidth
              onPress={() => {
                const item = selectedHistory;
                setSelectedHistory(null);
                router.push({ pathname: "/daily", params: { date: item.date, topic: item.topic } });
              }}
            >
              Rever História Desta Sessão
            </Button>
          ) : null
        }
      >
        {selectedHistory ? (
          <View className="gap-3">
            <Text className="text-xs font-label text-muted uppercase">Concluída em: {selectedHistory.date}</Text>
            <Text className="font-reading text-lg text-ink leading-7">
              {selectedHistory.lesson.story_text}
            </Text>
            <View className="mt-2 p-3 rounded-2xl bg-sunken">
              <Text className="font-label text-xs text-muted">Vocabulário praticado:</Text>
              <Text className="font-label text-sm text-ink mt-1">
                {selectedHistory.lesson.vocabulary.map((v) => v.word).join(" • ")}
              </Text>
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
