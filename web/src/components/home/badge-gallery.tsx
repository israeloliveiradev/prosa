import { Text, View } from "react-native";
import { BADGES } from "@/lib/progress";

const MARKS = ["I", "II", "III", "IV", "V", "VI"] as const;

export function BadgeGallery({ unlocked }: { unlocked: string[] }) {
  const owned = new Set(unlocked);
  return (
    <View className="flex-row flex-wrap gap-x-6 gap-y-8">
      {BADGES.map((badge, index) => {
        const active = owned.has(badge.code);
        return (
          <View key={badge.code} accessibilityLabel={`${badge.name}. ${active ? "Conquistada" : "Bloqueada"}. ${badge.description}`} className="w-[140px] items-center">
            <View className={`h-16 w-16 items-center justify-center rounded-full border ${active ? "border-ember bg-emberSoft" : "border-line bg-transparent"}`}>
              <Text className={`font-display text-xl ${active ? "text-ember" : "text-muted"}`}>{MARKS[index]}</Text>
            </View>
            <Text className="mt-3 text-center font-label text-sm text-ink">{badge.name}</Text>
            <Text className="mt-1 text-center text-xs leading-4 text-muted">{active ? "Conquistada" : "Bloqueada"}</Text>
          </View>
        );
      })}
    </View>
  );
}
