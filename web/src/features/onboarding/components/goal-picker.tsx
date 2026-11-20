import { StyleSheet, View } from "react-native";
import { Field } from "@/ui/field";
import { useAreaCopy } from "@/lib/copy/area";
import { ONBOARDING_COPY } from "@/lib/copy/onboarding";
import { GOAL_IDS, MAX_GOAL_NOTE_LENGTH, type GoalId } from "../model/journey-flow";
import { TactileOption } from "./tactile-option";

export interface GoalPickerProps {
  goal: GoalId | null;
  note: string;
  onChangeGoal: (goal: GoalId) => void;
  onChangeNote: (note: string) => void;
}

/** Um objetivo principal (escolha única) e um texto livre opcional. */
export function GoalPicker({ goal, note, onChangeGoal, onChangeNote }: GoalPickerProps) {
  const t = useAreaCopy(ONBOARDING_COPY);

  return (
    <View style={styles.container} testID="onboarding-goal-picker">
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {GOAL_IDS.map((id) => (
          <View key={id} style={styles.cell}>
            <TactileOption
              title={t.goals[id].title}
              caption={t.goals[id].caption}
              selected={goal === id}
              onPress={() => onChangeGoal(id)}
              testID={`goal-option-${id}`}
            />
          </View>
        ))}
      </View>
      <Field
        label={t.goalNoteLabel}
        placeholder={t.goalNoteHint}
        value={note}
        onChangeText={onChangeNote}
        maxLength={MAX_GOAL_NOTE_LENGTH}
        testID="onboarding-goal-note"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    flexGrow: 1,
    flexBasis: 240,
  },
});
