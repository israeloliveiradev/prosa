import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatPill } from "@/components/ui/stat-pill";
import { useRail } from "@/components/layout/rail-context";
import { countDue } from "@/lib/session-clock";
import { useProgress } from "@/lib/progress";
import { useSession } from "@/lib/session";
import { useXp } from "@/lib/xp";
import { useTheme } from "@/theme/ThemeContext";

export function RightRail() {
  const { palette } = useTheme();
  const session = useSession();
  const progress = useProgress();
  const { today, goal, weekProgress } = useXp();
  const { asideContent } = useRail();
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const dueCardsCount = countDue(progress.cards);
  const weekDays = ["S", "T", "Q", "Q", "S", "S", "D"];
  const xpRatio = goal > 0 ? Math.min(1, today / goal) : 0;

  return (
    <View className="w-[340px] border-l border-line bg-card/60 p-6 flex-col gap-6 select-none overflow-y-auto">
      {/* 1. Header Pills: Idioma, Ofensiva, XP */}
      <View className="flex-row items-center justify-between gap-2">
        {/* Language selector switcher */}
        <View className="relative">
          <LanguageSwitcher
            compact
            open={langPickerOpen}
            onToggle={() => setLangPickerOpen((o) => !o)}
            onClose={() => setLangPickerOpen(false)}
          />
        </View>

        <View className="flex-row items-center gap-2">
          <StatPill
            icon={<Icon name="flame" color="#F59E0B" size={16} />}
            value={progress.streakCount}
            tone="streak"
          />
          <StatPill
            icon={<Icon name="bolt" color="#2563EB" size={16} />}
            value={today}
            tone="xp"
          />
        </View>
      </View>

      {/* 2. Meta Diária de XP */}
      <Card variant="base" padding="md" className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-label text-xs uppercase tracking-wider text-muted">Meta Diária</Text>
          <Text className="font-label text-sm font-bold text-ink">
            {today} / {goal} XP
          </Text>
        </View>
        <ProgressBar value={xpRatio} tone="xp" size="md" />
        <Text className="text-[11px] text-muted leading-4">
          {xpRatio >= 1
            ? "🎉 Meta diária concluída! Continue praticando para acumular bônus."
            : `Faltam ${Math.max(0, goal - today)} XP para atingir sua meta de hoje.`}
        </Text>
      </Card>

      {/* 3. Revisões SRS Pendentes */}
      {dueCardsCount > 0 ? (
        <Card variant="interactive" padding="md" className="gap-3" onPress={() => router.push("/memory")}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Icon name="brain" color={palette.primary} size={20} />
              <Text className="font-label text-sm text-ink font-bold">Repetição Espaçada</Text>
            </View>
            <View className="px-2 py-0.5 rounded-full bg-primarySoft">
              <Text className="font-label text-xs text-primary font-bold">{dueCardsCount}</Text>
            </View>
          </View>
          <Text className="text-xs text-muted leading-4">
            Você tem {dueCardsCount} {dueCardsCount === 1 ? "palavra pronta" : "palavras prontas"} para reforçar na memória de longo prazo.
          </Text>
          <Button variant="primary" size="md" fullWidth onPress={() => router.push("/memory")}>
            Revisar Agora
          </Button>
        </Card>
      ) : null}

      {/* 4. Semana da Ofensiva */}
      <Card variant="base" padding="md" className="gap-3">
        <Text className="font-label text-xs uppercase tracking-wider text-muted">Ofensiva Semanal</Text>
        <View className="flex-row items-center justify-between pt-1">
          {weekDays.map((dayName, idx) => {
            const isDone = weekProgress[idx] === true;
            return (
              <View key={`${dayName}-${idx}`} className="items-center gap-1.5">
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center border ${
                    isDone
                      ? "bg-streak border-streakEdge"
                      : "bg-sunken border-line"
                  }`}
                >
                  {isDone ? (
                    <Icon name="flame" color="#1F1A17" size={14} />
                  ) : (
                    <Text className="text-[10px] text-muted font-label">•</Text>
                  )}
                </View>
                <Text className="text-[11px] font-label text-muted">{dayName}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* 5. Slot Aside Customizado da Página */}
      {asideContent ? <View className="pt-2">{asideContent}</View> : null}
    </View>
  );
}
