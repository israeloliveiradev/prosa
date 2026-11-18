import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

export type CardVariant = "base" | "interactive" | "selected";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
  className?: string;
  accessibilityRole?: "button" | "none";
  accessibilityLabel?: string;
}

export function Card({
  children,
  variant = "base",
  padding = "md",
  onPress,
  className = "",
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  let variantClasses = "border-2 border-line bg-card";
  if (variant === "selected") {
    variantClasses = "border-2 border-xp bg-xpSoft";
  } else if (variant === "interactive") {
    variantClasses = "border-2 border-line border-b-4 bg-card active:translate-y-0.5 active:border-b-2 cursor-pointer";
  }

  const baseStyle = `rounded-[20px] overflow-hidden ${variantClasses} ${paddingClasses[padding]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className={baseStyle}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseStyle}>{children}</View>;
}
