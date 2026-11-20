import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";
import { HIDDEN } from "./tactile-icon";
import { tactile } from "./tokens";

/** Monograma da Prosa (tecla tátil com o "P" de página), em react-native-svg. */
export function TactileLogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" fill="none" {...HIDDEN}>
      <Rect x="0" y="6" width="60" height="52" rx="16" fill="#0F766E" />
      <Rect x="0" y="0" width="60" height="52" rx="16" fill="#0D9488" />
      <Rect x="1.5" y="1.5" width="57" height="49" rx="14.5" stroke="#14B8A6" strokeWidth="1.5" fill="none" />
      <Rect x="14" y="11" width="7" height="30" rx="3.5" fill="#FDFBF7" />
      <Path d="M18 11H34C40.6274 11 46 16.3726 46 23C46 29.6274 40.6274 35 34 35H18V11Z" fill="#FDFBF7" />
      <Path d="M21 16H33.5C37.0899 16 40 18.9101 40 22.5C40 26.0899 37.0899 29 33.5 29H21V16Z" fill="#0D9488" />
      <Path d="M22 22.5C25.5 21 31 21.5 35 23" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
      <Polygon points="14,35 17.5,41 21,35" fill="#E2E8F0" />
      <Circle cx="48" cy="10" r="5" fill="#FF5722" />
      <Circle cx="48" cy="10" r="2.2" fill="#FF8A65" />
    </Svg>
  );
}

export interface TactileLogoProps {
  size?: number;
  showWordmark?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Logo com a palavra "Prosa"; com `onPress`, vira um botão (ex.: voltar para Hoje). */
export function TactileLogo({ size = 36, showWordmark = true, onPress, accessibilityLabel }: TactileLogoProps) {
  const content = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <TactileLogoMark size={size} />
      {showWordmark ? (
        <Text style={{ fontFamily: tactile.font, fontWeight: "800", fontSize: Math.round(size * 0.55), color: tactile.ink, letterSpacing: -0.4 }}>
          Prosa
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) {
    return content;
  }
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={accessibilityLabel} onPress={onPress} style={{ cursor: "pointer" } as object} hitSlop={6}>
      {content}
    </Pressable>
  );
}
