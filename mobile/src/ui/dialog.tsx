import React, { useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Platform,
  type ViewProps,
} from "react-native";
import { Text } from "./text";
import { Button } from "./button";
import { useThemeTokens } from "../theme/ThemeContext";

export interface DialogAction {
  label: string;
  onPress: () => void;
  tone?: "brand" | "neutral" | "negative";
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  testID?: string;
}

export interface DialogProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  tone?: "neutral" | "negative";
  confirmAction?: DialogAction;
  cancelAction?: DialogAction;
  dismissible?: boolean;
  children?: React.ReactNode;
  testID?: string;
}

export function Dialog({
  visible,
  onClose,
  title,
  description,
  tone = "neutral",
  confirmAction,
  cancelAction,
  dismissible = true,
  children,
  testID = "ui-dialog",
  style,
}: DialogProps) {
  const { colors, spacing, radius } = useThemeTokens();

  useEffect(() => {
    if (!visible || !dismissible || Platform.OS !== "web") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, dismissible, onClose]);

  if (!visible) return null;

  const isDestructive = tone === "negative";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissible ? onClose : undefined}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: colors.overlay.scrim,
            padding: spacing.lg,
          },
        ]}
      >
        {dismissible && (
          <Pressable
            testID={`${testID}-backdrop`}
            accessibilityRole="button"
            accessibilityLabel="Fechar diálogo"
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
        )}

        <View
          testID={testID}
          accessibilityRole={isDestructive ? "alert" : undefined}
          role={(isDestructive ? "alertdialog" : "dialog") as any}
          accessibilityViewIsModal
          aria-modal={true}
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
              borderRadius: radius.lg,
              padding: spacing.xl,
            },
            style,
          ]}
        >
          <Text variant="heading-sm" color="primary" style={{ marginBottom: spacing.xs }}>
            {title}
          </Text>

          {description && (
            <Text
              variant="body-md"
              color="secondary"
              style={{ marginBottom: spacing.md }}
            >
              {description}
            </Text>
          )}

          {children && (
            <View style={{ marginBottom: spacing.md }}>
              {children}
            </View>
          )}

          <View style={[styles.actionsRow, { marginTop: spacing.md }]}>
            {cancelAction && (
              <Button
                variant={cancelAction.variant || "secondary"}
                tone={cancelAction.tone || "neutral"}
                onPress={cancelAction.onPress}
                loading={cancelAction.loading}
                testID={cancelAction.testID || `${testID}-cancel`}
                style={styles.actionBtn}
              >
                {cancelAction.label}
              </Button>
            )}
            {confirmAction && (
              <Button
                variant={confirmAction.variant || "primary"}
                tone={confirmAction.tone || (isDestructive ? "negative" : "brand")}
                onPress={confirmAction.onPress}
                loading={confirmAction.loading}
                testID={confirmAction.testID || `${testID}-confirm`}
                style={styles.actionBtn}
              >
                {confirmAction.label}
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    zIndex: 1001,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    minWidth: 90,
  },
});
