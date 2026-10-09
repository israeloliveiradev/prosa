import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export interface MedalProps {
  icon: ReactNode;
  title: string;
  description?: string;
  unlocked?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Medal({
  icon,
  title,
  description,
  unlocked = false,
  onPress,
  className = "",
}: MedalProps) {
  const content = (
    <View className={`items-center p-3 ${className}`}>
      <View
        className={`w-16 h-16 rounded-full items-center justify-center border-b-4 ${
          unlocked
            ? "bg-streak border-streakEdge shadow-sm"
            : "bg-sunken border-line opacity-60"
        }`}
      >
        <View className={unlocked ? "" : "grayscale"}>{icon}</View>
      </View>
      <Text
        className={`font-label text-xs mt-2 text-center max-w-[90px] ${
          unlocked ? "text-ink" : "text-muted"
        }`}
        numberOfLines={2}
      >
        {title}
      </Text>
      {description ? (
        <Text className="text-[10px] text-muted text-center max-w-[100px] mt-0.5" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className="cursor-pointer active:scale-95">
        {content}
      </Pressable>
    );
  }

  return content;
}
