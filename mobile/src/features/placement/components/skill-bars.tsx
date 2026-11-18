import { View, StyleSheet } from "react-native";
import { Text } from "@/ui/text";
import { Progress } from "@/ui/progress";
import { skillPercentage } from "@/features/placement/model/placement-flow";
import { useCopy } from "@/lib/i18n";

export interface SkillEntry {
  skill: "vocab" | "grammar" | "reading" | "listening";
  correct: number;
  total: number;
}

export interface BandEntry {
  band: string;
  correct: number;
  total: number;
}

export interface SkillBarsProps {
  skills?: SkillEntry[];
  bands?: BandEntry[];
}

function skillName(copy: any, skill: string): string {
  switch (skill) {
    case "vocab":
      return copy.skillVocab ?? "Vocabulário";
    case "grammar":
      return copy.skillGrammar ?? "Gramática";
    case "reading":
      return copy.skillReading ?? "Leitura";
    case "listening":
      return copy.skillListening ?? "Escuta";
    default:
      return skill;
  }
}

export function SkillBars({ skills, bands }: SkillBarsProps) {
  const copy = useCopy();

  return (
    <View style={styles.container} testID="placement-skill-bars">
      {skills && skills.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text variant="label" weight="semibold" tone="ink">
            {copy.placeSkills ?? "Desempenho por habilidade"}
          </Text>
          <View style={{ gap: 10 }}>
            {skills.map((s) => {
              const percent = skillPercentage(s.correct, s.total);
              return (
                <View key={s.skill} style={styles.row}>
                  <Text variant="body" tone="ink" style={{ width: 110 }}>
                    {skillName(copy, s.skill)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Progress value={percent} tone="accent" />
                  </View>
                  <Text variant="caption" tone="muted" style={{ width: 48, textAlign: "right" }}>
                    {s.correct}/{s.total}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {bands && bands.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Text variant="label" weight="semibold" tone="ink">
            {copy.placeBand ?? "Desempenho por faixa CEFR"}
          </Text>
          <View style={{ gap: 10 }}>
            {bands.map((b) => {
              const percent = skillPercentage(b.correct, b.total);
              return (
                <View key={b.band} style={styles.row}>
                  <Text variant="body" weight="semibold" tone="ink" style={{ width: 40 }}>
                    {b.band}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Progress value={percent} tone="ink" />
                  </View>
                  <Text variant="caption" tone="muted" style={{ width: 48, textAlign: "right" }}>
                    {b.correct}/{b.total}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
