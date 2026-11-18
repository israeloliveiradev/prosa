import { useState } from "react";
import {
  Pressable,
  View,
  Modal,
  ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";
import { Icon } from "./icon";
import { usePointer } from "./hooks/use-pointer";
import { useHaptics } from "./hooks/use-haptics";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string = string> {
  label: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (val: T) => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Select<T extends string = string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  testID,
  style,
  className,
}: SelectProps<T>) {
  const { palette } = useTheme();
  const pointer = usePointer();
  const { trigger } = useHaptics();
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const height = pointer === "fine" ? 40 : 48;

  const handleSelect = (val: T) => {
    trigger("selection");
    onChange(val);
    setOpen(false);
  };

  return (
    <View style={style} className={`gap-1.5 ${className ?? ""}`}>
      {label && (
        <Text variant="label" tone="ink" weight="500">
          {label}
        </Text>
      )}

      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onPress={() => !disabled && setOpen((prev) => !prev)}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={{
          height,
          backgroundColor: disabled ? palette.raised : palette.sheet,
          borderColor: open ? palette.accent : isHovered ? palette.controlStrong : palette.controlStrong,
          borderWidth: open ? 1.5 : 1,
          borderRadius: radius.control,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text variant="body" tone={selectedOption ? "ink" : "faint"}>
          {selectedOption ? selectedOption.label : "Selecione..."}
        </Text>
        <Icon name="caret" size={16} tone="muted" />
      </Pressable>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: palette.scrim,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            testID={testID ? `${testID}-menu` : undefined}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 400,
              maxHeight: 320,
              backgroundColor: palette.sheet,
              borderRadius: radius.sheet,
              borderWidth: 1,
              borderColor: palette.border,
              overflow: "hidden",
            }}
          >
            <View className="border-b border-border p-3">
              <Text variant="section" tone="ink" weight="600">
                {label}
              </Text>
            </View>
            <ScrollView className="p-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    testID={testID ? `${testID}-option-${opt.value}` : undefined}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelect(opt.value)}
                    style={{
                      height: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 12,
                      borderRadius: radius.control,
                      backgroundColor: isSelected ? palette.accentSoft : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <Text
                      variant="body"
                      tone={isSelected ? "accent" : "ink"}
                      weight={isSelected ? "500" : "400"}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Icon name="check" size={16} tone="accent" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
