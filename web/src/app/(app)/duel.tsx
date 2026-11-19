import React, { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  Volume2,
  Flame,
  Zap,
  Clock,
  Sparkles,
  Award,
  Shield,
  Snowflake,
  Target,
  Flag,
  CheckCircle2,
  XCircle,
  Mic,
} from "lucide-react";
import { AppShell } from "@/components/tactile/app-shell";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { Flag as CountryFlag } from "@/components/shell/flag";
import { tap } from "@/lib/haptics";
import {
  LanguageMatrixEngine,
  type DuelQuestion,
} from "@/services/contentService";
import { speechService } from "@/services/speechService";
import { languageName } from "@/lib/languages";

const ELENA_AVATAR = "/cast/clara.png";
const FEYNMAN_AVATAR = "/cast/feynman.png";

export default function DuelScreen() {
  const session = useSession();
  const { addXp, userName, targetLang, supportLang, uiLang, activeMentor } = useProsa();

  const questions = LanguageMatrixEngine.getDuelQuestions(targetLang);
  const speechLang = LanguageMatrixEngine.getBCP47(targetLang);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [playerScore, setPlayerScore] = useState(1450);
  const [opponentScore, setOpponentScore] = useState(1280);
  const [combo, setCombo] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(84);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [freezeActive, setFreezeActive] = useState(false);
  const [showIpa, setShowIpa] = useState(false);

  const playerName = userName || session?.user?.display_name || "Você";

  const currentQ = questions[questionIdx % questions.length] || questions[0];

  // Opponent autonomous scoring interval
  useEffect(() => {
    if (freezeActive) return;
    const oppTimer = setInterval(() => {
      setOpponentScore((prev) => prev + Math.floor(Math.random() * 25) + 15);
    }, 2800);
    return () => clearInterval(oppTimer);
  }, [freezeActive]);

  // Round countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalScore = playerScore + opponentScore;
  const playerPercent = totalScore > 0 ? Math.round((playerScore / totalScore) * 100) : 50;
  const opponentPercent = 100 - playerPercent;

  const handleChoice = useCallback(
    (key: string, isCorrect: boolean) => {
      if (selectedKey !== null) return;
      setSelectedKey(key);

      if (isCorrect) {
        void tap("success");
        const points = 180 + combo * 20;
        setPlayerScore((prev) => prev + points);
        setCombo((prev) => prev + 1);
        addXp(15);
      } else {
        void tap("heavy");
        setCombo(0);
      }

      setTimeout(() => {
        setSelectedKey(null);
        setQuestionIdx((prev) => (prev + 1) % questions.length);
      }, 700);
    },
    [selectedKey, combo, addXp, questions.length]
  );

  // Keyboard navigation
  useEffect(() => {
    if (Platform.OS !== "web" || !currentQ) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const keyUpper = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(keyUpper)) {
        const option = currentQ.options.find((o) => o.key === keyUpper);
        if (option) {
          handleChoice(option.key, option.correct);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentQ, handleChoice]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handlePronounce = () => {
    void tap("light");
    const cleanWord = currentQ.word.replace(/[“”"«»]/g, "");
    speechService.speak(cleanWord, {
      lang: speechLang,
      speed: "0.8x",
      mentorId: activeMentor?.id || "feynman",
    });
  };

  const handleFreeze = () => {
    if (freezeActive) return;
    void tap("medium");
    setFreezeActive(true);
    setTimeout(() => setFreezeActive(false), 5000);
  };

  const intuitive =
    currentQ.intuitivePronunciation[supportLang] ||
    currentQ.intuitivePronunciation["pt-BR"] ||
    currentQ.intuitivePronunciation["en"] ||
    "";

  const targetFlag = targetLang === "en" ? "gb" : targetLang === "ja" ? "jp" : targetLang;
  const supportFlag = supportLang === "en" ? "gb" : supportLang === "pt-BR" || supportLang === "pt" ? "br" : supportLang;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-16">
      {/* ======================================================== */}
      {/* 1. TOP ARENA STATUS BANNER                               */}
      {/* ======================================================== */}
      <section className="w-full rounded-2xl bg-white p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8B5CF6]/15 text-2xl shadow-[0_3px_0_rgba(139,92,246,0.25)]">
            ⚔️
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-base text-[#111C2D]">
                Duelo Relâmpago 120s
              </span>
              <span className="text-[11px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-[#06B6D4]/15 text-[#0891B2]">
                Liga Diamante • Humboldt
              </span>
            </div>
            <span className="text-xs text-[#64748B] font-semibold flex items-center gap-1.5 flex-wrap">
              <span>Rodada {questionIdx + 1} de {questions.length} •</span>
              <CountryFlag code={targetFlag} size={14} />
              <span>{languageName(targetLang)} via {languageName(supportLang)}</span>
              <CountryFlag code={supportFlag} size={14} />
            </span>
          </div>
        </div>

        {/* Match Stakes Pills */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97706]/10 text-[#D97706] font-extrabold text-xs shadow-[0_2px_0_rgba(217,119,6,0.2)]">
            <span>⚡</span>
            <span>+250 XP em jogo</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06B6D4]/10 text-[#06B6D4] font-extrabold text-xs shadow-[0_2px_0_rgba(6,182,212,0.2)]">
            <span>💎</span>
            <span>50 Gemas</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981]/15 text-[#059669] font-extrabold text-xs shadow-[0_2px_0_rgba(16,185,129,0.2)]">
            <Award className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Bônus Feynman Ativo (+20%)</span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. LIVE TUG-OF-WAR COMBAT HUD                            */}
      {/* ======================================================== */}
      <section className="w-full rounded-3xl bg-white p-4 sm:p-6 shadow-[0_6px_0_#E2E8F0] border border-stone-200/80 relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Player (Left Player) */}
          <div className="md:col-span-4 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center font-black text-xl shadow-[0_4px_0_#0F766E]">
                {playerName[0]?.toUpperCase() ?? "V"}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-[#0D9488] text-[10px] font-extrabold text-white shadow-[0_2px_0_#0F766E]">
                PRO
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#111C2D] truncate">
                  {playerName}
                </span>
                <CountryFlag code={supportFlag} size={14} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-[#0D9488]">
                  {playerScore.toLocaleString("pt-BR")}
                </span>
                <span className="text-[11px] font-bold text-[#64748B]">PTS</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#FF5722]/15 text-[#FF5722] ml-1">
                  🔥 {combo}x Combo
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-semibold flex-wrap">
                <span>{languageName(targetLang)} via {languageName(supportLang)}</span>
              </div>
            </div>
          </div>

          {/* Momentum Indicator Tug-of-War Center */}
          <div className="md:col-span-4 flex flex-col items-center gap-2">
            <div className="w-full flex items-center justify-between text-xs font-extrabold px-1 text-[#64748B]">
              <span className="text-[#0D9488] font-black">{playerPercent}% {playerName.split(" ")[0]}</span>
              <span className="text-[#B10E6B] font-black">Elena {opponentPercent}%</span>
            </div>

            {/* Bar Container */}
            <div className="w-full h-5 rounded-full bg-[#F5F0E8] p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] relative flex items-center">
              <div
                className="h-full rounded-l-full bg-gradient-to-r from-[#0D9488] to-[#6BD8CB] transition-all duration-300"
                style={{ width: `${playerPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full bg-[#FEA619] shadow-[0_0_12px_#FEA619] flex items-center justify-center text-xs animate-bounce"
                style={{ left: `${playerPercent}%` }}
              >
                ⚡
              </div>
              <div
                className="h-full rounded-r-full bg-gradient-to-r from-[#FB7185] to-[#B10E6B] transition-all duration-300"
                style={{ width: `${opponentPercent}%` }}
              />
            </div>

            <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">
              Vantagem de +{Math.abs(playerScore - opponentScore)} Pontos
            </span>
          </div>

          {/* Elena Rostova (Right Opponent) */}
          <div className="md:col-span-4 flex items-center justify-start md:justify-end gap-3 flex-row-reverse md:flex-row text-right">
            <div className="flex flex-col min-w-0 items-start md:items-end">
              <div className="flex items-center gap-2">
                <CountryFlag code="de" size={14} />
                <span className="font-extrabold text-sm text-[#111C2D] truncate">
                  Elena Rostova
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] mr-1">
                  ⚡ 4x
                </span>
                <span className="text-[11px] font-bold text-[#64748B]">PTS</span>
                <span className="font-extrabold text-xl text-[#B10E6B]">
                  {opponentScore.toLocaleString("pt-BR")}
                </span>
              </div>
              <span className="text-xs text-[#64748B] font-semibold">
                Poliglota · Berlim, Alemanha
              </span>
            </div>
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-[#B10E6B]/10 border border-[#B10E6B]/30 overflow-hidden shadow-[0_4px_0_#93005A]">
                <img
                  src={ELENA_AVATAR}
                  alt="Elena"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.tried) {
                      target.dataset.tried = "1";
                      target.src = "/assets/assets/cast/clara.png";
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. LIVE ROUND TIMER & SPRINT METER                       */}
      {/* ======================================================== */}
      <section className="w-full grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* Countdown Timer Block (5 cols) */}
        <div className="sm:col-span-5 rounded-3xl bg-white p-5 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-[0_3px_0_#CBD5E1] ${
                secondsLeft <= 20
                  ? "bg-[#FF5722] text-white shadow-[0_3px_0_#C2410C] animate-bounce"
                  : "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
              }`}
            >
              <Clock className="w-6 h-6 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-extrabold">
                Cronômetro Arena
              </span>
              <span className={`text-2xl font-black ${secondsLeft <= 20 ? "text-[#FF5722]" : "text-[#111C2D]"}`}>
                {formatTime(secondsLeft)}
              </span>
            </div>
          </div>
          <span className="text-xs uppercase tracking-wider text-[#FF5722] font-black">
            {secondsLeft <= 20 ? "⚠️ TEMPO CRÍTICO" : "Sprint Ativo"}
          </span>
        </div>

        {/* Combo Multiplier Meter (7 cols) */}
        <div className="sm:col-span-7 rounded-3xl bg-[#F5F0E8] p-5 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="font-extrabold text-base text-[#B10E6B]">
                {combo >= 5 ? "5x Hiper Combo!" : `${Math.min(3, Math.floor(combo / 2))}x Multiplicador!`}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#B10E6B]/15 text-[#B10E6B] font-extrabold text-xs animate-pulse">
              +60 PTS / seg
            </span>
          </div>

          {/* Flame Pips Meter */}
          <div className="my-2 flex items-center gap-2">
            <div className="flex-1 h-3.5 rounded-full bg-white p-0.5 shadow-[inset_0_2px_0_#CBD5E1] flex items-center gap-1.5 px-1">
              {[1, 2, 3, 4, 5].map((pip) => (
                <div
                  key={pip}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    pip <= (combo % 6)
                      ? pip >= 4
                        ? "bg-[#FEA619] shadow-[0_0_8px_#FEA619]"
                        : "bg-[#FF5722] shadow-[0_0_8px_#FF5722]"
                      : "bg-stone-300 opacity-40"
                  }`}
                />
              ))}
            </div>
            <span className="font-extrabold text-xs text-[#FF5722]">
              {combo % 6} / 5
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Faltam {Math.max(1, 5 - (combo % 5))} acertos para o <b>5x Hiper Combo</b></span>
            <Zap className="w-4 h-4 text-[#FF5722]" />
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* 4. MAIN BATTLE ARENA (LEFT 8 COLS) + SIDEBAR (4 COLS)  */}
      {/* ====================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: ACTIVE COMBAT FLASHCARD + SAGE (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Main Challenge Card */}
          <TactileCard className="p-6 sm:p-8 flex flex-col gap-6 relative">
            {/* Instant Bonus Micro-Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#10B981]/15 text-[#059669] font-extrabold text-xs shadow-[0_2px_0_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                <span>Resposta Anterior Instantânea: 0.6s (+180 PTS)</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-semibold">
                <span>Palavra {questionIdx + 1} de {questions.length}</span>
                <span>•</span>
                <span className="text-[#0D9488] font-bold">Nível Intermediário B2</span>
              </div>
            </div>

            {/* Prompt Center Area */}
            <div className="flex flex-col items-center text-center py-2 px-2">
              <span className="text-xs uppercase tracking-widest text-[#64748B] font-extrabold mb-2">
                Traduza para o {languageName(supportLang)}:
              </span>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl text-[#111C2D] font-black tracking-tight">
                  {currentQ.word}
                </h1>
                <button
                  type="button"
                  onClick={handlePronounce}
                  title="Ouvir Pronúncia"
                  className="w-11 h-11 rounded-2xl bg-[#F5F0E8] text-[#0D9488] flex items-center justify-center shadow-[0_4px_0_#CBD5E1] active:translate-y-1 hover:bg-stone-200 transition-all cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Phonetics Helper: Intuitive by default with discreet IPA toggle */}
              <div className="flex items-center gap-3 mt-2 flex-wrap justify-center text-xs text-[#64748B]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F5F0E8] text-[#3D4947]">
                  <Mic size={13} className="text-[#0D9488]" />
                  {showIpa ? (
                    <span className="font-mono text-xs">{currentQ.ipa}</span>
                  ) : (
                    <span
                      className="text-xs"
                      dangerouslySetInnerHTML={{ __html: intuitive }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowIpa((prev) => !prev)}
                    className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer"
                  >
                    {showIpa ? "Intuitiva" : "IPA"}
                  </button>
                </div>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-md bg-[#FEA619]/20 text-[#855300] font-extrabold text-[11px]">
                  {LanguageMatrixEngine.getLocalizedText(currentQ.gender, supportLang, currentQ.gender["pt-BR"] || "")}
                </span>
              </div>

              {/* Context Sentence */}
              <div className="mt-4 p-3.5 rounded-2xl bg-[#F5F0E8] max-w-xl shadow-[inset_0_2px_0_#CBD5E1]">
                <p className="font-serif text-base text-[#111C2D]">
                  {currentQ.sentence}
                </p>
              </div>
            </div>

            {/* 4 Chunky 3D Answer Tiles (2x2 Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = selectedKey === opt.key;
                let cardStyle = "bg-white border-2 border-stone-200/80 shadow-[0_4px_0_#CBD5E1] hover:bg-[#F5F0E8]";

                if (isSelected) {
                  if (opt.correct) {
                    cardStyle = "bg-[#10B981]/15 border-2 border-[#10B981] shadow-[0_4px_0_#059669] text-[#059669]";
                  } else {
                    cardStyle = "bg-[#EF4444]/15 border-2 border-[#EF4444] shadow-[0_4px_0_#DC2626] text-[#DC2626]";
                  }
                }

                const localizedOptionText = LanguageMatrixEngine.getLocalizedText(
                  opt.text,
                  supportLang,
                  opt.text["pt-BR"] || ""
                );

                return (
                  <motion.button
                    key={opt.key}
                    type="button"
                    whileTap={{ y: 3 }}
                    onClick={() => handleChoice(opt.key, opt.correct)}
                    className={`group relative p-4 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer select-none ${cardStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-[#F5F0E8] group-hover:bg-[#0D9488] group-hover:text-white flex items-center justify-center font-extrabold text-xs text-[#111C2D] transition-colors shadow-[0_2px_0_#CBD5E1]">
                        {opt.key}
                      </span>
                      <span className="font-extrabold text-base text-[#111C2D]">
                        {localizedOptionText}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#64748B] opacity-60 group-hover:opacity-100">
                      [Tecla {opt.key}]
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                className="text-xs text-[#64748B] hover:text-[#111C2D] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Flag size={14} />
                <span>Reportar questão ambígua</span>
              </button>

              <span className="text-xs text-[#64748B] font-semibold">
                Pressione [A], [B], [C] ou [D] para responder em menos de 1s
              </span>
            </div>
          </TactileCard>

          {/* Richard Feynman Tactical Companion Deck */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-5 shadow-[0_4px_0_#CBD5E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 border-2 border-amber-300 overflow-hidden flex-shrink-0">
                <img
                  src={FEYNMAN_AVATAR}
                  alt="Feynman"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.tried) {
                      target.dataset.tried = "1";
                      target.src = "/assets/assets/cast/feynman.png";
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#855300] uppercase tracking-wider">
                  Dica de Richard Feynman
                </span>
                <p className="text-xs sm:text-sm text-stone-800 font-serif italic">
                  “Não traduza palavra por palavra; visualize o conceito no mundo real antes de escolher a opção.”
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFreeze}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                freezeActive
                  ? "bg-cyan-600 text-white shadow-inner animate-pulse"
                  : "bg-white text-cyan-800 border border-cyan-300 shadow-[0_2px_0_#06B6D4] hover:bg-cyan-50"
              }`}
            >
              <Snowflake size={14} />
              <span>{freezeActive ? "Congelamento Ativo!" : "Congelar Oponente (5s)"}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: ARENA LEADERBOARD & DEFENSE PERKS (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Defense Card */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0D9488]" />
                <h3 className="font-extrabold text-base text-[#111C2D]">
                  Escudos Defensivos
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-[#00685F] font-bold text-xs">
                2 Disponíveis
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Protege sua ofensiva e seus pontos em caso de resposta incorreta durante o duelo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
