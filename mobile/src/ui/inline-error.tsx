import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { Text } from "./text";
import { Icon } from "./icon";
import { TextAction } from "./text-action";
import { useThemeTokens } from "../theme/ThemeContext";

export interface InlineErrorProps extends ViewProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  testID?: string;
}

export function InlineError({
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  testID = "ui-inline-error",
  style,
  ...props
}: InlineErrorProps) {
  const { colors, spacing, radius } = useThemeTokens();

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      aria-live="assertive"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface.raised,
          borderColor: colors.status.negative,
          padding: spacing.md,
          borderRadius: radius.md,
        },
        style,
      ]}
      {...props}
    >
      <View style={styles.contentRow}>
        <View style={{ marginRight: spacing.sm, marginTop: 2 }}>
          <Icon name="alert-circle" size={16} color={colors.status.negative} />
        </View>
        <View style={styles.messageCol}>
          <Text variant="body-sm" color="negative">
            {message}
          </Text>
          {onRetry && (
            <View style={{ marginTop: spacing.xs }}>
              <TextAction
                onPress={onRetry}
                tone="negative"
                testID={`${testID}-retry`}
              >
                {retryLabel}
              </TextAction>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: "100%",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  messageCol: {
    flex: 1,
  },
});
