import React, { useState } from "react";
import { router } from "expo-router";
import { motion, AnimatePresence } from "framer-motion";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa } from "@/context/prosa-context";
import { tap } from "@/lib/haptics";
import {
  ArrowLeft,
  Volume2,
  Clock,
  Award,
  Sparkles,
  RotateCcw,
  Check,
  Lock,
  ArrowRight,
  HelpCircle,
  FileText,
  VolumeX,
} from "lucide-react";

const DA_VINCI_AVATAR = "/cast/davinci.png";

interface WordToken {
  id: string;
  text: string;
  color: string;
  category: string;
}

interface PlacementConfig {
  leadAnchor: string;
  expectedSentence: string;
  audioBadge: string;
  transcript: string;
  daVinciHint: string;
  tokens: WordToken[];
}

const PLACEMENT_BY_LANG: Record<string, PlacementConfig> = {
  en: {
    leadAnchor: "I study English,",
    expectedSentence: "because I want to understand philosophy.",
    audioBadge: "Áudio em Inglês Nativo (Oxford RP)",
    transcript: "Áudio original: “I study English, because I want to understand philosophy.”",
    daVinciHint:
      "Repare na ordem canônica SVO (Sujeito-Verbo-Objeto) no inglês clássico. O conector subordinativo 'because' introduz a oração causal mantendo o verbo e o infinitivo diretamente acoplados ao sujeito!",
    tokens: [
      { id: "1", text: "because", color: "#EC4899", category: "Conector Causal" },
      { id: "2", text: "I", color: "#06B6D4", category: "Sujeito" },
      { id: "3", text: "want", color: "#F59E0B", category: "Verbo Principal" },
      { id: "4", text: "to understand", color: "#10B981", category: "Infinitivo" },
      { id: "5", text: "philosophy.", color: "#8B5CF6", category: "Objeto Direto" },
      { id: "6", text: "therefore", color: "#64748B", category: "Distrator" },
      { id: "7", text: "can", color: "#64748B", category: "Distrator" },
    ],
  },
  de: {
    leadAnchor: "Ich lerne Deutsch,",
    expectedSentence: "weil ich die Philosophie verstehen will.",
    audioBadge: "Áudio em Alemão Nativo (Baviera)",
    transcript: "Áudio original: “Ich lerne Deutsch, weil ich die Philosophie verstehen will.”",
    daVinciHint:
      "Repare na mecânica do verbo principal na oração subordinada... No alemão clássico, a conjunção causal 'weil' atua como uma alavanca arquimediana: ela arremessa o verbo conjugado para a última posição da frase!",
    tokens: [
      { id: "1", text: "weil", color: "#EC4899", category: "Conector Causal" },
      { id: "2", text: "ich", color: "#06B6D4", category: "Sujeito" },
      { id: "3", text: "die Philosophie", color: "#10B981", category: "Objeto Direto" },
      { id: "4", text: "verstehen", color: "#F59E0B", category: "Infinitivo" },
      { id: "5", text: "will.", color: "#F59E0B", category: "Verbo Modal" },
      { id: "6", text: "deshalb", color: "#64748B", category: "Distrator" },
      { id: "7", text: "kann", color: "#64748B", category: "Distrator" },
    ],
  },
  es: {
    leadAnchor: "Estudio español,",
    expectedSentence: "porque quiero entender la filosofía.",
    audioBadge: "Áudio em Espanhol Nativo (Madrid)",
    transcript: "Áudio original: “Estudio español, porque quiero entender la filosofía.”",
    daVinciHint:
      "Repare na clareza da subordinação em espanhol. O conector causal 'porque' une as duas proposições mantendo a flexão do verbo 'quiero' congruente com a intenção expressa!",
    tokens: [
      { id: "1", text: "porque", color: "#EC4899", category: "Conector Causal" },
      { id: "2", text: "quiero", color: "#F59E0B", category: "Verbo Principal" },
      { id: "3", text: "entender", color: "#10B981", category: "Infinitivo" },
      { id: "4", text: "la filosofía.", color: "#8B5CF6", category: "Objeto Direto" },
      { id: "5", text: "profundamente", color: "#06B6D4", category: "Advérbio" },
      { id: "6", text: "por lo tanto", color: "#64748B", category: "Distrator" },
      { id: "7", text: "puedo", color: "#64748B", category: "Distrator" },
    ],
  },
};

