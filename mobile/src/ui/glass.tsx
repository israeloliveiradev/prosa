import React from "react";
import { View, StyleSheet, Platform, type ViewProps, type ViewStyle } from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

export interface GlassProps extends ViewProps {
  intensity?: "subtle" | "regular" | "heavy";
  tint?: "default" | "surface" | "raised";
  testID?: string;
  children?: React.ReactNode;
}

export function Glass({
  intensity = "regular",
  tint = "surface",
  children,
  testID = "ui-glass",
  style,
  ...props
}: GlassProps) {
  const { scheme, colors } = useThemeTokens();
  const isDark = scheme === "dark";

  const blurAmount = intensity === "subtle" ? 8 : intensity === "heavy" ? 24 : 16;

  // Background tint with alpha
  let baseColor = colors.surface.page;
  if (tint === "raised") baseColor = colors.surface.raised;
  if (tint === "surface") baseColor = colors.surface.card;

  // In dark mode 0.85 opacity, light mode 0.88 opacity
  const alpha = isDark ? "dd" : "e0";
  // If baseColor is hex, append alpha, or if var use fallback
  const bgWithAlpha = baseColor.startsWith("#") ? `${baseColor}${alpha}` : baseColor;

  const webStyle: ViewStyle =
    Platform.OS === "web"
      ? ({
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
        } as unknown as ViewStyle)
      : {};

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: bgWithAlpha,
          borderColor: colors.border.subtle,
        },
        webStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
