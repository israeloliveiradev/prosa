import React, { useEffect } from "react";
import { useAreaCopy } from "@/lib/copy/area";
import { UI } from "@/lib/copy/ui";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Platform,
  type ViewProps,
} from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

export interface PopoverProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: "center" | "top" | "bottom";
  testID?: string;
}

export function Popover({
  visible,
  onClose,
  children,
  position = "center",
  testID = "ui-popover",
  style,
  ...props
}: PopoverProps) {
  const ui = useAreaCopy(UI);
  const { colors, spacing, radius } = useThemeTokens();

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          position === "top" && styles.posTop,
          position === "bottom" && styles.posBottom,
          position === "center" && styles.posCenter,
        ]}
      >
        <Pressable
          testID={`${testID}-backdrop`}
          accessibilityRole="button"
          accessibilityLabel={ui.closePopover}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View
          testID={testID}
          style={[
            styles.content,
            {
              backgroundColor: colors.surface.card,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
              padding: spacing.md,
            },
            style,
          ]}
          {...props}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    zIndex: 1000,
  },
  posCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  posTop: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 80,
  },
  posBottom: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 80,
  },
  content: {
    borderWidth: 1,
    minWidth: 200,
    maxWidth: 360,
    zIndex: 1001,
  },
});
