import React, { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "expo-router";
import {
  Volume2,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Brain,
  Headphones,
  BookOpen,
  Mic,
  Puzzle,
  ThumbsUp,
  Activity,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Check,
  Repeat,
  Radio,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { AppShell } from "@/components/tactile/app-shell";
import { Flag } from "@/components/shell/flag";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { languageName } from "@/lib/languages";
import { tap } from "@/lib/haptics";
import { SpeechCadenceEngine } from "@/services/speech-cadence";
import {
  LanguageMatrixEngine,
  type CardItem,
} from "@/services/contentService";

export default function DailyRoute() {
  const router = useRouter();
  const session = useSession();
  const {
    addXp,
    activeMentor,
    targetLang,
    supportLang,
    uiLang,
    rateFSRSCard,
  } = useProsa();

  const cards = LanguageMatrixEngine.getDeckForCourse(targetLang);
  const speechLang = LanguageMatrixEngine.getBCP47(targetLang);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isCardsComplete, setIsCardsComplete] = useState(false);
  const [isRevealed, setIsRevealed] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showIpa, setShowIpa] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; xp: number } | null>(null);

  // Countdown timer: 08:45 (525 seconds)
  const [secondsLeft, setSecondsLeft] = useState(525);

  // Phase 1 (Áudio & Ritmo) state
  const [audioSpeed, setAudioSpeed] = useState<"0.8x" | "1.0x" | "1.2x">("1.0x");
  const [isShadowLoop, setIsShadowLoop] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  // Phase 2 (Sintaxe) state
  const [selectedSyntaxBlock, setSelectedSyntaxBlock] = useState<number | null>(0);
  const [syntaxQuizAnswer, setSyntaxQuizAnswer] = useState<string | null>(null);

  // Phase 3 (Cadência) state
  const [isRecordingCadence, setIsRecordingCadence] = useState(false);
  const [cadenceScore, setCadenceScore] = useState<number | null>(null);
  const engineRef = useRef<SpeechCadenceEngine | null>(null);
  const cadenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 4 (Reconstrução) state
  const [reconstructionSlots, setReconstructionSlots] = useState<string[]>([]);
  const [reconstructionBank, setReconstructionBank] = useState<string[]>([]);
  const [reconstructionStatus, setReconstructionStatus] = useState<"idle" | "correct" | "error">("idle");

  const currentCard = cards[currentIdx] || cards[0];

  // Helper to build tokens bank for reconstruction
  const buildBankForCard = useCallback((card: CardItem) => {
    const clean = card.targetPhrase.replace(/[“”".,]/g, "").trim();
    const tokens = clean.split(/\s+/);
    // Add distractors
    const distractors = ["sempre", "quando", "também", "also", "immer", "toujours"];
    const merged = [...tokens, distractors[0], distractors[1]];
    // Shuffle
    return merged.sort(() => 0.5 - Math.random());
  }, []);

  // Reset state whenever target language or course changes
  useEffect(() => {
    setCurrentIdx(0);
    setIsCardsComplete(false);
    setSelectedSyntaxBlock(0);
    setSyntaxQuizAnswer(null);
    setCadenceScore(null);
    setReconstructionSlots([]);
    setReconstructionStatus("idle");
    if (cards[0]) {
      setReconstructionBank(buildBankForCard(cards[0]));
    }
  }, [targetLang, buildBankForCard]);

  // Keep reconstruction bank in sync with card
  useEffect(() => {
    if (currentCard) {
      setReconstructionBank(buildBankForCard(currentCard));
      setReconstructionSlots([]);
      setReconstructionStatus("idle");
    }
  }, [currentCard, buildBankForCard]);

  useEffect(() => {
    engineRef.current = new SpeechCadenceEngine();
    return () => {
      if (engineRef.current) engineRef.current.stopListening();
      if (cadenceTimeoutRef.current) clearTimeout(cadenceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 1200));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handlePlayAudio = useCallback(
    (customSpeed?: number) => {
      void tap("medium");
      setIsPlayingAudio(true);
      setHasPlayedAudio(true);
      if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const cleanText = currentCard.targetPhrase.replace(/[“”"]/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = speechLang;
        const speedRate =
          customSpeed ||
          (audioSpeed === "0.8x" ? 0.75 : audioSpeed === "1.2x" ? 1.15 : 0.95);
        utterance.rate = speedRate;
        window.speechSynthesis.speak(utterance);
      }
      setTimeout(() => setIsPlayingAudio(false), 2400);
    },
    [currentCard.targetPhrase, audioSpeed, speechLang]
  );

  const triggerToast = (text: string, xpGain = 10) => {
    if (xpGain > 0) addXp(xpGain);
    setFeedbackToast({ text, xp: xpGain });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleRate = useCallback(
    (rating: "again" | "hard" | "good" | "easy") => {
      void tap("light");
      let xpEarned = 10;
      let label = "Bom";

      if (rating === "again") {
        xpEarned = 5;
        label = "Errei (+5 XP)";
      } else if (rating === "hard") {
        xpEarned = 10;
        label = "Difícil (+10 XP)";
      } else if (rating === "good") {
        xpEarned = 15;
        label = "Bom (+15 XP)";
      } else if (rating === "easy") {
        xpEarned = 25;
        label = "Fácil (+25 XP)";
      }

      rateFSRSCard(String(currentCard.id), rating);
      triggerToast(label, xpEarned);
      handlePlayAudio();

      setTimeout(() => {
        if (currentIdx + 1 < cards.length) {
          setCurrentIdx((prev) => prev + 1);
          setIsRevealed(true);
        } else {
          setIsCardsComplete(true);
          triggerToast("🎉 Lote FSRS Concluído! +50 XP", 50);
        }
      }, 500);
    },
    [handlePlayAudio, cards.length, currentIdx, currentCard.id, rateFSRSCard]
  );

  // Keyboard navigation for Phase 0
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseIndex !== 0 || isCardsComplete) return;
      if (e.key === "1") handleRate("again");
      else if (e.key === "2") handleRate("hard");
      else if (e.key === "3") handleRate("good");
      else if (e.key === "4") handleRate("easy");
      else if (e.code === "Space") {
        e.preventDefault();
        handlePlayAudio();
      } else if (e.key === "Enter") {
        setIsRevealed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phaseIndex, handleRate, handlePlayAudio, isCardsComplete]);

  // Phase 3 Cadence Recording with Real Mic Engine
  const handleRecordCadence = async () => {
    void tap("medium");
    if (!isRecordingCadence) {
      setIsRecordingCadence(true);
      setCadenceScore(null);
      if (engineRef.current) {
        await engineRef.current.startListening(speechLang);
      }
      cadenceTimeoutRef.current = setTimeout(() => {
        if (engineRef.current) {
          const res = engineRef.current.stopListening(currentCard.targetPhrase);
          setIsRecordingCadence(false);
          setCadenceScore(res.accuracy);
          void tap("success");
          triggerToast(`Gravação analisada: ${res.accuracy}% de Precisão Rítmica!`, 25);
        }
      }, 3500);
    } else {
      if (cadenceTimeoutRef.current) clearTimeout(cadenceTimeoutRef.current);
      setIsRecordingCadence(false);
      let res = { accuracy: 96 };
      if (engineRef.current) {
        res = engineRef.current.stopListening(currentCard.targetPhrase);
      }
      setCadenceScore(res.accuracy);
      void tap("success");
      triggerToast(`Gravação analisada: ${res.accuracy}% de Precisão Rítmica!`, 25);
    }
  };

  // Phase 4 Reconstruction token handling
  const handleAddTokenToSlot = (token: string, bankIdx: number) => {
    void tap("light");
    setReconstructionSlots((prev) => [...prev, token]);
    setReconstructionBank((prev) => prev.filter((_, idx) => idx !== bankIdx));
    setReconstructionStatus("idle");
  };

  const handleRemoveTokenFromSlot = (slotIdx: number) => {
    void tap("light");
    const token = reconstructionSlots[slotIdx];
    setReconstructionSlots((prev) => prev.filter((_, idx) => idx !== slotIdx));
    setReconstructionBank((prev) => [...prev, token]);
    setReconstructionStatus("idle");
  };

  const handleVerifyReconstruction = () => {
    const constructed = reconstructionSlots.join(" ").trim().toLowerCase();
    const cleanTarget = currentCard.targetPhrase.replace(/[“”".,]/g, "").trim().toLowerCase();
    if (constructed === cleanTarget) {
      void tap("success");
      setReconstructionStatus("correct");
      triggerToast("Reconstrução Perfeita! +50 XP", 50);
    } else {
      void tap("heavy");
      setReconstructionStatus("error");
    }
  };

  const intuitivePronunciation =
    currentCard.intuitivePronunciation[supportLang] ||
    currentCard.intuitivePronunciation["pt-BR"] ||
    currentCard.intuitivePronunciation["en"] ||
    "";

  const localizedTranslation = LanguageMatrixEngine.getLocalizedText(
    currentCard.translation,
    supportLang,
    currentCard.translation["pt-BR"] || ""
  );

  const localizedCulturalNote = LanguageMatrixEngine.getLocalizedText(
    currentCard.culturalNote,
    supportLang,
    currentCard.culturalNote["pt-BR"] || ""
  );

  const PHASES = [
    { id: 0, label: "1. FSRS Cards", icon: "🎴", desc: "Repetição Espaçada" },
    { id: 1, label: "2. Áudio & Ritmo", icon: "🎧", desc: "Shadowing Neural" },
    { id: 2, label: "3. Sintaxe", icon: "📖", desc: "Decomposição em Blocos" },
    { id: 3, label: "4. Cadência", icon: "🎙️", desc: "Radar de Prosódia" },
    { id: 4, label: "5. Reconstrução", icon: "🧩", desc: "Montagem Sináptica" },
  ];

  const flagCode = targetLang === "en" ? "gb" : targetLang === "ja" ? "jp" : targetLang;

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ======================================================== */}
        {/* 1. TOP SESSION NAVIGATION BAR: 5 RITUAL BUTTONS          */}
        {/* ======================================================== */}
        <header className="bg-white rounded-3xl p-4 lg:p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Phase Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {PHASES.map((phase) => {
              const active = phase.id === phaseIndex;
              const isPast = phase.id < phaseIndex;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => {
                    void tap("light");
                    setPhaseIndex(phase.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs select-none transition-all cursor-pointer ${
                    active
                      ? "bg-[#0D9488] text-white shadow-[0_4px_0_#0F766E] translate-y-0"
                      : isPast
                      ? "bg-teal-50 text-[#0D9488] border border-teal-200"
                      : "bg-[#F5F0E8] text-[#94A3B8] hover:text-stone-700"
                  }`}
                >
                  <span className="text-sm">{phase.icon}</span>
                  <span>{phase.label}</span>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Timer & Booster HUD */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 font-mono text-xs font-bold border border-stone-200">
              <Clock size={14} className="text-[#0D9488]" />
              <span>{formatTimer(secondsLeft)} / 20:00</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black shadow-xs">
              <Flame size={14} className="text-amber-500 fill-amber-500" />
              <span>2x XP Ativo</span>
            </div>
          </div>
        </header>

        {/* Dynamic Toast Feedback Pill */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-20 right-8 z-50 px-4 py-2 rounded-2xl bg-teal-800 text-white font-bold text-xs shadow-lg flex items-center gap-2 border border-teal-600 pointer-events-none"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>{feedbackToast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* 2. MAIN ACTIVE WORKSPACE ACCORDING TO PHASE INDEX        */}
        {/* ======================================================== */}
        <div className="space-y-6">
          {/* ETAPA 0: FSRS CARDS */}
          {phaseIndex === 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive 3D FSRS Card (8 Cols) */}
              <div className="lg:col-span-8 space-y-4">
                {isCardsComplete ? (
                  <TactileCard className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-5">
                    <div className="w-16 h-16 rounded-3xl bg-teal-100 text-[#0D9488] flex items-center justify-center text-3xl shadow-[0_4px_0_#0D9488]">
                      🎉
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-[#111C2D]">
                        Baralho do Dia Concluído!
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                        Você revisou todos os cartões FSRS de hoje com sucesso. O algoritmo
                        recalibrou suas curvas de esquecimento.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
                      <div className="px-4 py-2 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700">
                        ⚡ +75 XP Acumulados
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-xs font-bold text-[#0D9488]">
                        🧠 Retenção FSRS: 94%
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          void tap("success");
                          setPhaseIndex(1);
                        }}
                        className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#0D9488] text-white font-extrabold text-sm shadow-[0_4px_0_#0F766E] hover:opacity-95 active:translate-y-1 transition-all cursor-pointer"
                      >
                        <span>Avançar para Etapa 2: Áudio & Ritmo</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </TactileCard>
                ) : (
                  <>
                    <TactileCard className="min-h-[400px] flex flex-col justify-between p-6 sm:p-8 relative">
                      {/* Card Header Meta */}
                      <div className="flex items-center justify-between border-b-2 border-[#F5F0E8] pb-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-lg bg-[#E7EEFF] text-[#00685F] font-extrabold text-xs flex items-center gap-1.5">
                            <Flag code={flagCode} size={14} />
                            <span>{currentCard.level}</span>
                          </span>
                          <span className="text-[#64748B] text-xs font-semibold">
                            Cartão #{currentIdx + 1} de {cards.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#059669] font-extrabold text-xs">
                            <Brain className="w-3.5 h-3.5" />
                            <span>FSRS Retenção: 91%</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePlayAudio()}
                            title="Ouvir Áudio Nativo"
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-[0_2px_0_#CBD5E1] cursor-pointer ${
                              isPlayingAudio
                                ? "bg-[#0D9488] text-white scale-110"
                                : "bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488] hover:text-white"
                            }`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Core Content */}
                      <div className="my-auto py-6 space-y-4">
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                            Frase Alvo ({languageName(targetLang)})
                          </span>
                          <h2 className="font-serif text-2xl sm:text-3xl text-[#111C2D] font-bold leading-relaxed tracking-tight">
                            {currentCard.targetPhrase}
                          </h2>
                        </div>

                        {/* Phonetics Pronunciation Helper: Intuitive by default + discreet IPA toggle */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F0E8] text-[#3D4947] font-sans font-medium text-xs">
                          <Mic className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          {showIpa ? (
                            <span className="font-mono text-xs text-stone-700">
                              {currentCard.ipa}
                            </span>
                          ) : (
                            <span
                              className="text-xs text-stone-800"
                              dangerouslySetInnerHTML={{ __html: intuitivePronunciation }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setShowIpa((prev) => !prev)}
                            className={`ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                              showIpa
                                ? "bg-[#0D9488] text-white font-bold"
                                : "bg-stone-200/90 hover:bg-stone-300 text-stone-700 font-semibold"
                            }`}
                            title={
                              showIpa
                                ? "Mostrar pronúncia intuitiva natural"
                                : "Exibir transcrição fonética IPA"
                            }
                          >
                            {showIpa ? "Intuitiva" : "IPA"}
                          </button>
                        </div>

                        {/* Translation Drawer / Flip State */}
                        <div
                          className={`pt-3 border-t border-dashed border-stone-300 transition-all duration-300 ${
                            isRevealed ? "opacity-100" : "opacity-10 blur-sm select-none"
                          }`}
                        >
                          <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                            Tradução ({languageName(supportLang)})
                          </span>
                          <p className="text-base sm:text-lg text-[#0D9488] font-bold mt-0.5">
                            {localizedTranslation}
                          </p>
                          <p className="text-xs text-[#64748B] mt-1 italic">
                            {localizedCulturalNote}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom Bar: Quick Flip Toggle */}
                      <div className="flex items-center justify-between pt-4 border-t-2 border-[#F5F0E8]">
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Intervalo anterior: 1 dia atrás</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsRevealed((prev) => !prev)}
                          className="flex items-center gap-1 text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Ocultar Reverso (Espaço)</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Alternar Reverso (Espaço)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </TactileCard>

                    {/* 4 Chunky 3D FSRS Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("again")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#FECACA] shadow-[0_4px_0_#EF4444] hover:shadow-[0_2px_0_#EF4444] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mb-1.5" />
                        <span className="font-extrabold text-xs text-[#111C2D]">Errei</span>
                        <span className="text-[10px] text-[#64748B] font-mono mt-0.5">1m · [1]</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("hard")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#FED7AA] shadow-[0_4px_0_#F97316] hover:shadow-[0_2px_0_#F97316] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F97316] mb-1.5" />
                        <span className="font-extrabold text-xs text-[#111C2D]">Difícil</span>
                        <span className="text-[10px] text-[#64748B] font-mono mt-0.5">12h · [2]</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("good")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#A7F3D0] shadow-[0_4px_0_#10B981] hover:shadow-[0_2px_0_#10B981] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mb-1.5" />
                        <span className="font-extrabold text-xs text-[#111C2D]">Bom</span>
                        <span className="text-[10px] text-[#64748B] font-mono mt-0.5">3d · [3]</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ y: 3 }}
                        onClick={() => handleRate("easy")}
                        className="group flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border-2 border-[#BAE6FD] shadow-[0_4px_0_#0284C7] hover:shadow-[0_2px_0_#0284C7] transition-all cursor-pointer select-none"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] mb-1.5" />
                        <span className="font-extrabold text-xs text-[#111C2D]">Fácil</span>
                        <span className="text-[10px] text-[#64748B] font-mono mt-0.5">7d · [4]</span>
                      </motion.button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 px-1">
                      <span className="font-mono">1-4 · Avaliar</span>
                      <span className="font-mono">Espaço · Áudio</span>
                      <span className="font-mono">Fila Ativa: {currentIdx + 1} de {cards.length}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Dynamic Syntax Decomposition & Cadence Radar (4 Cols) */}
              <div className="lg:col-span-4 space-y-5">
                {/* Decomposição Sintática */}
                <TactileCard className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#0D9488]" />
                      <h3 className="font-extrabold text-sm text-[#111C2D]">
                        Decomposição Sintática
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-bold text-xs">
                      {currentCard.syntax.length} Partes
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B]">
                    Observe como as funções gramaticais se encaixam como blocos táteis colecionáveis:
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    {currentCard.syntax.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#F5F0E8] border-2 border-stone-200/80 shadow-[0_3px_0_#CBD5E1] flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[10px] uppercase font-extrabold tracking-wider"
                            style={{ color: item.color }}
                          >
                            {item.role}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                        <span className="font-extrabold text-xs text-[#111C2D]">
                          {item.word}
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </TactileCard>

                {/* Radar de Cadência Preview */}
                <TactileCard className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#FF5722]" />
                      <h3 className="font-extrabold text-sm text-[#111C2D]">
                        Radar de Cadência
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#059669] font-extrabold text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{cadenceScore ? `${cadenceScore}% Ritmo` : "Calibração"}</span>
                    </div>
                  </div>

                  <div className="relative bg-[#18181B] rounded-2xl p-4 overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#6BD8CB]" />
                        Nativo ({languageName(targetLang)})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FEA619]" />
                        Sua Voz
                      </span>
                    </div>

                    <div className="w-full h-16 flex items-center justify-center">
                      <svg
                        className="w-full h-full stroke-linecap-round"
                        fill="none"
                        viewBox="0 0 400 80"
                      >
                        <path
                          className="opacity-90"
                          d="M0,40 Q25,10 50,40 T100,40 T150,5 T200,40 T250,75 T300,40 T350,15 T400,40"
                          stroke="#6BD8CB"
                          strokeWidth="2.5"
                        />
                        <path
                          className="opacity-80"
                          d="M0,40 Q25,14 50,40 T100,38 T150,10 T200,42 T250,70 T300,40 T350,20 T400,40"
                          stroke="#FEA619"
                          strokeDasharray="3,3"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[9px] text-zinc-400 font-mono">
                      <span>0.0s</span>
                      <span>1.4s (Pausa)</span>
                      <span>2.8s</span>
                    </div>
                  </div>
                </TactileCard>
              </div>
            </div>
          )}

          {/* ETAPA 1: ÁUDIO & RITMO */}
          {phaseIndex === 1 && (
            <motion.div
              key="phase-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <TactileCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-[#0D9488]" />
                    <h3 className="font-extrabold text-lg text-[#111C2D]">
                      Imersão Auditiva & Shadowing Neural
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-teal-50 text-[#0D9488] font-bold text-xs">
                    Etapa 2 de 5
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                    Frase de Treino Auditivo ({languageName(targetLang)})
                  </span>
                  <p className="font-serif text-2xl sm:text-3xl font-bold text-[#111C2D]">
                    {currentCard.targetPhrase}
                  </p>
                  <p className="text-sm text-[#0D9488] font-semibold">
                    {localizedTranslation}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio()}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_4px_0_#0F766E] hover:opacity-95 active:translate-y-1 transition-all cursor-pointer"
                  >
                    <Volume2 size={16} />
                    <span>{isPlayingAudio ? "Reproduzindo..." : "Ouvir com Cadência Nativa"}</span>
                  </button>

                  <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
                    {(["0.8x", "1.0x", "1.2x"] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          setAudioSpeed(spd);
                          handlePlayAudio(spd === "0.8x" ? 0.75 : spd === "1.2x" ? 1.15 : 1.0);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          audioSpeed === spd
                            ? "bg-[#0D9488] text-white shadow-xs"
                            : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => {
                      triggerToast("Áudio Dominado! +25 XP", 25);
                      setPhaseIndex(2);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_4px_0_#0F766E] hover:opacity-95 cursor-pointer"
                  >
                    <span>Avançar para Decomposição Sintática (+25 XP)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </TactileCard>
            </motion.div>
          )}

          {/* ETAPA 2: SINTAXE */}
          {phaseIndex === 2 && (
            <motion.div
              key="phase-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <TactileCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#855300]" />
                    <h3 className="font-extrabold text-lg text-[#111C2D]">
                      Oficina de Sintaxe Estrutural
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-[#855300] font-bold text-xs">
                    Etapa 3 de 5
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {currentCard.syntax.map((block, idx) => {
                    const isSelected = selectedSyntaxBlock === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSyntaxBlock(idx)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white border-[#0D9488] shadow-[0_4px_0_#0F766E] scale-[1.02]"
                            : "bg-[#F5F0E8] border-stone-200/80 shadow-[0_2px_0_#CBD5E1] hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-[10px] uppercase font-black tracking-wider"
                            style={{ color: block.color }}
                          >
                            {block.role}
                          </span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: block.color }}
                          />
                        </div>
                        <span className="text-base font-black text-[#111C2D] block">
                          {block.word}
                        </span>
                        <span className="text-xs text-[#64748B] block mt-0.5">
                          {block.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedSyntaxBlock !== null && currentCard.syntax[selectedSyntaxBlock] && (
                  <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-start gap-3">
                    <Brain className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-xs text-teal-900 block mb-1">
                        Função: {currentCard.syntax[selectedSyntaxBlock].role}
                      </span>
                      <p className="text-xs text-teal-800 leading-relaxed">
                        {LanguageMatrixEngine.getLocalizedText(
                          currentCard.syntax[selectedSyntaxBlock].explanation,
                          supportLang,
                          "Função gramatical canônica estruturando a oração no padrão CEFR."
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerToast("Sintaxe Concluída! +30 XP", 30);
                      setPhaseIndex(3);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_4px_0_#0F766E] hover:opacity-95 cursor-pointer"
                  >
                    <span>Avançar para Radar de Cadência (+30 XP)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </TactileCard>
            </motion.div>
          )}

          {/* ETAPA 3: CADÊNCIA */}
          {phaseIndex === 3 && (
            <motion.div
              key="phase-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <TactileCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-[#FF5722]" />
                    <h3 className="font-extrabold text-lg text-[#111C2D]">
                      Radar de Cadência Acústica & Prosódia
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#FF5722]/10 text-[#FF5722] font-bold text-xs">
                    Etapa 4 de 5
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                    Frase para Gravação de Voz ({languageName(targetLang)})
                  </span>
                  <p className="font-serif text-2xl font-bold text-[#111C2D]">
                    {currentCard.targetPhrase}
                  </p>
                  <p className="text-xs text-stone-600">
                    Fale em voz alta. O espectrógrafo analisará a precisão silábica e o contorno entonacional.
                  </p>
                </div>

                {/* Dual Spectrogram Box */}
                <div className="bg-[#18181B] rounded-2xl p-5 text-white shadow-inner space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      Modelo Nativo ({languageName(targetLang)})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722]" />
                      {isRecordingCadence ? "Gravando voz..." : cadenceScore ? `${cadenceScore}% Precisão` : "Sua Voz (Pendente)"}
                    </span>
                  </div>

                  <div className="w-full h-24 flex items-center justify-center relative">
                    <svg
                      className="w-full h-full stroke-linecap-round"
                      fill="none"
                      viewBox="0 0 400 90"
                    >
                      <path
                        d="M0,45 Q30,10 60,45 T120,45 T180,12 T240,45 T300,78 T360,45 T400,20"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        className="opacity-90"
                      />
                      <motion.path
                        d={
                          isRecordingCadence || cadenceScore
                            ? "M0,45 Q30,15 60,45 T120,42 T180,18 T240,48 T300,72 T360,45 T400,26"
                            : "M0,45 L400,45"
                        }
                        stroke="#FF5722"
                        strokeWidth="2.5"
                        strokeDasharray={isRecordingCadence ? "4,4" : undefined}
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                  <button
                    type="button"
                    onClick={handleRecordCadence}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-xs shadow-md transition-all cursor-pointer ${
                      isRecordingCadence
                        ? "bg-[#EF4444] text-white animate-pulse"
                        : "bg-[#0D9488] text-white hover:opacity-95 shadow-[0_4px_0_#0F766E]"
                    }`}
                  >
                    <Mic size={16} />
                    <span>{isRecordingCadence ? "Gravando voz (Fale agora)..." : cadenceScore ? "Gravar Novamente" : "Gravar Minha Pronúncia"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerToast("Cadência Concluída! +35 XP", 35);
                      setPhaseIndex(4);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_4px_0_#0F766E] hover:opacity-95 cursor-pointer"
                  >
                    <span>Avançar para Reconstrução (+35 XP)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </TactileCard>
            </motion.div>
          )}

          {/* ETAPA 4: RECONSTRUÇÃO */}
          {phaseIndex === 4 && (
            <motion.div
              key="phase-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <TactileCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <div className="flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-lg text-[#111C2D]">
                      Reconstrução Neural de Sentenças
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#0F766E] font-bold text-xs">
                    Etapa Final
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
                    Tradução ({languageName(supportLang)}):
                  </span>
                  <p className="font-serif text-xl sm:text-2xl font-bold text-[#111C2D]">
                    {localizedTranslation}
                  </p>
                </div>

                {/* Assembly Slots Area */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-600 block">
                    Área de Montagem da Frase em {languageName(targetLang)}:
                  </span>
                  <div className="min-h-[72px] p-4 rounded-2xl bg-[#F5F0E8] border-2 border-dashed border-stone-300 flex flex-wrap gap-2 items-center">
                    {reconstructionSlots.length === 0 ? (
                      <span className="text-xs text-stone-400 italic">
                        Clique nas palavras abaixo para adicioná-las na ordem correta...
                      </span>
                    ) : (
                      reconstructionSlots.map((tok, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRemoveTokenFromSlot(idx)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_2px_0_#0F766E] flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{tok}</span>
                          <span className="text-teal-200 hover:text-white">×</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Token Bank */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-600 block">
                    Banco de Palavras & Conectores:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {reconstructionBank.map((tok, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddTokenToSlot(tok, idx)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 font-bold text-xs shadow-[0_3px_0_#CBD5E1] hover:bg-stone-50 cursor-pointer"
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status & Validation Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs">
                    {reconstructionStatus === "correct" && (
                      <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                        <CheckCircle2 size={16} /> Frase Reconstruída com Sucesso!
                      </span>
                    )}
                    {reconstructionStatus === "error" && (
                      <span className="text-rose-600 font-bold">
                        Ordem incorreta. Verifique a ordem sintática da oração.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReconstructionSlots([]);
                        setReconstructionBank(buildBankForCard(currentCard));
                        setReconstructionStatus("idle");
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      Reiniciar
                    </button>

                    {reconstructionStatus === "correct" ? (
                      <button
                        type="button"
                        onClick={() => router.push("/summary")}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#10B981] text-white font-extrabold text-xs shadow-[0_4px_0_#059669] hover:opacity-95 cursor-pointer"
                      >
                        <Sparkles size={16} />
                        <span>Concluir Sessão Diária de 20m 🏆</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyReconstruction}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0D9488] text-white font-extrabold text-xs shadow-[0_4px_0_#0F766E] hover:opacity-95 cursor-pointer"
                      >
                        <Check size={16} />
                        <span>Verificar Ordem Sintática</span>
                      </button>
                    )}
                  </div>
                </div>
              </TactileCard>
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
