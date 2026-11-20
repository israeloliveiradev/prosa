import { Text, View } from "react-native";
import { TactileCard } from "@/components/tactile/tactile-card";
import { fillCopy, percent } from "@/features/placement/model/placement-flow";
import type { PlacementCopy } from "@/lib/copy/placement";
import { SectionLabel } from "./parts";

export interface ScoreRow {
  key: string;
  label: string;
  correct: number;
  total: number;
}

/**
 * Barras de acerto (faixa CEFR ou habilidade). Cada barra é `correct / total`
 * devolvidos pelo servidor; o número ao lado mostra a conta de verdade.
 */
export function ScoreBars({
  title,
  rows,
  t,
  tone = "teal",
  labelWidth = 112,
  testID,
}: {
  title: string;
  rows: ScoreRow[];
  t: PlacementCopy;
  tone?: "teal" | "amber";
  labelWidth?: number;
  testID?: string;
}) {
  if (rows.length === 0) {
    return null;
  }
  const fill = tone === "teal" ? "bg-[#0D9488]" : "bg-[#F59E0B]";
  return (
    <TactileCard animateEntry={false} className="flex-1 p-5" style={{ padding: 20 }}>
      <View testID={testID} className="gap-4">
        <SectionLabel>{title}</SectionLabel>
        <View className="gap-3">
          {rows.map((row) => {
            const value = percent(row.correct, row.total);
            const spoken = fillCopy(t.correctOf, { correct: row.correct, total: row.total });
            return (
              <View
                key={row.key}
                className="flex-row items-center gap-3"
                accessible
                accessibilityLabel={`${row.label}: ${spoken}`}
              >
                <View style={{ width: labelWidth }}>
                  <Text className="font-sans text-sm font-bold text-[#111C2D]" numberOfLines={1}>
                    {row.label}
                  </Text>
                </View>
                <View
                  className="h-3 flex-1 overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F5F0E8]"
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: value }}
                >
                  <View className={`h-full rounded-full ${fill}`} style={{ width: `${value}%` }} />
                </View>
                <View style={{ width: 48 }}>
                  <Text className="text-right font-sans text-sm font-bold text-[#64748B]">
                    {row.correct}/{row.total}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </TactileCard>
  );
}
