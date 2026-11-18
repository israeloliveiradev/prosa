import { View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { Text } from "./text";

export interface KpiItem {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaGood?: boolean;
}

export interface KpiStripProps {
  items: readonly KpiItem[];
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function KpiStrip({ items, testID, style, className }: KpiStripProps) {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: palette.sheet,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: radius.card,
          flexDirection: isMobile ? "row" : "row",
          flexWrap: isMobile ? "wrap" : "nowrap",
          overflow: "hidden",
        },
        style,
      ]}
      className={className}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const deltaTone = item.deltaGood === undefined
          ? "muted"
          : item.deltaGood
          ? "positive"
          : "negative";

        return (
          <View
            key={item.label}
            style={{
              flex: isMobile ? undefined : 1,
              width: isMobile ? "50%" : undefined,
              padding: 16,
              borderRightWidth: isMobile ? (index % 2 === 0 ? 1 : 0) : (isLast ? 0 : 1),
              borderBottomWidth: isMobile && index < items.length - (items.length % 2 === 0 ? 2 : 1) ? 1 : 0,
              borderColor: palette.borderSoft,
            }}
          >
            <Text variant="small" tone="muted" weight="500">
              {item.label}
            </Text>

            <View className="mt-1 flex-row items-baseline gap-1">
              <Text variant="kpi" numeric tone="ink" weight="500">
                {String(item.value)}
              </Text>
              {item.unit && (
                <Text variant="small" tone="muted">
                  {item.unit}
                </Text>
              )}
            </View>

            {item.delta && (
              <View className="mt-1">
                <Text variant="small" numeric tone={deltaTone}>
                  {item.delta}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
