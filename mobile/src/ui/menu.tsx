import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  type ViewProps,
} from "react-native";
import { Text } from "./text";
import { Icon, type IconProps } from "./icon";
import { Popover } from "./popover";
import { useThemeTokens } from "../theme/ThemeContext";

export interface MenuItem {
  id: string;
  label: string;
  icon?: IconProps["name"];
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export type MenuEntry = MenuItem | { type: "divider" };

export interface MenuProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  entries: MenuEntry[];
  position?: "center" | "top" | "bottom";
  testID?: string;
}

export function Menu({
  visible,
  onClose,
  entries,
  position = "center",
  testID = "ui-menu",
  style,
}: MenuProps) {
  const { colors, spacing, radius } = useThemeTokens();

  return (
    <Popover
      visible={visible}
      onClose={onClose}
      position={position}
      testID={testID}
      style={[{ padding: spacing.xs, borderRadius: radius.md }, style]}
    >
      <View accessibilityRole="menu">
        {entries.map((entry, idx) => {
          if ("type" in entry && entry.type === "divider") {
            return (
              <View
                key={`divider-${idx}`}
                style={[
                  styles.divider,
                  {
                    backgroundColor: colors.border.subtle,
                    marginVertical: spacing.xxs,
                  },
                ]}
              />
            );
          }

          const item = entry as MenuItem;
          const isDestructive = item.destructive;

          return (
            <Pressable
              key={item.id}
              testID={`${testID}-item-${item.id}`}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.itemRow,
                {
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: radius.sm,
                  backgroundColor:
                    pressed || hovered
                      ? colors.surface.raised
                      : "transparent",
                  opacity: item.disabled ? 0.4 : 1,
                },
              ]}
            >
              {item.icon && (
                <View style={{ marginRight: spacing.sm }}>
                  <Icon
                    name={item.icon}
                    size={16}
                    color={
                      isDestructive
                        ? colors.status.negative
                        : colors.text.secondary
                    }
                  />
                </View>
              )}
              <Text
                variant="body-md"
                color={isDestructive ? "negative" : "primary"}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Popover>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
  },
  divider: {
    height: 1,
    width: "100%",
  },
});
