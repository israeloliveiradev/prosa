import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SrsStage } from "@/components/session/srs-stage";
import { ChunkButton } from "@/components/shell/chunk-button";
import { recordRetention } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { enqueueReview, persistDeck } from "@/lib/progress";
import { retentionSnapshot, type RetentionBand } from "@/lib/retention";
import { useSession } from "@/lib/session";
import type { SessionCard } from "@/lib/types";
import { lightPalette } from "@/design/tokens";
import { useTheme } from "@/theme/ThemeContext";

const BAND_LABEL: Record<RetentionBand, string> = {
  critical: "Em risco",
  decaying: "Esquecendo",
  settling: "Firmando",
  fixed: "Na memória longa",
};

export function RetentionHeatmap({ cards }: { cards: SessionCard[] }) {
  const session = useSession();
  const { palette } = useTheme();
  const [queue, setQueue] = useState<SessionCard[] | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const snapshot = retentionSnapshot(
    cards.map((card) => ({
      phrase: card.front_phrase,
      intervalDays: card.interval_days,
      status: card.status,
    })),
  );
  const signature = `${cards.length}:${snapshot.score}:${snapshot.critical}:${snapshot.decaying}:${snapshot.mastered}`;

  useEffect(() => {
    const token = session?.token;
    if (!token) {
      return;
    }
    const handle = setTimeout(() => {
      void recordRetention(
        token,
        cards.map((card) => ({
          phrase: card.front_phrase,
          interval_days: card.interval_days,
          status: card.status,
        })),
      ).catch(() => undefined);
    }, 400);
    return () => clearTimeout(handle);
  }, [session?.token, signature, cards]);

  const fill: Record<RetentionBand, string> = {
    critical: palette.error,
    decaying: palette.tertiary,
    settling: palette.secondaryContainer,
    fixed: palette.secondary,
  };
  const ink: Record<RetentionBand, string> = {
    critical: palette.surface,
    decaying: lightPalette.onSurface,
    settling: palette.onSecondaryContainer,
    fixed: palette.onSecondary,
  };

  if (queue) {
    return (
      <View accessibilityRole="summary" accessibilityLabel="Revisão relâmpago das palavras em risco">
        <SrsStage
          cards={queue}
          heading="Revisão relâmpago"
          doneTitle="As palavras em risco passaram."
          onChange={(next, graded, quality) => {
            setQueue(next);
            persistDeck(next);
            enqueueReview(graded, quality);
          }}
        />
        <View className="mt-4 self-start">
          <ChunkButton label="Voltar ao mapa" onPress={() => setQueue(null)} tone="ghost" />
        </View>
      </View>
    );
  }

  const criticalCards = cards.filter((card) => snapshot.cells.some((cell) => cell.band === "critical" && cell.phrases.includes(card.front_phrase)));

  return (
    <View accessibilityRole="summary" accessibilityLabel={`Mapa de retenção. ${snapshot.critical} em risco, ${snapshot.decaying} esquecendo, ${snapshot.settling} firmando, ${snapshot.mastered} na memória longa.`}>
      <Text className="font-label text-sm text-muted">Memória · em risco primeiro</Text>
      <Text className="mt-2 font-display text-2xl text-ink">
        {cards.length === 0 ? "O mapa abre com a primeira palavra." : `${snapshot.score}% já passou de 21 dias.`}
      </Text>
      <View className="mt-5 flex-row flex-wrap gap-2">
        {snapshot.cells.map((cell, index) => {
          const label = `${BAND_LABEL[cell.band]}, ${cell.phrases.length} ${cell.phrases.length === 1 ? "palavra" : "palavras"}: ${cell.phrases.join(", ")}`;
          return (
            <Pressable
              key={`${cell.band}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={cell.band === "critical" ? "Abre a revisão só das palavras em risco." : "Mostra as palavras desta célula."}
              onPress={() => {
                void tap(cell.band === "critical" ? "medium" : "light");
                if (cell.band === "critical") {
                  setPicked(null);
                  setQueue(criticalCards);
                  return;
                }
                setPicked(cell.phrases);
              }}
              className="h-11 w-11 cursor-pointer items-center justify-center rounded-2xl"
              style={{ backgroundColor: fill[cell.band] }}
            >
              <Text className="text-sm font-semibold" style={{ color: ink[cell.band] }}>
                {cell.phrases.length}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-4 gap-1">
        {(["critical", "decaying", "settling", "fixed"] as const).map((band) => (
          <Text key={band} className="text-base text-muted">
            {BAND_LABEL[band]} · {band === "critical" ? snapshot.critical : band === "decaying" ? snapshot.decaying : band === "settling" ? snapshot.settling : snapshot.mastered}
          </Text>
        ))}
      </View>
      {picked ? (
        <View className="mt-4 rounded-3xl border border-line bg-card px-4 py-3">
          {picked.map((phrase) => (
            <Text key={phrase} className="min-h-8 py-1 text-base text-ink">
              {phrase}
            </Text>
          ))}
        </View>
      ) : null}
      {snapshot.critical > 0 ? (
        <Text className="mt-4 text-base leading-6 text-muted">Toque numa célula em risco para revisar só essas palavras.</Text>
      ) : null}
    </View>
  );
}
