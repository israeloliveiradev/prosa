import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";

export interface SurfaceProps {
  children?: ReactNode;
  tone?: "frame" | "sheet" | "raised";
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Surface({
  children,
  tone = "sheet",
  testID,
  style,
  className,
}: SurfaceProps) {
  const { palette } = useTheme();

  const backgroundColor = tone === "frame"
    ? palette.frame
    : tone === "raised"
    ? palette.raised
    : palette.sheet;

  return (
    <View
      testID={testID}
      style={[{ backgroundColor }, style]}
      className={className}
    >
      {children}
    </View>
  );
}
