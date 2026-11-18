import { View, StyleSheet } from "react-native";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { useXp } from "@/lib/xp";
import type { ProgressState } from "@/lib/progress";

export interface StreakBlockProps {
  progress: ProgressState;
  testID?: string;
}

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function StreakBlock({ progress, testID = "home-streak" }: StreakBlockProps) {
  const { palette } = useTheme();
  const xp = useXp();
  const dots = xp.weekProgress ?? [false, false, false, false, false, false, false];

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: palette.sheet,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.content}>
        <Text variant="caption" tone="muted" weight="medium">
          Frequência
        </Text>

        <View style={styles.metricRow}>
          <Text
            variant="display"
            weight="bold"
            tone="ink"
            style={styles.number}
            testID="home-streak-count"
          >
            {progress.streakCount}
          </Text>
          <Text variant="caption" tone="muted">
            {progress.streakCount === 1 ? "dia consecutivo" : "dias consecutivos"}
          </Text>
        </View>

        <Text variant="caption" tone="muted">
          Ritmo da semana
        </Text>
      </View>

      {/* 7 Weekday dots */}
      <View style={styles.dotsRow} testID="home-streak-dots">
        {dots.map((active, index) => (
          <View key={index} style={styles.dotCol}>
            <View
              testID={`home-streak-dot-${index}`}
              style={[
                styles.dot,
                {
                  backgroundColor: active ? palette.accent : palette.raised,
                  borderColor: active ? palette.accent : palette.border,
                },
              ]}
            />
            <Text variant="caption" tone={active ? "accent" : "muted"} style={styles.weekdayText}>
              {WEEKDAYS[index]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 200,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 20,
    justifyContent: "space-between",
    gap: 16,
  },
  content: {
    gap: 8,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  number: {
    fontVariant: ["tabular-nums"],
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  dotCol: {
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  weekdayText: {
    fontSize: 10,
  },
});
