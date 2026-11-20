import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fill } from "@/components/persona/talk-logic";
import { SrsStage } from "@/components/session/srs-stage";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { recordRetention } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { MEMORY } from "@/lib/copy/memory";
import { tap } from "@/lib/haptics";
import { enqueueReview, persistDeck } from "@/lib/progress";
import { retentionInput, retentionSnapshot, type RetentionBand } from "@/lib/retention";
import { useSession } from "@/lib/session";
import type { SessionCard } from "@/lib/types";

const FILL: Record<RetentionBand, { bg: string; ink: string }> = {
  critical: { bg: tactile.danger, ink: "#FFFFFF" },
  decaying: { bg: "#F59E0B", ink: tactile.ink },
  settling: { bg: "#99D5CD", ink: tactile.ink },
  fixed: { bg: tactile.primary, ink: "#FFFFFF" },
};

/** Mapa de retenção (FSRS real) e a revisão relâmpago das palavras em risco. */
export function RetentionHeatmap({ cards }: { cards: SessionCard[] }) {
  const session = useSession();
  const t = useAreaCopy(MEMORY);
  const [queue, setQueue] = useState<SessionCard[] | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);
  const snapshot = retentionSnapshot(cards.map((card) => retentionInput(card)));
  const signature = `${cards.length}:${snapshot.score}:${snapshot.critical}:${snapshot.decaying}:${snapshot.mastered}`;

  useEffect(() => {
    const token = session?.token;
    if (!token) {
      return;
    }
    const handle = setTimeout(() => {
      void recordRetention(
        token,
        cards.map((card) => ({ phrase: card.front_phrase, interval_days: card.interval_days, status: card.status })),
      ).catch(() => undefined);
    }, 400);
    return () => clearTimeout(handle);
  }, [session?.token, signature, cards]);

  if (queue) {
    return (
      <View testID="retention-risk-round" accessibilityRole="summary" accessibilityLabel={t.riskA11y}>
        <SrsStage
          cards={queue}
          heading={t.riskHeading}
          doneTitle={t.riskDone}
          onChange={(next, graded, quality) => {
            setQueue(next);
            persistDeck(next);
            enqueueReview(graded, quality);
          }}
        />
        <View className="mt-4 self-start">
          <TactileButton testID="retention-risk-back" label={t.riskBack} onPress={() => setQueue(null)} variant="ghost" />
        </View>
      </View>
    );
  }

  const criticalCards = cards.filter((card) => snapshot.cells.some((cell) => cell.band === "critical" && cell.phrases.includes(card.front_phrase)));
  const bandLabel: Record<RetentionBand, string> = {
    critical: t.bandCritical,
    decaying: t.bandDecaying,
    settling: t.bandSettling,
    fixed: t.bandFixed,
  };
  const counts: Record<RetentionBand, number> = {
    critical: snapshot.critical,
    decaying: snapshot.decaying,
    settling: snapshot.settling,
    fixed: snapshot.mastered,
  };

  return (
    <TactilePanel testID="retention-heatmap">
      <View
        accessibilityRole="summary"
        accessibilityLabel={fill(t.mapA11y, { critical: snapshot.critical, decaying: snapshot.decaying, settling: snapshot.settling, fixed: snapshot.mastered })}
      >
        <Text className="text-xs font-extrabold uppercase tracking-wider" style={{ color: tactile.primaryInk }}>
          {t.mapKicker}
        </Text>
        <Text className="mt-2 font-display text-2xl font-extrabold" style={{ color: tactile.ink }}>
          {cards.length === 0 ? t.mapEmpty : fill(t.mapScore, { score: snapshot.score })}
        </Text>
        <View className="mt-5 flex-row flex-wrap gap-2">
          {snapshot.cells.map((cell, index) => {
            const n = cell.phrases.length;
            const label = `${bandLabel[cell.band]}, ${fill(n === 1 ? t.cellOne : t.cellMany, { n })}: ${cell.phrases.join(", ")}`;
            return (
              <Pressable
                key={`${cell.band}-${index}`}
                testID={`retention-cell-${cell.band}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={cell.band === "critical" ? t.cellHintRisk : t.cellHintOther}
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
                style={{ backgroundColor: FILL[cell.band].bg }}
              >
                <Text className="text-sm font-semibold" style={{ color: FILL[cell.band].ink }}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-4 gap-1">
          {(["critical", "decaying", "settling", "fixed"] as const).map((band) => (
            <Text key={band} className="text-base" style={{ color: tactile.muted }}>
              {`${bandLabel[band]} · ${counts[band]}`}
            </Text>
          ))}
        </View>
        {picked ? (
          <View className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: tactile.border, backgroundColor: tactile.raised }}>
            {picked.map((phrase) => (
              <Text key={phrase} className="min-h-8 py-1 text-base" style={{ color: tactile.ink }}>
                {phrase}
              </Text>
            ))}
          </View>
        ) : null}
        {snapshot.critical > 0 ? (
          <Text className="mt-4 text-base leading-6" style={{ color: tactile.muted }}>
            {t.mapHintRisk}
          </Text>
        ) : null}
      </View>
    </TactilePanel>
  );
}
