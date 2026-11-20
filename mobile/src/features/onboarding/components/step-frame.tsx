import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { TactileButton, type ButtonVariant } from "@/components/tactile/tactile-button";

export interface StepFrameProps {
  kicker?: string;
  title: string;
  dek?: string;
  children?: ReactNode;
  footer?: ReactNode;
  testID?: string;
}

/** Cabeçalho (rótulo, título, apoio), conteúdo e rodapé de ações de um passo. */
export function StepFrame({ kicker, title, dek, children, footer, testID }: StepFrameProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        {kicker ? (
          <Text variant="caption" weight="bold" tone="accent" style={styles.kicker}>
            {kicker}
          </Text>
        ) : null}
        <Text variant="title" weight="bold" tone="ink" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {dek ? (
          <Text variant="body" tone="muted" style={styles.dek}>
            {dek}
          </Text>
        ) : null}
      </View>
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

export interface StepActionProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  testID: string;
}

/** Botão 3D do visual tátil, com testID para os testes de ponta a ponta. */
export function StepAction({ label, onPress, disabled = false, variant = "primary", testID }: StepActionProps) {
  return (
    <View testID={testID} style={styles.action}>
      <TactileButton label={label} onPress={onPress} disabled={disabled} variant={variant} size="lg" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 24,
  },
  header: {
    gap: 8,
  },
  kicker: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  dek: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    gap: 10,
    paddingTop: 4,
  },
  action: {
    width: "100%",
  },
});
