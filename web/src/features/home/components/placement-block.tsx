import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { useSession } from "@/lib/session";

export interface PlacementBlockProps {
  testID?: string;
}

export function PlacementBlock({ testID = "home-placement" }: PlacementBlockProps) {
  const { palette } = useTheme();
  const session = useSession();
  const level = session?.user?.level ?? "A2";

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
          Nivelamento
        </Text>

        <View style={styles.metricRow}>
          <Text
            variant="display"
            weight="bold"
            tone="ink"
            style={styles.number}
            testID="home-placement-level"
          >
            {level}
          </Text>
          <Text variant="caption" tone="muted">
            Quadro Europeu (CEFR)
          </Text>
        </View>

        <Text variant="caption" tone="muted">
          Avaliação contínua de vocabulário e gramática.
        </Text>
      </View>

      <Button
        variant="secondary"
        size="sm"
        label="Avaliar nível"
        onPress={() => router.push("/placement")}
        testID="home-placement-button"
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
