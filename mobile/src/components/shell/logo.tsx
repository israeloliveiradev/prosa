import React from "react";
import { View } from "react-native";
import { ProsaLogo, ProsaLogoIcon } from "@/components/ProsaLogo";

export interface LogoProps {
  compact?: boolean;
  tone?: "ink" | "light";
  decorative?: boolean;
  showSubtitle?: boolean;
}

export function Logo({
  compact = false,
  tone = "ink",
  decorative = false,
  showSubtitle = false,
}: LogoProps) {
  return (
    <View style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <ProsaLogo
        variant={compact ? "icon" : showSubtitle ? "full" : "compact"}
        size={compact ? "sm" : "md"}
      />
    </View>
  );
}

export function ProsaMarkIcon({ size = 28 }: { size?: number }) {
  return <ProsaLogoIcon size={size} />;
}

export default Logo;
