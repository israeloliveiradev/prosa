import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { Text } from "./text";
import { useThemeTokens } from "../theme/ThemeContext";

export interface ProgressProps extends ViewProps {
  value: number; // 0 to 100
  tone?: "accent" | "ink";
  labelStart?: string;
  labelEnd?: string;
  testID?: string;
}

export function Progress({
  value,
  tone = "accent",
  labelStart,
  labelEnd,
  testID = "ui-progress",
  style,
  ...props
}: ProgressProps) {
  const { colors } = useThemeTokens();
  const clampedValue = Math.min(100, Math.max(0, value));

  const trackBg = colors.surface.raised;
  const barBg = tone === "accent" ? colors.accent.brand : colors.text.primary;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={labelStart || "Progresso"}
      aria-label={labelStart || "Progresso"}
      accessibilityValue={{ min: 0, max: 100, now: clampedValue }}
      style={[styles.container, style]}
      {...props}
    >
      {(labelStart || labelEnd) && (
        <View style={styles.labelRow}>
          {labelStart ? (
            <Text variant="caption" color="secondary">
              {labelStart}
            </Text>
          ) : (
            <View />
          )}
          {labelEnd ? (
            <Text variant="caption" color="secondary">
              {labelEnd}
            </Text>
          ) : null}
        </View>
      )}
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View
          style={[
            styles.bar,
            {
              width: `${clampedValue}%`,
              backgroundColor: barBg,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
});
