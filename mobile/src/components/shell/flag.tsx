import { useId, type ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Polygon, Rect } from "react-native-svg";
import { useAreaCopy } from "@/lib/copy/area";
import { UI } from "@/lib/copy/ui";
import { languageName } from "@/lib/languages";

function Frame({
  size,
  label,
  children,
}: {
  size: number;
  label: string;
  children: ReactNode;
}) {
  const height = Math.round(size * (2 / 3));
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        width: size,
        height,
        minWidth: size,
        minHeight: height,
        flexShrink: 0,
        borderRadius: Math.max(3, Math.round(size * 0.16)),
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(28,25,23,0.18)",
        backgroundColor: "#FFFFFF",
      }}
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
      <Path d="M23.6 22.2 C27 18.4 33 18.4 36.4 22.2" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
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

function Austria() {
  return (
    <>
      <Rect width="60" height="13.4" fill="#C8102E" />
      <Rect y="13.3" width="60" height="13.4" fill="#FFFFFF" />
      <Rect y="26.6" width="60" height="13.4" fill="#C8102E" />
    </>
  );
}

function UnitedStates({ clipId }: { clipId: string }) {
  return (
    <>
      <Defs>
        <ClipPath id={clipId}>
          <Rect width="60" height="40" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect width="60" height="40" fill="#B22234" />
        <Rect y="3.08" width="60" height="3.08" fill="#FFFFFF" />
        <Rect y="9.24" width="60" height="3.08" fill="#FFFFFF" />
        <Rect y="15.4" width="60" height="3.08" fill="#FFFFFF" />
        <Rect y="21.56" width="60" height="3.08" fill="#FFFFFF" />
        <Rect y="27.72" width="60" height="3.08" fill="#FFFFFF" />
        <Rect y="33.88" width="60" height="3.08" fill="#FFFFFF" />
        <Rect width="24" height="21.56" fill="#3C3B6E" />
        <Circle cx="6" cy="5.5" r="1.2" fill="#FFFFFF" />
        <Circle cx="12" cy="5.5" r="1.2" fill="#FFFFFF" />
        <Circle cx="18" cy="5.5" r="1.2" fill="#FFFFFF" />
        <Circle cx="9" cy="11" r="1.2" fill="#FFFFFF" />
        <Circle cx="15" cy="11" r="1.2" fill="#FFFFFF" />
        <Circle cx="6" cy="16.5" r="1.2" fill="#FFFFFF" />
        <Circle cx="12" cy="16.5" r="1.2" fill="#FFFFFF" />
        <Circle cx="18" cy="16.5" r="1.2" fill="#FFFFFF" />
      </G>
    </>
  );
}

export function Flag({ code, size = 28 }: { code: string; size?: number }) {
  const ui = useAreaCopy(UI);
  const clipId = useId().replace(/:/g, "");
  const normalized = (code || "en").toLowerCase();
  const label = languageName(normalized);

  if (normalized === "pt" || normalized === "br") {
    return (
      <Frame size={size} label={label}>
        <Brazil />
      </Frame>
    );
  }
  if (normalized === "es") {
    return (
      <Frame size={size} label={label}>
        <Spain />
      </Frame>
    );
  }
  if (normalized === "de") {
    return (
      <Frame size={size} label={label}>
        <Germany />
      </Frame>
    );
  }
  if (normalized === "at") {
    return (
      <Frame size={size} label={ui.flagAustria}>
        <Austria />
      </Frame>
    );
  }
  if (normalized === "ru") {
    return (
      <Frame size={size} label={label}>
        <Russia />
      </Frame>
    );
  }
  if (normalized === "fr") {
    return (
      <Frame size={size} label={label}>
        <France />
      </Frame>
    );
  }
  if (normalized === "it") {
    return (
      <Frame size={size} label={label}>
        <Italy />
      </Frame>
    );
  }
  if (normalized === "ja" || normalized === "jp") {
    return (
      <Frame size={size} label={label}>
        <Japan />
      </Frame>
    );
  }
  if (normalized === "us") {
    return (
      <Frame size={size} label={ui.flagUnitedStates}>
        <UnitedStates clipId={`us${clipId}`} />
      </Frame>
    );
  }
  return (
    <Frame size={size} label={label}>
      <UnitedKingdom clipId={`uk${clipId}`} />
    </Frame>
  );
}
