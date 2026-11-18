import { useState, type ReactNode } from "react";
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeContext";
import { radius, motion } from "@/design/tokens";
import { Text } from "./text";
import { useReducedMotionPref } from "./hooks/use-reduced-motion";

export type CardPadding = "none" | "sm" | "md";

export interface CardProps {
  children?: ReactNode;
  padding?: CardPadding;
  onPress?: () => void;
  selected?: boolean;
  header?: ReactNode | { title: string; action?: ReactNode };
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  padding = "md",
  onPress,
  selected = false,
  header,
  testID,
  style,
  className,
}: CardProps) {
  const { palette } = useTheme();
  const reducedMotion = useReducedMotionPref();
  const [isHovered, setIsHovered] = useState(false);

  const scale = useSharedValue(1);

  const isInteractive = !!onPress;

  const handlePressIn = () => {
    if (!isInteractive) return;
    if (!reducedMotion) {
      scale.value = withTiming(0.99, { duration: motion.press });
    }
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    if (!reducedMotion) {
      scale.value = withTiming(1, { duration: motion.press });
    }
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const padValue = padding === "none" ? 0 : padding === "sm" ? 12 : 16;

  const borderColor = selected
    ? palette.accent
    : isHovered && isInteractive
    ? palette.controlStrong
    : palette.border;

  const borderWidth = selected ? 1.5 : 1;

  const content = (
    <>
      {header && (
        <View className="mb-3 flex-row items-center justify-between">
          {typeof header === "object" && header !== null && "title" in header ? (
            <>
              <Text variant="section" tone="ink" weight="600">
                {header.title}
              </Text>
              {header.action}
            </>
          ) : (
            header
          )}
        </View>
      )}
      {children}
    </>
  );

  const cardStyle: ViewStyle = {
    backgroundColor: palette.sheet,
    borderColor,
    borderWidth,
    borderRadius: radius.card,
    padding: padValue,
  };

  if (isInteractive) {
    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={[cardStyle, { cursor: "pointer" }, animStyle, style]}
        className={className}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View testID={testID} style={[cardStyle, style]} className={className}>
      {content}
    </View>
  );
}
