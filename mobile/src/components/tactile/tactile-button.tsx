import React, { useState } from "react";
import { Platform, Pressable, Text, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { motion } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "amber" | "crimson" | "ghost" | "purple";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface TactileButtonProps {
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  { bg: string; shadow: string; border?: string; text: string; activeShadow: string }
> = {
  primary: {
    bg: "#0D9488",
    shadow: "0 4px 0 #0F766E",
    border: "#0F766E",
    text: "#FFFFFF",
    activeShadow: "0 1px 0 #0F766E",
  },
  secondary: {
    bg: "#FFFFFF",
    shadow: "0 4px 0 #CBD5E1",
    border: "#E2E8F0",
    text: "#111C2D",
    activeShadow: "0 1px 0 #CBD5E1",
  },
  amber: {
    bg: "#F59E0B",
    shadow: "0 4px 0 #D97706",
    border: "#D97706",
    text: "#2A1700",
    activeShadow: "0 1px 0 #D97706",
  },
  crimson: {
    bg: "#EF4444",
    shadow: "0 4px 0 #DC2626",
    border: "#DC2626",
    text: "#FFFFFF",
    activeShadow: "0 1px 0 #DC2626",
  },
  purple: {
    bg: "#8B5CF6",
    shadow: "0 4px 0 #7C3AED",
    border: "#7C3AED",
    text: "#FFFFFF",
    activeShadow: "0 1px 0 #7C3AED",
  },
  ghost: {
    bg: "transparent",
    shadow: "none",
    border: "transparent",
    text: "#00685F",
    activeShadow: "none",
  },
};

const SIZE_STYLES: Record<ButtonSize, { py: number; px: number; fontSize: number; radius: number }> = {
  sm: { py: 8, px: 12, fontSize: 12, radius: 12 },
  md: { py: 12, px: 18, fontSize: 14, radius: 14 },
  lg: { py: 14, px: 22, fontSize: 16, radius: 16 },
  xl: { py: 18, px: 28, fontSize: 18, radius: 20 },
};

export function TactileButton({
  children,
  label,
  onPress,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  style,
  textStyle,
  icon,
  rightIcon,
  fullWidth = false,
}: TactileButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const [isPressed, setIsPressed] = useState(false);
  const handleAction = onPress || onClick;

  if (Platform.OS === "web") {
    return (
      <motion.button
        type="button"
        disabled={disabled}
        onClick={handleAction}
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { y: 3, boxShadow: v.activeShadow }}
        transition={{ duration: 0.08, ease: "easeInOut" }}
        className={`box-border flex items-center justify-center font-bold tracking-tight select-none cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${fullWidth ? "w-full" : ""} ${className}`}
        style={{
          boxSizing: "border-box",
          backgroundColor: v.bg,
          boxShadow: v.shadow,
          border: v.border ? `1.5px solid ${v.border}` : "none",
          borderRadius: s.radius,
          paddingTop: s.py,
          paddingBottom: s.py,
          paddingLeft: s.px,
          paddingRight: s.px,
          color: v.text,
          fontSize: s.fontSize,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          outline: "none",
          ...(style as any),
        }}
      >
        {icon}
        {label ? <span>{label}</span> : children}
        {rightIcon}
      </motion.button>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        {
          backgroundColor: v.bg,
          borderRadius: s.radius,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          boxShadow: isPressed ? v.activeShadow : v.shadow,
          transform: [{ translateY: isPressed ? 3 : 0 }],
          width: fullWidth ? "100%" : "auto",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        } as any,
        style,
      ]}
    >
      {icon}
      {label ? (
        <Text
          style={[
            {
              color: v.text,
              fontSize: s.fontSize,
              fontWeight: "700",
              fontFamily: "Plus Jakarta Sans",
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : (
        children
      )}
      {rightIcon}
    </Pressable>
  );
}

