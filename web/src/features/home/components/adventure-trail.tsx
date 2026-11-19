import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { tap } from "@/lib/haptics";
import { useProsa } from "@/context/prosa-context";
import { LanguageMatrixEngine } from "@/services/contentService";
import { useTranslation } from "@/i18n/use-translation";

export function AdventureTrail() {
  const { targetLang, supportLang, activeCourse, activeMentor } = useProsa();
  const { t } = useTranslation();
  const [chestClaimed, setChestClaimed] = useState(false);

  const modules = LanguageMatrixEngine.getTrailModules(targetLang);
  const completedNodeIds = activeCourse.completedNodeIds || [];

  // Determine active node (first incomplete node)
  const activeNodeIndex = modules.findIndex((m) => !completedNodeIds.includes(m.id));
  const currentActiveIndex = activeNodeIndex >= 0 ? activeNodeIndex : modules.length - 1;
  const currentActiveModule = modules[currentActiveIndex] || modules[0];

  const headerTitle = LanguageMatrixEngine.getLocalizedText(currentActiveModule.title, supportLang);
  const headerSubtitle = LanguageMatrixEngine.getLocalizedText(currentActiveModule.subtitle, supportLang);

  return (
    <View className="w-full flex-col items-center">
      {/* 1. Dynamic Module Header */}
      <View className="w-full bg-card rounded-3xl p-6 border border-line shadow-[0_4px_0_#CBD5E1] mb-8 relative">
        <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
          <View className="max-w-xl">
            <View className="flex-row items-center gap-2 mb-1.5">
              <View className="px-2.5 py-0.5 rounded-full bg-primary/10">
                <Text className="text-primary font-bold text-xs uppercase tracking-wider">
                  Módulo 0{currentActiveIndex + 1}
                </Text>
              </View>
              <Text className="text-muted text-xs">
                · {activeMentor.name} • {activeMentor.title}
              </Text>
            </View>
            <Text className="font-extrabold text-2xl text-ink tracking-tight font-serif">
              {headerTitle}
            </Text>
            <Text className="font-reading text-sm text-muted mt-1 leading-relaxed">
              {headerSubtitle}
            </Text>
            <Text className="text-xs text-primary font-semibold italic mt-2">
              {currentActiveModule.quote}
            </Text>
          </View>

          <View className="flex-row items-center gap-2 self-start sm:self-auto">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guia Gramatical"
              onPress={() => {
                void tap("light");
                router.push("/practice");
              }}
              className="p-3 rounded-2xl bg-raised border border-line shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <Text className="text-base">📖</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Áudio da Trilha"
              onPress={() => {
                void tap("light");
                router.push("/commute");
              }}
              className="p-3 rounded-2xl bg-raised border border-line shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              <Text className="text-base">🔊</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2. S-Curve Adventure Trail Canvas */}
      <View className="relative w-full max-w-lg flex-col items-center py-6 px-4">
        {/* Background S-Curve Path */}
        <View className="absolute inset-0 w-full h-full pointer-events-none items-center">
          <Svg width="360" height="880" viewBox="0 0 360 880" fill="none">
            <Path
              d="M 180,60 C 250,130 280,190 250,260 C 210,340 100,340 90,430 C 80,520 260,540 250,650 C 240,730 140,760 180,840"
              stroke="#E2E8F0"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="4 8"
            />
            <Path
              d="M 180,60 C 250,130 280,190 250,260 C 210,340 100,340 90,430 C 80,520 260,540 250,650 C 240,730 140,760 180,840"
              stroke="#0D9488"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="12 14"
            />
          </Svg>
        </View>

        {/* Dynamic Nodes Mapping */}
        {modules.map((mod, idx) => {
          const isCompleted = completedNodeIds.includes(mod.id);
          const isActive = idx === currentActiveIndex;
          const isLocked = !isCompleted && !isActive;

          // Alternate horizontal offsets in S-Curve
          const offsetClass =
            idx === 0
              ? ""
              : idx % 2 === 1
              ? "translate-x-12 sm:translate-x-16"
              : "-translate-x-12 sm:-translate-x-16";

          const modTitle = LanguageMatrixEngine.getLocalizedText(mod.title, supportLang);

          return (
            <View key={mod.id} className={`relative z-10 flex-col items-center mb-16 ${offsetClass}`}>
              {/* Stars row (only if completed) */}
              {isCompleted ? (
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Text className="text-xs">⭐</Text>
                  <Text className="text-sm">⭐</Text>
                  <Text className="text-xs">⭐</Text>
                </View>
              ) : (
                <View className="h-5" />
              )}

              {/* Node Button */}
              {isCompleted ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void tap("light");
                    router.push("/daily");
                  }}
                  className="relative w-20 h-20 rounded-full bg-success items-center justify-center shadow-[0_6px_0_#059669] active:translate-y-1 active:shadow-[0_2px_0_#059669] cursor-pointer"
                >
                  <Text className="text-3xl text-white font-bold">✓</Text>
                  <View className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-[#FCD34D] items-center justify-center shadow-md">
                    <Text className="text-xs">{mod.icon}</Text>
                  </View>
                </Pressable>
              ) : isActive ? (
                <View className="flex-col items-center">
                  {/* Speech bubble */}
                  <View className="mb-3 bg-card p-3 rounded-2xl border-2 border-primary/40 shadow-[0_6px_0_#CBD5E1] flex-row items-center gap-2.5">
                    <Text className="text-xl">{mod.icon}</Text>
                    <View className="flex-col text-left">
                      <Text className="text-[10px] text-primary uppercase font-bold tracking-wider">
                        Próximo Passo
                      </Text>
                      <Text className="font-bold text-xs text-ink truncate max-w-[180px]">
                        {modTitle}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void tap("medium");
                      router.push("/daily");
                    }}
                    className="relative w-24 h-24 rounded-full bg-primary text-white items-center justify-center shadow-[0_8px_0_#0F766E] active:translate-y-2 active:shadow-[0_2px_0_#0F766E] cursor-pointer"
                  >
                    <Text className="text-4xl text-white">▶</Text>
                    <View className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-[#FF5722] shadow-md">
                      <Text className="text-white text-[11px] font-extrabold tracking-wider">START!</Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                <View className="w-20 h-20 rounded-full bg-raised border border-line items-center justify-center shadow-[0_5px_0_#CBD5E1] opacity-75">
                  <Text className="text-2xl">🔒</Text>
                </View>
              )}

              {/* Node Label Capsule */}
              <View className="mt-3 px-3.5 py-1 bg-card rounded-full border border-line shadow-[0_2px_0_#CBD5E1] max-w-[220px]">
                <Text className="font-bold text-xs text-ink truncate text-center">
                  {modTitle}
                </Text>
              </View>
            </View>
          );
        })}

        {/* 3. Mysterious Idiom Chest */}
        <View className="relative z-10 flex-col items-center mb-16 -translate-x-6">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("light");
              setChestClaimed(true);
            }}
            className={`relative w-20 h-20 rounded-2xl items-center justify-center shadow-[0_6px_0_#D97706] active:translate-y-1 active:shadow-[0_2px_0_#D97706] cursor-pointer ${
              chestClaimed ? "bg-[#FEF3C7]" : "bg-accent"
            }`}
          >
            <Text className="text-3xl">{chestClaimed ? "✨" : "📦"}</Text>
            <View className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#06B6D4] items-center justify-center shadow-sm">
              <Text className="text-[10px] text-white font-bold">💎</Text>
            </View>
          </Pressable>
          <View className="mt-2.5 px-3.5 py-1 bg-card rounded-full border border-line shadow-[0_2px_0_#CBD5E1]">
            <Text className="font-bold text-xs text-ink">
              {chestClaimed ? "+25 Gemas Coletadas! 🎉" : "Baú de Expressões"}
            </Text>
          </View>
        </View>

        {/* 4. Grand Final Challenge Node */}
        <View className="relative z-10 flex-col items-center mb-8">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void tap("medium");
              router.push("/duel");
            }}
            className="px-6 py-4 rounded-2xl bg-[#18181B] border-2 border-[#3F3F46] flex-row items-center gap-4 shadow-[0_8px_0_#09090B] active:translate-y-2 active:shadow-[0_2px_0_#09090B] cursor-pointer"
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
                Duelo de Síntese: {activeMentor.name}
              </Text>
              <Text className="text-xs text-[#94A3B8]">
                Defenda seu raciocínio com fluidez • 120s
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
