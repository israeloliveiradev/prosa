import { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { router } from "expo-router";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { CastPortrait } from "@/features/cast/cast-portrait";
import { SessionRuler } from "@/features/session/components/session-ruler";
import { countDue } from "@/lib/session-clock";
import type { ProgressState } from "@/lib/progress";
import { useCopy } from "@/lib/i18n";

export interface TodayBlockProps {
  progress: ProgressState;
  isTodayDone: boolean;
  continuing: boolean;
  topic: string;
  onChangeTopic: (next: string) => void;
  onStart: () => void;
  elapsedSeconds?: number;
  testID?: string;
}

export function TodayBlock({
  progress,
  isTodayDone,
  continuing,
  topic,
  onChangeTopic,
  onStart,
  elapsedSeconds = 0,
  testID = "home-today",
}: TodayBlockProps) {
  const { palette } = useTheme();
  const copy = useCopy();
  const [showTopicEditor, setShowTopicEditor] = useState(false);
  const dueCount = countDue(progress.cards);

  const displayTopic = topic.trim()
    ? topic
    : continuing && progress.topic
    ? progress.topic
    : "História do dia";

  if (isTodayDone) {
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
        <View style={styles.doneRow}>
          <View style={styles.doneInfo}>
            <Text variant="title" weight="semibold" tone="ink">
              Prosa de hoje concluída
            </Text>
            <Text variant="body" tone="muted" style={styles.dek}>
              Você cumpriu os 20 minutos de estudo de hoje. Mantenha o ritmo revisando seu vocabulário ou praticando diálogos livres.
            </Text>

            <View style={styles.doneActions}>
              {dueCount > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  label={`Revisar ${dueCount} cartas`}
                  onPress={() => router.push("/memory")}
                  testID="home-review-done"
                />
              )}
              <Button
                variant={dueCount > 0 ? "secondary" : "primary"}
                size="md"
                label="Prática livre"
                onPress={() => router.push("/practice")}
                testID="home-practice-done"
              />
            </View>
          </View>

          <CastPortrait who="einstein" size={72} slot="reading" />
        </View>
      </View>
    );
  }

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
      <View style={styles.headerRow}>
        <View style={styles.topicCol}>
          <Text variant="body" tone="muted" weight="medium">
            {continuing ? "Continuar sessão" : "Sessão recomendada de 20 minutos"}
          </Text>
          <Text
            variant="title"
            weight="bold"
            tone="ink"
            numberOfLines={2}
            testID="home-topic-title"
          >
            {displayTopic}
          </Text>
        </View>

        <CastPortrait who="einstein" size={56} slot="reading" />
      </View>

      {/* Session Ruler com proporções das 6 etapas */}
      <View style={styles.rulerContainer}>
        <SessionRuler
          currentSeconds={elapsedSeconds}
          compact={false}
          showLabels={true}
          testID="home-session-ruler"
        />
      </View>

      {/* Ações principais */}
      <View style={styles.actionsRow}>
        <Button
          variant="primary"
          size="lg"
          label={continuing ? (copy.continueToday ?? "Continuar") : "Abrir a prosa de hoje"}
          onPress={onStart}
          testID="home-start"
          style={styles.startButton}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (!progress.pro) {
              router.push("/paywall");
            } else {
              setShowTopicEditor((v) => !v);
            }
          }}
          testID="home-topic-toggle"
          style={styles.topicTrigger}
        >
          <Text variant="caption" tone="accent" weight="medium">
            {progress.pro
              ? showTopicEditor
                ? "Fechar tema"
                : "Personalizar tema"
              : "Tema personalizado (Pro)"}
          </Text>
        </Pressable>
      </View>

      {/* Editor de Tópico Customizado para Pro */}
      {showTopicEditor && progress.pro && (
        <View
          style={[
            styles.topicEditor,
            {
              backgroundColor: palette.raised,
              borderColor: palette.border,
            },
          ]}
          testID="home-topic-editor"
        >
          <Text variant="caption" tone="muted" weight="medium">
            Digite o assunto da lição de hoje:
          </Text>
          <TextInput
            value={topic}
            onChangeText={onChangeTopic}
            placeholder="Ex: pedindo café em Londres, entrevista de emprego..."
            placeholderTextColor={palette.muted}
            testID="home-topic-input"
            style={[
              styles.input,
              {
                backgroundColor: palette.sheet,
                borderColor: palette.border,
                color: palette.ink,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 24,
    gap: 20,
    width: "100%",
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  doneInfo: {
    flex: 1,
    gap: 8,
  },
  dek: {
    lineHeight: 22,
  },
  doneActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  topicCol: {
    flex: 1,
    gap: 4,
  },
  rulerContainer: {
    width: "100%",
    paddingVertical: 4,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  startButton: {
    minWidth: 200,
  },
  topicTrigger: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  topicEditor: {
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});
