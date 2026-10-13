import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Figure } from "@/components/cast/figure";
import { Icon } from "@/components/shell/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCast } from "@/lib/cast";
import { countDue } from "@/lib/session-clock";
import type { ProgressState } from "@/lib/progress";

export interface TodayCardProps {
  progress: ProgressState;
  isTodayDone: boolean;
  continuing: boolean;
  topic: string;
  onChangeTopic: (next: string) => void;
  onStart: () => void;
}

export function TodayCard({
  progress,
  isTodayDone,
  continuing,
  topic,
  onChangeTopic,
  onStart,
}: TodayCardProps) {
  const { people } = useCast();
  const leadMind = people[0] ?? { id: "einstein", name: "Albert Einstein" };
  const [topicEditorOpen, setTopicEditorOpen] = useState(false);
  const dueCount = countDue(progress.cards);

  const phases = [
    { label: "Revisão", icon: "brain" as const },
    { label: "Ouvir", icon: "speaker" as const },
    { label: "Leitura", icon: "book" as const },
    { label: "Fala", icon: "mic" as const },
    { label: "Diário", icon: "pencil" as const },
  ];

  if (isTodayDone) {
    return (
      <Card variant="base" padding="lg" className="border-2 border-success/30 bg-successSoft/30 gap-6">
        <View className="flex-col md:flex-row items-center justify-between gap-6">
          <View className="flex-1 items-center md:items-start text-center md:text-left">
            <View className="self-center md:self-start flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-success text-onSuccess mb-3">
              <Icon name="check" color="#FFFFFF" size={14} />
              <Text className="font-label text-xs font-bold text-onSuccess uppercase tracking-wider">
                Sessão de Hoje Concluída!
              </Text>
            </View>
            <Text className="font-display text-3xl font-extrabold text-ink">
              Parabéns! +50 XP acumulados
            </Text>
            <Text className="text-sm text-muted mt-2 leading-6">
              Sua ofensiva foi mantida. Deseja reforçar seu vocabulário ou desafiar outros alunos?
            </Text>

            <View className="flex-row flex-wrap gap-3 mt-6">
              {dueCount > 0 ? (
                <Button variant="primary" size="lg" onPress={() => router.push("/memory")}>
                  Revisar {dueCount} Palavras no SRS
                </Button>
              ) : null}
              <Button variant="secondary" size="lg" onPress={() => router.push("/practice")}>
                Abrir Duelo ou Diálogo
              </Button>
            </View>
          </View>

          <View className="w-24 h-24 rounded-full bg-success/20 items-center justify-center border-2 border-success/30">
            <Figure who={leadMind.id} size={90} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="interactive" padding="lg" className="border-2 border-primary/20 bg-card gap-6">
      <View className="flex-col md:flex-row items-center justify-between gap-6">
        <View className="flex-1">
          {/* Badge de recomendação */}
          <View className="self-start flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primarySoft mb-3">
            <Icon name="star" color="#C2410C" size={14} />
            <Text className="font-label text-xs font-bold text-primary uppercase tracking-wider">
              {continuing ? "Continuar Sessão Diária" : "Sessão Recomendada de Hoje"}
            </Text>
          </View>

          {/* Título */}
          <Text className="font-display text-3xl font-extrabold text-ink">
            {topic ? `"${topic}"` : "História do Dia"}
          </Text>

          <Text className="text-sm text-muted mt-2 leading-6 max-w-lg">
            Sessão imersiva com 5 etapas interativas para desenvolver fala, escuta, leitura e retenção ativa.
          </Text>

          {/* 5 Fases como Chips/Pills visuais */}
          <View className="flex-row flex-wrap gap-2 mt-4">
            {phases.map((p, idx) => (
              <View
                key={p.label}
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sunken border border-line"
              >
                <Text className="font-label text-[11px] text-muted">{idx + 1}. {p.label}</Text>
              </View>
            ))}
          </View>

          {/* Botão de Ação 3D Principal */}
          <View className="mt-6 flex-row flex-wrap items-center gap-4">
            <Button variant="primary" size="lg" onPress={onStart}>
              {continuing ? "CONTINUAR LIÇÃO DIÁRIA ➔" : "INICIAR LIÇÃO DIÁRIA (20 MIN) ➔"}
            </Button>

            {/* Alternar / Customizar tema */}
            <Pressable
              onPress={() => {
                if (!progress.pro) {
                  router.push("/paywall");
                } else {
                  setTopicEditorOpen((o) => !o);
                }
              }}
              className="cursor-pointer py-2 px-1"
            >
              <Text className="font-label text-xs text-muted hover:text-primary">
                {progress.pro ? "✏️ Escolher outro tópico" : "👑 Tópico Personalizado (Pro)"}
              </Text>
            </Pressable>
          </View>

          {/* Editor de Tópico (Pro) */}
          {topicEditorOpen && progress.pro ? (
            <View className="mt-4 p-4 rounded-2xl bg-sunken border border-line gap-3">
              <Text className="font-label text-xs uppercase text-muted">Digite o tema da sua lição de hoje:</Text>
              <TextInput
                value={topic}
                onChangeText={onChangeTopic}
                placeholder="Ex: pedindo café em Londres, entrevista de emprego..."
                className="bg-card border border-line rounded-xl px-4 py-2.5 text-sm font-sans text-ink"
              />
            </View>
          ) : null}
        </View>

        {/* Mascote Mente do Dia */}
        <View className="w-28 h-28 rounded-3xl bg-primarySoft/60 items-center justify-center border-2 border-primary/20 shadow-sm">
          <Figure who={leadMind.id} size={110} />
        </View>
      </View>
    </Card>
  );
}
