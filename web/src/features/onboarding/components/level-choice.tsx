import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { Pill } from "@/ui/pill";
import { useTheme } from "@/theme/ThemeContext";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { CEFR_LEVELS, type CefrLevel } from "../model/journey-flow";
import { StepAction } from "./step-frame";
import { TactileOption } from "./tactile-option";

export interface LevelChoiceProps {
  /** Abre o nivelamento adaptativo embutido. */
  onStartTest: () => void;
  /** "Já sei o meu nível": confirma a faixa escolhida. */
  onSelectLevel: (level: CefrLevel) => void;
  /** Nível pré-marcado na lista (o atual da conta, se houver). */
  initialLevel?: CefrLevel | null;
  pending?: boolean;
}

/** Duas portas para o nível: nivelamento adaptativo ou escolha direta A1–C2. */
export function LevelChoice({ onStartTest, onSelectLevel, initialLevel = null, pending = false }: LevelChoiceProps) {
  const t = useAreaCopy(ONBOARDING_COPY);
  const { palette } = useTheme();
  const [mode, setMode] = useState<"choose" | "pick">("choose");
  const [selected, setSelected] = useState<CefrLevel | null>(initialLevel);

  if (mode === "choose") {
    return (
      <View style={styles.container} testID="onboarding-level-choice">
        <View style={[styles.door, { backgroundColor: palette.card, borderColor: palette.primary, borderBottomColor: palette.primaryEdge }]}>
          <View style={styles.doorHead}>
            <Text variant="body-lg" weight="bold" tone="ink" style={styles.doorTitle}>
              {t.testTitle}
            </Text>
            <Pill label={t.recommended} tone="positive" />
          </View>
          <Text variant="body" tone="muted" style={styles.doorBody}>
            {t.testBody}
          </Text>
          <StepAction label={t.testCta} onPress={onStartTest} disabled={pending} testID="level-choice-start-test" />
        </View>

        <View style={[styles.door, { backgroundColor: palette.card, borderColor: palette.line, borderBottomColor: palette.outline }]}>
          <Text variant="body-lg" weight="bold" tone="ink" style={styles.doorTitle}>
            {t.selfTitle}
          </Text>
          <Text variant="body" tone="muted" style={styles.doorBody}>
            {t.selfBody}
          </Text>
          <StepAction
            label={t.selfCta}
            variant="secondary"
            onPress={() => setMode("pick")}
            disabled={pending}
            testID="level-choice-pick-level"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="onboarding-level-pick">
      <View style={styles.pickHead}>
        <Text variant="body-lg" weight="bold" tone="ink">
          {t.pickTitle}
        </Text>
        <Text variant="body-sm" tone="muted">
          {t.pickDek}
        </Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {CEFR_LEVELS.map((level) => (
          <TactileOption
            key={level}
            title={t.levels[level].name}
            caption={t.levels[level].description}
            selected={selected === level}
            onPress={() => setSelected(level)}
            disabled={pending}
            leading={
              <View
                style={[
                  styles.badge,
                  { backgroundColor: selected === level ? palette.primary : palette.sunken, borderColor: palette.line },
                ]}
              >
                <Text variant="body-sm" weight="bold" tone={selected === level ? "onPrimary" : "ink"}>
                  {level}
                </Text>
              </View>
            }
            testID={`level-option-${level.toLowerCase()}`}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <StepAction
          label={pending ? t.savingPlan : selected ? t.confirmLevel(selected) : t.pickTitle}
          onPress={() => {
            if (selected) onSelectLevel(selected);
          }}
          disabled={pending || !selected}
          testID="level-choice-confirm"
        />
        <StepAction
          label={t.backToOptions}
          variant="ghost"
          onPress={() => setMode("choose")}
          disabled={pending}
          testID="level-choice-back"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: "100%",
  },
  door: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderBottomWidth: 4,
  },
  doorHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  doorTitle: {
    flexShrink: 1,
  },
  doorBody: {
    lineHeight: 22,
  },
  pickHead: {
    gap: 4,
  },
  list: {
    gap: 10,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: 8,
    paddingTop: 4,
  },
});
