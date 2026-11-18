import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Pill } from "@/ui/pill";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { useCopy } from "@/lib/i18n";
import type { PlacementItem } from "@/api/schemas/placement";

export interface QuestionProps {
  item: PlacementItem;
  currentIndex: number;
  totalCap: number;
  picked: number | null;
  onPick: (choice: number) => void;
  onSubmit: () => void;
  onPlayAudio?: (text: string) => void;
  audioLoading?: boolean;
  audioPlaying?: boolean;
  isLast: boolean;
  pending: boolean;
}

export function Question({
  item,
  currentIndex,
  totalCap,
  picked,
  onPick,
  onSubmit,
  onPlayAudio,
  audioLoading = false,
  audioPlaying = false,
  isLast,
  pending,
}: QuestionProps) {
  const { palette } = useTheme();
  const copy = useCopy();

  return (
    <View style={styles.container} testID="placement-question">
      {/* Indicador de questão e faixa CEFR */}
      <View style={styles.headerRow}>
        <Text variant="caption" weight="medium" tone="muted">
          Questão {currentIndex + 1} de {totalCap}
        </Text>
        <Pill label={`Nível ${item.band}`} tone="neutral" />
      </View>

      {/* Dica opcional */}
      {item.hint ? (
        <Text variant="caption" tone="muted">
          {item.hint}
        </Text>
      ) : null}

      {/* Passagem de texto para leitura */}
      {item.passage ? (
        <View style={[styles.passageCard, { backgroundColor: palette.raised, borderColor: palette.border }]}>
          <Text variant="reading" tone="ink" style={{ lineHeight: 28 }}>
            {item.passage}
          </Text>
        </View>
      ) : null}

      {/* Botão de áudio para questão de escuta */}
      {item.kind === "listening" && item.audio_text && onPlayAudio ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Button
            label={
              audioLoading
                ? "Carregando..."
                : audioPlaying
                ? "Reproduzindo..."
                : (copy.placeListen ?? "Ouvir áudio")
            }
            icon="speaker"
            variant={audioPlaying ? "primary" : "secondary"}
            size="md"
            loading={audioLoading}
            onPress={() => onPlayAudio(item.audio_text ?? "")}
            testID="placement-play-audio"
          />
        </View>
      ) : null}

      {/* Enunciado da questão em Literata */}
      <Text variant="reading" weight="semibold" tone="ink" style={{ fontSize: 20, lineHeight: 28 }}>
        {item.prompt}
      </Text>

      {/* Opções de múltipla escolha */}
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {item.options.map((option, idx) => {
          const isSelected = picked === idx;
          return (
            <Pressable
              key={`${item.id}-${idx}`}
              accessibilityRole="radio"
              accessibilityLabel={option}
              accessibilityState={{ selected: isSelected, disabled: pending }}
              disabled={pending}
              onPress={() => onPick(idx)}
              testID={`placement-option-${idx}`}
              style={[
                styles.optionCard,
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
                style={{ lineHeight: 24 }}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Ação de avançar / finalizar */}
      <View style={{ paddingTop: 12 }}>
        <Button
          label={
            pending
              ? (copy.startSaving ?? "Salvando...")
              : isLast
              ? (copy.placeFinish ?? "Concluir nivelamento")
              : (copy.placeNext ?? "Próxima questão")
          }
          variant="primary"
          size="lg"
          loading={pending}
          disabled={picked === null || pending}
          onPress={onSubmit}
          testID="placement-submit-answer"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passageCard: {
    padding: 16,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  optionCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 52,
    borderRadius: radius.control,
    justifyContent: "center",
  },
});
