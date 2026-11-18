import React, { useState, useRef } from "react";
import { View, StyleSheet, Platform, type ViewProps } from "react-native";
import { Text } from "./text";
import { useThemeTokens } from "../theme/ThemeContext";

export interface TooltipProps extends ViewProps {
  content: string;
  delayMs?: number;
  testID?: string;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  delayMs = 400,
  testID = "ui-tooltip",
  children,
  style,
  ...props
}: TooltipProps) {
  const { colors, spacing, radius } = useThemeTokens();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = () => {
    if (Platform.OS !== "web") return;
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const handlePointerLeave = () => {
    if (Platform.OS !== "web") return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  return (
    <View
      style={[styles.wrapper, style]}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
      {visible && (
        <View
          testID={testID}
          accessibilityRole="none"
          aria-hidden={!visible}
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.text.primary,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xxs,
            },
          ]}
        >
          <Text
            variant="caption"
            style={{ color: colors.surface.page }}
          >
            {content}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    display: "flex",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -4 }],
    zIndex: 2000,
    pointerEvents: "none",
  },
});
