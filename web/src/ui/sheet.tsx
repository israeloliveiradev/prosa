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
import { IconButton } from "./icon-button";
import { useThemeTokens } from "../theme/ThemeContext";
import { useBreakpoint } from "./hooks/use-breakpoint";

export interface SheetProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  testID?: string;
}

export function Sheet({
  visible,
  onClose,
  title,
  description,
  children,
  testID = "ui-sheet",
  style,
}: SheetProps) {
  const { colors, spacing, radius } = useThemeTokens();
  const { isDesktopOrLaptop } = useBreakpoint();

  // Handle ESC on web
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
      animationType={isDesktopOrLaptop ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: colors.overlay.scrim,
            justifyContent: isDesktopOrLaptop ? "flex-end" : "flex-end",
            flexDirection: isDesktopOrLaptop ? "row" : "column",
          },
        ]}
      >
        {/* Scrim click backdrop */}
        <Pressable
          testID={`${testID}-backdrop`}
          accessibilityRole="button"
          accessibilityLabel="Fechar painel"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        {/* Sheet Content */}
        <View
          testID={testID}
          accessibilityRole="none"
          accessibilityViewIsModal
          aria-modal={true}
          style={[
            styles.sheetBase,
            isDesktopOrLaptop ? styles.sidePanel : styles.bottomSheet,
            {
              backgroundColor: colors.surface.page,
              borderColor: colors.border.subtle,
            },
            !isDesktopOrLaptop && {
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              borderTopWidth: 1,
            },
            isDesktopOrLaptop && {
              borderLeftWidth: 1,
            },
            style,
          ]}
        >
          {/* Mobile Drag Handle */}
          {!isDesktopOrLaptop && (
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: colors.border.strong },
                ]}
              />
            </View>
          )}

          {/* Header */}
          {Boolean(title || description) && (
            <View
              style={[
                styles.header,
                {
                  paddingHorizontal: spacing.lg,
                  paddingTop: isDesktopOrLaptop ? spacing.lg : spacing.sm,
                  paddingBottom: spacing.md,
                },
              ]}
            >
              <View style={styles.titleCol}>
                {title && (
                  <Text variant="heading-sm" color="primary">
                    {title}
                  </Text>
                )}
                {description && (
                  <Text
                    variant="body-sm"
                    color="secondary"
                    style={{ marginTop: spacing.xxs }}
                  >
                    {description}
                  </Text>
                )}
              </View>
              <IconButton
                icon="x"
                variant="ghost"
                size="md"
                accessibilityLabel="Fechar"
                onPress={onClose}
                testID={`${testID}-close`}
              />
            </View>
          )}

          {/* Body */}
          <View
            style={[
              styles.body,
              {
                paddingHorizontal: spacing.lg,
                paddingBottom: isDesktopOrLaptop ? spacing.xl : spacing["2xl"],
              },
            ]}
          >
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: "relative",
    zIndex: 1000,
  },
  sheetBase: {
    zIndex: 1001,
  },
  bottomSheet: {
    width: "100%",
    maxHeight: "90%",
  },
  sidePanel: {
    width: 420,
    maxWidth: "100%",
    height: "100%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
    width: "100%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleCol: {
    flex: 1,
    marginRight: 12,
  },
  body: {
    flexGrow: 1,
  },
});
