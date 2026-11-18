import { useState } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeContext";
import { motion, radius, size as sizeTokens } from "@/design/tokens";
import { Icon, type IconName } from "./icon";
import { useHaptics } from "./hooks/use-haptics";
import { useReducedMotionPref } from "./hooks/use-reduced-motion";

export interface IconButtonProps {
  icon: IconName;
  label?: string;
  accessibilityLabel?: string;
  size?: 32 | 40 | "sm" | "md";
  variant?: "ghost" | "secondary";
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({
  icon,
  label,
  accessibilityLabel,
  size = 40,
  variant = "ghost",
  disabled = false,
  onPress,
  testID,
  style,
  className,
}: IconButtonProps) {
  const resolvedSize = size === "sm" ? 32 : size === "md" ? 40 : size;
  const a11yLabel = accessibilityLabel ?? label ?? icon;
  const { palette } = useTheme();
  const { trigger } = useHaptics();
  const reducedMotion = useReducedMotionPref();
  const [isHovered, setIsHovered] = useState(false);

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled) return;
    trigger("light");
    if (!reducedMotion) {
      scale.value = withTiming(motion.scale.press, { duration: motion.press });
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    if (!reducedMotion) {
      scale.value = withTiming(1, { duration: motion.press });
    }
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = variant === "secondary"
    ? (isHovered ? palette.raised : palette.sheet)
    : (isHovered ? palette.active : "transparent");

  const borderColor = variant === "secondary" ? palette.border : "transparent";
  const borderWidth = variant === "secondary" ? 1 : 0;
  const iconTone = isHovered ? "ink" : "muted";

  const hitSlop = resolvedSize < sizeTokens.hit
    ? {
        top: Math.ceil((sizeTokens.hit - resolvedSize) / 2),
        bottom: Math.ceil((sizeTokens.hit - heightDiff(resolvedSize) / 2)),
        left: Math.ceil((sizeTokens.hit - resolvedSize) / 2),
        right: Math.ceil((sizeTokens.hit - resolvedSize) / 2),
      }
    : undefined;

  function heightDiff(s: number) {
    return sizeTokens.hit - s;
  }

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={!disabled ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      hitSlop={hitSlop}
      style={[
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: radius.control,
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.45 : 1,
          alignItems: "center",
          justifyContent: "center",
        },
        animStyle,
        style,
      ]}
      className={className}
    >
      <Icon name={icon} size={20} tone={iconTone} />
    </AnimatedPressable>
  );
}
