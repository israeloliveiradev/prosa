import { View, StyleSheet } from "react-native";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";
import { useCopy } from "@/lib/i18n";
import { useAreaCopy } from "@/lib/copy/area";
import { SHELL_COPY } from "@/lib/copy/shell";
import {
  sessionPhases,
  phaseAt,
  type SessionPhase,
  SESSION_SECONDS,
} from "@/lib/session-clock";
import {
  calculatePhaseSegments,
  phaseName,
} from "../model/session-ruler-geometry";

export { calculatePhaseSegments, phaseName };

export interface SessionRulerProps {
  phases?: SessionPhase[];
  currentSeconds?: number;
  totalDurationSeconds?: number;
  compact?: boolean;
  showLabels?: boolean;
  testID?: string;
}

export function SessionRuler({
  phases: phasesProp,
  currentSeconds = 0,
  totalDurationSeconds = SESSION_SECONDS,
  compact = false,
  showLabels = true,
  testID = "session-ruler",
}: SessionRulerProps) {
  const { palette } = useTheme();
  const copy = useCopy();
  const shell = useAreaCopy(SHELL_COPY);

  const phases = phasesProp && phasesProp.length > 0
    ? phasesProp
    : sessionPhases({ dueCount: 0, totalDurationSeconds });

  const segments = calculatePhaseSegments(phases, totalDurationSeconds);
  const currentPhaseId = phaseAt(currentSeconds, phases);

  // Accessible Label
  const currentSegment = segments.find((s) => s.id === currentPhaseId) ?? segments[0];
  const elapsedInPhase = Math.max(0, currentSeconds - currentSegment.start);
  const currentMinutes = Math.floor(elapsedInPhase / 60);
  const totalPhaseMinutes = Math.round(currentSegment.duration / 60);

  const completedPhasesCount = segments.filter((s) => currentSeconds >= s.end).length;
  const a11ySummary =
    completedPhasesCount === segments.length
      ? shell.rulerDone
      : `${completedPhasesCount > 0 ? `${shell.rulerStepsDone(completedPhasesCount)} ` : ""}${shell.rulerAt(phaseName(copy, currentSegment.id), currentMinutes, totalPhaseMinutes)}`;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={a11ySummary}
      accessibilityValue={{
        min: 0,
        max: totalDurationSeconds,
        now: Math.min(totalDurationSeconds, Math.max(0, currentSeconds)),
      }}
      style={styles.container}
    >
      {/* Régua de segmentos */}
      <View style={[styles.rulerTrack, { height: compact ? 10 : 20 }]}>
        {segments.map((seg) => {
          const isDone = currentSeconds >= seg.end;
          const isActive = currentSeconds >= seg.start && currentSeconds < seg.end;

          const progressRatio = isActive
            ? Math.min(1, Math.max(0, (currentSeconds - seg.start) / seg.duration))
            : isDone
            ? 1
            : 0;

          return (
            <View
              key={seg.id}
              testID={`${testID}-segment-${seg.id}`}
              style={[
                styles.segment,
                {
                  flex: seg.duration,
                  backgroundColor: isDone
                    ? palette.active
                    : isActive
                    ? palette.accentSoft
                    : palette.raised,
                  borderColor: isActive ? palette.accent : "transparent",
                  borderWidth: isActive ? 1 : 0,
                },
              ]}
            >
              {isActive && (
                <View
                  style={[
                    styles.segmentFill,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: palette.accent,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Rótulos de etapas (quando não for compacto e showLabels=true) */}
      {!compact && showLabels && (
        <View style={styles.labelsRow}>
          {segments.map((seg) => {
            const isActive = seg.id === currentPhaseId;
            return (
              <View key={seg.id} style={{ flex: seg.duration, alignItems: "center" }}>
                <Text
                  variant="caption"
                  weight={isActive ? "semibold" : "regular"}
                  tone={isActive ? "accent" : "muted"}
                  numberOfLines={1}
                  style={styles.labelText}
                >
                  {phaseName(copy, seg.id)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 6,
  },
  rulerTrack: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  segment: {
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  segmentFill: {
    height: "100%",
  },
  labelsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 3,
  },
  labelText: {
    fontSize: 11,
    textAlign: "center",
  },
});
