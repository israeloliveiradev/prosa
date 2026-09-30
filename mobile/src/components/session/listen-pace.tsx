import { Pressable, Text, View } from "react-native";
import { LISTEN_RATES, type ListenRate } from "@/lib/listen-pace";
import { setListenRate, useListenRate } from "@/lib/listen-rate";

export function ListenPace() {
  const rate = useListenRate();
  return (
    <View accessibilityRole="radiogroup" className="mt-4 flex-row flex-wrap gap-2">
      {LISTEN_RATES.map((item) => {
        const selected = rate === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="radio"
            accessibilityLabel={paceLabel(item)}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => setListenRate(item)}
            className={`min-h-12 min-w-16 items-center justify-center rounded-full px-4 ${selected ? "bg-ember" : "border border-line bg-card"}`}
          >
            <Text className={`font-label text-sm ${selected ? "text-onEmber" : "text-ink"}`}>{paceLabel(item)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function paceLabel(rate: ListenRate): string {
  if (rate === 0.75) {
    return "0,75×";
  }
  if (rate === 1.15) {
    return "1,15×";
  }
  return "1×";
}
