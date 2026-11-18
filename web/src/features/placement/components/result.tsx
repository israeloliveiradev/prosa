import { View, StyleSheet } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { Flag } from "@/ui/flag";
import { Pill } from "@/ui/pill";
import { Checkbox } from "@/ui/checkbox";
import { SkillBars } from "./skill-bars";
import { deltaLabel } from "@/features/placement/model/placement-flow";
import { canDoFor } from "@/lib/can-do";
import { languageName } from "@/lib/languages";
import { useCopy, getLocale } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeContext";
import type { PlacementFinish } from "@/api/schemas/placement";

export interface ResultProps {
  result: PlacementFinish;
  held: string[];
  canDoSaved: boolean;
  onToggleCanDo: (id: string) => void;
  onSaveCanDo: () => void;
  onDone: () => void;
  embedded?: boolean;
}

export function Result({
  result,
  held,
  canDoSaved,
  onToggleCanDo,
  onSaveCanDo,
  onDone,
  embedded = false,
}: ResultProps) {
  const copy = useCopy();
  const locale = getLocale();
  const { palette } = useTheme();

  const targetLang = result.target_lang || "en";
  const canDoItems = canDoFor(result.level);
  const delta = deltaLabel(result.previous_level, result.level, {
    placeUp: copy.placeUp,
    placeDown: copy.placeDown,
    placeSame: copy.placeSame,
  });

  return (
    <View style={styles.container} testID="placement-result">
      {/* Title & score summary */}
      <View style={styles.header}>
        <Text variant="title" tone="ink">
          {copy.placeResult ?? "Resultado do nivelamento"}
        </Text>
        <Text variant="body" tone="muted">
          {result.correct}/{result.total} acertos • {result.score} pontos
        </Text>
      </View>

      {/* Level Card */}
      <Card padding="md" style={styles.levelCard}>
        <View style={styles.levelRow}>
          <Flag code={targetLang} size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" tone="muted">
              {languageName(targetLang)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
              <Text variant="display" weight="bold" tone="ink" testID="placement-result-level">
                {result.level}
              </Text>
              <Pill tone="accent" label={delta} />
            </View>
          </View>
          {result.previous_level ? (
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text variant="caption" tone="muted">
                {copy.placeWas ?? "Nível anterior"}
              </Text>
              <Text variant="body" weight="semibold" tone="muted">
                {result.previous_level}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      {/* Skill & Band Performance */}
      <SkillBars skills={result.skills} bands={result.bands} />

      {/* Can-Do Checklist */}
      {canDoItems.length > 0 ? (
        <View style={styles.section} testID="placement-can-do-section">
          <View style={{ gap: 4 }}>
            <Text variant="label" weight="semibold" tone="ink">
              {copy.canDoTitle ?? "O que você consegue fazer"}
            </Text>
            <Text variant="caption" tone="muted">
              {copy.canDoHint ?? "Marque as habilidades com as quais você já se sente seguro."}
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {canDoItems.map((item) => {
              const isChecked = held.includes(item.id);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.canDoRow,
                    {
                      borderColor: isChecked ? palette.accentSoft : palette.border,
                      backgroundColor: isChecked ? palette.accentSoft : palette.surface,
                    },
                  ]}
                >
                  <Checkbox
                    label={item.text[locale] || item.text.pt}
                    checked={isChecked}
                    onChange={() => onToggleCanDo(item.id)}
                    testID={`placement-can-do-item-${item.id}`}
                  />
                </View>
              );
            })}
          </View>

          <Button
            variant="ghost"
            size="sm"
            label={canDoSaved ? (copy.canDoSaved ?? "Salvo") : (copy.canDoSave ?? "Salvar autoavaliação")}
            disabled={canDoSaved}
            onPress={onSaveCanDo}
            testID="placement-save-can-do"
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      ) : null}

      {/* Action Footer */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          label={embedded ? (copy.startPlaceContinue ?? "Continuar jornada") : (copy.navHome ?? "Concluir")}
          onPress={onDone}
          testID="placement-result-done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    width: "100%",
    paddingBottom: 20,
  },
  header: {
    gap: 6,
  },
  levelCard: {
    width: "100%",
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  section: {
    gap: 12,
  },
  canDoRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  footer: {
    marginTop: 8,
  },
});
