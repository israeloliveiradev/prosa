import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { tap } from "@/lib/haptics";

export interface ImmersionHeroBannerProps {
  remainingTimeText?: string;
  progressPercent?: number;
  onContinue?: () => void;
}

export function ImmersionHeroBanner({
  remainingTimeText = "14:20 restante hoje",
  progressPercent = 68,
  onContinue,
}: ImmersionHeroBannerProps) {
  const handlePress = () => {
    void tap("medium");
    if (onContinue) {
      onContinue();
    } else {
      router.push("/daily");
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        borderWidth: 2,
        borderColor: "#E2E8F0",
        boxShadow: "0 4px 0 #CBD5E1",
        position: "relative",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Luz difusa decorativa */}
      <View className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#00685F]/10 pointer-events-none" />
      <View className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#F59E0B]/10 pointer-events-none" />

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
          position: "relative",
          zIndex: 10,
        }}
      >
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 18 }}>
          {/* Ícone 3D de Cronômetro */}
          <View style={{ position: "relative", flexShrink: 0 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 20,
                backgroundColor: "#00685F",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 5px 0 #0F766E",
              }}
            >
              <Text style={{ fontSize: 36, color: "#FFFFFF" }}>⏱️</Text>
            </View>
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 9999,
                backgroundColor: "#FF5722",
                boxShadow: "0 2px 0 #C2410C",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 10, textTransform: "uppercase" }}>
                Ao Vivo
              </Text>
            </View>
          </View>

          {/* Textos de Status */}
          <View style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 9999,
                  backgroundColor: "#F5F0E8",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Text style={{ color: "#111C2D", fontWeight: "800", fontSize: 11, textTransform: "uppercase" }}>
                  Ritual Diário · Módulo 3
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 9999,
                  backgroundColor: "#FEF3C7",
                  borderWidth: 1,
                  borderColor: "#FCD34D",
                }}
              >
                <Text style={{ color: "#B45309", fontWeight: "900", fontSize: 11 }}>
                  ⚡ +120 XP
                </Text>
              </View>
            </View>
            <Text style={{ fontWeight: "900", fontSize: 24, color: "#111C2D", letterSpacing: -0.5 }}>
              Sessão de Imersão: 20 Minutos
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B" }}>
              <Text style={{ fontWeight: "800", color: "#111C2D" }}>{remainingTimeText}</Text> • 8 de 12 micro-desafios concluídos.
            </Text>
          </View>
        </View>

        {/* Ações Táteis 3D */}
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: "#F5F0E8",
              borderWidth: 1,
              borderColor: "#CBD5E1",
            }}
          >
            <Text style={{ fontSize: 14 }}>🧠</Text>
            <Text style={{ fontWeight: "700", fontSize: 12, color: "#64748B" }}>Modo Foco Ativado</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handlePress}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 18,
              backgroundColor: "#00685F",
              boxShadow: "0 5px 0 #0F766E",
              cursor: "pointer",
            }}
          >
            <Text style={{ fontWeight: "900", fontSize: 15, color: "#FFFFFF" }}>Continuar Sessão 🚀</Text>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "monospace", color: "#FFFFFF" }}>Espaço</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Barra de Progresso do Ritual */}
      <View
        style={{
          marginTop: 20,
          padding: 14,
          backgroundColor: "#F5F0E8",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontWeight: "800", fontSize: 12, color: "#111C2D" }}>Progresso do Ritual ({progressPercent}%)</Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Meta: Nível Causalidade B2</Text>
        </View>
        <View style={{ width: "100%", height: 10, borderRadius: 9999, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
          <View
            style={{
              height: "100%",
              backgroundColor: "#00685F",
              borderRadius: 9999,
              width: `${progressPercent}%`,
            }}
          />
        </View>
      </View>
    </View>
  );
}

