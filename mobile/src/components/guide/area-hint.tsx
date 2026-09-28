import { Pressable, Text, View } from "react-native";
import { markGuideSeen, useGuideSeen, type GuideArea } from "@/lib/guide";
import { tap } from "@/lib/haptics";

const COPY: Record<Exclude<GuideArea, "welcome">, string> = {
  prosa: "Toque numa palavra. Depois ouça. O áudio já está sendo preparado.",
  news: "O boletim busca a matéria de hoje. Ouvir usa a voz escolhida. Estudar esta notícia abre a prosa com esse texto.",
  practice: "Duelo: 120 segundos e uma lacuna. Cena: uma conversa no tom do lugar, com a dica cultural em seguida.",
  memory: "O mapa mostra o que está em risco. Toque numa célula vermelha para revisar. O histórico e os selos ficam aqui.",
};

export function AreaHint({ area }: { area: Exclude<GuideArea, "welcome"> }) {
  const seen = useGuideSeen(area);
  if (seen) {
    return null;
  }
  return (
    <View className="rounded-[28px] border border-line bg-card px-5 py-5">
      <Text className="font-label text-sm text-muted">Nesta tela</Text>
      <Text className="mt-2 text-base leading-7 text-ink">{COPY[area]}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          markGuideSeen(area);
          void tap("light");
        }}
        className="mt-4 min-h-12 cursor-pointer items-center justify-center self-start rounded-full bg-ember px-6"
      >
        <Text className="text-base font-semibold text-onEmber">Entendi</Text>
      </Pressable>
    </View>
  );
}
