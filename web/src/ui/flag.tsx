import React, { useId, type ReactNode } from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, Rect } from "react-native-svg";
import { languageName } from "@/lib/languages";
import { useThemeTokens } from "../theme/ThemeContext";

function Frame({
  size,
  label,
  children,
  testID,
}: {
  size: number;
  label: string;
  children: ReactNode;
  testID?: string;
}) {
  const { colors, radius } = useThemeTokens();
  const height = Math.round(size * (2 / 3));

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.frame,
        {
          width: size,
          height,
          minWidth: size,
          minHeight: height,
          flexShrink: 0,
          borderRadius: Math.max(radius.xs, Math.round(size * 0.16)),
          borderColor: colors.border.subtle,
          backgroundColor: colors.surface.page,
        },
      ]}
    >
      <Svg width={size} height={height} viewBox="0 0 60 40">
        {children}
      </Svg>
    </View>
  );
}

function Brazil() {
  return (
    <>
      <Rect width="60" height="40" fill="#009B3A" />
      <Polygon points="30,5 55,20 30,35 5,20" fill="#FEDD00" />
      <Circle cx="30" cy="20" r="7.2" fill="#002776" />
      <Path
        d="M23.6 22.2 C27 18.4 33 18.4 36.4 22.2"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        fill="none"
      />
    </>
  );
}

function UnitedKingdom({ clipId }: { clipId: string }) {
  return (
    <>
      <Defs>
        <ClipPath id={clipId}>
          <Rect width="60" height="40" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect width="60" height="40" fill="#012169" />
        <Path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="8" />
        <Path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="2.6" />
        <Path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="13" />
        <Path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="8" />
      </G>
    </>
  );
}

function Spain() {
  return (
    <>
      <Rect width="60" height="10" fill="#AA151B" />
      <Rect y="10" width="60" height="20" fill="#F1BF00" />
      <Rect y="30" width="60" height="10" fill="#AA151B" />
      <Rect x="16" y="14" width="8" height="12" rx="1" fill="#AD1519" />
      <Rect x="18" y="16" width="4" height="8" fill="#F1BF00" />
      <Circle cx="20" cy="15.2" r="1.4" fill="#C41E3A" />
    </>
  );
}

function Germany() {
  return (
    <>
      <Rect width="60" height="13.4" fill="#000000" />
      <Rect y="13.3" width="60" height="13.4" fill="#DD0000" />
      <Rect y="26.6" width="60" height="13.4" fill="#FFCE00" />
    </>
  );
}

function Russia() {
  return (
    <>
      <Rect width="60" height="13.4" fill="#FFFFFF" />
      <Rect y="13.3" width="60" height="13.4" fill="#0039A6" />
      <Rect y="26.6" width="60" height="13.4" fill="#D52B1E" />
    </>
  );
}

function France() {
  return (
    <>
      <Rect width="20" height="40" fill="#002395" />
      <Rect x="20" width="20" height="40" fill="#FFFFFF" />
      <Rect x="40" width="20" height="40" fill="#ED2939" />
    </>
  );
}

function Italy() {
  return (
    <>
      <Rect width="20" height="40" fill="#009246" />
      <Rect x="20" width="20" height="40" fill="#FFFFFF" />
      <Rect x="40" width="20" height="40" fill="#CE2B37" />
    </>
  );
}

function Japan() {
  return (
    <>
      <Rect width="60" height="40" fill="#FFFFFF" />
      <Circle cx="30" cy="20" r="8.6" fill="#BC002D" />
    </>
  );
}

export interface FlagProps extends ViewProps {
  code: string;
  size?: number;
  testID?: string;
}

export function Flag({
  code,
  size = 28,
  testID = `ui-flag-${code}`,
}: FlagProps) {
  const clipId = useId().replace(/:/g, "");
  const label = languageName(code);

  if (code === "pt") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <Brazil />
      </Frame>
    );
  }
  if (code === "es") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <Spain />
      </Frame>
    );
  }
  if (code === "de") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <Germany />
      </Frame>
    );
  }
  if (code === "ru") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <Russia />
      </Frame>
    );
  }
  if (code === "fr") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <France />
      </Frame>
    );
  }
  if (code === "it") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <Italy />
      </Frame>
    );
  }
  if (code === "ja") {
    return (
      <Frame size={size} label={label} testID={testID}>
        <Japan />
      </Frame>
    );
  }
  return (
    <Frame size={size} label={label} testID={testID}>
      <UnitedKingdom clipId={`uk${clipId}`} />
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderWidth: 1,
  },
});
