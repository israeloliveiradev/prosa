import { useState, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/lib/session";
import { applyRemoteFreeze, isoDate, useProgress } from "@/lib/progress";
import { ImmersionHeroBanner } from "../components/immersion-hero-banner";
import { AdventureTrail } from "../components/adventure-trail";
import { GamifiedSidebarRail } from "../components/gamified-sidebar-rail";

export function HomeScreen() {
  const session = useSession();
  const progress = useProgress();
  const [topic, setTopic] = useState("");

  const today = isoDate();
  const continuing = progress.lessonDate === today && Boolean(progress.topic);
  const isTodayDone = progress.lessonDate === today && !continuing;

  const freezeRemote = session?.user?.streak_freeze_count;
  useEffect(() => {
    if (typeof freezeRemote === "number") {
      applyRemoteFreeze(freezeRemote);
    }
  }, [freezeRemote]);

  function handleStart() {
    if (!progress.pro && topic.trim() && !continuing) {
      router.push("/paywall");
      return;
    }
    const nextTopic =
      progress.pro && topic.trim() ? topic.trim() : continuing ? progress.topic : undefined;
    router.push(nextTopic ? { pathname: "/daily", params: { topic: nextTopic } } : "/daily");
  }

  return (
    <ScrollView
      testID="home-screen"
      style={{ backgroundColor: "#FDFBF7" }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 1380,
          marginHorizontal: "auto",
          paddingHorizontal: 24,
          paddingVertical: 24,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Banner Herói Superior: Sessão Diária de 20 Minutos */}
        <ImmersionHeroBanner
          remainingTimeText={isTodayDone ? "Prosa de hoje concluída! 🎉" : "14:20 restante hoje"}
          progressPercent={isTodayDone ? 100 : 68}
          onContinue={handleStart}
        />

        {/* Divisão Principal: Trilha Sinuosa (Esquerda) + Barra Gamificada (Direita) */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 32,
            alignItems: "flex-start",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          {/* Trilha de Aventura (Esquerda) */}
          <View style={{ flex: 1, minWidth: 380 }}>
            <AdventureTrail />
          </View>

          {/* Painel Lateral Gamificado: Mentor + Missões + Liga (Direita) */}
          <View style={{ width: 360, flexShrink: 0 }}>
            <GamifiedSidebarRail />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
