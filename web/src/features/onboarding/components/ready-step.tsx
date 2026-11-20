import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { Flag } from "@/ui/flag";
import { Icon } from "@/ui/icon";
import { useTheme } from "@/theme/ThemeContext";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { useLocale } from "@/lib/i18n";
import { canDoFor, canDoText } from "@/lib/can-do";
import { themeLabel } from "@/lib/themes";
import { weeklyMinutes, type CefrLevel, type DailyMinutes, type GoalId, type LevelSource } from "../model/journey-flow";
import { formatDuration } from "./minutes-picker";
import { StepAction, StepFrame } from "./step-frame";
import { useLanguageName } from "./use-language-name";

export interface ReadyStepProps {
  level: CefrLevel;
  levelSource: LevelSource | null;
  targetLang: string;
  throughLang: string;
  goal: GoalId | null;
  goalNote: string;
  interests: string[];
  minutes: DailyMinutes;
  onStart: () => void;
  onEdit?: () => void;
}

/** Plano pessoal: só o que o aluno escolheu e o que a conta guardou. */
export function ReadyStep({
  level,
  levelSource,
  targetLang,
  throughLang,
  goal,
  goalNote,
  interests,
  minutes,
  onStart,
  onEdit,
}: ReadyStepProps) {
  const t = useAreaCopy(ONBOARDING_COPY);
  const locale = useLocale();
  const { palette } = useTheme();
  const nameOf = useLanguageName();
  const canDo = canDoFor(level);
  const cardStyle = { backgroundColor: palette.card, borderColor: palette.line, borderBottomColor: palette.outline };

  return (
    <StepFrame
      testID="onboarding-ready"
      kicker={t.planKicker}
      title={t.planTitle}
      footer={
        <>
          <StepAction label={t.planStart} onPress={onStart} testID="onboarding-open-daily" />
          {onEdit ? <StepAction label={t.planEdit} variant="ghost" onPress={onEdit} testID="onboarding-edit-plan" /> : null}
        </>
      }
    >
      <View style={[styles.card, cardStyle]}>
        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: palette.primary }]}>
            <Text variant="heading-sm" weight="bold" tone="onPrimary" testID="onboarding-plan-level">
              {level}
            </Text>
          </View>
          <View style={styles.levelText}>
            <Text variant="body-lg" weight="bold" tone="ink">
              {t.levels[level].name}
            </Text>
            {levelSource ? (
              <Text variant="body-sm" tone="muted">
                {levelSource === "placement" ? t.planLevelPlacement : t.planLevelSelf}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.line }]} />
        <Text variant="label" weight="semibold" tone="muted">
          {t.planCanDo(level)}
        </Text>
        <View style={styles.canDoList}>
          {canDo.map((item) => (
            <View key={item.id} style={styles.canDoRow}>
              <Icon name="check" size={16} color={palette.positive} />
              <Text variant="body" tone="ink" style={styles.canDoText}>
                {canDoText(item, locale)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, cardStyle]}>
        <PlanRow label={t.planStudy} testID="onboarding-plan-target">
          <View style={styles.inline}>
            <Flag code={targetLang} size={22} />
            <Text variant="body" weight="semibold" tone="ink">
              {nameOf(targetLang)}
            </Text>
          </View>
        </PlanRow>
        <PlanRow label={t.planSupport}>
          <View style={styles.inline}>
            <Flag code={throughLang} size={22} />
            <Text variant="body" weight="semibold" tone="ink">
              {nameOf(throughLang)}
            </Text>
          </View>
        </PlanRow>
        {goal ? (
          <PlanRow label={t.planGoal} testID="onboarding-plan-goal">
            <Text variant="body" weight="semibold" tone="ink">
              {t.goals[goal].title}
            </Text>
            {goalNote.trim() ? (
              <Text variant="body-sm" tone="muted">
                {goalNote.trim()}
              </Text>
            ) : null}
          </PlanRow>
        ) : null}
        <PlanRow label={t.planDaily} testID="onboarding-plan-daily">
          <Text variant="body" weight="semibold" tone="ink">
            {t.planDailyValue(minutes, formatDuration(t, weeklyMinutes(minutes)))}
          </Text>
        </PlanRow>
        <PlanRow label={t.planThemes} last>
          <View style={styles.chips}>
            {interests.map((theme) => (
              <View key={theme} style={[styles.chip, { backgroundColor: palette.primarySoft, borderColor: palette.primary }]}>
                <Text variant="body-sm" weight="semibold" tone="ink">
                  {themeLabel(theme, t.themes)}
                </Text>
              </View>
            ))}
          </View>
        </PlanRow>
      </View>

      <View style={[styles.card, styles.first, { backgroundColor: palette.primarySoft, borderColor: palette.primary, borderBottomColor: palette.primaryEdge }]}>
        <Icon name="book" size={22} color={palette.primary} />
        <View style={styles.firstText}>
          <Text variant="body" weight="bold" tone="ink">
            {t.planFirstTitle}
          </Text>
          <Text variant="body-sm" tone="ink">
            {t.planFirstBody}
          </Text>
        </View>
      </View>
    </StepFrame>
  );
}

function PlanRow({ label, children, last = false, testID }: { label: string; children: ReactNode; last?: boolean; testID?: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: palette.line }]} testID={testID}>
      <Text variant="label" weight="semibold" tone="muted" style={styles.rowLabel}>
        {label}
      </Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderBottomWidth: 4,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  canDoList: {
    gap: 8,
  },
  canDoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  canDoText: {
    flex: 1,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 12,
  },
  rowLabel: {
    width: 120,
    paddingTop: 2,
  },
  rowValue: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  first: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  firstText: {
    flex: 1,
    gap: 4,
  },
});
