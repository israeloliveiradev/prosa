import { View, StyleSheet } from "react-native";
import { Figure } from "@/components/cast/figure";
import { Text } from "@/ui/text";
import { useTheme } from "@/theme/ThemeContext";

export function CastBanner() {
  const { palette } = useTheme();

  const minds = [
    { who: "einstein" as const, label: "Leitura", name: "Einstein", bg: palette.castReading },
    { who: "curie" as const, label: "Memória", name: "Curie", bg: palette.castMemory },
    { who: "feynman" as const, label: "Fala", name: "Feynman", bg: palette.castSpeech },
    { who: "davinci" as const, label: "Diário", name: "Leonardo", bg: palette.castJournal },
  ];

  return (
    <View style={styles.container} testID="cast-banner">
      <Text variant="display" weight="semibold" tone="ink" style={{ fontSize: 32, lineHeight: 40 }}>
        Vinte minutos por dia para dominar um novo idioma.
      </Text>

      <Text variant="body" tone="muted" style={{ marginTop: 12, marginBottom: 28, lineHeight: 24, fontSize: 16 }}>
        Quatro mentes históricas guiam a sua jornada diária com IA personalizada e áudio neural.
      </Text>

      <View style={styles.grid}>
        {minds.map((m) => (
          <View
            key={m.who}
            style={[
              styles.mindCard,
              {
                backgroundColor: palette.sheet,
                borderColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: m.bg,
                },
              ]}
            >
              <Figure who={m.who} size={140} />
            </View>
            <View style={{ alignItems: "center", gap: 2, marginTop: 4 }}>
              <Text variant="caption" weight="semibold" tone="accent" style={{ letterSpacing: 0.6, textTransform: "uppercase", fontSize: 11 }}>
                {m.label}
              </Text>
              <Text variant="body" weight="semibold" tone="ink" style={{ fontSize: 15 }}>
                {m.name}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function CastRow() {
  const { palette } = useTheme();

  const minds = [
    { who: "einstein" as const, label: "Leitura", name: "Einstein", bg: palette.castReading },
    { who: "curie" as const, label: "Memória", name: "Curie", bg: palette.castMemory },
    { who: "feynman" as const, label: "Fala", name: "Feynman", bg: palette.castSpeech },
    { who: "davinci" as const, label: "Diário", name: "Leonardo", bg: palette.castJournal },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        paddingVertical: 12,
      }}
      testID="cast-row-compact"
    >
      {minds.map((m) => (
        <View key={m.who} style={{ alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              backgroundColor: m.bg,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: palette.border,
            }}
          >
            <Figure who={m.who} size={64} />
          </View>
          <Text variant="caption" weight="medium" tone="ink" style={{ fontSize: 13 }}>
            {m.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 480,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
  },
  mindCard: {
    flex: 1,
    minWidth: 200,
    maxWidth: 224,
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  avatarCircle: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
