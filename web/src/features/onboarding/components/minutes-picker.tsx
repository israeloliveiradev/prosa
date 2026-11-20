import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { Pill } from "@/ui/pill";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY, type OnboardingCopy } from "@/lib/copy/onboarding";
import { CORE_SESSION_MINUTES, DAILY_MINUTES, weeklyMinutes, type DailyMinutes } from "../model/journey-flow";
import { TactileOption } from "./tactile-option";

export interface MinutesPickerProps {
  minutes: DailyMinutes;
  onChange: (minutes: DailyMinutes) => void;
}

/** "2 h 20 min" a partir de minutos, no idioma da interface. */
export function formatDuration(t: OnboardingCopy, totalMinutes: number): string {
  return t.duration(Math.floor(totalMinutes / 60), totalMinutes % 60);
}

/** Meta diária de 10, 20 ou 30 minutos e a meta semanal que ela gera. */
export function MinutesPicker({ minutes, onChange }: MinutesPickerProps) {
  const t = useAreaCopy(ONBOARDING_COPY);

  return (
    <View style={styles.container} testID="onboarding-minutes-picker">
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {DAILY_MINUTES.map((value) => (
          <View key={value} style={styles.cell}>
            <TactileOption
              title={t.minutesValue(value)}
              caption={t.minutesCaption[String(value) as "10" | "20" | "30"]}
              selected={minutes === value}
              onPress={() => onChange(value)}
              trailing={value === CORE_SESSION_MINUTES ? <Pill label={t.recommended} tone="positive" /> : null}
              testID={`minutes-option-${value}`}
            />
          </View>
        ))}
      </View>
      <Text variant="body" weight="semibold" tone="ink" testID="onboarding-weekly-aim">
        {t.weeklyAim(formatDuration(t, weeklyMinutes(minutes)))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    width: "100%",
  },
  grid: {
    gap: 10,
  },
  cell: {
    width: "100%",
  },
});
