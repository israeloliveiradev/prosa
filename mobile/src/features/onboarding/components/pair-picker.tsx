import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Flag } from "@/ui/flag";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { useCopy } from "@/lib/i18n";
import { STUDY_LANGUAGES, THROUGH_LANGUAGES, languageName } from "@/lib/languages";

export interface PairPickerProps {
  targetLang: string;
  throughLang: string;
  onChangeTarget: (lang: string) => void;
  onChangeThrough: (lang: string) => void;
  onNext: () => void;
}

export function PairPicker({
  targetLang,
  throughLang,
  onChangeTarget,
  onChangeThrough,
  onNext,
}: PairPickerProps) {
  const { palette } = useTheme();
  const copy = useCopy();

  const throughOptions = THROUGH_LANGUAGES.filter((item) => item.id !== targetLang);

  return (
    <View style={styles.container} testID="onboarding-pair-picker">
      <View style={{ gap: 8 }}>
        <Text variant="title" weight="semibold" tone="ink" accessibilityRole="header">
          {copy.startPairTitle ?? "O que você estuda, e através de quê."}
        </Text>
        <Text variant="body" tone="muted">
          {copy.startPairDek ??
            "Português só entra como através de. Cada idioma ganha o próprio deck e a própria prosa."}
        </Text>
      </View>

      {/* Idioma de estudo */}
      <View style={{ gap: 10 }}>
        <Text variant="label" weight="medium" tone="muted">
          {copy.study ?? "Idioma que você quer estudar"}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.chipGrid}>
          {STUDY_LANGUAGES.map((item) => {
            const isSelected = item.id === targetLang;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityLabel={languageName(item.id)}
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                onPress={() => onChangeTarget(item.id)}
                testID={`target-lang-${item.id}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? palette.active : palette.sheet,
                    borderColor: isSelected ? palette.primary : palette.border,
                    borderWidth: isSelected ? 1.5 : 1,
                    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
                  },
                ]}
              >
                <Flag code={item.id} size={22} />
                <Text
                  variant="body"
                  weight={isSelected ? "semibold" : "regular"}
                  tone="ink"
                >
                  {languageName(item.id)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Idioma de apoio */}
      <View style={{ gap: 10 }}>
        <Text variant="label" weight="medium" tone="muted">
          {copy.through ?? "Idioma de apoio (explicações e traduções)"}
        </Text>
        <View accessibilityRole="radiogroup" style={styles.chipGrid}>
          {throughOptions.map((item) => {
            const isSelected = item.id === throughLang;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityLabel={languageName(item.id)}
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                onPress={() => onChangeThrough(item.id)}
                testID={`through-lang-${item.id}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? palette.active : palette.sheet,
                    borderColor: isSelected ? palette.primary : palette.border,
                    borderWidth: isSelected ? 1.5 : 1,
                    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
                  },
                ]}
              >
                <Flag code={item.id} size={22} />
                <Text
                  variant="body"
                  weight={isSelected ? "semibold" : "regular"}
                  tone="ink"
                >
                  {languageName(item.id)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingTop: 8 }}>
        <Button
          label={copy.startNext ?? "Continuar"}
          variant="primary"
          size="lg"
          onPress={onNext}
          testID="onboarding-pair-next"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    maxWidth: 580,
    alignSelf: "center",
    width: "100%",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: radius.control,
  },
});
