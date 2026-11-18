import { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "@/ui/text";
import { Button } from "@/ui/button";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/design/tokens";
import { resetGuide } from "@/lib/guide";
import { CastPortrait } from "@/features/cast/cast-portrait";
import { SessionRuler } from "@/features/session/components/session-ruler";

export function GuideScreen() {
  const { palette } = useTheme();
  const [resetFeedback, setResetFeedback] = useState(false);

  function handleResetHints() {
    resetGuide();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 3000);
  }

  return (
    <ScrollView
      testID="guide-screen"
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.readingColumn}>
        {/* Cabeçalho do Guia (sem kicker) */}
        <View style={styles.header}>
          <Text variant="display" weight="bold" tone="ink" testID="guide-title">
            Como usar o Prosa
          </Text>
          <Text variant="body" tone="muted" style={styles.lead}>
            Um guia sobre o método de vinte minutos diários, o elenco pedagógico e como consolidar sua fluência com retenção duradoura.
          </Text>
        </View>

        {/* Seção 1: O ritmo do dia */}
        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text variant="title" weight="semibold" tone="ink">
            O ritmo dos 20 minutos
          </Text>
          <Text variant="body" tone="ink" style={styles.bodyText}>
            Cada sessão é dividida em seis etapas sequenciais calibradas para criar imersão sem sobrecarregar a memória de trabalho:
          </Text>

          <View style={[styles.cardIllustration, { backgroundColor: palette.raised, borderColor: palette.border }]}>
            <SessionRuler compact={false} showLabels={true} />
          </View>

          <Text variant="body" tone="muted" style={styles.bodyText}>
            Começamos com aquecimento e escuta atenta, passamos pela leitura aprofundada com vocabulário em contexto, praticamos a fala com avaliação acústica e finalizamos no diário reflexivo.
          </Text>
        </View>

        {/* Seção 2: As mentes pedagógicas */}
        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text variant="title" weight="semibold" tone="ink">
            As quatro mentes pedagógicas
          </Text>
          <Text variant="body" tone="ink" style={styles.bodyText}>
            Figuras históricas acompanham cada momento do seu aprendizado com estilos pedagógicos distintos:
          </Text>

          <View style={styles.castGrid}>
            <View style={[styles.castCard, { backgroundColor: palette.raised, borderColor: palette.border }]}>
              <CastPortrait who="einstein" size={48} slot="reading" />
              <View style={styles.castInfo}>
                <Text variant="body" weight="semibold" tone="ink">
                  Albert Einstein
                </Text>
                <Text variant="caption" tone="muted">
                  Leitura e síntese de ideias complexas em linguagem acessível.
                </Text>
              </View>
            </View>

            <View style={[styles.castCard, { backgroundColor: palette.raised, borderColor: palette.border }]}>
              <CastPortrait who="curie" size={48} slot="memory" />
              <View style={styles.castInfo}>
                <Text variant="body" weight="semibold" tone="ink">
                  Marie Curie
                </Text>
                <Text variant="caption" tone="muted">
                  Memória, precisão terminológica e repetição espaçada.
                </Text>
              </View>
            </View>

            <View style={[styles.castCard, { backgroundColor: palette.raised, borderColor: palette.border }]}>
              <CastPortrait who="feynman" size={48} slot="speech" />
              <View style={styles.castInfo}>
                <Text variant="body" weight="semibold" tone="ink">
                  Richard Feynman
                </Text>
                <Text variant="caption" tone="muted">
                  Fala espontânea, clareza intuitiva e desinibição oral.
                </Text>
              </View>
            </View>

            <View style={[styles.castCard, { backgroundColor: palette.raised, borderColor: palette.border }]}>
              <CastPortrait who="davinci" size={48} slot="journal" />
              <View style={styles.castInfo}>
                <Text variant="body" weight="semibold" tone="ink">
                  Leonardo da Vinci
                </Text>
                <Text variant="caption" tone="muted">
                  Diário pessoal, escrita expressiva e conexões culturais.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seção 3: Memória e FSRS */}
        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text variant="title" weight="semibold" tone="ink">
            Memória e retenção duradoura
          </Text>
          <Text variant="body" tone="ink" style={styles.bodyText}>
            O Prosa utiliza o algoritmo FSRS (Free Spaced Repetition Scheduler), uma evolução moderna do SM-2 que calcula intervalos ótimos com base na estabilidade da memória e dificuldade de cada termo.
          </Text>
          <Text variant="body" tone="muted" style={styles.bodyText}>
            Revisar 5 a 10 cartas por dia garante que as palavras novas migrem da memória de curto prazo para o vocabulário ativo permanente.
          </Text>
        </View>

        {/* Seção 4: Redefinir dicas de área */}
        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text variant="title" weight="semibold" tone="ink">
            Dicas das telas
          </Text>
          <Text variant="body" tone="ink" style={styles.bodyText}>
            Deseja rever as explicações contextuais de primeira visita que aparecem no topo das telas do aplicativo?
          </Text>

          <View style={styles.resetRow}>
            <Button
              variant="secondary"
              size="md"
              label={resetFeedback ? "Dicas redefinidas!" : "Rever as dicas de uso"}
              onPress={handleResetHints}
              testID="guide-reset-hints"
            />
            {resetFeedback && (
              <Text variant="caption" tone="accent" weight="medium">
                As dicas de Início, Prática e Memória reaparecerão na próxima visita.
              </Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  readingColumn: {
    width: "100%",
    maxWidth: 640,
    gap: 36,
  },
  header: {
    gap: 12,
  },
  lead: {
    fontSize: 16,
    lineHeight: 26,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: 24,
    gap: 16,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
  },
  cardIllustration: {
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    marginVertical: 4,
  },
  castGrid: {
    gap: 12,
    marginTop: 4,
  },
  castCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 16,
  },
  castInfo: {
    flex: 1,
    gap: 2,
  },
  resetRow: {
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
  },
});
