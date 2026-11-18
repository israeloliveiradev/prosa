import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { Text } from "./text";
import { Progress } from "./progress";
import { useThemeTokens } from "../theme/ThemeContext";

export interface StepperProps extends ViewProps {
  currentStep: number; // 1-indexed
  totalSteps: number;
  label?: string;
  testID?: string;
}

export function Stepper({
  currentStep,
  totalSteps,
  label,
  testID = "ui-stepper",
  style,
  ...props
}: StepperProps) {
  const { spacing } = useThemeTokens();
  const safeTotal = Math.max(1, totalSteps);
  const safeCurrent = Math.min(safeTotal, Math.max(1, currentStep));
  const progressPercent = Math.round((safeCurrent / safeTotal) * 100);

  const stepLabel = label || `Passo ${safeCurrent} de ${safeTotal}`;

  return (
    <View testID={testID} style={[styles.container, style]} {...props}>
      <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
        <Text variant="caption" weight="medium" color="secondary">
          {stepLabel}
        </Text>
      </View>
      <Progress
        value={progressPercent}
        tone="accent"
        testID={`${testID}-progress`}
      />
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
  },
});
