import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { Field } from "@/ui/field";
import { Icon } from "@/ui/icon";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useTheme } from "@/theme/ThemeContext";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import {
  MAX_THEMES,
  MAX_THEME_LENGTH,
  NEWS_THEMES,
  addTheme,
  hasTheme,
  isNewsTheme,
  presetFromLabel,
  themeLabel,
} from "@/lib/themes";
import { TactileOption } from "./tactile-option";

export interface InterestPickerProps {
  interests: string[];
  onToggleInterest: (theme: string) => void;
  onAddInterest: (theme: string) => void;
  onRemoveInterest: (theme: string) => void;
}

type Notice = "full" | "duplicate" | null;

/**
 * Os 8 temas fixos como chips (rótulo traduzido, ID canônico) e temas livres
 * escritos pelo aluno. De 1 a 12 no total.
 */
export function InterestPicker({ interests, onToggleInterest, onAddInterest, onRemoveInterest }: InterestPickerProps) {
  const t = useAreaCopy(ONBOARDING_COPY);
  const { palette } = useTheme();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const full = interests.length >= MAX_THEMES;
  const custom = interests.filter((item) => !isNewsTheme(item));

  const handleToggle = (theme: string) => {
    if (!hasTheme(interests, theme) && full) {
      setNotice("full");
      return;
    }
    setNotice(null);
    onToggleInterest(theme);
  };

  const handleAdd = () => {
    const preset = presetFromLabel(draft, t.themes);
    const candidate = preset ?? draft;
    const result = addTheme(interests, candidate);
    if (result.status === "empty") return;
    if (result.status === "full" || result.status === "duplicate") {
      setNotice(result.status);
      return;
    }
    setNotice(null);
    setDraft("");
    onAddInterest(candidate);
  };

  const handleRemove = (theme: string) => {
    setNotice(null);
    onRemoveInterest(theme);
  };

  return (
    <View style={styles.container} testID="onboarding-interest-picker">
      <Text variant="label" weight="semibold" tone={full ? "accent" : "muted"} testID="onboarding-themes-count">
        {t.themesCount(interests.length, MAX_THEMES)}
      </Text>

      <View style={styles.chips}>
        {NEWS_THEMES.map((theme, index) => {
          const selected = interests.includes(theme);
          return (
            <TactileOption
              key={theme}
              compact
              role="checkbox"
              title={themeLabel(theme, t.themes)}
              selected={selected}
              onPress={() => handleToggle(theme)}
              disabled={!selected && full}
              leading={selected ? <Icon name="check" size={16} color={palette.primary} /> : null}
              testID={`theme-preset-${index + 1}`}
            />
          );
        })}
      </View>

      {custom.length > 0 ? (
        <View style={styles.group}>
          <Text variant="label" weight="semibold" tone="muted">
            {t.yourThemes}
          </Text>
          <View style={styles.chips}>
            {custom.map((theme, index) => (
              <TactileOption
                key={theme}
                compact
                role="checkbox"
                title={theme}
                selected
                onPress={() => handleRemove(theme)}
                accessibilityLabel={t.removeTheme(theme)}
                trailing={<Icon name="x" size={14} color={palette.primary} />}
                testID={`theme-custom-${index + 1}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.addRow}>
        <View style={styles.addField}>
          <Field
            label={t.customLabel}
            placeholder={t.customHint}
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              if (notice === "duplicate") setNotice(null);
            }}
            onSubmitEditing={handleAdd}
            maxLength={MAX_THEME_LENGTH}
            returnKeyType="done"
            disabled={full}
            testID="onboarding-theme-input"
          />
        </View>
        <View style={styles.addButton} testID="onboarding-theme-add">
          <TactileButton
            label={t.customAdd}
            variant="secondary"
            size="md"
            onPress={handleAdd}
            disabled={full || draft.trim().length === 0}
          />
        </View>
      </View>

      {notice ? (
        <Text variant="body-sm" tone="warning" accessibilityRole="alert" testID="onboarding-theme-notice">
          {notice === "full" ? t.themesFull(MAX_THEMES) : t.themesDuplicate}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    width: "100%",
  },
  group: {
    gap: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  addField: {
    flexGrow: 1,
    flexBasis: 220,
  },
  addButton: {
    flexShrink: 0,
  },
});
