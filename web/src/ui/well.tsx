import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";

export interface WellProps {
  children?: ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Well({ children, testID, style, className }: WellProps) {
  const { palette } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: palette.raised,
          borderColor: palette.borderSoft,
          borderWidth: 1,
          borderRadius: radius.card,
          padding: 12,
        },
        style,
      ]}
      className={className}
    >
      {children}
    </View>
  );
}
