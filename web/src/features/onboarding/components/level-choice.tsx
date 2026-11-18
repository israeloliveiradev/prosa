import { useState } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { Pill } from "@/ui/pill";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";

export interface LevelOption {
  code: string;
  name: string;
  description: string;
}

export const CEFR_LEVELS: LevelOption[] = [
  {
    code: "A1",
    name: "Iniciante",
    description: "Estou começando do zero ou conheço apenas algumas palavras soltas.",
  },
  {
    code: "A2",
    name: "Básico",
    description: "Compreendo frases do dia a dia e consigo me virar em situações simples.",
  },
  {
    code: "B1",
    name: "Intermediário",
    description: "Consigo conversar sobre trabalho, viagens e rotina com independência.",
  },
  {
    code: "B2",
    name: "Intermediário Avançado",
    description: "Compreendo conversas e textos complexos e me expresso com boa fluência.",
  },
  {
    code: "C1",
    name: "Avançado",
    description: "Compreendo nuances, leitura densa e me comunico de forma espontânea.",
  },
  {
    code: "C2",
    name: "Domínio Pleno",
    description: "Fluência completa e precisão comparável a um falante nativo.",
  },
];

export interface LevelChoiceProps {
  onStartTest: () => void;
  onSelectLevel: (level: string) => void;
  pending?: boolean;
}

export function LevelChoice({ onStartTest, onSelectLevel, pending = false }: LevelChoiceProps) {
  const { palette } = useTheme();
  const [mode, setMode] = useState<"choose" | "pickLevel">("choose");
  const [selectedLevel, setSelectedLevel] = useState<string>("B1");

  return (
    <View style={styles.container} testID="onboarding-level-choice">
      <View style={{ gap: 8 }}>
        <Text variant="title" weight="semibold" tone="ink">
          {mode === "choose" ? "Como você prefere começar?" : "Escolha o seu nível"}
        </Text>
        <Text variant="body" tone="muted" style={{ lineHeight: 22 }}>
          {mode === "choose"
            ? "Você pode fazer um teste adaptativo rápido ou selecionar diretamente sua proficiência."
            : "Selecione a faixa do Quadro Comum Europeu (CEFR) que melhor descreve seu conhecimento atual."}
        </Text>
      </View>

      {mode === "choose" ? (
        <View style={{ gap: 16, marginTop: 8 }}>
          {/* Card Opção 1: Teste de nivelamento */}
          <Pressable
            onPress={onStartTest}
            testID="level-choice-start-test"
            style={[
              styles.choiceCard,
              {
                backgroundColor: palette.sheet,
                borderColor: palette.primary,
                borderWidth: 1.5,
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="label" weight="semibold" tone="ink" style={{ fontSize: 17 }}>
                Fazer teste de nivelamento
              </Text>
              <Pill label="Recomendado" tone="positive" />
            </View>
            <Text variant="body" tone="muted" style={{ lineHeight: 20 }}>
              Responda a perguntas curtas de escuta e leitura com áudio neural para calibrar seu ponto de partida ideal.
            </Text>
            <Button
              label="Iniciar teste"
              variant="primary"
              size="md"
              onPress={onStartTest}
              testID="level-choice-btn-test"
            />
          </Pressable>

          {/* Card Opção 2: Já sei meu nível */}
          <Pressable
            onPress={() => setMode("pickLevel")}
            testID="level-choice-pick-level"
            style={[
              styles.choiceCard,
              {
                backgroundColor: palette.sheet,
                borderColor: palette.border,
                borderWidth: 1,
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
              },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="label" weight="semibold" tone="ink" style={{ fontSize: 17 }}>
                Já sei meu nível de proficiência
              </Text>
              <Pill label="Mais rápido" tone="neutral" />
            </View>
            <Text variant="body" tone="muted" style={{ lineHeight: 20 }}>
              Escolha sua faixa (A1 a C2) diretamente e pule para a primeira lição personalizada.
            </Text>
            <Button
              label="Escolher nível manualmente"
              variant="secondary"
              size="md"
              onPress={() => setMode("pickLevel")}
              testID="level-choice-btn-pick"
            />
          </Pressable>
        </View>
      ) : (
        /* Seção de escolha direta de nível */
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            {CEFR_LEVELS.map((lvl) => {
              const isSelected = selectedLevel === lvl.code;
              return (
                <Pressable
                  key={lvl.code}
                  onPress={() => setSelectedLevel(lvl.code)}
                  testID={`level-option-${lvl.code}`}
                  style={[
                    styles.levelCard,
                    {
                      backgroundColor: isSelected ? palette.active : palette.sheet,
                      borderColor: isSelected ? palette.primary : palette.border,
                      borderWidth: isSelected ? 2 : 1,
                      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isSelected ? palette.primary : palette.controlStrong,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        weight="bold"
                        tone={isSelected ? "onPrimary" : "ink"}
                      >
                        {lvl.code}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="label" weight="semibold" tone="ink">
                        {lvl.name}
                      </Text>
                      <Text variant="caption" tone="muted" style={{ lineHeight: 18 }}>
                        {lvl.description}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 12, paddingTop: 8 }}>
            <Button
              label={pending ? "Guardando nível..." : `Confirmar nível ${selectedLevel} e continuar`}
              variant="primary"
              size="lg"
              loading={pending}
              disabled={pending}
              onPress={() => onSelectLevel(selectedLevel)}
              testID="level-choice-confirm"
              fullWidth
            />

            <Button
              label="Voltar para opções de início"
              variant="ghost"
              size="md"
              onPress={() => setMode("choose")}
              testID="level-choice-back"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: "100%",
  },
  choiceCard: {
    padding: 20,
    borderRadius: radius.sheet,
    gap: 12,
  },
  levelCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

