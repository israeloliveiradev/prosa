import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/shell/icon";
import { useTheme } from "@/theme/ThemeContext";

export type TrailNodeState = "done" | "today" | "locked" | "special";

export interface TrailNodeProps {
  state: TrailNodeState;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  className?: string;
}

export function TrailNode({
  state,
  title,
  subtitle,
  onPress,
  className = "",
}: TrailNodeProps) {
  const { palette } = useTheme();
  const isClickable = state !== "locked";

  let bgClass = "bg-primary border-b-4 border-primaryEdge";
  let iconName: "check" | "star" | "lock" | "bolt" = "star";
  let iconColor = palette.onPrimary;

  if (state === "done") {
    bgClass = "bg-success border-b-4 border-successEdge";
    iconName = "check";
    iconColor = palette.onSuccess;
  } else if (state === "locked") {
    bgClass = "bg-sunken border-b-4 border-line opacity-65";
    iconName = "lock";
    iconColor = palette.muted;
  } else if (state === "special") {
    bgClass = "bg-streak border-b-4 border-streakEdge";
    iconName = "bolt";
    iconColor = palette.onStreak;
  }

  const content = (
    <View className={`items-center select-none ${className}`}>
      {/* Círculo com efeito de anel para o nó do dia */}
      <View className="relative items-center justify-center">
        {state === "today" ? (
          <View className="absolute -inset-2 rounded-full border-2 border-primary/30 border-dashed animate-spin" />
        ) : null}

        <View
          className={`w-[72px] h-[72px] rounded-full items-center justify-center ${bgClass} ${
            isClickable ? "active:translate-y-1 active:border-b-0" : ""
          }`}
        >
          <Icon name={iconName} color={iconColor} size={28} />
        </View>
      </View>

      {title ? (
        <Text
          className={`font-label text-sm mt-2 text-center max-w-[120px] ${
            state === "locked" ? "text-muted" : "text-ink"
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : null}

      {subtitle ? (
        <Text className="text-xs text-muted text-center max-w-[120px]" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  if (isClickable && onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="cursor-pointer active:opacity-90"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
