import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { DailyNews } from "@/components/home/daily-news";
import { fill, languageLabel } from "@/components/persona/talk-logic";
import { TactileButton } from "@/components/tactile/tactile-button";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useAreaCopy } from "@/lib/copy/area";
import { READING } from "@/lib/copy/reading";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";

/** Leitura: notícias reais no nível do aluno, ditado de ouvido e o atalho para "Seu texto". */
export default function NewsScreen() {
  const session = useSession();
  const locale = useLocale();
  const t = useAreaCopy(READING);

  if (!session) {
    return <Redirect href="/account" />;
  }

  const support = languageLabel(session.user.native_lang ?? "pt", LOCALE_BCP47[locale]);

  return (
    <View className="w-full gap-6 pb-16" style={{ maxWidth: 992, alignSelf: "center", paddingHorizontal: 16 }}>
      <View className="gap-2">
        <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.kicker}</Text>
        <Text accessibilityRole="header" className="font-display text-3xl font-extrabold tracking-tight text-[#111C2D]">
          {t.title}
        </Text>
        <Text className="text-base leading-6 text-[#3D4947]">
          {fill(t.dek, { level: session.user.level ?? "A2", support })}
        </Text>
      </View>

      <TactileCard className="p-5" animateEntry={false}>
        <View>
          <View className="flex-row flex-wrap items-center justify-between gap-4">
            <View className="flex-1 gap-1" style={{ minWidth: 220 }}>
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.ownTextKicker}</Text>
              <Text className="text-base leading-6 text-[#3D4947]">{t.ownTextBody}</Text>
            </View>
            <TactileButton label={t.ownTextOpen} variant="secondary" onPress={() => router.push("/life")} />
          </View>
        </View>
      </TactileCard>

      <DailyNews />
    </View>
  );
}
