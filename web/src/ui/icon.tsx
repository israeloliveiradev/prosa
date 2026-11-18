import { Platform } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/ThemeContext";
import { ICON_PATHS, type IconName } from "@/components/shell/icon";

export type { IconName };
export { ICON_PATHS };

export type IconTone =
  | "ink"
  | "muted"
  | "faint"
  | "accent"
  | "positive"
  | "negative"
  | "warning"
  | "onPrimary";

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  tone?: IconTone;
  color?: string;
  label?: string;
  testID?: string;
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.5,
  tone = "muted",
  color,
  label,
  testID,
}: IconProps) {
  const { palette } = useTheme();

  const resolvedColor = color ?? (
    tone === "ink"
      ? palette.ink
      : tone === "muted"
      ? palette.muted
      : tone === "faint"
      ? palette.faint
      : tone === "accent"
      ? palette.accent
      : tone === "positive"
      ? palette.positive
      : tone === "negative"
      ? palette.negative
      : tone === "warning"
      ? palette.warning
      : tone === "onPrimary"
      ? palette.onPrimary
      : palette.muted
  );

  const path = ICON_PATHS[name];
  if (!path) {
    return null;
  }

  const isDecorative = !label;
  const isWeb = Platform.OS === "web";

  return (
    <Svg
      testID={testID}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...(isWeb
        ? {
            role: isDecorative ? "presentation" : "img",
            "aria-hidden": isDecorative,
            "aria-label": label ?? undefined,
          }
        : {
            accessibilityRole: isDecorative ? "none" : "image",
            accessibilityLabel: label,
            accessibilityElementsHidden: isDecorative,
            importantForAccessibility: isDecorative ? "no" : "yes",
          })}
    >
      <Path
        d={path}
        stroke={resolvedColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
