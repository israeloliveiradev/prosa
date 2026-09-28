import { router } from "expo-router";
import { View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";

export default function PracticeScreen() {
  const session = useSession();

  function open(href: "/duel" | "/persona") {
    void tap("medium");
    router.push(session ? href : "/account");
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker="Oficina" title="Prática" dek="Um duelo curto ou uma conversa no tom do lugar." />
        <AreaHint area="practice" />
        <ActionRow title="Duelo" detail="120 segundos. Uma frase, quatro escolhas." onPress={() => open("/duel")} />
        <ActionRow title="Cena" detail="Uma conversa real, com a dica cultural em seguida." onPress={() => open("/persona")} />
      </View>
    </AppFrame>
  );
}
