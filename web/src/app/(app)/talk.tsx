import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { PersonaScreen } from "@/components/persona/persona-screen";
import { fill, languageLabel, talkTabFromParam, type TalkTab } from "@/components/persona/talk-logic";
import { ProseScreen } from "@/components/session/prose-screen";
import { useAreaCopy } from "@/lib/copy/area";
import { TALK } from "@/lib/copy/talk";
import { tap } from "@/lib/haptics";
import { LOCALE_BCP47, useLocale } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { AudioService } from "@/services/audio/AudioService";

/**
 * Conversa: Mentor com memória (/prose/turn) e Cenas (/persona/turn).
 * As duas abas ficam montadas depois da primeira visita, para não perder a conversa ao trocar de aba.
 */
export default function TalkScreen() {
  const session = useSession();
  const locale = useLocale();
  const t = useAreaCopy(TALK);
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = talkTabFromParam(params.tab);
  const [visited, setVisited] = useState<Record<TalkTab, boolean>>({ mentor: tab === "mentor", scenes: tab === "scenes" });

  if (!session) {
    return <Redirect href="/account" />;
  }

  const lang = languageLabel(session.user.target_lang ?? "en", LOCALE_BCP47[locale]);
  const tabs: Array<{ id: TalkTab; label: string }> = [
    { id: "mentor", label: t.tabMentor },
    { id: "scenes", label: t.tabScenes },
  ];
  const mounted = { ...visited, [tab]: true };

  function choose(next: TalkTab) {
    if (next === tab) {
      return;
    }
    AudioService.stopAndUnload();
    setVisited((current) => ({ ...current, [next]: true }));
    router.setParams({ tab: next });
    void tap("light");
  }

  return (
    <View className="w-full gap-6 pb-16" style={{ maxWidth: 852, alignSelf: "center", paddingHorizontal: 16 }}>
      <View className="gap-2">
        <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">{t.kicker}</Text>
        <Text accessibilityRole="header" className="font-display text-3xl font-extrabold tracking-tight text-[#111C2D]">
          {t.title}
        </Text>
        <Text className="text-base leading-6 text-[#3D4947]">{fill(t.dek, { lang })}</Text>
      </View>

      <View
        accessibilityRole="tablist"
        accessibilityLabel={t.tabsA11y}
        className="flex-row gap-2 self-start rounded-2xl border border-[#E2E8F0] bg-[#F5F0E8] p-1.5"
      >
        {tabs.map((item) => {
          const selected = item.id === tab;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => choose(item.id)}
              className={`min-h-11 min-w-28 cursor-pointer items-center justify-center rounded-xl px-5 ${
                selected ? "border bg-[#0D9488]" : "bg-transparent"
              }`}
              style={selected ? ({ borderColor: "#0F766E", boxShadow: "0 3px 0 #0F766E" } as ViewStyle) : undefined}
            >
              <Text className={`text-base font-extrabold ${selected ? "text-white" : "text-[#3D4947]"}`}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {mounted.mentor ? (
        <View style={{ display: tab === "mentor" ? "flex" : "none" }}>
          <ProseScreen />
        </View>
      ) : null}
      {mounted.scenes ? (
        <View style={{ display: tab === "scenes" ? "flex" : "none" }}>
          <PersonaScreen />
        </View>
      ) : null}
    </View>
  );
}
