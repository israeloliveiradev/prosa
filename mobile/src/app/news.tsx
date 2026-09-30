import { Redirect } from "expo-router";
import { View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { DailyNews } from "@/components/home/daily-news";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function NewsScreen() {
  const session = useSession();
  const copy = useCopy();
  if (!session) {
    return <Redirect href="/account" />;
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker={copy.newsKicker} title={copy.newsTitle} dek={copy.newsDek} />
        <AreaHint area="news" />
        <DailyNews />
      </View>
    </AppFrame>
  );
}
