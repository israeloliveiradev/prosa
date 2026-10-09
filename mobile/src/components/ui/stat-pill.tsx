import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export interface StatPillProps {
  icon: ReactNode;
  value: string | number;
  label?: string;
  tone?: "primary" | "streak" | "xp" | "muted";
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function StatPill({
  icon,
  value,
  label,
  tone = "muted",
  onPress,
  accessibilityLabel,
}: StatPillProps) {
  const toneTextMap = {
    primary: "text-primary",
    streak: "text-streak",
    xp: "text-xp",
    muted: "text-ink",
  };

  const content = (
    <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-card">
      <View className="items-center justify-center">{icon}</View>
      <Text className={`font-label text-sm ${toneTextMap[tone]}`}>{value}</Text>
      {label ? <Text className="font-label text-xs text-muted ml-0.5">{label}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        className="cursor-pointer active:opacity-80"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
