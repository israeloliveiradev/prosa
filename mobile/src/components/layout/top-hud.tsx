import { Pressable, Text, View, Image } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/lib/session";
import { useProgress } from "@/lib/progress";
import { useXp } from "@/lib/xp";
import { languageName } from "@/lib/languages";
import { ProsaMarkIcon } from "@/components/shell/logo";
import { Flag } from "@/components/shell/flag";
import { tap } from "@/lib/haptics";
import { useProsa } from "@/context/prosa-context";



export function TopHud() {
  const session = useSession();
  const progress = useProgress();
  const { total } = useXp();
  const prosa = useProsa();

  const targetLang = session?.user?.target_lang || prosa.targetLang || "en";
  const targetName = languageName(targetLang);
  const userName = session?.user?.display_name ?? "Você";

  return (
    <View
      style={{
        height: 64,
        width: "100%",
        paddingHorizontal: 24,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderBottomWidth: 2,
        borderBottomColor: "#E2E8F0",
        boxShadow: "0 2px 0 #F5F0E8",
        zIndex: 40,
      }}
    >
      {/* Esquerda: Logo Mobile + Seletor de Curso Ativo */}
      <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          className="lg:hidden flex-row items-center mr-1"
          style={{ width: 34, height: 34, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 0 #09090B" } as any}
        >
          <Image
            source={require("../../../assets/brand/prosa-logo.png")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void tap("light");
            router.push("/profile");
          }}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9999,
            backgroundColor: "#F5F0E8",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            boxShadow: "0 2px 0 #CBD5E1",
            cursor: "pointer",
          }}
        >
          <Flag code={targetLang} size={18} />
          <Text style={{ fontWeight: "800", fontSize: 12, color: "#111C2D" }}>{targetName}</Text>
          <Text style={{ fontSize: 11, color: "#64748B" }}>via PT</Text>
          <Flag code="br" size={18} />
          <Text style={{ fontSize: 11, color: "#64748B" }}>▾</Text>
        </Pressable>
      </View>

      {/* Direita: Gamificação HUD (Ofensiva, XP, Gemas, Duelo e Perfil) */}
      <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
        {/* Streak Fogo */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9999,
            backgroundColor: "rgba(255, 87, 34, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(255, 87, 34, 0.25)",
            boxShadow: "0 2px 0 rgba(255, 87, 34, 0.15)",
          }}
        >
          <Text style={{ fontSize: 14 }}>🔥</Text>
          <Text style={{ fontWeight: "800", fontSize: 12, color: "#FF5722" }}>
            {progress.streakCount || 14} Dias
          </Text>
        </View>

        {/* XP Acumulado */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9999,
            backgroundColor: "#FEF3C7",
            borderWidth: 1,
            borderColor: "#FCD34D",
            boxShadow: "0 2px 0 rgba(217, 119, 6, 0.15)",
          }}
        >
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <Text style={{ fontWeight: "800", fontSize: 12, color: "#B45309" }}>
            {total || "2.450"} XP
          </Text>
        </View>

        {/* Gemas de Foco */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9999,
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(6, 182, 212, 0.25)",
            boxShadow: "0 2px 0 rgba(6, 182, 212, 0.15)",
          }}
        >
          <Text style={{ fontSize: 14 }}>💎</Text>
          <Text style={{ fontWeight: "800", fontSize: 12, color: "#06B6D4" }}>680</Text>
        </View>

        {/* Botão de Duelo 120s */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void tap("light");
            router.push("/duel");
          }}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 9999,
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(139, 92, 246, 0.25)",
            boxShadow: "0 2px 0 rgba(139, 92, 246, 0.2)",
            cursor: "pointer",
          }}
        >
          <Text style={{ fontSize: 13 }}>⚔️</Text>
          <Text style={{ fontWeight: "800", fontSize: 12, color: "#8B5CF6" }}>Duelo</Text>
        </Pressable>

        {/* Avatar do Usuário */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/profile")}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingLeft: 4,
            borderLeftWidth: 1,
            borderLeftColor: "#E2E8F0",
            cursor: "pointer",
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "#00685F",
              backgroundColor: "#00685F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>
              {userName[0]?.toUpperCase() ?? "V"}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#111C2D" }}>
            {userName}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