export default function PlacementScreen() {
  const { addXp, targetLang } = useProsa();
  const config = PLACEMENT_BY_LANG[targetLang && targetLang in PLACEMENT_BY_LANG ? targetLang : "en"];
  const [bankTokens, setBankTokens] = useState<WordToken[]>(config.tokens);
  const [selectedTokens, setSelectedTokens] = useState<WordToken[]>([]);

  React.useEffect(() => {
    setBankTokens(config.tokens);
    setSelectedTokens([]);
    setFeedback("idle");
  }, [targetLang]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [hintAvailable, setHintAvailable] = useState(1);

  const handleSelectWord = (token: WordToken) => {
    void tap("light");
    setBankTokens((prev) => prev.filter((t) => t.id !== token.id));
    setSelectedTokens((prev) => [...prev, token]);
    setFeedback("idle");
  };

  const handleRemoveWord = (token: WordToken) => {
    void tap("light");
    setSelectedTokens((prev) => prev.filter((t) => t.id !== token.id));
    setBankTokens((prev) => [...prev, token]);
    setFeedback("idle");
  };

  const handleClearSlots = () => {
    void tap("light");
    setBankTokens(config.tokens);
    setSelectedTokens([]);
    setFeedback("idle");
  };

  const handlePlayAudio = () => {
    void tap("light");
    setIsPlayingAudio(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(config.leadAnchor + " " + config.expectedSentence);
      utter.lang = targetLang === "de" ? "de-DE" : targetLang === "es" ? "es-ES" : "en-US";
      window.speechSynthesis.speak(utter);
    }
    setTimeout(() => setIsPlayingAudio(false), 2400);
  };

  const handleVerify = () => {
    const constructed = selectedTokens.map((t) => t.text).join(" ");
    const isCorrect = constructed === config.expectedSentence;

    if (isCorrect) {
      void tap("success");
      setFeedback("correct");
      addXp(150);
    } else {
      void tap("heavy");
      setFeedback("wrong");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pb-16">
      {/* ======================================================== */}
      {/* 1. TOP STEPPER & CEFR CALIBRATION RIBBON                 */}
      {/* ======================================================== */}
      <TactileCard className="p-5 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-10 h-10 rounded-2xl bg-[#F5F0E8] text-[#111C2D] flex items-center justify-center shadow-[0_3px_0_#CBD5E1] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                title="Voltar para a Trilha"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-black text-[#0D9488] tracking-wider">
                    Calibração Adaptativa
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  <span className="text-xs font-black text-[#111C2D]">
                    Questão 4 de 10
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Nível B1 em Avaliação • Sintaxe Subordinada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F0E8] text-[#64748B] text-xs font-bold shadow-[0_2px_0_#CBD5E1]">
                <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Tempo estimado: ~3 min restantes</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-xs font-black shadow-[0_2px_0_#FDE68A]">
                <Award className="w-3.5 h-3.5" />
                <span>+150 XP &amp; Insígnia Auditada</span>
              </div>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="pt-2">
            <div className="relative w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="h-full bg-[#0D9488] rounded-full transition-all duration-500" style={{ width: "40%" }} />
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold text-[#64748B] mt-2 px-1">
              <span className="text-[#0D9488]">A1 Consolidado ✓</span>
              <span className="text-[#0D9488]">A2 Dominado ✓</span>
              <span className="text-[#0D9488] font-black underline">B1 Avaliando...</span>
              <span>B2 Desafio</span>
              <span>C1 Avançado</span>
              <span>C2 Polímata</span>
            </div>
          </div>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 2. LEONARDO DA VINCI MENTOR HINT CARD                     */}
      {/* ======================================================== */}
      <TactileCard className="p-5 bg-[#FDFBF7] border border-stone-200/80">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[#D97706] shadow-sm bg-[#D97706]/10">
              <img src={DA_VINCI_AVATAR} alt="Leonardo da Vinci" className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#D97706] text-white text-[9px] font-black">
              Nv.8
            </span>
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#111C2D]">Leonardo da Vinci</h3>
                <span className="text-[10px] uppercase font-bold text-[#D97706] tracking-wider">
                  Observador de Sintaxe &amp; Decomposição
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-bold flex items-center gap-1 shadow-sm">
                <span>💡</span> Pista Renascentista ({hintAvailable} restante)
              </span>
            </div>

            <p className="font-serif text-sm text-[#334155] italic leading-relaxed">
              “{config.daVinciHint}”
            </p>
          </div>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 3. RECONSTRUCTION & AUDIO CHALLENGE CARD                  */}
      {/* ======================================================== */}
      <TactileCard className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-4">
          <div>
            <span className="text-xs uppercase font-extrabold text-[#0D9488] tracking-wider">
              Módulo B1 • Compreensão &amp; Reconstrução
            </span>
            <h2 className="text-2xl font-black text-[#111C2D]">
              Estruture a Oração Causal
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
            <span>{config.audioBadge}</span>
          </div>
        </div>

        {/* Audio Player Bar */}
        <div className="flex items-center gap-4 bg-[#F5F0E8] p-4 rounded-2xl border border-stone-200/80">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayAudio}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-[0_4px_0_#0F766E] transition-all cursor-pointer ${isPlayingAudio ? "bg-[#0F766E]" : "bg-[#0D9488]"
              }`}
          >
            <Volume2 className="w-7 h-7" />
          </motion.button>

          {/* Soundwave animation */}
          <div className="flex-1 h-8 flex items-center gap-1">
            {[40, 70, 90, 60, 100, 50, 80, 45, 95, 30, 75, 60, 85, 40].map((h, i) => (
              <motion.span
                key={i}
                animate={isPlayingAudio ? { height: [`${h * 0.4}%`, `${h}%`, `${h * 0.3}%`] } : { height: `${h * 0.4}%` }}
                transition={{ duration: 0.5, repeat: isPlayingAudio ? Infinity : 0, delay: i * 0.04 }}
                className="w-1.5 bg-[#0D9488] rounded-full"
                style={{ height: `${h * 0.4}%` }}
              />
            ))}
          </div>

          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-[#111C2D] border border-stone-200/80 shadow-[0_2px_0_#CBD5E1]"
          >
            1.0x
          </button>

          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-xs font-bold text-[#111C2D] border border-stone-200/80 shadow-[0_2px_0_#CBD5E1] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Ver Transcrição</span>
          </button>
        </div>

        {showTranscript && (
          <p className="text-xs italic text-[#64748B] bg-stone-50 p-3 rounded-xl border border-stone-200/60">
            {config.transcript}
          </p>
        )}

        {/* Mapeamento Sintático Legend */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-bold text-[#64748B]">Mapeamento Sintático:</span>
          <span className="px-2 py-0.5 rounded-md bg-[#06B6D4]/15 text-[#0891B2] font-extrabold text-[11px]">
            Sujeito
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#EC4899]/15 text-[#BE185D] font-extrabold text-[11px]">
            Conector Causal
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#059669] font-extrabold text-[11px]">
            Objeto Direto
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/15 text-[#B45309] font-extrabold text-[11px]">
            Infinitivo &amp; Modal
          </span>
        </div>

        {/* Dropzone Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#111C2D]">
              Reorganize os blocos para completar a frase do áudio:
            </span>
            {selectedTokens.length > 0 && (
              <button
                type="button"
                onClick={handleClearSlots}
                className="text-xs font-bold text-[#64748B] hover:text-[#EF4444] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar slots</span>
              </button>
            )}
          </div>

          <div className="min-h-24 p-4 rounded-2xl bg-[#FDFBF7] border-2 border-dashed border-stone-300 flex flex-wrap items-center gap-2.5">
            {/* Fixed Lead Anchor */}
            <div className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-sm font-black text-[#111C2D] shadow-[0_2px_0_#CBD5E1] flex items-center gap-2">
              <span>{config.leadAnchor}</span>
              <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>

            {/* User Selected Tokens */}
            <AnimatePresence>
              {selectedTokens.map((token) => (
                <motion.button
                  key={token.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  whileTap={{ y: 2 }}
                  onClick={() => handleRemoveWord(token)}
                  className="px-4 py-2 rounded-xl bg-white text-sm font-black text-[#111C2D] border-2 shadow-[0_3px_0_#CBD5E1] cursor-pointer hover:bg-red-50 transition-colors flex items-center gap-1.5"
                  style={{ borderColor: token.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: token.color }} />
                  <span>{token.text}</span>
                </motion.button>
              ))}
            </AnimatePresence>

            {selectedTokens.length === 0 && (
              <span className="text-xs text-[#94A3B8] italic">
                Toque nas palavras abaixo para construir a subordinada...
              </span>
            )}
          </div>
        </div>

        {/* Word Bank */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase text-[#64748B] tracking-wider">
            Banco de Palavras Táteis (Clique para inserir ou remover):
          </span>

          <div className="flex flex-wrap gap-2.5">
            {bankTokens.map((token) => (
              <motion.button
                key={token.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ y: 2 }}
                onClick={() => handleSelectWord(token)}
                className="px-4 py-2.5 rounded-xl bg-white border border-stone-200/90 text-sm font-black text-[#111C2D] shadow-[0_4px_0_#CBD5E1] active:shadow-[0_1px_0_#CBD5E1] cursor-pointer hover:bg-stone-50 transition-all flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: token.color }} />
                <span>{token.text}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback === "correct" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/40 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center font-bold">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#047857]">
                  Exato! Sintaxe Perfeita em Nível B1
                </h4>
                <p className="text-xs text-[#065F46] mt-0.5">
                  Conjunção subordinativa <em>weil</em> arremessou o verbo modal <em>will</em> para a posição final. +150 XP!
                </p>
              </div>
            </div>
            <TactileButton onClick={() => router.push("/summary")} variant="primary" size="sm">
              Continuar ➔
            </TactileButton>
          </motion.div>
        )}

        {feedback === "wrong" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#EF4444]/40 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EF4444] text-white flex items-center justify-center font-bold">
                ✕
              </div>
              <div>
                <h4 className="text-sm font-black text-[#B91C1C]">
                  Atenção à Ordem dos Verbos!
                </h4>
                <p className="text-xs text-[#991B1B] mt-0.5">
                  Lembre-se da dica de Da Vinci: o verbo modal conjugado deve ir ao final absoluto da oração subordinada.
                </p>
              </div>
            </div>
            <TactileButton onClick={handleClearSlots} variant="secondary" size="sm">
              Tentar Novamente
            </TactileButton>
          </motion.div>
        )}
      </TactileCard>

      {/* ======================================================== */}
      {/* 4. FOOTER CONTROLS                                       */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => router.push("/summary")}
          className="text-xs font-bold text-[#64748B] hover:text-[#111C2D] px-4 py-3 rounded-2xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          Ainda não aprendi isto (Pular)
        </button>

        <span className="hidden md:inline text-xs text-[#94A3B8]">
          Dica rápida: <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-700">Espaço</kbd> Áudio •{" "}
          <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-700">Enter</kbd> Validar
        </span>

        <TactileButton
          onClick={handleVerify}
          variant="primary"
          size="lg"
          disabled={selectedTokens.length === 0}
          className="w-full sm:w-auto px-8 py-4 font-black flex items-center justify-center gap-2"
        >
          <span>Verificar Resposta</span>
          <ArrowRight className="w-5 h-5" />
        </TactileButton>
      </div>
    </div>
  );
}
