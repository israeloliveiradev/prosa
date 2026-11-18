import { useState } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { size as sizeTokens } from "@/design/tokens";
import { Text } from "./text";
import { Icon, type IconName } from "./icon";
import { useHaptics } from "./hooks/use-haptics";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
  role?: "checkbox" | "radio" | "button";
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  testID,
  role = "button",
  style,
  className,
}: ChipProps) {
  const { palette } = useTheme();
  const { trigger } = useHaptics();
  const [isHovered, setIsHovered] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    trigger("selection");
    onPress?.();
  };

  const backgroundColor = selected
    ? palette.accentSoft
    : isHovered
    ? palette.raised
    : "transparent";

  const borderColor = selected ? "transparent" : palette.control;
  const textColor = selected ? "accent" : "ink";
  const iconTone = selected ? "accent" : "muted";

  const height = 32;
  const hitSlop = {
    top: Math.ceil((sizeTokens.hit - height) / 2),
    bottom: Math.ceil((sizeTokens.hit - height) / 2),
    left: 4,
    right: 4,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={handlePress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      hitSlop={hitSlop}
      style={[
        {
          height,
          borderRadius: 999,
          backgroundColor,
          borderWidth: 1,
          borderColor,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          opacity: disabled ? 0.5 : 1,
          alignSelf: "flex-start",
        },
        style,
      ]}
      className={className}
    >
      {icon && <Icon name={icon} size={16} tone={iconTone} />}
      <Text variant="small" tone={textColor} weight={selected ? "500" : "400"}>
        {label}
      </Text>
    </Pressable>
  );
}
