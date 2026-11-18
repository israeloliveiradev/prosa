import { View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { CastPortrait } from "@/features/cast/cast-portrait";
import { MINDS, type MindId } from "@/design/minds";

export interface CastBlockProps {
  testID?: string;
}

const DEFAULT_MINDS: MindId[] = ["einstein", "curie", "feynman", "davinci"];

export function CastBlock({ testID = "home-cast" }: CastBlockProps) {
  const { palette } = useTheme();

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
      <View style={styles.header}>
        <Text variant="caption" tone="muted" weight="medium">
          Mentes pedagógicas
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          testID="home-cast-settings"
          style={styles.settingsLink}
        >
          <Text variant="caption" tone="accent" weight="medium">
            Personalizar
          </Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {DEFAULT_MINDS.map((mindId) => {
          const mind = MINDS.find((m) => m.id === mindId);
          return (
            <Pressable
              key={mindId}
              accessibilityRole="button"
              onPress={() => router.push("/settings")}
              style={styles.mindItem}
              testID={`home-cast-item-${mindId}`}
            >
              <CastPortrait
                who={mindId}
                slot={mind?.slot}
                size={48}
                showName={true}
                showRole={true}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  grid: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: 12,
  },
  mindItem: {
    alignItems: "center",
  },
});
