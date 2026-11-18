import React from "react";
import { View, StyleSheet, type DimensionValue, type ViewProps } from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

export interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: "sm" | "md" | "full";
  testID?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius = "md",
  testID = "ui-skeleton",
  style,
  ...props
}: SkeletonProps) {
  const { colors, radius: radiusTokens } = useThemeTokens();

  const borderRadius =
    radius === "sm"
      ? radiusTokens.sm
      : radius === "full"
      ? radiusTokens.full
      : radiusTokens.md;

  return (
    <View
      testID={testID}
      role="status"
      accessibilityLabel="Carregando..."
      aria-busy={true}
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surface.raised,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
