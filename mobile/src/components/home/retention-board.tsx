import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { isoDate, useSyncPhase, type SyncPhase } from "@/lib/progress";
import type { SessionCard } from "@/lib/types";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const SYNC_LABEL: Record<SyncPhase, string> = {
  device: "No aparelho, até entrar na conta",
  queued: "Na fila. Sincroniza quando a rede voltar",
  sent: "Deck sincronizado",
  paused: "Sem rede. As revisões ficam neste aparelho",
};

function recentDays(today: string): string[] {
  const [year, month, day] = today.split("-").map(Number);
  const base = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() - (6 - index));
    return isoDate(date);
  });
}

export function RetentionBoard({
  cards,
  historyDates,
  lastLessonDate,
}: {
  cards: SessionCard[];
  historyDates: string[];
  lastLessonDate: string | null;
}) {
  const sync = useSyncPhase();
  const [open, setOpen] = useState<SessionCard["status"] | null>(null);
  const today = isoDate();
  const days = recentDays(today);
  const practiced = new Set([...historyDates, ...(lastLessonDate ? [lastLessonDate] : [])]);
  const groups = [
    { id: "learning" as const, label: "Aprendendo", count: cards.filter((card) => card.status === "learning").length, bar: "bg-ember" },
    { id: "reviewing" as const, label: "Revisando", count: cards.filter((card) => card.status === "reviewing").length, bar: "bg-moss" },
    { id: "mastered" as const, label: "Dominadas", count: cards.filter((card) => card.status === "mastered").length, bar: "bg-ink" },
  ];
  const widest = Math.max(1, ...groups.map((group) => group.count));
  const shown = open ? cards.filter((card) => card.status === open).slice(0, 6) : [];
  const kept = groups[2]?.count ?? 0;
  const total = cards.length;

  return (
    <View accessibilityRole="summary" accessibilityLabel={`Retenção. ${kept} de ${total} palavras dominadas. ${SYNC_LABEL[sync.phase]}`}>
      <Text className="font-label text-sm text-muted">Retenção</Text>
      <Text className="mt-2 font-display text-2xl text-ink">
        {total === 0 ? "O deck começa na primeira prosa." : `${kept} de ${total} já ficaram.`}
      </Text>
      <View className="mt-5 gap-3">
        {groups.map((group) => {
          const selected = open === group.id;
          return (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              accessibilityLabel={`${group.label}, ${group.count}`}
              accessibilityState={{ selected }}
              onPress={() => setOpen(selected ? null : group.id)}
              className="min-h-12 justify-center"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-label text-base text-ink">{group.label}</Text>
                <Text className="font-label text-base text-ink">{group.count}</Text>
              </View>
              <View className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <View className={`h-2 rounded-full ${group.bar}`} style={{ width: `${Math.round((group.count / widest) * 100)}%` }} />
              </View>
            </Pressable>
          );
        })}
      </View>
      {shown.length > 0 ? (
        <View className="mt-4 rounded-[28px] border border-line bg-card px-4 py-3">
          {shown.map((card) => (
            <Text key={card.id} className="min-h-8 py-1 text-base text-ink">
              {card.front_phrase}
            </Text>
          ))}
        </View>
      ) : null}
      <Text className="mt-6 font-label text-sm text-muted">Sete dias</Text>
      <View className="mt-3 flex-row gap-2">
        {days.map((day) => {
          const present = practiced.has(day);
          const date = new Date(`${day}T12:00:00`);
          const name = WEEKDAYS[date.getDay()] ?? day;
          return (
            <View
              key={day}
              accessibilityLabel={`${name}, ${present ? "prosa feita" : "sem prosa"}`}
              className={`h-12 min-w-0 flex-1 items-center justify-center rounded-full ${present ? "bg-ember" : "border border-line bg-card"}`}
            >
              <Text className={`text-sm font-semibold ${present ? "text-onEmber" : "text-muted"}`}>{name}</Text>
            </View>
          );
        })}
      </View>
      <Text className="mt-4 text-base text-muted">{SYNC_LABEL[sync.phase]}{sync.pending > 0 ? ` · ${sync.pending} na fila` : ""}</Text>
    </View>
  );
}
