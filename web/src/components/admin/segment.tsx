import { Pressable, Text, View } from "react-native";

export function AdminSegment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" className="mt-8 flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            className={`min-h-12 cursor-pointer items-center justify-center rounded-full px-6 ${selected ? "bg-ember" : "border border-line bg-card"}`}
          >
            <Text className={`font-label text-base ${selected ? "text-onEmber" : "text-ink"}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
