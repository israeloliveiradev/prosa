import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { RetentionHeatmap } from "@/components/home/retention-heatmap";
import { fill } from "@/components/persona/talk-logic";
import { SrsStage } from "@/components/session/srs-stage";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { useAreaCopy } from "@/lib/copy/area";
import { MEMORY, type MemoryCopy } from "@/lib/copy/memory";
import { tap } from "@/lib/haptics";
import { cardXpKey, enqueueReview, persistDeck, useProgress } from "@/lib/progress";
import { awardXp } from "@/lib/xp";
import { useSession } from "@/lib/session";
import type { SessionCard } from "@/lib/types";
import { PracticePage } from "../components/practice-header";
import { filterCards, filterCounts, type MemoryFilter } from "../model/practice-model";
import { useServerDeck } from "../model/use-server-deck";

const FILTERS: MemoryFilter[] = ["due", "learning", "mastered"];

function filterLabel(filter: MemoryFilter, t: MemoryCopy): string {
  return filter === "due" ? t.filterDue : filter === "learning" ? t.filterLearning : t.filterMastered;
}

/**
 * Revisão e Palácio: mapa de retenção, filtros (vencidos, aprendendo, dominados) e uma rodada
 * de revisão com os cartões FSRS reais do aluno. O palácio (mnemônico) aparece no cartão elegível.
 */
export function MemoryScreen() {
  const session = useSession();
  const t = useAreaCopy(MEMORY);
  const progress = useProgress();
  const deck = useServerDeck();
  const [filter, setFilter] = useState<MemoryFilter>("due");
  const [queue, setQueue] = useState<SessionCard[] | null>(null);
  const cards = progress.cards;
  const counts = useMemo(() => filterCounts(cards), [cards]);
  const visible = useMemo(() => filterCards(cards, filter), [cards, filter]);

  if (!session) {
    return <Redirect href="/account" />;
  }

  if (cards.length === 0 && deck.syncing) {
    return (
      <PracticePage testID="memory-screen" kicker={t.kicker} title={t.title} dek={t.dek}>
        <TactilePanel testID="memory-loading" tone="quiet">
          <Text className="text-base leading-6" style={{ color: tactile.body }}>
            {t.loadingCards}
          </Text>
        </TactilePanel>
      </PracticePage>
    );
  }

  if (cards.length === 0) {
    return (
      <PracticePage testID="memory-screen" kicker={t.kicker} title={t.title} dek={t.dek}>
        <TactilePanel testID="memory-empty" tone="quiet">
          <Text className="font-display text-xl font-extrabold" style={{ color: tactile.ink }}>
            {t.emptyTitle}
          </Text>
          <Text className="mt-2 text-base leading-6" style={{ color: tactile.body }}>
            {t.emptyBody}
          </Text>
          <View className="mt-4 self-start">
            <TactileButton testID="memory-empty-cta" label={t.emptyCta} variant="primary" onPress={() => router.push("/daily")} />
          </View>
        </TactilePanel>
      </PracticePage>
    );
  }

  if (queue) {
    return (
      <PracticePage testID="memory-screen" kicker={t.kicker} title={t.title}>
        <View testID="memory-round">
          <SrsStage
            cards={queue}
            heading={t.reviewHeading}
            doneTitle={t.reviewDone}
            onChange={(next, graded, quality) => {
              setQueue(next);
              persistDeck(next);
              enqueueReview(graded, quality);
              // enqueueReview não paga XP; 1 XP por cartão por dia, como na sessão diária.
              awardXp("card", cardXpKey(graded));
            }}
          />
        </View>
        <View className="self-start">
          <TactileButton testID="memory-round-back" label={t.backToList} variant="secondary" onPress={() => setQueue(null)} />
        </View>
      </PracticePage>
    );
  }

  return (
    <PracticePage testID="memory-screen" kicker={t.kicker} title={t.title} dek={t.dek} back>
      <RetentionHeatmap cards={cards} />
      <View accessibilityRole="tablist" accessibilityLabel={t.filterA11y} className="flex-row flex-wrap gap-2">
        {FILTERS.map((item) => {
          const selected = item === filter;
          return (
            <Pressable
              key={item}
              testID={`memory-filter-${item}`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setFilter(item);
                void tap("light");
              }}
              className="min-h-11 cursor-pointer justify-center rounded-xl border px-4"
              style={{
                backgroundColor: selected ? tactile.primary : tactile.surface,
                borderColor: selected ? tactile.primaryDark : tactile.border,
                borderBottomWidth: 4,
              }}
            >
              <Text className="text-sm font-extrabold" style={{ color: selected ? "#FFFFFF" : tactile.ink }}>
                {`${filterLabel(item, t)} · ${counts[item]}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {visible.length > 0 ? (
        <View className="self-start">
          <TactileButton
            testID="memory-start"
            label={visible.length === 1 ? t.startOne : fill(t.start, { n: visible.length })}
            variant="primary"
            onPress={() => setQueue(visible)}
          />
        </View>
      ) : (
        <Text testID="memory-filter-empty" className="text-base leading-6" style={{ color: tactile.muted }}>
          {filter === "due" ? t.nothingDue : t.nothingHere}
        </Text>
      )}
      {visible.length > 0 ? (
        <TactilePanel tone="quiet">
          <Text className="text-xs font-extrabold uppercase tracking-wider" style={{ color: tactile.primaryInk }}>
            {t.listTitle}
          </Text>
          {visible.slice(0, 40).map((card) => (
            <View key={card.id || card.front_phrase} className="mt-3">
              <Text className="text-base font-bold" style={{ color: tactile.ink }}>
                {card.front_phrase}
              </Text>
              <Text className="text-sm" style={{ color: tactile.muted }}>
                {card.back_translation}
              </Text>
            </View>
          ))}
        </TactilePanel>
      ) : null}
    </PracticePage>
  );
}
