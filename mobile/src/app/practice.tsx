import { Redirect, router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AreaHint } from "@/components/guide/area-hint";
import { ActionRow } from "@/components/shell/action-row";
import { AppFrame } from "@/components/shell/app-frame";
import { PageMasthead } from "@/components/shell/page-masthead";
import { fetchDossier } from "@/lib/api";
import { tap } from "@/lib/haptics";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function PracticeScreen() {
  const session = useSession();
  const copy = useCopy();
  const [hint, setHint] = useState("");
  const token = session?.token;
  const targetLang = session?.user.target_lang;

  useEffect(() => {
    if (!token || !targetLang) {
      return;
    }
    let active = true;
    void fetchDossier(token, targetLang)
      .then((pack) => {
        if (active && pack.practice) {
          setHint(pack.practice);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token, targetLang]);

  if (!session) {
    return <Redirect href="/account" />;
  }

  function open(
    href: "/duel" | "/persona" | "/prose" | "/placement" | "/exam" | "/score" | "/pairs" | "/life" | "/dossier" | "/org",
  ) {
    void tap("medium");
    router.push(href as Href);
  }

  return (
    <AppFrame>
      <View className="gap-8">
        <PageMasthead kicker={copy.practiceKicker} title={copy.practiceTitle} dek={copy.practiceDek} />
        <AreaHint area="practice" />
        {hint ? (
          <Text className="text-base leading-7 text-ember">{`${copy.dossierPractice}: ${hint}`}</Text>
        ) : null}
        <ActionRow title={copy.placeTitle} detail={copy.placeTileDetail} onPress={() => open("/placement")} />
        <ActionRow title={copy.talk} detail={copy.talkDetail} onPress={() => open("/prose")} />
        <ActionRow title={copy.duel} detail={copy.duelDetail} onPress={() => open("/duel")} />
        <ActionRow title={copy.scene} detail={copy.sceneDetail} onPress={() => open("/persona")} />
        <ActionRow title={copy.examTitle} detail={copy.examDetail} onPress={() => open("/exam")} />
        <ActionRow title={copy.scoreTitle} detail={copy.scoreDetail} onPress={() => open("/score")} />
        <ActionRow title={copy.pairTitle} detail={copy.pairDetail} onPress={() => open("/pairs")} />
        <ActionRow title={copy.lifeTitle} detail={copy.lifeDetail} onPress={() => open("/life")} />
        <ActionRow title={copy.dossierTitle} detail={copy.dossierDetail} onPress={() => open("/dossier")} />
        <ActionRow title={copy.orgTitle} detail={copy.orgDetail} onPress={() => open("/org")} />
      </View>
    </AppFrame>
  );
}
