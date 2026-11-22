import { useMemo } from "react";
import { Text, View } from "react-native";
import { tactile } from "@/components/tactile/tokens";
import { fill } from "@/components/persona/talk-logic";
import type { AdminDay } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { ADMIN } from "@/lib/copy/admin";

const COLORS = { users: tactile.primary, lessons: tactile.amber, duels: tactile.faint } as const;

export function OpsChart({ series }: { series: AdminDay[] }) {
  const t = useAreaCopy(ADMIN);
  const peak = useMemo(() => Math.max(1, ...series.flatMap((day) => [day.users, day.lessons, day.duels])), [series]);
  const totals = useMemo(
    () =>
      series.reduce(
        (acc, day) => ({
          users: acc.users + day.users,
          lessons: acc.lessons + day.lessons,
          duels: acc.duels + day.duels,
        }),
        { users: 0, lessons: 0, duels: 0 },
      ),
    [series],
  );
  const legend = [
    { key: "users", label: t.legendUsers },
    { key: "lessons", label: t.legendLessons },
    { key: "duels", label: t.legendDuels },
  ] as const;

  return (
    <View style={{ gap: 8 }}>
      <Text className="font-display font-extrabold" style={{ fontSize: 22, color: tactile.ink }}>
        {t.chartTitle}
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: tactile.muted }}>{fill(t.chartSummary, totals)}</Text>
      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
        {series.map((day) => (
          <View key={day.date} style={{ minWidth: 0, flex: 1, alignItems: "center" }}>
            <View style={{ height: 144, width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
              {(["users", "lessons", "duels"] as const).map((key) => (
                <View
                  key={key}
                  accessibilityLabel={fill(key === "users" ? t.dayUsers : key === "lessons" ? t.dayLessons : t.dayDuels, {
                    date: day.date,
                    n: day[key],
                  })}
                  style={{
                    width: 6,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                    backgroundColor: COLORS[key],
                    height: `${Math.max(6, (day[key] / peak) * 100)}%`,
                  }}
                />
              ))}
            </View>
            <Text style={{ marginTop: 6, fontSize: 10, color: tactile.muted }}>{day.date.slice(8)}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {legend.map((item) => (
          <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[item.key] }} />
            <Text style={{ fontSize: 13, color: tactile.muted }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
