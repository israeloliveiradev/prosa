import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { Flag } from "@/ui/flag";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { STUDY_TARGETS, SUPPORT_LANGS } from "../model/journey-flow";
import { TactileOption } from "./tactile-option";
import { useLanguageName } from "./use-language-name";

export interface PairPickerProps {
  targetLang: string;
  throughLang: string;
  onChangeTarget: (lang: string) => void;
  onChangeThrough: (lang: string) => void;
  disabled?: boolean;
}

/**
 * Idioma de estudo (en, es, de, fr, it, ja, ru) e idioma de apoio
 * (português + os mesmos). O idioma estudado some da lista de apoio.
 */
export function PairPicker({ targetLang, throughLang, onChangeTarget, onChangeThrough, disabled = false }: PairPickerProps) {
  const t = useAreaCopy(ONBOARDING_COPY);
  const nameOf = useLanguageName();
  const supportOptions = SUPPORT_LANGS.filter((code) => code !== targetLang);

  return (
    <View style={styles.container} testID="onboarding-pair-picker">
      <View style={styles.group}>
        <Text variant="label" weight="semibold" tone="muted" nativeID="onboarding-target-label">
          {t.targetLabel}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.grid}>
          {STUDY_TARGETS.map((code) => (
            <View key={code} style={styles.cell}>
              <TactileOption
                title={nameOf(code)}
                selected={code === targetLang}
                onPress={() => onChangeTarget(code)}
                leading={<Flag code={code} size={24} />}
                disabled={disabled}
                testID={`target-lang-${code}`}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text variant="label" weight="semibold" tone="muted">
          {t.supportLabel}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.grid}>
          {supportOptions.map((code) => (
            <View key={code} style={styles.cell}>
              <TactileOption
                title={nameOf(code)}
                selected={code === throughLang}
                onPress={() => onChangeThrough(code)}
                leading={<Flag code={code} size={24} />}
                disabled={disabled}
                testID={`through-lang-${code}`}
              />
            </View>
          ))}
        </View>
        <Text variant="caption" tone="muted">
          {t.supportHint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 28,
    width: "100%",
  },
  group: {
    gap: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    flexGrow: 1,
    flexBasis: 150,
  },
});
