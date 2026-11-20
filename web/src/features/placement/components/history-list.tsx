import { Text, View } from "react-native";
import { TactileCard } from "@/components/tactile/tactile-card";
import type { PlacementHistoryEntry } from "@/api/schemas/placement";
import { fillCopy, formatDay } from "@/features/placement/model/placement-flow";
import type { PlacementCopy } from "@/lib/copy/placement";
import { SectionLabel } from "./parts";

/** Tentativas concluídas deste idioma, da mais recente para a mais antiga. */
export function HistoryList({
  entries,
  t,
  bcp47,
}: {
  entries: PlacementHistoryEntry[];
  t: PlacementCopy;
  bcp47: string;
}) {
  if (entries.length === 0) {
    return null;
  }
  const recent = entries.slice().reverse();
  return (
    <TactileCard animateEntry={false} className="p-5" style={{ padding: 20 }}>
      <View testID="placement-history" className="gap-4">
        <SectionLabel>{t.historyTitle}</SectionLabel>
        <View className="gap-2">
          {recent.map((entry) => (
            <View
              key={entry.id}
              className="flex-row items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-[#FDFBF7] px-4 py-3"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-xl bg-[#0D9488]"
                style={{ borderWidth: 2, borderColor: "#0F766E" }}
              >
                <Text className="font-sans text-sm font-black text-white">{entry.result_level}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-sm font-bold text-[#111C2D]">
                  {entry.kind === "progress" ? t.historyProgress : t.historyFirst}
                </Text>
                <Text className="font-sans text-xs text-[#64748B]">{formatDay(entry.finished_at, bcp47)}</Text>
              </View>
              {entry.item_count > 0 ? (
                <Text className="font-sans text-xs font-bold text-[#64748B]">
                  {fillCopy(t.correctOf, { correct: entry.correct_count, total: entry.item_count })}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </TactileCard>
  );
}
