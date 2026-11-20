import { useQuery } from "@tanstack/react-query";
import { fetchSrsCards } from "@/lib/api";
import { getProgress, mergeServerCards, persistDeck } from "@/lib/progress";
import { useSession } from "@/lib/session";

/**
 * Traz os cartões FSRS do servidor para o baralho do aparelho (mesma fusão que a sessão diária
 * faz). Sem isso, um aparelho novo ou com o armazenamento limpo mostraria "nenhum cartão" na
 * Revisão até a primeira sessão do dia, embora o servidor já tenha o baralho do aluno.
 */
export function useServerDeck(): { syncing: boolean; failed: boolean } {
  const session = useSession();
  const token = session?.token ?? null;
  const query = useQuery({
    queryKey: ["srs-cards", session?.user.id ?? null],
    enabled: Boolean(token),
    staleTime: 60_000,
    queryFn: async () => {
      const remote = await fetchSrsCards(token as string);
      persistDeck(mergeServerCards(getProgress().cards, remote));
      return remote.length;
    },
  });
  return { syncing: query.isPending && query.fetchStatus !== "idle", failed: query.isError };
}
