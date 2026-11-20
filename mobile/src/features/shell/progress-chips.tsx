import { Text, View } from "react-native";
import { TactileIcon } from "@/components/tactile/tactile-icon";
import { tactile } from "@/components/tactile/tokens";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";
import type { TodaySnapshot } from "@/lib/today";

/** Ofensiva real (dias seguidos com sessão completa) e XP de hoje contra a meta. */
export function ProgressChips({ snapshot, compact = false }: { snapshot: TodaySnapshot; compact?: boolean }) {
  const t = useAreaCopy(SHELL_COPY);
  const lit = snapshot.streak > 0;
  const goalMet = snapshot.xpGoal > 0 && snapshot.xpToday >= snapshot.xpGoal;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        testID="shell-streak"
        accessible
        accessibilityRole="text"
        accessibilityLabel={t.streakA11y(snapshot.streak)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: lit ? "#FED7AA" : tactile.border,
          backgroundColor: lit ? tactile.streakSoft : tactile.surface,
        }}
      >
        <TactileIcon name="flame" size={16} color={lit ? tactile.streak : tactile.faint} fill={lit ? "#FDBA74" : "none"} />
        <Text style={{ fontFamily: tactile.font, fontSize: 14, fontWeight: "800", color: lit ? tactile.streak : tactile.muted, fontVariant: ["tabular-nums"] }}>
          {snapshot.streak}
        </Text>
      </View>
      {compact ? null : (
        <View
          testID="shell-xp"
          accessible
          accessibilityRole="text"
          accessibilityLabel={t.xpA11y(snapshot.xpToday, snapshot.xpGoal)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: goalMet ? "#FDE68A" : tactile.border,
            backgroundColor: goalMet ? tactile.amberSoft : tactile.surface,
          }}
        >
          <TactileIcon name="bolt" size={15} color={goalMet ? tactile.amber : tactile.primary} fill={goalMet ? "#FCD34D" : "none"} />
          <Text style={{ fontFamily: tactile.font, fontSize: 13, fontWeight: "800", color: goalMet ? tactile.amber : tactile.ink, fontVariant: ["tabular-nums"] }}>
            {t.xpChip(snapshot.xpToday, snapshot.xpGoal)}
          </Text>
        </View>
      )}
    </View>
  );
}
