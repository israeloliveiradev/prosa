import { useState, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";
import { Icon } from "./icon";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  chevron?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  selected = false,
  chevron = false,
  testID,
  style,
  className,
}: ListRowProps) {
  const { palette } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const isInteractive = !!onPress;
  const minHeight = subtitle ? 64 : 48;

  const backgroundColor = selected
    ? palette.active
    : isHovered && isInteractive
    ? palette.raised
    : "transparent";

  return (
    <Pressable
      testID={testID}
      accessibilityRole={isInteractive ? "button" : "none"}
      accessibilityState={{ selected }}
      disabled={!isInteractive}
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        {
          minHeight,
          backgroundColor,
          borderRadius: radius.control,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: palette.borderSoft,
        },
        style,
      ]}
      className={className}
    >
      {leading && <View className="items-center justify-center">{leading}</View>}

      <View className="flex-1 justify-center">
        <Text variant="body" tone="ink" weight="500">
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" tone="muted" className="mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>

      <View className="flex-row items-center gap-2">
        {trailing}
        {chevron && <Icon name="chevron" size={16} tone="muted" />}
      </View>
    </Pressable>
  );
}
