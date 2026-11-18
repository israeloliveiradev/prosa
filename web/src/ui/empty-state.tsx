import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { Card } from "./card";
import { Text } from "./text";
import { Button, type ButtonProps } from "./button";
import { Icon, type IconProps } from "./icon";
import { useThemeTokens } from "../theme/ThemeContext";

export interface EmptyStateProps extends ViewProps {
  icon?: IconProps["name"];
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
    variant?: ButtonProps["variant"];
    tone?: ButtonProps["tone"];
    testID?: string;
  };
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  testID = "ui-empty-state",
  style,
  ...props
}: EmptyStateProps) {
  const { colors, spacing } = useThemeTokens();

  return (
    <Card
      testID={testID}
      style={[styles.container, { padding: spacing.xl }, style]}
      {...props}
    >
      {icon && (
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.surface.raised,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Icon name={icon} size={28} color={colors.text.secondary} />
        </View>
      )}
      <Text
        variant="heading-sm"
        color="primary"
        align="center"
        style={{ marginBottom: description ? spacing.xs : spacing.md }}
      >
        {title}
      </Text>
      {description && (
        <Text
          variant="body-md"
          color="secondary"
          align="center"
          style={{ marginBottom: action ? spacing.lg : 0 }}
        >
          {description}
        </Text>
      )}
      {action && (
        <Button
          variant={action.variant || "secondary"}
          tone={action.tone || "neutral"}
          onPress={action.onPress}
          testID={action.testID || `${testID}-action`}
        >
          {action.label}
        </Button>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
