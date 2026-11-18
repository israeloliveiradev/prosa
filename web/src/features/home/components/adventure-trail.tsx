import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { tap } from "@/lib/haptics";

export function AdventureTrail() {
  const [activeModalNode, setActiveModalNode] = useState<number | null>(null);
  const [chestClaimed, setChestClaimed] = useState(false);

  return (
    <View className="w-full flex-col items-center">
      {/* Cabeçalho do Módulo */}
      <View className="w-full bg-card rounded-3xl p-6 border border-line shadow-[0_4px_0_#CBD5E1] mb-8 relative">
        <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
          <View>
            <View className="flex-row items-center gap-2 mb-1">
              <View className="px-2.5 py-0.5 rounded-full bg-primary/10">
                <Text className="text-primary font-bold text-xs uppercase tracking-wider">
                  Módulo 03
                </Text>
              </View>
              <Text className="text-muted text-xs">· Trilha da Sabedoria</Text>
            </View>
            <Text className="font-extrabold text-2xl text-ink tracking-tight">
              Mente Quântica & Filosofia Natural
            </Text>
            <Text className="font-reading text-sm text-muted italic mt-1">
              “Gott würfelt nicht mit dem Universum.” — Deus não joga dados com o universo.
            </Text>
          </View>

          <View className="flex-row items-center gap-2 self-start sm:self-auto">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guia Gramatical"
              onPress={() => router.push("/guide")}
              className="p-3 rounded-2xl bg-raised border border-line shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none"
            >
              <Text className="text-base">📖</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Áudio da Trilha"
              onPress={() => router.push("/news")}
              className="p-3 rounded-2xl bg-raised border border-line shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none"
            >
              <Text className="text-base">🔊</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* O Canvas da Trilha com Nós em Curva S */}
      <View className="relative w-full max-w-lg flex-col items-center py-6 px-4">
        {/* Camada de Trilha Sinuosa (Linha pontilhada conectora) */}
        <View className="absolute inset-0 w-full h-full pointer-events-none items-center">
          <Svg width="360" height="840" viewBox="0 0 360 840" fill="none">
            <Path
              d="M 180,60 C 250,130 280,190 250,260 C 210,340 100,340 90,430 C 80,520 260,540 250,650 C 240,730 140,760 180,820"
              stroke="#E2E8F0"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="4 8"
            />
            <Path
              d="M 180,60 C 250,130 280,190 250,260 C 210,340 100,340 90,430 C 80,520 260,540 250,650 C 240,730 140,760 180,820"
              stroke="#0D9488"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="12 14"
            />
          </Svg>
        </View>

        {/* NÓ 1: Lição Concluída (3 Estrelas & Coroa de Ouro) */}
        <View className="relative z-10 flex-col items-center mb-16">
          <View className="flex-row items-center gap-1 mb-1.5">
            <Text className="text-xs">⭐</Text>
            <Text className="text-sm">⭐</Text>
            <Text className="text-xs">⭐</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("light");
              router.push("/daily");
            }}
            className="relative w-20 h-20 rounded-full bg-accent items-center justify-center shadow-[0_6px_0_#D97706] active:translate-y-1 active:shadow-[0_2px_0_#D97706]"
          >
            <Text className="text-3xl text-white font-bold">✓</Text>
            <View className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-[#FCD34D] items-center justify-center shadow-md">
              <Text className="text-xs">👑</Text>
            </View>
          </Pressable>
          <View className="mt-2.5 px-3.5 py-1 bg-card rounded-full border border-line shadow-[0_2px_0_#CBD5E1]">
            <Text className="font-bold text-xs text-ink">1. Causalidade & Grund</Text>
          </View>
        </View>

        {/* NÓ 2: Lição Concluída (3 Estrelas Esmeralda) */}
        <View className="relative z-10 flex-col items-center mb-16 translate-x-14 sm:translate-x-20">
          <View className="flex-row items-center gap-1 mb-1">
            <Text className="text-xs">⭐</Text>
            <Text className="text-xs">⭐</Text>
            <Text className="text-xs">⭐</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("light");
              router.push("/daily");
            }}
            className="relative w-20 h-20 rounded-full bg-success items-center justify-center shadow-[0_6px_0_#059669] active:translate-y-1 active:shadow-[0_2px_0_#059669]"
          >
            <Text className="text-3xl text-white font-bold">✓</Text>
          </Pressable>
          <View className="mt-2.5 px-3.5 py-1 bg-card rounded-full border border-line shadow-[0_2px_0_#CBD5E1]">
            <Text className="font-bold text-xs text-ink">2. Relatividade Léxica</Text>
          </View>
        </View>

        {/* NÓ 3: NÓ ATIVO ATUAL (Einstein + Balão de Fala + Botão Pulsante START!) */}
        <View className="relative z-20 flex-col items-center mb-16 -translate-x-12 sm:-translate-x-16">
          {/* Balão de Fala do Einstein */}
          <View className="mb-4 bg-card p-3 rounded-2xl border-2 border-primary/40 shadow-[0_6px_0_#CBD5E1] flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-primarySoft items-center justify-center border border-primary/20">
              <Text className="text-xl">🧠</Text>
            </View>
            <View className="flex-col text-left">
              <Text className="text-[10px] text-primary uppercase font-bold tracking-wider">
                Próximo Passo
              </Text>
              <Text className="font-bold text-xs text-ink">
                Lição 7: Conectores (Denn vs Weil)
              </Text>
            </View>
          </View>

          {/* Botão Gigante START! */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("medium");
              router.push("/daily");
            }}
            className="relative w-24 h-24 rounded-full bg-primary text-white items-center justify-center shadow-[0_8px_0_#0F766E] active:translate-y-2 active:shadow-[0_2px_0_#0F766E]"
          >
            <Text className="text-4xl text-white">▶</Text>
            <View className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-[#FF5722] shadow-md">
              <Text className="text-white text-[11px] font-extrabold tracking-wider">START!</Text>
            </View>
          </Pressable>

          <View className="mt-4 px-4 py-1.5 bg-primary rounded-full shadow-[0_3px_0_#0F766E]">
            <Text className="font-bold text-xs text-white">
              Lição 7 • Partículas & Conexões
            </Text>
          </View>
        </View>

        {/* NÓ 4: Lição Bloqueada (Estilo Concreto Tátil) */}
        <View className="relative z-10 flex-col items-center mb-16 translate-x-12 sm:translate-x-16 opacity-75">
          <View className="w-20 h-20 rounded-full bg-raised border border-line items-center justify-center shadow-[0_5px_0_#CBD5E1]">
            <Text className="text-2xl">🔒</Text>
          </View>
          <View className="mt-2.5 px-3 py-1 bg-card rounded-full border border-line shadow-[0_2px_0_#CBD5E1]">
            <Text className="text-[11px] font-bold text-muted">Requer 400 XP</Text>
          </View>
        </View>

        {/* NÓ 5: Baú Misterioso de Expressões Idiomáticas */}
        <View className="relative z-10 flex-col items-center mb-16 -translate-x-8 sm:-translate-x-12">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("light");
              setChestClaimed(true);
            }}
            className={`relative w-20 h-20 rounded-2xl items-center justify-center shadow-[0_6px_0_#D97706] active:translate-y-1 active:shadow-[0_2px_0_#D97706] ${
              chestClaimed ? "bg-[#FEF3C7]" : "bg-accent"
            }`}
          >
            <Text className="text-3xl">{chestClaimed ? "✨" : "📦"}</Text>
            <View className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#06B6D4] items-center justify-center shadow-sm">
              <Text className="text-[10px] text-white font-bold">💎</Text>
            </View>
          </Pressable>
          <View className="mt-2.5 px-3 py-1 bg-card rounded-full border border-line shadow-[0_2px_0_#CBD5E1]">
            <Text className="font-bold text-xs text-ink">
              {chestClaimed ? "+25 Gemas Coletadas! 🎉" : "Baú de Expressões"}
            </Text>
          </View>
        </View>

        {/* NÓ 6: Grande Desafio Final (Duelo de Síntese: Leonardo da Vinci) */}
        <View className="relative z-10 flex-col items-center mb-8">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("medium");
              router.push("/duel");
            }}
            className="px-6 py-4 rounded-2xl bg-[#18181B] border-2 border-[#3F3F46] flex-row items-center gap-4 shadow-[0_8px_0_#09090B] active:translate-y-2 active:shadow-[0_2px_0_#09090B]"
          >
            <View className="w-12 h-12 rounded-xl bg-[#FF5722] items-center justify-center shadow-inner">
              <Text className="text-2xl">⚔️</Text>
            </View>
            <View className="flex-col text-left">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[10px] text-[#FB7185] font-extrabold tracking-widest uppercase">
                  Grande Desafio Final
                </Text>
                <Text className="text-xs">👑</Text>
              </View>
              <Text className="font-bold text-base text-white">
                Duelo de Síntese: Leonardo da Vinci
              </Text>
              <Text className="text-xs text-[#94A3B8]">
                Defenda seu raciocínio em Alemão • 120s
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

