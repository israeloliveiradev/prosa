import { type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { Text } from "./text";
import { Icon, type IconName } from "./icon";

export type PillTone = "positive" | "negative" | "warning" | "neutral" | "accent";

export interface PillProps {
  label?: string;
  children?: ReactNode;
  tone?: PillTone;
  icon?: IconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Pill({
  label,
  children,
  tone = "neutral",
  icon,
  testID,
  style,
  className,
}: PillProps) {
  const { palette } = useTheme();

  let bg = palette.pillNeutralBg;
  let fg = palette.pillNeutralInk;

  if (tone === "positive") {
    bg = palette.pillPositiveBg;
    fg = palette.pillPositiveInk;
  } else if (tone === "negative") {
    bg = palette.pillNegativeBg;
    fg = palette.pillNegativeInk;
  } else if (tone === "warning") {
    bg = palette.pillWarningBg;
    fg = palette.pillWarningInk;
  } else if (tone === "accent") {
    bg = palette.accentSoft;
    fg = palette.accentInk;
  }

  const content = label ?? children;

  return (
    <View
      testID={testID}
      style={[
        {
          height: 20,
          borderRadius: 999,
          backgroundColor: bg,
          paddingHorizontal: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-start",
        },
        style,
      ]}
      className={className}
    >
      {icon && <Icon name={icon} size={12} color={fg} />}
      <Text
        variant="small"
        weight="500"
        style={{ color: fg, fontSize: 11, lineHeight: 14 }}
      >
        {content}
      </Text>
    </View>
  );
}
