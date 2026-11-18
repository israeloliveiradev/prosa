import { useMemo, type ReactNode } from "react";
import {
  Text as RNText,
  type TextStyle,
  type StyleProp,
  Platform,
} from "react-native";
import { type TypeVariant, type as typeScale } from "@/design/tokens";
import { useTheme } from "@/theme/ThemeContext";

export type TextTone =
  | "ink"
  | "muted"
  | "faint"
  | "accent"
  | "positive"
  | "negative"
  | "warning"
  | "onPrimary";

export type TextColor = "primary" | "secondary" | "disabled" | "negative" | "positive";

export type TextWeight = "normal" | "regular" | "medium" | "semibold" | "bold" | "400" | "500" | "600" | "700";

export interface TextProps {
  children?: ReactNode;
  variant?: TypeVariant;
  tone?: TextTone;
  color?: TextColor;
  weight?: TextWeight;
  numeric?: boolean;
  align?: "left" | "center" | "right";
  numberOfLines?: number;
  level?: 1 | 2 | 3;
  testID?: string;
  nativeID?: string;
  className?: string;
  style?: StyleProp<TextStyle>;
  accessibilityRole?: "none" | "button" | "link" | "search" | "image" | "keyboardkey" | "text" | "adjustable" | "imagebutton" | "header" | "summary" | "alert" | "checkbox" | "combobox" | "menu" | "menubar" | "menuitem" | "progressbar" | "radio" | "radiogroup" | "scrollbar" | "spinbutton" | "switch" | "tab" | "tabbar" | "tablist" | "timer" | "toolbar";
}

export function Text({
  children,
  variant = "body",
  tone = "ink",
  color: colorProp,
  weight,
  numeric,
  align,
  numberOfLines,
  level,
  testID,
  className,
  style,
  accessibilityRole,
  ...rest
}: TextProps) {
  const { palette } = useTheme();
  const spec = typeScale[variant] || typeScale.body;

  const resolvedTone: TextTone = colorProp
    ? colorProp === "primary"
      ? "ink"
      : colorProp === "secondary"
      ? "muted"
      : colorProp === "disabled"
      ? "faint"
      : (colorProp as TextTone)
    : tone;

  // Resolve color from palette tone
  const color = useMemo(() => {
    switch (resolvedTone) {
      case "muted":
        return palette.muted;
      case "faint":
        return palette.faint;
      case "accent":
        return palette.accent;
      case "positive":
        return palette.positive;
      case "negative":
        return palette.negative;
      case "warning":
        return palette.warning;
      case "onPrimary":
        return palette.onPrimary;
      case "ink":
      default:
        return palette.ink;
    }
  }, [resolvedTone, palette]);

  // Determine effective weight
  const effectiveWeight = weight ?? spec.weight;

  // Determine font family
  const fontFamily = useMemo(() => {
    const isReading = "font" in spec && spec.font === "Literata";
    if (isReading) {
      if (effectiveWeight === "600" || effectiveWeight === "semibold" || effectiveWeight === "bold" || effectiveWeight === "700") {
        return "Literata SemiBold";
      }
      return "Literata";
    }
    if (effectiveWeight === "500" || effectiveWeight === "medium") {
      return "IBM Plex Sans Medium";
    }
    if (effectiveWeight === "600" || effectiveWeight === "semibold" || effectiveWeight === "bold" || effectiveWeight === "700") {
      return "IBM Plex Sans SemiBold";
    }
    return "IBM Plex Sans";
  }, [spec, effectiveWeight]);

  // Heading role & level
  const isHeading = variant === "title" || variant === "section" || variant === "subsection" || level !== undefined;
  const headingLevel = level ?? (variant === "title" ? 1 : variant === "section" ? 2 : variant === "subsection" ? 3 : undefined);

  // Tabular nums
  const isNumeric = numeric || ("tabular" in spec && spec.tabular);

  const textStyle: TextStyle = {
    color,
    fontFamily,
    fontSize: spec.size,
    lineHeight: spec.line,
    letterSpacing: "tracking" in spec ? spec.tracking * spec.size : 0,
    textAlign: align,
    fontVariant: isNumeric ? ["tabular-nums"] : undefined,
  };

  const webProps = Platform.OS === "web" && isHeading
    ? {
        role: "heading" as const,
        "aria-level": headingLevel,
      }
    : {};

  return (
    <RNText
      testID={testID}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole ?? (isHeading ? "header" : undefined)}
      style={[textStyle, style]}
      className={className}
      {...webProps}
      {...rest}
    >
      {children}
    </RNText>
  );
}
