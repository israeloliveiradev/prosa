import { useMemo } from "react";
import { Text, View } from "react-native";
import type { AdminDay } from "@/lib/api";

export function OpsChart({ series }: { series: AdminDay[] }) {
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

  return (
    <View className="mt-10">
      <Text className="font-displayItalic text-headline text-ink">14 dias</Text>
      <Text className="mt-2 text-base leading-6 text-muted">
        {totals.users} contas novas · {totals.lessons} lições · {totals.duels} duelos. A altura é quantidade, não cor.
      </Text>
      <View className="mt-6 flex-row items-end gap-1">
        {series.map((day) => (
          <View key={day.date} className="min-w-0 flex-1 items-center">
            <View className="h-36 w-full flex-row items-end justify-center gap-0.5">
              <View
                accessibilityLabel={`${day.date}, ${day.users} contas`}
                className="w-1.5 rounded-t bg-ember"
                style={{ height: `${Math.max(6, (day.users / peak) * 100)}%` }}
              />
              <View
                accessibilityLabel={`${day.date}, ${day.lessons} lições`}
                className="w-1.5 rounded-t bg-moss"
                style={{ height: `${Math.max(6, (day.lessons / peak) * 100)}%` }}
              />
              <View
                accessibilityLabel={`${day.date}, ${day.duels} duelos`}
                className="w-1.5 rounded-t bg-sandInk"
                style={{ height: `${Math.max(6, (day.duels / peak) * 100)}%` }}
              />
            </View>
            <Text className="mt-2 text-[10px] text-muted">{day.date.slice(8)}</Text>
          </View>
        ))}
      </View>
      <View className="mt-4 gap-1">
        <Text className="text-base text-muted">Bordô · contas novas</Text>
        <Text className="text-base text-muted">Verde · lições</Text>
        <Text className="text-base text-muted">Areia · duelos</Text>
      </View>
    </View>
  );
}
