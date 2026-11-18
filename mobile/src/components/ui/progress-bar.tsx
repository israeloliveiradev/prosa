import React from "react";
import { View } from "react-native";
import { Progress } from "@/ui";
import { useThemeTokens } from "@/theme/ThemeContext";

export type ProgressTone = "primary" | "success" | "xp" | "streak";
export type ProgressSize = "md" | "lg";

export interface ProgressSegment {
  key: string;
  label?: string;
  value?: number; // 0 to 1
  state: "done" | "active" | "todo";
}

export interface ProgressBarProps {
  value?: number; // 0 to 1
  tone?: ProgressTone;
  size?: ProgressSize;
  segments?: ProgressSegment[];
  className?: string;
}

export function ProgressBar({
  value = 0,
  tone: _tone = "primary",
  size: _size = "md",
  segments,
  className = "",
}: ProgressBarProps) {
  const { colors } = useThemeTokens();

  if (segments && segments.length > 0) {
    return (
      <View
        className={`flex-row items-center gap-1.5 w-full ${className}`}
        accessibilityRole="progressbar"
      >
        {segments.map((seg) => {
          const fillRatio =
            seg.state === "done"
              ? 1
              : seg.state === "active"
              ? Math.max(0.15, Math.min(1, seg.value ?? 0.5))
              : 0;

          const fillColor =
            seg.state === "done"
              ? colors.status.positive
              : colors.accent.brand;

          return (
            <View
              key={seg.key}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.surface.raised,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: fillColor,
                  width: `${Math.round(fillRatio * 100)}%`,
                }}
              />
            </View>
          );
        })}
      </View>
    );
  }

  const clamped = Math.max(0, Math.min(1, value));
  return <Progress value={clamped * 100} tone="accent" className={className} />;
}
