import { Redirect, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileIcon, type TactileIconName } from "@/components/tactile/tactile-icon";
import { TactilePanel } from "@/components/tactile/tactile-panel";
import { tactile } from "@/components/tactile/tokens";
import { fill } from "@/components/persona/talk-logic";
import { fetchDuelBoard } from "@/lib/api";
import { useAreaCopy } from "@/lib/copy/area";
import { PRACTICE, type PracticeCopy } from "@/lib/copy/practice";
import { useProgress } from "@/lib/progress";
import { useServerDeck } from "../model/use-server-deck";
import { useSession } from "@/lib/session";
import { PracticePage } from "../components/practice-header";
import { hubStats, type PracticeId } from "../model/practice-model";

const CARDS: Array<{ id: PracticeId; href: string; icon: TactileIconName }> = [
  { id: "memory", href: "/memory", icon: "layers" },
  { id: "pronunciation", href: "/pronunciation", icon: "mic" },
  { id: "workshop", href: "/syntax-workshop", icon: "pen" },
  { id: "duel", href: "/duel", icon: "bolt" },
];

function labels(t: PracticeCopy, id: PracticeId): { title: string; body: string } {
  if (id === "memory") {
    return { title: t.memoryTitle, body: t.memoryBody };
  }
  if (id === "pronunciation") {
    return { title: t.pronunciationTitle, body: t.pronunciationBody };
  }
  if (id === "workshop") {
    return { title: t.workshopTitle, body: t.workshopBody };
  }
  return { title: t.duelTitle, body: t.duelBody };
}

/** Hub das 4 práticas. Cada cartão mostra um número real (vencidos, melhor do Duelo) ou nenhum. */
export function PracticeHub() {
  const session = useSession();
  const t = useAreaCopy(PRACTICE);
  const progress = useProgress();
  useServerDeck();
  const token = session?.token;
  const userId = session?.user.id ?? "";
  const target = session?.user.target_lang ?? "";
  const board = useQuery({
    queryKey: ["duel-board", userId, target],
    queryFn: () => fetchDuelBoard(token as string),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });
  if (!session) {
    return <Redirect href="/account" />;
  }
  const best = board.data?.find((entry) => entry.you)?.score ?? null;
  const stats = hubStats(progress.cards, best);

  function statFor(id: PracticeId): string | null {
    if (id === "memory" && stats.due !== null) {
      return fill(t.memoryDue, { n: stats.due });
    }
    if (id === "duel" && stats.duelBest !== null) {
      return fill(t.duelBest, { n: stats.duelBest });
    }
    return null;
  }

  return (
    <PracticePage testID="practice-hub" kicker={t.kicker} title={t.title} dek={t.dek}>
      <View className="flex-row flex-wrap gap-4">
        {CARDS.map((card) => {
          const text = labels(t, card.id);
          const stat = statFor(card.id);
          return (
            <View key={card.id} style={{ flexGrow: 1, flexBasis: 320, minWidth: 260 }}>
              <TactilePanel testID={`practice-card-${card.id}`}>
                <View className="flex-row items-center gap-3">
                  <TactileIcon name={card.icon} size={24} color={tactile.primary} />
                  <Text className="flex-1 font-display text-xl font-extrabold" style={{ color: tactile.ink }}>
                    {text.title}
                  </Text>
                </View>
                <Text className="mt-2 text-base leading-6" style={{ color: tactile.body }}>
                  {text.body}
                </Text>
                {stat ? (
                  <Text testID={`practice-stat-${card.id}`} className="mt-2 text-sm font-extrabold" style={{ color: tactile.primaryInk }}>
                    {stat}
                  </Text>
                ) : null}
                <View className="mt-4 self-start">
                  <TactileButton testID={`practice-open-${card.id}`} label={t.open} variant="primary" onPress={() => router.push(card.href as never)} />
                </View>
              </TactilePanel>
            </View>
          );
        })}
      </View>
    </PracticePage>
  );
}
