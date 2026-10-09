import { View } from "react-native";

export type ProgressTone = "primary" | "success" | "xp" | "streak";
export type ProgressSize = "md" | "lg";

export interface ProgressSegment {
  key: string;
  label?: string;
  value?: number; // 0 a 1 se for preenchimento parcial no segmento ativo
  state: "done" | "active" | "todo";
}

export interface ProgressBarProps {
  value?: number; // 0 a 1
  tone?: ProgressTone;
  size?: ProgressSize;
  segments?: ProgressSegment[];
  className?: string;
}

export function ProgressBar({
  value = 0,
  tone = "primary",
  size = "md",
  segments,
  className = "",
}: ProgressBarProps) {
  const heightClass = size === "lg" ? "h-4" : "h-3";

  const toneColorMap: Record<ProgressTone, string> = {
    primary: "bg-primary",
    success: "bg-success",
    xp: "bg-xp",
    streak: "bg-streak",
  };

  // Se for segmentado (ex: sessões com 5 fases)
  if (segments && segments.length > 0) {
    return (
      <View className={`flex-row items-center gap-1.5 w-full ${className}`}>
        {segments.map((seg) => {
          let segFillColor = "bg-sunken";
          if (seg.state === "done") {
            segFillColor = "bg-success";
          } else if (seg.state === "active") {
            segFillColor = toneColorMap[tone];
          }

          const fillRatio =
            seg.state === "done" ? 1 : seg.state === "active" ? Math.max(0.15, Math.min(1, seg.value ?? 0.5)) : 0;

          return (
            <View
              key={seg.key}
              className={`flex-1 ${heightClass} rounded-full bg-sunken overflow-hidden`}
            >
              <View
                className={`h-full rounded-full ${segFillColor}`}
                style={{ width: `${Math.round(fillRatio * 100)}%` }}
              />
            </View>
          );
        })}
      </View>
    );
  }

  // Barra contínua
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);

  return (
    <View className={`w-full ${heightClass} rounded-full bg-sunken overflow-hidden ${className}`}>
      <View
        className={`h-full rounded-full ${toneColorMap[tone]} relative`}
        style={{ width: `${percent}%` }}
      >
        {/* Faixa sutil de brilho interno superior */}
        <View className="absolute top-0 inset-x-0 h-1 bg-white/20 rounded-full" />
      </View>
    </View>
  );
}
