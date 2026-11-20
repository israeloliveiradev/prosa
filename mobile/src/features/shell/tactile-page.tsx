import type { ReactNode } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { tactile } from "@/components/tactile/tokens";

export interface TactilePageProps {
  kicker?: string;
  title: string;
  dek?: string;
  children: ReactNode;
  testID?: string;
  maxWidth?: number;
}

/** Moldura das telas secundárias (Score, Exames, Pares, Dossiê, Assinatura, Ajustes) no visual tátil. */
export function TactilePage({ kicker, title, dek, children, testID, maxWidth = 760 }: TactilePageProps) {
  const phone = useWindowDimensions().width < 768;
  return (
    <ScrollView testID={testID} style={{ flex: 1, backgroundColor: tactile.bg }} contentContainerStyle={{ alignItems: "center", paddingBottom: 64 }}>
      <View style={{ width: "100%", maxWidth, paddingHorizontal: phone ? 16 : 24, paddingTop: phone ? 20 : 32, gap: 20 }}>
        <View style={{ gap: 6 }}>
          {kicker ? (
            <Text style={{ fontFamily: tactile.font, fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: tactile.primaryInk }}>{kicker}</Text>
          ) : null}
          <Text accessibilityRole="header" style={{ fontFamily: tactile.serif, fontSize: phone ? 30 : 38, lineHeight: phone ? 36 : 44, fontWeight: "600", color: tactile.ink }}>
            {title}
          </Text>
          {dek ? <Text style={{ fontFamily: tactile.font, fontSize: 16, lineHeight: 24, color: tactile.muted }}>{dek}</Text> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

/** Texto de corpo no tom do visual tátil. */
export function BodyText({ children, tone = "body", testID }: { children: ReactNode; tone?: "body" | "muted" | "danger" | "ink"; testID?: string }) {
  const color = tone === "muted" ? tactile.muted : tone === "danger" ? tactile.danger : tone === "ink" ? tactile.ink : tactile.body;
  return (
    <Text testID={testID} style={{ fontFamily: tactile.font, fontSize: 16, lineHeight: 24, color }}>
      {children}
    </Text>
  );
}
