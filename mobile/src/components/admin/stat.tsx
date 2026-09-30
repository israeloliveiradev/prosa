import { Text, View } from "react-native";
import { keepWords } from "@/lib/text";

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="min-w-28 border-l border-ink py-1 pl-4">
      <Text className="font-label text-[11px] uppercase tracking-[0.22em] text-muted">{keepWords(label)}</Text>
      <Text className="font-display mt-1 text-3xl text-ink">{value}</Text>
    </View>
  );
}
