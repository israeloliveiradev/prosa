import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { countDue } from "@/lib/session-clock";
import type { ProgressState } from "@/lib/progress";

export interface ReviewsBlockProps {
  progress: ProgressState;
  testID?: string;
}

export function ReviewsBlock({ progress, testID = "home-reviews" }: ReviewsBlockProps) {
  const { palette } = useTheme();
  const dueCount = countDue(progress.cards);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: palette.sheet,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.content}>
        <Text variant="caption" tone="muted" weight="medium">
          Revisões
        </Text>

        <View style={styles.metricRow}>
          <Text
            variant="display"
            weight="bold"
            tone={dueCount > 0 ? "accent" : "ink"}
            style={styles.number}
            testID="home-reviews-count"
          >
            {dueCount}
          </Text>
          <Text variant="caption" tone="muted">
            {dueCount === 1 ? "palavra pendente" : "palavras pendentes"}
          </Text>
        </View>

        <Text variant="caption" tone="muted" numberOfLines={2}>
          {dueCount > 0
            ? "Mantenha a retenção com o algoritmo de repetição FSRS."
            : "Vocabulário totalmente em dia por hoje."}
        </Text>
      </View>

      <Button
        variant="secondary"
        size="sm"
        label="Revisar agora"
        onPress={() => router.push("/memory")}
        disabled={dueCount === 0}
        testID="home-reviews-button"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 200,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 20,
    justifyContent: "space-between",
    gap: 16,
  },
  content: {
    gap: 8,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  number: {
    fontVariant: ["tabular-nums"],
  },
  button: {
    alignSelf: "flex-start",
  },
});
