import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { tap } from "@/lib/haptics";
import { Flag } from "@/components/shell/flag";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { languageName } from "@/lib/languages";

export function GamifiedSidebarRail() {
  const [quest1Claimed, setQuest1Claimed] = useState(false);
  const { targetLang, activeMentor, xp } = useProsa();
  const session = useSession();
  const currentLangName = languageName(targetLang);
  const mentorFirstName = activeMentor?.name ? activeMentor.name.split(" ")[0] : "Albert";
  const userLabel = session?.user?.display_name ? `Você (${session.user.display_name})` : "Você";

  return (
    <View className="flex-col gap-6 w-full">
      {/* 1. Card do Mentor Ativo (Albert Einstein) */}
      <View className="bg-card rounded-3xl p-5 border border-line shadow-[0_4px_0_#CBD5E1]">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🧠</Text>
            <Text className="font-bold text-sm text-ink">Mentor Ativo</Text>
          </View>
          <View className="px-2.5 py-1 rounded-full bg-[#FEF3C7] border border-[#FCD34D]">
            <Text className="font-extrabold text-[11px] text-[#B45309]">
              Nível 7 • Físico Brincalhão
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3.5 bg-raised p-3.5 rounded-2xl mb-4 border border-line">
          <View className="relative w-14 h-14 rounded-2xl bg-[#CCFBF1] overflow-hidden items-center justify-center border border-primary/20 shadow-sm">
            <Image
              source={require("../../../../../assets/cast/einstein.png")}
              style={{ width: 56, height: 56 }}
              resizeMode="cover"
            />
            <View className="absolute bottom-0 inset-x-0 bg-stone-900/80 rounded-b-xl py-0.5">
              <Text className="text-[8px] text-center text-white font-extrabold">98% AFINIDADE</Text>
            </View>
          </View>
          <View className="flex-1 flex-col">
            <Text className="font-bold text-sm text-ink">Albert Einstein</Text>
            <Text className="text-xs text-muted">Especialista em Causalidade</Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Text className="text-xs text-primary font-bold">⚡ Bônus: +15% Retenção FSRS</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void tap("light");
            router.push("/persona");
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-card border border-line shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none flex-row items-center justify-center gap-2"
        >
          <Text className="text-sm">💬</Text>
          <Text className="font-bold text-xs text-ink">Conversar em {currentLangName} com {mentorFirstName}</Text>
        </Pressable>
      </View>

      {/* 2. Missões de Hoje (Daily Quests) */}
      <View className="bg-card rounded-3xl p-5 border border-line shadow-[0_4px_0_#CBD5E1]">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🎯</Text>
            <Text className="font-bold text-sm text-ink">Missões de Hoje</Text>
          </View>
          <Text className="text-xs text-muted font-bold">Expira em 9h</Text>
        </View>

        <View className="flex-col gap-3.5">
          {/* Missão 1: Concluída & Coletável */}
          <View className="p-3.5 rounded-2xl bg-raised border border-line flex-col gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 flex-row items-start gap-2.5">
                <Text className="text-base text-success">✓</Text>
                <View className="flex-1">
                  <Text className="font-bold text-xs text-ink">Treino de Cadência Sonora</Text>
                  <Text className="text-[11px] text-muted">Pronuncie 5 orações complexas</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void tap("medium");
                  setQuest1Claimed(true);
                }}
                disabled={quest1Claimed}
                className={`px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-[0_3px_0_#0891B2] active:translate-y-0.5 active:shadow-[0_1px_0_#0891B2] ${
                  quest1Claimed ? "bg-raised border border-line shadow-none" : "bg-[#06B6D4]"
                }`}
              >
                <Text className="font-bold text-xs text-white">
                  {quest1Claimed ? "Coletado! 🎉" : "Coletar 25 💎"}
                </Text>
              </Pressable>
            </View>
            <View className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <View className="h-full bg-success w-full" />
            </View>
          </View>

          {/* Missão 2: Em Andamento */}
          <View className="p-3.5 rounded-2xl bg-raised border border-line flex-col gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 flex-row items-start gap-2.5">
                <Text className="text-base text-primary">🧠</Text>
                <View className="flex-1">
                  <Text className="font-bold text-xs text-ink">15 Flashcards FSRS</Text>
                  <Text className="text-[11px] text-muted">12 de 15 revisões corretas</Text>
                </View>
              </View>
              <Text className="font-extrabold text-xs text-muted">12/15</Text>
            </View>
            <View className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <View className="h-full bg-primary w-[80%]" />
            </View>
          </View>

          {/* Missão 3: Duelo Relâmpago */}
          <View className="p-3.5 rounded-2xl bg-raised border border-line flex-col gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 flex-row items-start gap-2.5">
                <Text className="text-base text-[#FF5722]">⚔️</Text>
                <View className="flex-1">
                  <Text className="font-bold text-xs text-ink">Vencer 1 Duelo 120s</Text>
                  <Text className="text-[11px] text-muted">Desafie outro estudante ao vivo</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/duel")}
                className="px-3 py-1.5 rounded-xl bg-[#FF5722] shadow-[0_3px_0_#C2410C] active:translate-y-0.5 active:shadow-[0_1px_0_#C2410C]"
              >
                <Text className="font-bold text-xs text-white">Desafiar</Text>
              </Pressable>
            </View>
            <View className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <View className="h-full bg-[#FF5722] w-0" />
            </View>
          </View>
        </View>
      </View>

      {/* 3. Liga Diamante (Leaderboard) */}
      <View className="bg-card rounded-3xl p-5 border border-line shadow-[0_4px_0_#CBD5E1]">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🏆</Text>
            <Text className="font-bold text-sm text-ink">Liga Diamante</Text>
          </View>
          <View className="px-2 py-0.5 rounded-full bg-[#ECFEFF] border border-[#A5F3FC]">
            <Text className="font-bold text-[10px] text-[#0E7490]">2d 14h restante</Text>
          </View>
        </View>

        <View className="bg-raised p-2.5 rounded-2xl mb-3 flex-row items-center gap-2 border border-line">
          <Text className="text-sm">⚡</Text>
          <Text className="text-xs text-ink">
            Zona de Promoção: <Text className="font-bold text-primary">Top 3 sobem para Lendária</Text>
          </Text>
        </View>

        <View className="flex-col divide-y divide-line">
          {/* Rank 1 */}
          <View className="py-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="font-extrabold text-xs text-accent w-4 text-center">1</Text>
              <View className="w-8 h-8 rounded-full bg-accentSoft items-center justify-center">
                <Text className="text-sm">👩‍🔬</Text>
              </View>
              <View className="flex-col">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-bold text-xs text-ink">Helena Meyer</Text>
                  <Flag code="de" size={16} />
                </View>
                <Text className="text-[10px] text-muted">3,890 XP</Text>
              </View>
            </View>
            <Text className="text-base">🥇</Text>
          </View>

          {/* Rank 2 */}
          <View className="py-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="font-extrabold text-xs text-muted w-4 text-center">2</Text>
              <View className="w-8 h-8 rounded-full bg-raised items-center justify-center">
                <Text className="text-sm">👨‍💻</Text>
              </View>
              <View className="flex-col">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-bold text-xs text-ink">Lucas Santos</Text>
                  <Flag code="br" size={16} />
                </View>
                <Text className="text-[10px] text-muted">3,420 XP</Text>
              </View>
            </View>
            <Text className="text-base">🥈</Text>
          </View>

          {/* Rank 3 */}
          <View className="py-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="font-extrabold text-xs text-accent w-4 text-center">3</Text>
              <View className="w-8 h-8 rounded-full bg-secondary-fixed items-center justify-center">
                <Text className="text-sm">👩‍🎨</Text>
              </View>
              <View className="flex-col">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-bold text-xs text-ink">Anouk Dubois</Text>
                  <Flag code="fr" size={16} />
                </View>
                <Text className="text-[10px] text-muted">3,110 XP</Text>
              </View>
            </View>
            <Text className="text-base">🥉</Text>
          </View>

          {/* Rank 4 - Aluno Atual em Destaque */}
          <View className="py-2.5 px-2 bg-primarySoft rounded-xl flex-row items-center justify-between my-1">
            <View className="flex-row items-center gap-3">
              <Text className="font-extrabold text-xs text-primary w-4 text-center">4</Text>
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                <Text className="text-sm text-white font-bold">{session?.user?.display_name?.[0]?.toUpperCase() ?? "V"}</Text>
              </View>
              <View className="flex-col">
                <View className="flex-row items-center gap-1.5">
                  <Text className="font-bold text-xs text-primary">{userLabel}</Text>
                  <Flag code={session?.user?.native_lang ?? "br"} size={16} />
                </View>
                <Text className="text-[10px] text-primary">{xp > 0 ? `${xp.toLocaleString()} XP` : "2.450 XP"} • Faltam 660 XP p/ Top 3</Text>
              </View>
            </View>
            <Text className="text-sm font-bold text-primary">▲</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

