import { useState, useEffect } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { router } from "expo-router";
import { tap } from "@/lib/haptics";
import { useProsa } from "@/context/prosa-context";

const DA_VINCI_PORTRAIT = "/cast/davinci.png";

interface WordToken {
  id: string;
  word: string;
  role: "conector" | "sujeito" | "objeto" | "infinitivo" | "modal" | "distractor";
  colorClass: string;
  bgLightClass: string;
}

const TOKENS_BY_LANG: Record<
  string,
  {
    lead: string;
    correct: string[];
    audioLabel: string;
    transcript: string;
    hint: string;
    tokens: WordToken[];
  }
> = {
  en: {
    lead: "I study English,",
    correct: ["because", "I", "want", "to understand", "philosophy."],
    audioLabel: "Áudio em Inglês Nativo (Oxford RP)",
    transcript: "“I study English, because I want to understand philosophy.”",
    hint: "Repare na ordem canônica SVO (Sujeito-Verbo-Objeto). O conector subordinativo 'because' introduz a oração causal mantendo o verbo e o infinitivo diretamente acoplados ao sujeito!",
    tokens: [
      { id: "1", word: "because", role: "conector", colorClass: "text-[#8B5CF6]", bgLightClass: "bg-[#8B5CF6]/15" },
      { id: "2", word: "I", role: "sujeito", colorClass: "text-[#06B6D4]", bgLightClass: "bg-[#06B6D4]/15" },
      { id: "3", word: "want", role: "modal", colorClass: "text-[#D97706]", bgLightClass: "bg-[#D97706]/15" },
      { id: "4", word: "to understand", role: "infinitivo", colorClass: "text-[#059669]", bgLightClass: "bg-[#10B981]/15" },
      { id: "5", word: "philosophy.", role: "objeto", colorClass: "text-[#FF5722]", bgLightClass: "bg-[#FF5722]/15" },
      { id: "6", word: "therefore", role: "distractor", colorClass: "text-[#64748B]", bgLightClass: "bg-[#F5F0E8]" },
      { id: "7", word: "can", role: "distractor", colorClass: "text-[#64748B]", bgLightClass: "bg-[#F5F0E8]" },
    ],
  },
  de: {
    lead: "Ich lerne Deutsch,",
    correct: ["weil", "ich", "die Philosophie", "verstehen", "will."],
    audioLabel: "Áudio em Alemão Nativo (Baviera)",
    transcript: "“Ich lerne Deutsch, weil ich die Philosophie verstehen will.”",
    hint: "Repare na mecânica do verbo principal na oração subordinada... No alemão clássico, a conjunção causal 'weil' atua como uma alavanca arquimediana: ela arremessa o verbo conjugado para a última posição da frase!",
    tokens: [
      { id: "1", word: "weil", role: "conector", colorClass: "text-[#8B5CF6]", bgLightClass: "bg-[#8B5CF6]/15" },
      { id: "2", word: "ich", role: "sujeito", colorClass: "text-[#06B6D4]", bgLightClass: "bg-[#06B6D4]/15" },
      { id: "3", word: "die Philosophie", role: "objeto", colorClass: "text-[#059669]", bgLightClass: "bg-[#10B981]/15" },
      { id: "4", word: "verstehen", role: "infinitivo", colorClass: "text-[#D97706]", bgLightClass: "bg-[#D97706]/15" },
      { id: "5", word: "will.", role: "modal", colorClass: "text-[#FF5722]", bgLightClass: "bg-[#FF5722]/15" },
      { id: "6", word: "deshalb", role: "distractor", colorClass: "text-[#64748B]", bgLightClass: "bg-[#F5F0E8]" },
      { id: "7", word: "kann", role: "distractor", colorClass: "text-[#64748B]", bgLightClass: "bg-[#F5F0E8]" },
    ],
  },
};

export interface PlacementScreenProps {
  embedded?: boolean;
  autoStart?: boolean;
  onDone?: (level: string) => void;
}

