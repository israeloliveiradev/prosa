import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export interface BadgeProps {
  children: ReactNode;
  tone?: "primary" | "success" | "streak" | "xp" | "danger" | "muted";
  className?: string;
}

export function Badge({ children, tone = "muted", className = "" }: BadgeProps) {
  const toneClasses = {
    primary: "bg-primarySoft text-primary border-primary/20",
    success: "bg-successSoft text-success border-success/20",
    streak: "bg-streak/15 text-streakEdge border-streak/20",
    xp: "bg-xpSoft text-xp border-xp/20",
    danger: "bg-dangerSoft text-danger border-danger/20",
    muted: "bg-sunken text-muted border-line",
  };

  return (
    <View
      className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-label ${toneClasses[tone]} ${className}`}
    >
      {typeof children === "string" ? (
        <Text className="font-label text-xs tracking-wider">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Chip({ label, selected = false, onPress, className = "" }: ChipProps) {
  const baseClasses = selected
    ? "bg-xpSoft border-xp text-xp"
    : "bg-card border-line text-ink active:bg-sunken";

  const chipContent = (
    <View
      className={`px-3.5 py-1.5 rounded-full border-2 items-center justify-center cursor-pointer ${baseClasses} ${className}`}
    >
      <Text className={`font-label text-xs ${selected ? "text-xp" : "text-ink"}`}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {chipContent}
      </Pressable>
    );
  }

  return chipContent;
}
