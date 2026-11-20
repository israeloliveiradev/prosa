import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { TactileIcon, type TactileIconName } from "./tactile-icon";
import { tactile } from "./tokens";

export interface TactilePanelProps {
  children: ReactNode;
  tone?: "plain" | "accent" | "quiet";
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Cartão do visual tátil: borda, degrau de 4 px embaixo e cantos de 20 px (RN puro, web e nativo). */
export function TactilePanel({ children, tone = "plain", padding = 20, style, testID }: TactilePanelProps) {
  const accent = tone === "accent";
  const quiet = tone === "quiet";
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: accent ? tactile.primarySoft : quiet ? tactile.raised : tactile.surface,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: accent ? "#99D5CC" : tactile.border,
          boxShadow: `0 4px 0 ${accent ? "#99D5CC" : tactile.border}`,
          padding,
          gap: 12,
          minWidth: 0,
        } as ViewStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Rótulo curto em caixa alta com ícone, no topo de um painel. */
export function PanelKicker({ icon, children, color = tactile.primaryInk }: { icon?: TactileIconName; children: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {icon ? <TactileIcon name={icon} size={15} color={color} /> : null}
      <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color }}>{children}</Text>
    </View>
  );
}
