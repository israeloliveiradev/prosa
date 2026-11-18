import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useEffect } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { motion } from "@/design/tokens";
import { Text } from "./text";
import { useHaptics } from "./hooks/use-haptics";
import { useReducedMotionPref } from "./hooks/use-reduced-motion";

export interface SwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange?: (next: boolean) => void;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Switch({
  label,
  description,
  value,
  onValueChange,
  onChange,
  disabled = false,
  testID,
  style,
  className,
}: SwitchProps) {
  const { palette } = useTheme();
  const { trigger } = useHaptics();
  const reducedMotion = useReducedMotionPref();

  const offset = useSharedValue(value ? 16 : 2);

  useEffect(() => {
    const target = value ? 16 : 2;
    if (reducedMotion) {
      offset.value = target;
    } else {
      offset.value = withTiming(target, { duration: motion.quick });
    }
  }, [value, reducedMotion, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleToggle = () => {
    if (disabled) return;
    trigger("selection");
    const next = !value;
    if (onValueChange) onValueChange(next);
    if (onChange) onChange(next);
  };

  const trackColor = value ? palette.positive : palette.controlStrong;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={handleToggle}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      className={className}
    >
      <View className="flex-1 pr-4">
        <Text variant="label" tone="ink" weight="500">
          {label}
        </Text>
        {description && (
          <Text variant="small" tone="muted" className="mt-0.5">
            {description}
          </Text>
        )}
      </View>

      <View
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          backgroundColor: trackColor,
          justifyContent: "center",
          padding: 2,
        }}
      >
        <Animated.View
          style={[
            {
              width: 16,
              height: 16,
              borderRadius: 999,
              backgroundColor: palette.sheet,
            },
            thumbStyle,
          ]}
        />
      </View>
    </Pressable>
  );
}
