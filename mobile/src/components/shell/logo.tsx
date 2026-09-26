import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";

export function Logo({ compact = false, tone = "ink" }: { compact?: boolean; tone?: "ink" | "light" }) {
  const mark = compact ? 32 : 44;
  const light = tone === "light";
  return (
    <View accessibilityRole="header" accessibilityLabel="Prosa" className="flex-row items-center gap-3">
      <Mark size={mark} light={light} />
      <View>
        <Text className={`font-displayItalic ${light ? "text-sidebarInk" : "text-ink"} ${compact ? "text-2xl leading-7" : "text-[40px] leading-[44px]"}`}>Prosa</Text>
      </View>
    </View>
  );
}

function Mark({ size, light }: { size: number; light: boolean }) {
  const { palette } = useTheme();
  const stroke = light ? "#F9F8F6" : palette.onSurface;
  return (
    <Svg width={size} height={size * (48 / 44)} viewBox="0 0 44 48">
      <Path
        d="M14 10c16-1 24 5 24 12s-8 13-24 11"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={1.5}
      />
      <Path
        d="M20 17c8 .4 11 2.6 11 5.2s-3 4.6-11 5"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth={1.15}
      />
      <Path d="M14 10v23" stroke={stroke} strokeLinecap="round" strokeWidth={1.5} />
      <Path d="M11.2 32.2h5.6V42L14 46l-2.8-4V32.2z" fill={palette.primary} />
    </Svg>
  );
}
