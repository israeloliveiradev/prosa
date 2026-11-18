import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { Text } from "./text";
import { IconButton } from "./icon-button";
import { useThemeTokens } from "../theme/ThemeContext";

export interface PageHeaderProps extends ViewProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  testID?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  onBack,
  backAccessibilityLabel = "Voltar",
  testID = "ui-page-header",
  style,
  ...props
}: PageHeaderProps) {
  const { spacing } = useThemeTokens();

  return (
    <View testID={testID} style={[styles.container, style]} {...props}>
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          {onBack && (
            <View style={{ marginBottom: spacing.xs }}>
              <IconButton
                icon="arrow-left"
                variant="ghost"
                size="md"
                accessibilityLabel={backAccessibilityLabel}
                onPress={onBack}
                testID={`${testID}-back`}
              />
            </View>
          )}
          <Text variant="display-sm" color="primary">
            {title}
          </Text>
          {description && (
            <Text
              variant="body-md"
              color="secondary"
              style={{ marginTop: spacing.xs }}
            >
              {description}
            </Text>
          )}
        </View>

        {actions && <View style={styles.actionsCol}>{actions}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleCol: {
    flex: 1,
  },
  actionsCol: {
    marginLeft: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
