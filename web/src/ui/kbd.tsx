import React from "react";
import { View, StyleSheet, Platform, type ViewProps } from "react-native";
import { Text } from "./text";
import { useThemeTokens } from "../theme/ThemeContext";
import { usePointer } from "./hooks/use-pointer";

export interface KbdProps extends ViewProps {
  shortcut: string | string[];
  testID?: string;
}

export function Kbd({ shortcut, testID = "ui-kbd", style, ...props }: KbdProps) {
  const { colors, radius, spacing } = useThemeTokens();
  const pointer = usePointer();
  const hasFinePointer = pointer === "fine";

  // If mobile touch only, hide keyboard hint
  if (Platform.OS !== "web" || !hasFinePointer) {
    return null;
  }

  const keys = Array.isArray(shortcut) ? shortcut : [shortcut];

  return (
    <View testID={testID} style={[styles.container, style]} {...props}>
      {keys.map((k, idx) => (
        <View
          key={`${k}-${idx}`}
          style={[
            styles.key,
            {
              backgroundColor: colors.surface.raised,
              borderColor: colors.border.strong,
              borderRadius: radius.xs,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
            },
          ]}
        >
          <Text
            variant="caption"
            weight="medium"
            color="secondary"
            style={styles.keyText}
          >
            {k}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  key: {
    borderWidth: 1,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