export function PlacementScreen({ embedded = false, autoStart = false, onDone }: PlacementScreenProps = {}) {
  const { targetLang } = useProsa();
  const config = TOKENS_BY_LANG[targetLang && targetLang in TOKENS_BY_LANG ? targetLang : "en"];
  const [placedTokens, setPlacedTokens] = useState<WordToken[]>([]);

  useEffect(() => {
    setPlacedTokens([]);
    setValidationResult(null);
  }, [targetLang]);
  const [showHint, setShowHint] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioSpeedIndex, setAudioSpeedIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [validationResult, setValidationResult] = useState<"correct" | "incorrect" | "skipped" | null>(null);

  const speeds = ["1.0x", "0.8x Lento", "1.2x"];

  const handlePickToken = (token: WordToken) => {
    void tap("light");
    if (placedTokens.some((t) => t.id === token.id)) return;
    setPlacedTokens((prev) => [...prev, token]);
    setValidationResult(null);
  };

  const handleRemoveToken = (tokenId: string) => {
    void tap("light");
    setPlacedTokens((prev) => prev.filter((t) => t.id !== tokenId));
    setValidationResult(null);
  };

  const handleClear = () => {
    void tap("medium");
    setPlacedTokens([]);
    setValidationResult(null);
  };

  const handleVerify = () => {
    if (placedTokens.length === 0) return;
    void tap("medium");
    const chosenWords = placedTokens.map((t) => t.word);
    const isMatch = JSON.stringify(chosenWords) === JSON.stringify(config.correct);

    if (isMatch) {
      setValidationResult("correct");
      void tap("success");
      if (onDone) {
        setTimeout(() => onDone("B1"), 1200);
      }
    } else {
      setValidationResult("incorrect");
      void tap("heavy");
    }
  };

  const handleSkip = () => {
    void tap("light");
    setValidationResult("skipped");
    if (onDone) {
      setTimeout(() => onDone("A2"), 1200);
    }
  };

  const handlePlayAudio = () => {
    void tap("medium");
    setAudioPlaying(true);
    setTimeout(() => setAudioPlaying(false), 2500);
  };

  return (
    <ScrollView className="flex-1 bg-[#FDFBF7]" contentContainerStyle={{ paddingBottom: 60 }}>
      <View className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-col gap-6">
        {/* Top Stepper & CEFR Calibration Ribbon */}
        <View className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col gap-4">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.push("/")}
                className="w-10 h-10 rounded-2xl bg-[#F5F0E8] items-center justify-center shadow-[0_3px_0_#CBD5E1] active:translate-y-1 active:shadow-none cursor-pointer"
              >
                <Text className="text-lg">←</Text>
              </Pressable>
              <View className="flex-col">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-black uppercase tracking-wider text-[#00685F]">
                    Calibração Adaptativa
                  </Text>
                  <View className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                  <Text className="text-xs font-black text-[#111C2D]">Questão 4 de 10</Text>
                </View>
                <Text className="text-xs text-[#64748B]">
                  Nível B1 em Avaliação • Sintaxe Subordinada
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 flex-wrap">
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F0E8] border border-[#CBD5E1] shadow-[0_2px_0_#CBD5E1]">
                <Text className="text-xs">⏱️</Text>
                <Text className="text-xs text-[#64748B] font-semibold">~3 min restantes</Text>
              </View>
              <View className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FEA619]/20 border border-[#FEA619]/40 shadow-[0_2px_0_rgba(254,166,25,0.3)]">
                <Text className="text-xs">🏆</Text>
                <Text className="text-xs font-bold text-[#855300]">+150 XP & Insígnia Auditada</Text>
              </View>
            </View>
          </View>

          {/* Continuous Progress Bar */}
          <View className="w-full h-3 rounded-full bg-[#F5F0E8] overflow-hidden border border-[#CBD5E1]">
            <View className="h-full rounded-full bg-[#00685F]" style={{ width: "42%" }} />
          </View>

          {/* CEFR Scale Stepper */}
          <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4, paddingTop: 4 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text className="text-xs font-black text-[#00685F]">A1</Text>
              <Text className="text-[10px] font-bold text-[#10B981]">Consolidado ✓</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text className="text-xs font-black text-[#00685F]">A2</Text>
              <Text className="text-[10px] font-bold text-[#10B981]">Dominado ✓</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <View className="px-2 py-0.5 rounded-md bg-[#06B6D4]/15">
                <Text className="text-xs font-black text-[#06B6D4]">B1</Text>
              </View>
              <Text className="text-[10px] font-bold text-[#06B6D4]">Avaliando...</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center", opacity: 0.4 }}>
              <Text className="text-xs font-bold text-[#64748B]">B2</Text>
              <Text className="text-[10px] text-[#64748B]">Desafio</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center", opacity: 0.4 }}>
              <Text className="text-xs font-bold text-[#64748B]">C1</Text>
              <Text className="text-[10px] text-[#64748B]">Avançado</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center", opacity: 0.4 }}>
              <Text className="text-xs font-bold text-[#64748B]">C2</Text>
              <Text className="text-[10px] text-[#64748B]">Polímata</Text>
            </View>
          </View>
        </View>

        {/* Master Observer: Leonardo Da Vinci Mentor Unit */}
        <View className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col sm:flex-row items-start gap-4">
          <View className="relative shrink-0">
            <View className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-[0_4px_0_#CBD5E1] border-2 border-[#FEA619]">
              <Image source={{ uri: DA_VINCI_PORTRAIT }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-full bg-[#FEA619] shadow-[0_2px_0_#D97706]">
              <Text className="text-[10px] font-black text-[#2A1700]">Nv.8</Text>
            </View>
          </View>

          <View className="flex-1 flex-col gap-3">
            <View className="flex-row items-center justify-between flex-wrap gap-2">
              <View>
                <Text className="text-base font-extrabold text-[#111C2D]">Leonardo da Vinci</Text>
                <Text className="text-[11px] font-black uppercase text-[#855300]">
                  Observador de Sintaxe & Decomposição
                </Text>
              </View>
              <Pressable
                onPress={() => setShowHint(!showHint)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F0E8] border border-[#CBD5E1] shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                <Text className="text-xs">💡</Text>
                <Text className="text-xs font-bold text-[#111C2D]">
                  {showHint ? "Ocultar Pista" : "Pista Renascentista (1 restante)"}
                </Text>
              </Pressable>
            </View>

            <View className="bg-[#F5F0E8] rounded-2xl p-4 border border-[#CBD5E1]">
              <Text className="text-sm text-[#111C2D] italic leading-relaxed">
                “{config.hint}”
              </Text>
              {showHint ? (
                <View className="mt-3 pt-3 border-t border-[#CBD5E1]">
                  <Text className="text-xs text-[#3D4947]">
                    💡 <Text className="font-bold">Esquema Estrutural:</Text> {config.transcript}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Main Interactive Exercise Bay */}
        <View className="bg-white rounded-3xl p-5 md:p-8 shadow-[0_4px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col gap-6">
          <View className="flex-row items-center justify-between flex-wrap gap-2 pb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-xl bg-[#00685F] items-center justify-center shadow-[0_2px_0_#0F766E]">
                <Text className="text-white text-base">🎧</Text>
              </View>
              <View>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#00685F]">
                  Módulo B1 • Compreensão & Reconstrução
                </Text>
                <Text className="text-lg font-black text-[#111C2D]">Estruture a Oração Causal</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-[#06B6D4]/15">
              <View className="w-2 h-2 rounded-full bg-[#06B6D4]" />
              <Text className="text-xs font-bold text-[#06B6D4]">{config.audioLabel}</Text>
            </View>
          </View>

          {/* Tactile Audio Player Component */}
          <View className="bg-[#F5F0E8] rounded-2xl p-4 md:p-5 border border-[#CBD5E1] shadow-[0_3px_0_#E2E8F0] flex-col md:flex-row items-center justify-between gap-4">
            <View className="flex-row items-center gap-4 w-full md:w-auto">
              <Pressable
                onPress={handlePlayAudio}
                className={`w-14 h-14 rounded-2xl bg-[#00685F] items-center justify-center shadow-[0_4px_0_#0F766E] active:translate-y-1 active:shadow-none cursor-pointer ${
                  audioPlaying ? "scale-105" : ""
                }`}
              >
                <Text className="text-2xl text-white">{audioPlaying ? "⏸️" : "🔊"}</Text>
              </Pressable>

              {/* Animated Waveform Mockup */}
              <View className="flex-1 flex-row items-end gap-1.5 h-10 px-3 py-1.5 bg-white rounded-xl border border-[#CBD5E1] min-w-[160px] md:min-w-[260px]">
                {[14, 28, 20, 34, 12, 26, 36, 18, 30, 15, 25, 32, 10].map((h, i) => (
                  <View
                    key={i}
                    className="w-1.5 rounded-full bg-[#00685F]"
                    style={{ height: audioPlaying ? (h * 1.2) % 36 + 8 : h }}
                  />
                ))}
              </View>
            </View>

            {/* Controls */}
            <View className="flex-row items-center gap-2 w-full md:w-auto justify-end">
              <Pressable
                onPress={() => setAudioSpeedIndex((prev) => (prev + 1) % speeds.length)}
                className="px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 cursor-pointer"
              >
                <Text className="text-xs font-black text-[#111C2D]">{speeds[audioSpeedIndex]}</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowTranscript(!showTranscript)}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 cursor-pointer"
              >
                <Text className="text-xs">📜</Text>
                <Text className="text-xs font-bold text-[#111C2D]">
                  {showTranscript ? "Ocultar Transcrição" : "Ver Transcrição"}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Collapsible Transcription Box */}
          {showTranscript ? (
            <View className="bg-white rounded-2xl p-4 border border-[#CBD5E1] shadow-[0_2px_0_#E2E8F0]">
              <Text className="text-[11px] font-bold text-[#64748B] uppercase">Transcrição Auditiva:</Text>
              <Text className="text-base font-bold text-[#111C2D] mt-1">
                {config.transcript}
              </Text>
              <Text className="text-xs text-[#64748B] mt-0.5">
                Tradução de apoio: "Estudo idiomas porque quero compreender a filosofia."
              </Text>
            </View>
          ) : null}

          {/* Syntax Color Grammar Key */}
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-[11px] uppercase tracking-wider font-extrabold text-[#64748B]">
              Mapeamento Sintático:
            </Text>
            <View className="px-2 py-0.5 rounded-md bg-[#06B6D4]/15">
              <Text className="text-[10px] font-bold text-[#06B6D4]">Sujeito</Text>
            </View>
            <View className="px-2 py-0.5 rounded-md bg-[#8B5CF6]/15">
              <Text className="text-[10px] font-bold text-[#8B5CF6]">Conector Causal</Text>
            </View>
            <View className="px-2 py-0.5 rounded-md bg-[#10B981]/15">
              <Text className="text-[10px] font-bold text-[#059669]">Objeto Direto</Text>
            </View>
            <View className="px-2 py-0.5 rounded-md bg-[#D97706]/15">
              <Text className="text-[10px] font-bold text-[#D97706]">Infinitivo & Modal</Text>
            </View>
          </View>

          {/* Target Construction Bay (Drop / Placement Zone) */}
          <View className="flex-col gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-[#111C2D]">
                Reorganize os blocos para completar a frase do áudio:
              </Text>
              <Pressable onPress={handleClear} className="flex-row items-center gap-1 cursor-pointer">
                <Text className="text-xs">🔄</Text>
                <Text className="text-xs font-bold text-[#64748B]">Limpar slots</Text>
              </Pressable>
            </View>

            <View className="min-h-[96px] p-4 rounded-2xl bg-[#F5F0E8] border border-[#CBD5E1] flex-row flex-wrap items-center gap-2.5">
              {/* Fixed Stem */}
              <View className="px-4 py-3 rounded-xl bg-white border border-[#CBD5E1] shadow-[0_3px_0_#CBD5E1] flex-row items-center gap-1.5">
                <Text className="text-base font-extrabold text-[#111C2D]">{config.lead}</Text>
                <Text className="text-xs text-[#64748B]">🔒</Text>
              </View>

              {/* Placed Chips */}
              {placedTokens.map((token) => (
                <Pressable
                  key={token.id}
                  onPress={() => handleRemoveToken(token.id)}
                  className="px-4 py-3 rounded-2xl bg-white border-2 border-[#CBD5E1] shadow-[0_3px_0_#CBD5E1] flex-row items-center gap-1.5 cursor-pointer active:translate-y-0.5"
                >
                  <Text className={`text-base font-extrabold ${token.colorClass}`}>
                    {token.word}
                  </Text>
                  <Text className="text-xs text-[#64748B]">✕</Text>
                </Pressable>
              ))}

              {placedTokens.length === 0 ? (
                <Text className="text-xs text-[#64748B] italic px-2">
                  Toque nas palavras abaixo para construir a subordinada...
                </Text>
              ) : null}
            </View>
          </View>

          {/* Scrambled Tactile Chip Bank */}
          <View className="flex-col gap-2 pt-2">
            <Text className="text-[11px] uppercase tracking-wider font-extrabold text-[#64748B]">
              Banco de Palavras Táteis (Clique para inserir ou remover):
            </Text>
            <View className="flex-row flex-wrap items-center gap-3">
              {config.tokens.map((token) => {
                const isPlaced = placedTokens.some((t) => t.id === token.id);
                return (
                  <Pressable
                    key={token.id}
                    onPress={() => handlePickToken(token)}
                    disabled={isPlaced}
                    className={`px-4 py-3 rounded-2xl bg-white border-2 border-[#CBD5E1] shadow-[0_4px_0_#CBD5E1] active:translate-y-1 active:shadow-none flex-row items-center gap-2 cursor-pointer ${
                      isPlaced ? "opacity-30" : ""
                    }`}
                  >
                    <View className={`w-2.5 h-2.5 rounded-full ${token.bgLightClass}`} />
                    <Text className={`text-base font-extrabold ${token.colorClass}`}>
                      {token.word}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Validation Banner */}
          {validationResult === "correct" ? (
            <View className="rounded-2xl p-4 bg-[#10B981]/15 border border-[#10B981]/30 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#10B981] items-center justify-center">
                <Text className="text-white text-lg font-bold">✓</Text>
              </View>
              <View className="flex-col">
                <Text className="text-sm font-extrabold text-[#059669]">
                  Brilhante! Domínio da Oração Subordinada (B1)
                </Text>
                <Text className="text-xs text-[#059669]/90 mt-0.5">
                  Você aplicou corretamente a "Regra de Ouro": o conector "weil" enviou o verbo modal "will" exatamente para o encerramento do pensamento.
                </Text>
              </View>
            </View>
          ) : validationResult === "incorrect" ? (
            <View className="rounded-2xl p-4 bg-red-50 border border-red-200 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#EF4444] items-center justify-center">
                <Text className="text-white text-lg font-bold">✕</Text>
              </View>
              <View className="flex-col">
                <Text className="text-sm font-extrabold text-[#DC2626]">
                  Quase lá! Atenção à posição do verbo conjugado
                </Text>
                <Text className="text-xs text-[#DC2626]/90 mt-0.5">
                  Lembre-se da dica do Mestre da Vinci: "weil" exige o verbo conjugado ("will") na última posição absoluta da oração.
                </Text>
              </View>
            </View>
          ) : validationResult === "skipped" ? (
            <View className="rounded-2xl p-4 bg-[#F5F0E8] border border-[#CBD5E1] flex-row items-center gap-3">
              <Text className="text-lg">➔</Text>
              <View className="flex-col">
                <Text className="text-sm font-extrabold text-[#111C2D]">
                  Calibração Adaptativa Atualizada
                </Text>
                <Text className="text-xs text-[#64748B]">
                  Nenhum problema! O sistema registrou seu estágio para reforçar orações causais nos seus próximos rituais.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Bottom Action Footer & Adaptive Controls */}
        <View className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_4px_0_#E2E8F0] border-2 border-[#E2E8F0] flex-col md:flex-row items-center justify-between gap-4">
          <View className="flex-row items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <Pressable
              onPress={handleSkip}
              className="px-4 py-3 rounded-2xl bg-[#F5F0E8] border border-[#CBD5E1] shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 cursor-pointer"
            >
              <Text className="text-xs font-bold text-[#64748B]">
                Ainda não aprendi isto (Pular)
              </Text>
            </Pressable>
            <Text className="hidden lg:flex text-xs text-[#64748B]">
              Dica rápida: [Espaço] Áudio • [Enter] Validar
            </Text>
          </View>

          <Pressable
            onPress={handleVerify}
            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-[#00685F] shadow-[0_4px_0_#0F766E] active:translate-y-1 active:shadow-none flex-row items-center justify-center gap-2 cursor-pointer"
          >
            <Text className="text-base font-extrabold text-white">Verificar Resposta ➔</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
