import { router } from "expo-router";
import { View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { DailyNews } from "@/components/home/daily-news";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { useSession } from "@/lib/session";

export default function NewsScreen() {
  const session = useSession();

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker="Boletim" title="Notícias" dek="O jornal de hoje, no assunto e no nível da conta." />
        <AreaHint area="news" />
        {session ? (
          <DailyNews />
        ) : (
          <ActionRow title="Entre na conta para ler a notícia" detail="A notícia usa o nível e os interesses da conta." onPress={() => router.push("/account")} />
        )}
      </View>
    </AppFrame>
  );
}
