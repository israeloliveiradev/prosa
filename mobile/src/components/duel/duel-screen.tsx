import { useEffect, useRef, useState, useMemo } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { router } from "expo-router";
import { tap } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { useProsa } from "@/context/prosa-context";
import { LanguageMatrixEngine, type DuelQuestion } from "@/services/contentService";
import { speechService } from "@/services/speechService";
import { languageName } from "@/lib/languages";

const GABRIEL_DUEL_AVATAR = "/cast/bento.png";
const ELENA_DUEL_AVATAR = "/cast/clara.png";
const FEYNMAN_CHEER_AVATAR = "/cast/feynman.png";

export function DuelScreen() {
  const session = useSession();
  const {
    targetLang,
    supportLang,
    activeMentor,
    addXp,
    addGems,
  } = useProsa();

  const playerName = session?.user?.display_name ?? "Você";
  const [timeLeft, setTimeLeft] = useState(120);
  const [playerScore, setPlayerScore] = useState(1420);
  const [opponentScore, setOpponentScore] = useState(1280);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [freezeActive, setFreezeActive] = useState(false);
  const [comboCount, setComboCount] = useState(3);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [matchOver, setMatchOver] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  const questions = useMemo(() => {
    const raw = LanguageMatrixEngine.getDuelQuestions(targetLang);
    return raw && raw.length > 0 ? raw : LanguageMatrixEngine.getDuelQuestions("en");
  }, [targetLang]);

  const currentQ = questions[questionIdx % questions.length];

  const speechLang = LanguageMatrixEngine.getBCP47(targetLang);
  const isFeynmanActive = activeMentor?.id === "feynman";

  useEffect(() => {
    if (freezeActive || matchOver) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setMatchOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [freezeActive, matchOver]);

  useEffect(() => {
    if (matchOver && !xpAwarded) {
      setXpAwarded(true);
      addXp(250);
      addGems(50);
    }
  }, [matchOver, xpAwarded, addXp, addGems]);

  const handleChoice = (optKey: string, isCorrect: boolean) => {
    void tap(isCorrect ? "success" : "heavy");
    setSelectedOption(optKey);

    if (isCorrect) {
      const bonusMultiplier = isFeynmanActive ? 1.25 : 1.0;
      const points = Math.round((180 + comboCount * 20) * bonusMultiplier);
      setPlayerScore((prev) => prev + points);
      setComboCount((c) => c + 1);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);

      setTimeout(() => {
        setSelectedOption(null);
        setQuestionIdx((q) => q + 1);
      }, 700);
    } else {
      setComboCount(0);
      setTimeout(() => {
        setSelectedOption(null);
      }, 700);
    }
  };

  const handleUseFreeze = () => {
    void tap("medium");
    setFreezeActive(true);
    setTimeout(() => setFreezeActive(false), 5000);
  };

  const handlePlayPromptAudio = () => {
    void tap("light");
    speechService.speak(currentQ.word, {
      lang: speechLang,
      mentorId: activeMentor?.id || "feynman",
      speed: "1.0x",
    });
  };

  const circumference = 2 * Math.PI * 42; // ~263.89
  const strokeDashoffset = circumference - (circumference * timeLeft) / 120;

  return (
    <ScrollView className="flex-1 bg-[#FDFBF7]" contentContainerStyle={{ paddingBottom: 60 }}>
      <View className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 flex-col gap-6">
        {/* Top Arena Status Banner */}
        <View className="w-full rounded-2xl bg-white p-4 shadow-[0_6px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col md:flex-row items-center justify-between gap-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#8B5CF6]/15 shadow-[0_3px_0_rgba(139,92,246,0.25)]">
              <Text className="text-2xl">⚔️</Text>
            </View>
            <View className="flex-col">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-base font-extrabold text-[#111C2D]">
                  Duelo Relâmpago 120s
                </Text>
                <View className="px-2.5 py-0.5 rounded-full bg-[#06B6D4]/15">
                  <Text className="text-[11px] font-black uppercase tracking-wider text-[#06B6D4]">
                    Liga Diamante • Humboldt
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-[#64748B]">
                Rodada 6 de 15 • Alemão 🇩🇪 via Português 🇧🇷
              </Text>
            </View>
          </View>

          {/* Match Stakes Pills */}
          <View className="flex-row items-center gap-2 flex-wrap justify-end">
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97706]/10 border border-[#D97706]/20 shadow-[0_2px_0_rgba(217,119,6,0.2)]">
              <Text className="text-sm">⚡</Text>
              <Text className="text-xs font-black text-[#D97706]">+250 XP em jogo</Text>
            </View>

            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/20 shadow-[0_2px_0_rgba(6,182,212,0.2)]">
              <Text className="text-sm">💎</Text>
              <Text className="text-xs font-black text-[#06B6D4]">50 Gemas</Text>
            </View>

            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 shadow-[0_2px_0_rgba(16,185,129,0.2)]">
              <Text className="text-sm">🎖️</Text>
              <Text className="text-xs font-bold text-[#059669]">Bônus Feynman (+20%)</Text>
            </View>
          </View>
        </View>

        {/* Live Tug-of-War Combat HUD */}
        <View className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-[0_8px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col md:flex-row items-center justify-between gap-6">
          {/* Player (Left Player) */}
          <View className="flex-row items-center gap-3 w-full md:w-auto">
            <View className="relative shrink-0">
              <View className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#00685F] shadow-[0_4px_0_#0F766E] bg-[#00685F] items-center justify-center">
                <Text className="text-white font-black text-xl">{playerName[0]?.toUpperCase() ?? "V"}</Text>
              </View>
              <View className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-[#00685F] shadow-[0_2px_0_#0F766E]">
                <Text className="text-[9px] font-black text-white">PRO</Text>
              </View>
            </View>
            <View className="flex-col">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-extrabold text-[#111C2D]">{playerName}</Text>
                <Text className="text-xs">🇧🇷</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-xl font-black text-[#00685F]">{playerScore}</Text>
                <Text className="text-[11px] font-bold text-[#64748B]">PTS</Text>
                <View className="px-2 py-0.5 rounded-full bg-[#FF5722]/15">
                  <Text className="text-[10px] font-black text-[#FF5722]">🔥 6x Combo</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Momentum Indicator Tug-of-War Center */}
          <View className="flex-1 max-w-md w-full flex-col items-center gap-1.5">
            <View className="w-full flex-row items-center justify-between px-1">
              <Text className="text-xs font-black text-[#00685F]">54% {playerName.split(" ")[0]}</Text>
              <Text className="text-xs font-black text-[#B10E6B]">Elena 46%</Text>
            </View>

            <View className="w-full h-5 rounded-full bg-[#F5F0E8] p-1 border border-[#CBD5E1] relative flex-row items-center">
              <View
                className="h-full rounded-l-full bg-gradient-to-r from-[#00685F] to-[#6BD8CB]"
                style={{ width: "54%" }}
              />
              <View
                className="h-full rounded-r-full bg-gradient-to-r from-[#FB7185] to-[#B10E6B]"
                style={{ width: "46%" }}
              />
              {/* Dynamic Clash Spark Indicator */}
              <View
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full bg-[#FEA619] shadow-[0_0_12px_#FEA619] items-center justify-center"
                style={{ left: "54%" }}
              >
                <Text className="text-xs">⚡</Text>
              </View>
            </View>

            <Text className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
              Vantagem de +140 Pontos
            </Text>
          </View>

          {/* Elena Rostova (Right Opponent) */}
          <View className="flex-row items-center justify-end gap-3 w-full md:w-auto text-right">
            <View className="flex-col items-end">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs">🇩🇪</Text>
                <Text className="text-sm font-extrabold text-[#111C2D]">Elena Rostova</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/15">
                  <Text className="text-[10px] font-black text-[#8B5CF6]">⚡ 4x</Text>
                </View>
                <Text className="text-[11px] font-bold text-[#64748B]">PTS</Text>
                <Text className="text-xl font-black text-[#B10E6B]">{opponentScore}</Text>
              </View>
            </View>
            <View className="relative shrink-0">
              <View className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#B10E6B] shadow-[0_4px_0_#8C0053]">
                <Image source={{ uri: ELENA_DUEL_AVATAR }} className="w-full h-full" />
              </View>
              <View className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-md bg-[#B10E6B] shadow-[0_2px_0_#8C0053]">
                <Text className="text-[9px] font-black text-white">NV 13</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Duel Combat Zone (8 cols / 4 cols) */}
        <View className="w-full flex-col lg:flex-row gap-6 items-start">
          {/* Coluna Esquerda: Sprint Arena (8 Cols) */}
          <View className="w-full lg:w-8/12 flex-col gap-6">
            {/* Sprint Timer & Combo Voltage Bar */}
            <View className="flex-col sm:flex-row gap-4">
              {/* Giant Circular Arcade Clock */}
              <View className="sm:w-5/12 rounded-3xl bg-white p-5 shadow-[0_6px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-row items-center justify-between sm:justify-center gap-4">
                <View className="relative items-center justify-center w-24 h-24">
                  <Svg width={96} height={96} viewBox="0 0 100 100" className="transform -rotate-90">
                    <Circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#F5F0E8"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <Circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#FF5722"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <View className="absolute inset-0 items-center justify-center">
                    <Text className="text-2xl font-black text-[#111C2D] leading-none">
                      {timeLeft}
                    </Text>
                    <Text className="text-[9px] uppercase font-black text-[#64748B] tracking-widest">
                      Segundos
                    </Text>
                  </View>
                </View>

                <View className="flex-col">
                  <Text className="text-[11px] uppercase font-black tracking-wider text-[#FF5722]">
                    Tempo Crítico
                  </Text>
                  <Text className="text-base font-extrabold text-[#111C2D]">Sprint Final</Text>
                  <Text className="text-xs text-[#64748B]">Responda antes do gongo!</Text>
                </View>
              </View>

              {/* Combo Multiplier Meter */}
              <View className="sm:w-7/12 rounded-3xl bg-[#F5F0E8] p-5 shadow-[0_6px_0_#CBD5E1] border-2 border-[#E2E8F0] flex-col justify-between">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-lg">🔥</Text>
                    <Text className="text-base font-black text-[#B10E6B]">3x Multiplicador!</Text>
                  </View>
                  <View className="px-2.5 py-0.5 rounded-full bg-[#B10E6B]/15">
                    <Text className="text-xs font-black text-[#B10E6B]">+60 PTS / seg</Text>
                  </View>
                </View>

                {/* Flame pips meter */}
                <View className="my-2 flex-row items-center gap-2">
                  <View className="flex-1 h-3.5 rounded-full bg-white p-0.5 border border-[#CBD5E1] flex-row items-center gap-1.5 px-1">
                    <View className="h-2 flex-1 rounded-full bg-[#FF5722]" />
                    <View className="h-2 flex-1 rounded-full bg-[#FF5722]" />
                    <View className="h-2 flex-1 rounded-full bg-[#FEA619]" />
                    <View className="h-2 flex-1 rounded-full bg-[#CBD5E1] opacity-40" />
                    <View className="h-2 flex-1 rounded-full bg-[#CBD5E1] opacity-40" />
                  </View>
                  <Text className="text-xs font-black text-[#FF5722]">3 / 5</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-[#64748B]">
                    Faltam 2 acertos seguidos para o <Text className="font-bold text-[#111C2D]">5x Hiper Combo</Text>
                  </Text>
                  <Text className="text-sm">⚡</Text>
                </View>
              </View>
            </View>

            {/* Main Challenge Card (Tactile Sprint) */}
            <View className="w-full rounded-3xl bg-white p-6 sm:p-8 shadow-[0_8px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col gap-6">
              <View className="flex-row items-center justify-between flex-wrap gap-2">
                <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-xl bg-[#10B981]/15">
                  <Text className="text-sm">✓</Text>
                  <Text className="text-xs font-bold text-[#059669]">
                    Resposta Anterior Instantânea: 0.6s (+180 PTS)
                  </Text>
                </View>
                <Text className="text-xs text-[#64748B]">
                  Palavra 6 de 15 • <Text className="font-bold text-[#00685F]">Nível B2</Text>
                </Text>
              </View>

              {/* Prompt Center Area */}
              {matchOver ? (
                <View className="flex-col items-center text-center py-6 px-4 bg-emerald-50 rounded-2xl border-2 border-emerald-400 gap-3">
                  <Text className="text-4xl">🏆</Text>
                  <Text className="text-2xl font-black text-emerald-900">
                    Duelo Relâmpago 120s Concluído!
                  </Text>
                  <Text className="text-sm font-bold text-emerald-700">
                    Vitória de {playerName} com {playerScore} PTS (+250 XP & +50 Gemas adicionados!)
                  </Text>
                  <View className="flex-row items-center gap-3 mt-4">
                    <Pressable
                      onPress={() => {
                        setTimeLeft(120);
                        setPlayerScore(1420);
                        setMatchOver(false);
                        setXpAwarded(false);
                        setQuestionIdx(0);
                      }}
                      className="px-5 py-3 rounded-xl bg-emerald-700 shadow-[0_3px_0_#064E3B] cursor-pointer"
                    >
                      <Text className="text-white text-xs font-black">Jogar Novamente (120s)</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push("/")}
                      className="px-5 py-3 rounded-xl bg-white border border-stone-200 shadow-[0_2px_0_#CBD5E1] cursor-pointer"
                    >
                      <Text className="text-stone-800 text-xs font-bold">Voltar à Trilha</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View className="flex-col items-center text-center py-2 px-2">
                    <Text className="text-[11px] font-black uppercase tracking-widest text-[#64748B] mb-2">
                      Traduza para o {supportLang.toUpperCase().split("-")[0]}:
                    </Text>
                    <View className="flex-row items-center justify-center gap-3 flex-wrap">
                      <Text className="text-3xl sm:text-4xl font-black text-[#111C2D] tracking-tight">
                        {currentQ.word}
                      </Text>
                      <Pressable
                        onPress={handlePlayPromptAudio}
                        className="w-12 h-12 rounded-2xl bg-[#F5F0E8] items-center justify-center shadow-[0_4px_0_#CBD5E1] active:translate-y-1 active:shadow-none cursor-pointer"
                      >
                        <Text className="text-xl">🔊</Text>
                      </Pressable>
                    </View>

                    <View className="flex-row items-center gap-2 mt-2 flex-wrap justify-center">
                      <Text className="text-xs font-bold text-[#00685F]">
                        {currentQ.intuitivePronunciation?.[supportLang] || currentQ.ipa}
                      </Text>
                      <Text className="text-[#CBD5E1]">•</Text>
                      <View className="px-2 py-0.5 rounded bg-[#FFDDB8]">
                        <Text className="text-[10px] font-bold text-[#2A1700]">
                          {LanguageMatrixEngine.getLocalizedText(currentQ.gender, supportLang, "Termo Léxico")}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 p-3.5 rounded-2xl bg-[#F5F0E8] border border-[#CBD5E1] max-w-xl">
                      <Text className="text-sm text-[#111C2D] italic">
                        {currentQ.sentence}
                      </Text>
                    </View>
                  </View>

                  {/* 4 Chunky 3D Answer Tiles (2x2 Grid via Flexbox) */}
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 14,
                      paddingTop: 8,
                      width: "100%",
                    }}
                  >
                    {currentQ.options.map((opt) => {
                      const isSelected = selectedOption === opt.key;
                      const isCorrect = opt.correct;
                      const optLabel = LanguageMatrixEngine.getLocalizedText(opt.text, supportLang, opt.key);

                      const bg = isSelected ? (isCorrect ? "#10B981" : "#EF4444") : "#FFFFFF";
                      const borderColor = isSelected ? (isCorrect ? "#059669" : "#DC2626") : "#E2E8F0";
                      const shadow = isSelected
                        ? isCorrect
                          ? "0 4px 0 #059669"
                          : "0 4px 0 #DC2626"
                        : "0 4px 0 #CBD5E1";

                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          onPress={() => handleChoice(opt.key, opt.correct)}
                          style={{
                            flex: 1,
                            minWidth: "46%",
                            padding: 16,
                            borderRadius: 18,
                            backgroundColor: bg,
                            borderWidth: 2,
                            borderColor: borderColor,
                            boxShadow: shadow,
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <View style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: isSelected ? "rgba(255, 255, 255, 0.25)" : "#F5F0E8",
                                boxShadow: "0 2px 0 #CBD5E1",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "900",
                                  color: isSelected ? "#FFFFFF" : "#00685F",
                                }}
                              >
                                {opt.key}
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: "800",
                                color: isSelected ? "#FFFFFF" : "#111C2D",
                              }}
                            >
                              {optLabel}
                            </Text>
                          </View>
                          {isSelected && (
                            <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "900" }}>
                              {isCorrect ? "✓" : "✕"}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Bottom micro-actions bar inside card */}
              <View className="flex-row items-center justify-between pt-2">
                <Text className="text-xs text-[#64748B]">🚩 Reportar questão ambígua</Text>
                <Text className="text-xs text-[#64748B] hidden sm:flex">
                  Pressione [A], [B], [C] ou [D] para responder em menos de 1s
                </Text>
              </View>
            </View>

            {/* Cheering Historical Mentor Widget (Richard Feynman) */}
            <View className="w-full rounded-3xl bg-white p-5 shadow-[0_6px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col sm:flex-row items-center gap-4">
              <View className="relative shrink-0">
                <View className="w-16 h-16 rounded-full border-4 border-[#FEA619] overflow-hidden shadow-[0_4px_0_#D97706]">
                  <Image source={{ uri: FEYNMAN_CHEER_AVATAR }} className="w-full h-full" />
                </View>
                <View className="absolute -bottom-1 -right-1 w-6 h-6 items-center justify-center rounded-full bg-[#FF5722]">
                  <Text className="text-xs text-white">🔥</Text>
                </View>
              </View>

              <View className="flex-1 flex-col gap-1">
                <View className="flex-row items-center justify-between flex-wrap gap-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-extrabold text-[#111C2D]">Richard Feynman</Text>
                    <View className="px-2 py-0.5 rounded-full bg-[#FFDDB8]">
                      <Text className="text-[10px] font-black text-[#2A1700] uppercase">
                        Mentor de Ritmo & Foco
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-black text-[#00685F]">Bônus de Vitória 1.2x</Text>
                </View>
                <View className="bg-[#F5F0E8] rounded-2xl p-3 border border-[#CBD5E1] mt-1">
                  <Text className="text-xs text-[#111C2D] italic">
                    “— Fantástico ritmo, {playerName.split(" ")[0]}! Mantenha a cadência sincopada e o combo 5x explode a pontuação da Elena!”
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Coluna Direita: Arsenal & Feed de Combate (4 Cols) */}
          <View className="w-full lg:w-4/12 flex-col gap-6">
            {/* Power-up Inventory Slots */}
            <View className="rounded-3xl bg-white p-5 shadow-[0_6px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col gap-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-[#111C2D]">Arsenal de Batalha</Text>
                <Text className="text-xs text-[#64748B] font-bold">2 Disponíveis</Text>
              </View>

              <View className="flex-col gap-3">
                {/* Power up 1 */}
                <Pressable
                  onPress={handleUseFreeze}
                  className="w-full p-3.5 rounded-2xl bg-[#F5F0E8] flex-row items-center justify-between shadow-[0_4px_0_#CBD5E1] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">❄️</Text>
                    <View className="flex-col text-left">
                      <Text className="text-sm font-bold text-[#111C2D]">Congelar Tempo</Text>
                      <Text className="text-xs text-[#64748B]">
                        {freezeActive ? "Pausado (5s)!" : "Pausa relógio por 5s"}
                      </Text>
                    </View>
                  </View>
                  <View className="px-2.5 py-1 rounded-xl bg-[#06B6D4] shadow-[0_2px_0_#0F766E]">
                    <Text className="text-xs font-extrabold text-white">
                      {freezeActive ? "ATIVO" : "USAR"}
                    </Text>
                  </View>
                </Pressable>

                {/* Power up 2 */}
                <View className="w-full p-3.5 rounded-2xl bg-[#D97706]/10 flex-row items-center justify-between shadow-[0_4px_0_rgba(217,119,6,0.3)] border border-[#D97706]/20">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">⚡</Text>
                    <View className="flex-col text-left">
                      <Text className="text-sm font-bold text-[#D97706]">Duplo XP Relâmpago</Text>
                      <Text className="text-xs text-[#D97706]/80">Ativo nas próximas 3 rodadas</Text>
                    </View>
                  </View>
                  <View className="px-2 py-0.5 rounded-lg bg-[#FEA619]">
                    <Text className="text-[10px] font-black text-[#2A1700]">ATIVO</Text>
                  </View>
                </View>

                {/* Power up 3 */}
                <View className="w-full p-3.5 rounded-2xl bg-[#F5F0E8]/60 flex-row items-center justify-between opacity-50">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">🎯</Text>
                    <View className="flex-col text-left">
                      <Text className="text-sm font-bold text-[#64748B]">Eliminar Alternativas</Text>
                      <Text className="text-xs text-[#64748B]">Recarrega em 2 rodadas</Text>
                    </View>
                  </View>
                  <Text className="text-sm">🔒</Text>
                </View>
              </View>
            </View>

            {/* Live Feed de Combate */}
            <View className="rounded-3xl bg-white p-5 shadow-[0_6px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-[#111C2D]">Feed de Combate</Text>
                <View className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              </View>

              <View className="flex-col gap-2.5">
                <View className="p-2.5 rounded-xl bg-[#F5F0E8] flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-[#00685F]" />
                    <Text className="text-xs text-[#111C2D]">
                      {playerName.split(" ")[0]} acertou <Text className="font-bold">'die Entscheidung'</Text>
                    </Text>
                  </View>
                  <Text className="text-xs font-black text-[#00685F]">+120 PTS</Text>
                </View>

                <View className="p-2.5 rounded-xl bg-[#F5F0E8] flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-[#B10E6B]" />
                    <Text className="text-xs text-[#111C2D]">
                      Elena acertou <Text className="font-bold">'die Erfahrung'</Text>
                    </Text>
                  </View>
                  <Text className="text-xs font-black text-[#B10E6B]">+100 PTS</Text>
                </View>

                <View className="p-2.5 rounded-xl bg-[#FF5722]/10 flex-row items-center justify-between border border-[#FF5722]/20">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs">💥</Text>
                    <Text className="text-xs font-bold text-[#FF5722]">{playerName.split(" ")[0]} ativou 3x COMBO!</Text>
                  </View>
                  <Text className="text-[10px] font-black text-[#FF5722]">SUPER</Text>
                </View>

                <View className="p-2.5 rounded-xl bg-[#F5F0E8] flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-[#00685F]" />
                    <Text className="text-xs text-[#111C2D]">
                      {playerName.split(" ")[0]} acertou <Text className="font-bold">'die Begründung'</Text>
                    </Text>
                  </View>
                  <Text className="text-xs font-black text-[#00685F]">+140 PTS</Text>
                </View>
              </View>
            </View>

            {/* Upcoming Vocabulary Queue Teaser */}
            <View className="rounded-3xl bg-white p-5 shadow-[0_6px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-[#111C2D]">Próximos Desafios</Text>
                <Text className="text-[11px] font-bold text-[#00685F]">Fila Rápida</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1 p-2.5 rounded-xl bg-[#F5F0E8] border border-[#CBD5E1] items-center">
                  <Text className="text-[9px] font-bold text-[#64748B]">RODADA 7</Text>
                  <Text className="text-xs font-bold text-[#111C2D]">der Erfolg</Text>
                </View>
                <View className="flex-1 p-2.5 rounded-xl bg-[#F5F0E8] border border-[#CBD5E1] items-center">
                  <Text className="text-[9px] font-bold text-[#64748B]">RODADA 8</Text>
                  <Text className="text-xs font-bold text-[#111C2D]">das Geheimnis</Text>
                </View>
                <View className="flex-1 p-2.5 rounded-xl bg-[#F5F0E8] border border-[#CBD5E1] items-center">
                  <Text className="text-[9px] font-bold text-[#64748B]">RODADA 9</Text>
                  <Text className="text-xs font-bold text-[#111C2D]">die Weisheit</Text>
                </View>
              </View>
            </View>

            {/* Atalhos e Desistir */}
            <View className="p-4 rounded-2xl bg-[#F5F0E8] border border-[#CBD5E1] flex-col gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-[#64748B]">⌨️ [A - D] Escolher</Text>
                <Text className="text-xs text-[#64748B]">[Espaço] Áudio</Text>
              </View>
              <Pressable
                onPress={() => router.push("/")}
                className="items-center justify-center pt-1"
              >
                <Text className="text-xs font-bold text-[#EF4444] underline">
                  [Esc] Desistir do Duelo (-30 XP)
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Pop-in Combo Toast */}
        {showToast ? (
          <View className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#00685F] shadow-[0_8px_0_#0F766E] flex-row items-center gap-3">
            <Text className="text-3xl">🎯</Text>
            <View className="flex-col">
              <Text className="text-base font-extrabold text-white">+180 PONTOS!</Text>
              <Text className="text-xs text-white/90">Acerto Perfeito • Mantendo Combo!</Text>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
