import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme/ThemeContext";

export type ButtonVariant = "primary" | "success" | "danger" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

export interface ButtonProps {
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  accessibilityLabel,
  className = "",
}: ButtonProps) {
  const { palette } = useTheme();
  const isInteractive = !disabled && !loading;

  // Alturas e paddings
  const heightClass = size === "lg" ? "min-h-[56px] py-3.5 px-6" : "min-h-[52px] py-3 px-5";
  const textClass = size === "lg" ? "text-base font-label" : "text-sm font-label";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      disabled={!isInteractive}
      onPress={isInteractive ? onPress : undefined}
      className={`${fullWidth ? "w-full" : "self-start"} ${className}`}
    >
      {({ pressed }) => {
        const isPressed = pressed && isInteractive;

        // Estilos de variante (Fundo, Texto e Borda 3D)
        let bgStyle = "bg-primary";
        let textStyle = "text-onPrimary";
        let borderStyle = "border-b-4 border-primaryEdge";
        let spinnerColor = palette.onPrimary;

        if (disabled) {
          bgStyle = "bg-sunken";
          textStyle = "text-muted";
          borderStyle = "border-b-0";
          spinnerColor = palette.muted;
        } else if (variant === "success") {
          bgStyle = "bg-success";
          textStyle = "text-onSuccess";
          borderStyle = "border-b-4 border-successEdge";
          spinnerColor = palette.onSuccess;
        } else if (variant === "danger") {
          bgStyle = "bg-danger";
          textStyle = "text-onDanger";
          borderStyle = "border-b-4 border-dangerEdge";
          spinnerColor = palette.onDanger;
        } else if (variant === "secondary") {
          bgStyle = "bg-card";
          textStyle = "text-ink";
          borderStyle = "border-2 border-line border-b-4";
          spinnerColor = palette.ink;
        } else if (variant === "ghost") {
          bgStyle = "bg-transparent";
          textStyle = "text-ink";
          borderStyle = "border-b-0";
          spinnerColor = palette.ink;
        }

        // Quando pressionado: remove a borda 3D inferior e desce o botão 4px
        const pressStyle = isPressed ? "translate-y-1 border-b-0 mt-1" : "";

        return (
          <View
            className={`flex-row items-center justify-center rounded-2xl cursor-pointer select-none active:opacity-95 ${heightClass} ${bgStyle} ${borderStyle} ${pressStyle}`}
          >
            {loading ? (
              <ActivityIndicator size="small" color={spinnerColor} />
            ) : (
              <View className="flex-row items-center justify-center gap-2">
                {icon ? <View>{icon}</View> : null}
                {typeof children === "string" ? (
                  <Text className={`${textClass} ${textStyle} tracking-wide text-center`}>{children}</Text>
                ) : (
                  children
                )}
                {iconRight ? <View>{iconRight}</View> : null}
              </View>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}
