import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { InlineError } from "@/ui/inline-error";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { useCopy } from "@/lib/i18n";
import { NEWS_THEMES } from "@/lib/themes";

export interface InterestPickerProps {
  interests: string[];
  goal: string;
  onToggleInterest: (theme: string) => void;
  onChangeGoal: (goal: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}

export function InterestPicker({
  interests,
  goal,
  onToggleInterest,
  onChangeGoal,
  onSubmit,
  pending,
  error,
}: InterestPickerProps) {
  const { palette } = useTheme();
  const copy = useCopy();

  return (
    <View style={styles.container} testID="onboarding-interest-picker">
      <View style={{ gap: 8 }}>
        <Text variant="title" weight="semibold" tone="ink" accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32 }}>
          {copy.startInterestTitle ?? "Do que você vive."}
        </Text>
        <Text variant="body" tone="muted" style={{ fontSize: 16, lineHeight: 24 }}>
          {copy.startInterestDek ??
            "A notícia, a cena e o palácio nascem daqui. Escolha o que é seu de verdade."}
        </Text>
      </View>

      <View style={styles.chipGrid}>
        {NEWS_THEMES.map((theme) => {
          const isSelected = interests.includes(theme);
          return (
            <Pressable
              key={theme}
              accessibilityRole="checkbox"
              accessibilityLabel={theme}
              accessibilityState={{ checked: isSelected }}
              onPress={() => onToggleInterest(theme)}
              testID={`theme-${theme}`}
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
              <Text
                variant="body"
                weight={isSelected ? "semibold" : "regular"}
                tone="ink"
                style={{ fontSize: 15 }}
              >
                {theme}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 6 }}>
        <Field
          label={copy.startGoalLabel ?? "Uma meta de estudo (opcional)"}
          placeholder={copy.startGoalHint ?? "Falar no trabalho, viajar, ler notícias…"}
          value={goal}
          onChangeText={onChangeGoal}
          testID="onboarding-goal-input"
        />
      </View>

      {error ? (
        <InlineError message={error} testID="onboarding-error" />
      ) : null}

      <View style={{ paddingTop: 8 }}>
        <Button
          label={pending ? (copy.startSaving ?? "Guardando...") : (copy.startToPlacement ?? "Medir o nível")}
          variant="primary"
          size="lg"
          loading={pending}
          disabled={pending || interests.length === 0}
          onPress={onSubmit}
          testID="onboarding-interest-submit"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    maxWidth: 620,
    alignSelf: "center",
    width: "100%",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
