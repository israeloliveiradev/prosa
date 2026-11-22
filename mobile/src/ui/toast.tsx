import React, { useState, useEffect, useCallback } from "react";
import { useAreaCopy } from "@/lib/copy/area";
import { UI } from "@/lib/copy/ui";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "./text";
import { Icon } from "./icon";
import { TextAction } from "./text-action";
import { useThemeTokens } from "../theme/ThemeContext";

export type ToastTone = "info" | "positive" | "negative" | "warning";

export interface ToastOptions {
  id?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastItem extends ToastOptions {
  id: string;
}

type Listener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<Listener> = new Set();

  show(options: ToastOptions | string) {
    const item: ToastItem =
      typeof options === "string"
        ? { id: `toast-${Date.now()}-${Math.random()}`, message: options, tone: "info" }
        : {
            ...options,
            id: options.id || `toast-${Date.now()}-${Math.random()}`,
            tone: options.tone || "info",
          };

    // Keep max 3 stacked
    this.toasts = [...this.toasts.slice(-2), item];
    this.notify();

    const duration = item.durationMs ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(item.id);
      }, duration);
    }

    return item.id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.toasts));
  }
}

export const toast = new ToastManager();

export function Toaster({ testID = "ui-toaster" }: { testID?: string }) {
  const ui = useAreaCopy(UI);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { colors, spacing, radius } = useThemeTokens();

  useEffect(() => {
    return toast.subscribe((updated) => {
      setToasts(updated);
    });
  }, []);

  const handleDismiss = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View
      testID={testID}
      accessibilityRole="none"
      pointerEvents="box-none"
      style={styles.container}
    >
      {toasts.map((item) => {
        const iconName =
          item.tone === "positive"
            ? "check-circle"
            : item.tone === "negative"
            ? "alert-circle"
            : item.tone === "warning"
            ? "alert-circle"
            : "info";

        const iconColor =
          item.tone === "positive"
            ? colors.status.positive
            : item.tone === "negative"
            ? colors.status.negative
            : item.tone === "warning"
            ? colors.status.warning
            : colors.accent.brand;

        return (
          <View
            key={item.id}
            testID={`ui-toast-${item.id}`}
            accessibilityRole="alert"
            style={[
              styles.toast,
              {
                backgroundColor: colors.surface.card,
                borderColor: colors.border.subtle,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View style={{ marginRight: spacing.sm }}>
              <Icon name={iconName} size={16} color={iconColor} />
            </View>
            <View style={styles.messageCol}>
              <Text variant="body-sm" color="primary">
                {item.message}
              </Text>
            </View>
            {item.action && (
              <View style={{ marginLeft: spacing.sm }}>
                <TextAction
                  onPress={() => {
                    item.action?.onPress();
                    handleDismiss(item.id);
                  }}
                  testID={`ui-toast-action-${item.id}`}
                >
                  {item.action.label}
                </TextAction>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.closeToast}
              onPress={() => handleDismiss(item.id)}
              style={{ marginLeft: spacing.sm, padding: 4 }}
            >
              <Icon name="x" size={14} color={colors.text.secondary} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
    gap: 8,
  },
  toast: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },
  messageCol: {
    flex: 1,
  },
});
