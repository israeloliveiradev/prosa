import { useState, type ReactNode } from "react";
import {
  Pressable,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeContext";
import { motion, radius, size as sizeTokens } from "@/design/tokens";
import { Text } from "./text";
import { Icon, type IconName } from "./icon";
import { useHaptics } from "./hooks/use-haptics";
import { useReducedMotionPref } from "./hooks/use-reduced-motion";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonTone = "brand" | "neutral" | "negative";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  children,
  variant: variantProp = "primary",
  tone,
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  onPress,
  testID,
  style,
  className,
}: ButtonProps) {
  const variant = tone === "negative" ? "danger" : variantProp;
  const { palette } = useTheme();
  const { trigger } = useHaptics();
  const reducedMotion = useReducedMotionPref();
  const [isHovered, setIsHovered] = useState(false);

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (disabled || loading) return;
    trigger("light");
    if (!reducedMotion) {
      scale.value = withTiming(motion.scale.press, { duration: motion.press });
    }
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    if (!reducedMotion) {
      scale.value = withTiming(1, { duration: motion.press });
    }
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Resolve dimensions
  const height = size === "sm" ? 32 : size === "md" ? 40 : 48;
  const paddingX = size === "sm" ? 12 : size === "md" ? 16 : 20;

  // Resolve colors based on variant & state
  let backgroundColor = "transparent";
  let borderColor = "transparent";
  let borderWidth = 0;
  let textColor: "onPrimary" | "ink" | "negative" = "ink";
  let iconTone: "onPrimary" | "ink" | "muted" | "negative" = "ink";

  if (variant === "primary") {
    backgroundColor = palette.primary;
    textColor = "onPrimary";
    iconTone = "onPrimary";
  } else if (variant === "secondary") {
    backgroundColor = isHovered ? palette.raised : palette.sheet;
    borderColor = palette.controlStrong;
    borderWidth = 1;
    textColor = "ink";
    iconTone = "ink";
  } else if (variant === "ghost") {
    backgroundColor = isHovered ? palette.active : "transparent";
    textColor = "ink";
    iconTone = isHovered ? "ink" : "muted";
  } else if (variant === "danger") {
    backgroundColor = isHovered ? palette.pillNegativeBg : "transparent";
    borderColor = palette.negative;
    borderWidth = 1;
    textColor = "negative";
    iconTone = "negative";
  }

  const isInteractive = !disabled && !loading;
  const effectiveOpacity = disabled ? 0.45 : 1;

  const hitSlop = height < sizeTokens.hit
    ? {
        top: Math.ceil((sizeTokens.hit - height) / 2),
        bottom: Math.ceil((sizeTokens.hit - height) / 2),
        left: 4,
        right: 4,
      }
    : undefined;

  const textVariant = size === "sm" ? "small" : "label";

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      disabled={!isInteractive}
      onPress={isInteractive ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      hitSlop={hitSlop}
      style={[
        {
          height,
          paddingHorizontal: paddingX,
          borderRadius: radius.control,
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: effectiveOpacity,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          cursor: isInteractive ? "pointer" : undefined,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        },
        animStyle,
        style,
      ]}
      className={`flex-row items-center justify-center gap-2 ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          accessibilityLabel="Carregando..."
          aria-label="Carregando..."
          color={textColor === "onPrimary" ? palette.onPrimary : palette.ink}
        />
      ) : (
        icon && <Icon name={icon} size={size === "sm" ? 16 : 20} tone={iconTone} />
      )}

      {(() => {
        const content = label !== undefined ? label : children;
        if (content == null) return null;
        if (typeof content === "string" || typeof content === "number") {
          return (
            <Text variant={textVariant} tone={textColor} weight="500">
              {content}
            </Text>
          );
        }
        if (Array.isArray(content)) {
          return content.map((item, idx) =>
            typeof item === "string" || typeof item === "number" ? (
              <Text key={idx} variant={textVariant} tone={textColor} weight="500">
                {item}
              </Text>
            ) : (
              item
            )
          );
        }
        return content;
      })()}

      {!loading && iconRight && (
        <Icon name={iconRight} size={size === "sm" ? 16 : 20} tone={iconTone} />
      )}
    </AnimatedPressable>
  );
}
