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
} from "lucide-react";
import { AppShell } from "@/components/tactile/app-shell";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { Flag as CountryFlag } from "@/components/shell/flag";
import { tap } from "@/lib/haptics";

const ELENA_AVATAR = "/cast/clara.png";
const FEYNMAN_AVATAR = "/cast/feynman.png";

interface Question {
  id: number;
  word: string;
  phonetic: string;
  gender: string;
  sentence: string;
  highlight: string;
  options: { key: "A" | "B" | "C" | "D"; text: string; correct: boolean }[];
}

const QUESTIONS_BY_LANG: Record<string, Question[]> = {
  en: [
    {
      id: 1,
      word: "the Breakthrough",
      phonetic: "[the brayk-throo]",
      gender: "Substantivo Contável",
      sentence: "“The team achieved a major scientific breakthrough in neural computing.”",
      highlight: "breakthrough",
      options: [
        { key: "A", text: "O Avanço Decisivo", correct: true },
        { key: "B", text: "O Retrocesso", correct: false },
        { key: "C", text: "A Hipótese", correct: false },
        { key: "D", text: "O Prazo", correct: false },
      ],
    },
    {
      id: 2,
      word: "the Resilience",
      phonetic: "[the ri-zil-yens]",
      gender: "Substantivo Abstrato",
      sentence: "“Cognitive resilience allows learners to master complex syntactic structures.”",
      highlight: "resilience",
      options: [
        { key: "A", text: "A Vulnerabilidade", correct: false },
        { key: "B", text: "A Resiliência / Persistência", correct: true },
        { key: "C", text: "A Hesitação", correct: false },
        { key: "D", text: "A Imprudência", correct: false },
      ],
    },
    {
      id: 3,
      word: "the Nuance",
      phonetic: "[the noo-ahns]",
      gender: "Substantivo Contável",
      sentence: "“Native fluency requires listening to the subtle nuances of spoken cadence.”",
      highlight: "nuances",
      options: [
        { key: "A", text: "A Sutileza / Nuance", correct: true },
        { key: "B", text: "O Erro Crasso", correct: false },
        { key: "C", text: "A Contradição", correct: false },
        { key: "D", text: "A Rigidez", correct: false },
      ],
    },
  ],
  de: [
    {
      id: 1,
      word: "die Herausforderung",
      phonetic: "[dee heh-rows-for-deh-roong]",
      gender: "Substantivo Feminino",
      sentence: "“Eine neue Sprache zu lernen ist eine spannende Herausforderung für den Geist.”",
      highlight: "Herausforderung",
      options: [
        { key: "A", text: "O Desafio", correct: true },
        { key: "B", text: "A Oportunidade", correct: false },
        { key: "C", text: "O Hábito", correct: false },
        { key: "D", text: "A Conexão", correct: false },
      ],
    },
    {
      id: 2,
      word: "die Zuverlässigkeit",
      phonetic: "[dee tsoo-fer-les-ikh-kyt]",
      gender: "Substantivo Feminino",
      sentence: "“Zuverlässigkeit ist das Fundament jeder dauerhaften wissenschaftlichen Zusammenarbeit.”",
      highlight: "Zuverlässigkeit",
      options: [
        { key: "A", text: "A Incerteza", correct: false },
        { key: "B", text: "A Confiabilidade", correct: true },
        { key: "C", text: "A Velocidade", correct: false },
        { key: "D", text: "A Criatividade", correct: false },
      ],
    },
    {
      id: 3,
      word: "das Fingerspitzengefühl",
      phonetic: "[dahs fing-er-shpit-sen-geh-feel]",
      gender: "Substantivo Neutro",
      sentence: "“In diplomatischen Verhandlungen braucht man echtes Fingerspitzengefühl.”",
      highlight: "Fingerspitzengefühl",
      options: [
        { key: "A", text: "Tato e Sensibilidade", correct: true },
        { key: "B", text: "Força Bruta", correct: false },
        { key: "C", text: "Memória Fotográfica", correct: false },
        { key: "D", text: "Aperto de Mão", correct: false },
      ],
    },
  ],
};

export default function DuelRoute() {
  const { addXp, addGems, targetLang } = useProsa();
  const session = useSession();
  const playerName = session?.user?.display_name || "Você";
  const questions = QUESTIONS_BY_LANG[targetLang && targetLang in QUESTIONS_BY_LANG ? targetLang : "en"];

  const [questionIdx, setQuestionIdx] = useState(0);
  const [playerScore, setPlayerScore] = useState(1420);
  const [opponentScore, setOpponentScore] = useState(1280);
  const [combo, setCombo] = useState(6);
  const [secondsLeft, setSecondsLeft] = useState(74);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [freezeActive, setFreezeActive] = useState(false);
  const [doubleXpActive, setDoubleXpActive] = useState(true);

  const currentQ = questions[questionIdx] || questions[0];

  // Timer countdown
  useEffect(() => {
    if (freezeActive) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(interval);
  }, [freezeActive]);

  // Tug of war percentage
  const totalScore = playerScore + opponentScore || 1;
  const playerPercent = Math.min(85, Math.max(15, Math.round((playerScore / totalScore) * 100)));
  const opponentPercent = 100 - playerPercent;

  const handleChoice = useCallback(
    (key: "A" | "B" | "C" | "D", isCorrect: boolean) => {
      if (selectedKey !== null) return;
      void tap(isCorrect ? "medium" : "heavy");
      setSelectedKey(key);
      setIsAnswerCorrect(isCorrect);

      if (isCorrect) {
        const gain = doubleXpActive ? 120 : 60;
        setPlayerScore((prev) => prev + gain);
        setCombo((prev) => prev + 1);
        addXp(gain);
        if (combo >= 5) {
          addGems(5);
        }
      } else {
        setCombo(1);
        setOpponentScore((prev) => prev + 40);
      }

      setTimeout(() => {
        setSelectedKey(null);
        setIsAnswerCorrect(null);
        setQuestionIdx((prev) => (prev + 1) % questions.length);
      }, 1100);
    },
    [selectedKey, doubleXpActive, combo, addXp, addGems, questions.length]
  );

  // Keyboard shortcut listener for A, B, C, D
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(k)) {
        const option = currentQ.options.find((o) => o.key === k);
        if (option) {
          e.preventDefault();
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
    if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQ.word);
      utterance.lang = "de-DE";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFreeze = () => {
    if (freezeActive) return;
    void tap("medium");
    setFreezeActive(true);
    setTimeout(() => setFreezeActive(false), 5000);
  };

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
            <span className="text-xs text-[#64748B] font-semibold">
              Rodada {questionIdx + 6} de 15 • Alemão 🇩🇪 via Português 🇧🇷
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
                <span className="text-xs">🇧🇷</span>
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
                <span>Rodada {questionIdx + 6} de 15 • {targetLang === "en" ? "Inglês" : "Alemão"}</span>
                <CountryFlag code={targetLang === "en" ? "gb" : "de"} size={14} />
                <span>via Português</span>
                <CountryFlag code="br" size={14} />
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
              {/* Left Player Fill */}
              <div
                className="h-full rounded-l-full bg-gradient-to-r from-[#0D9488] to-[#6BD8CB] transition-all duration-300"
                style={{ width: `${playerPercent}%` }}
              />
              {/* Clash Spark Indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-7 h-7 rounded-full bg-[#FEA619] shadow-[0_0_12px_#FEA619] flex items-center justify-center text-xs animate-bounce"
                style={{ left: `${playerPercent}%` }}
              >
                ⚡
              </div>
              {/* Right Player Fill */}
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
            </div>
            <div className="relative flex-shrink-0">
              <img
                src={ELENA_AVATAR}
                alt="Elena Rostova"
                className="w-14 h-14 rounded-2xl object-cover shadow-[0_4px_0_#8C0053]"
              />
              <span className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-md bg-[#B10E6B] text-[10px] font-extrabold text-white shadow-[0_2px_0_#8C0053]">
                NV 13
              </span>
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
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-[0_3px_0_#CBD5E1] ${secondsLeft <= 20
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
                  className={`h-2 flex-1 rounded-full transition-all ${pip <= (combo % 6)
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
                <span>Palavra {questionIdx + 6} de 15</span>
                <span>•</span>
                <span className="text-[#0D9488] font-bold">Nível Intermediário B2</span>
              </div>
            </div>

            {/* Prompt Center Area */}
            <div className="flex flex-col items-center text-center py-2 px-2">
              <span className="text-xs uppercase tracking-widest text-[#64748B] font-extrabold mb-2">
                Traduza para o Português:
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

              <div className="flex items-center gap-3 mt-2 flex-wrap justify-center text-xs text-[#64748B]">
                <span className="font-sans text-[#0D9488] font-bold text-xs tracking-wide">
                  {currentQ.phonetic}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-md bg-[#FEA619]/20 text-[#855300] font-extrabold text-[11px]">
                  {currentQ.gender}
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
                        {opt.text}
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
                className="text-xs font-semibold text-[#64748B] hover:text-[#EF4444] flex items-center gap-1 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Reportar questão ambígua</span>
              </button>
              <span className="text-xs text-[#64748B] hidden sm:inline">
                Pressione [A], [B], [C] ou [D] para responder em menos de 1s
              </span>
            </div>
          </TactileCard>

          {/* Cheering Historical Mentor Widget (Richard Feynman) */}
          <div className="w-full rounded-3xl bg-white p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={FEYNMAN_AVATAR}
                alt="Richard Feynman"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FEA619] shadow-[0_4px_0_#D97706]"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5722] text-white text-xs font-bold shadow-[0_2px_0_rgba(0,0,0,0.2)]">
                🔥
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#111C2D]">
                    Richard Feynman
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFDDB8] text-[#2A1700] uppercase font-bold">
                    Mentor de Ritmo & Foco
                  </span>
                </div>
                <span className="text-xs font-extrabold text-[#0D9488]">
                  Bônus de Vitória 1.2x
                </span>
              </div>

              <div className="relative bg-[#F5F0E8] rounded-2xl p-3.5 shadow-[inset_0_2px_0_#CBD5E1] mt-1">
                <p className="font-serif text-sm text-[#111C2D] italic">
                  “— Fantástico ritmo, Gabriel! Mantenha a cadência sincopada e o combo {combo}x explode a pontuação da Elena!”
                </p>
              </div>
            </div>
          </div>
        </div >

        {/* ====================================================== */}
        {/* RIGHT: BATTLE ARSENAL & COMBAT LOG (4 COLS)            */}
        {/* ====================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Power-up Inventory Slots */}
          <TactileCard className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base text-[#111C2D]">
                Arsenal de Batalha
              </span>
              <span className="text-xs text-[#64748B] font-semibold">
                2 Disponíveis
              </span>
            </div>

            {/* Power-up Buttons List */}
            <div className="flex flex-col gap-3">
              {/* 1. Congelar Tempo */}
              <motion.button
                type="button"
                whileTap={{ y: 2 }}
                onClick={handleFreeze}
                className={`w-full p-3.5 rounded-2xl flex items-center justify-between shadow-[0_4px_0_#CBD5E1] transition-all cursor-pointer ${freezeActive ? "bg-[#06B6D4]/20 border-2 border-[#06B6D4]" : "bg-[#F5F0E8] hover:bg-stone-200"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">❄️</span>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-sm text-[#111C2D]">
                      Congelar Tempo
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {freezeActive ? "Pausado (5s)!" : "Pausa relógio por 5s"}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-[#06B6D4] text-white font-extrabold text-xs shadow-[0_2px_0_#0F766E]">
                  {freezeActive ? "ATIVO" : "USAR"}
                </span>
              </motion.button>

              {/* 2. Duplo XP Relâmpago */}
              <div className="w-full p-3.5 rounded-2xl bg-[#D97706]/10 flex items-center justify-between shadow-[0_4px_0_rgba(217,119,6,0.3)] border border-[#D97706]/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-spin">⚡</span>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-sm text-[#D97706]">
                      Duplo XP Relâmpago
                    </span>
                    <span className="text-xs text-[#D97706]/80">
                      Ativo nas próximas 3 rodadas
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-[#D97706] text-white font-extrabold text-xs shadow-[0_2px_0_#B45309]">
                  ATIVO
                </span>
              </div>

              {/* 3. Eliminar Duas Alternativas (Cooldown) */}
              <div className="w-full p-3.5 rounded-2xl bg-[#F5F0E8]/60 flex items-center justify-between opacity-50 cursor-not-allowed border border-stone-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl grayscale">🎯</span>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-sm text-[#64748B]">
                      Eliminar Alternativas
                    </span>
                    <span className="text-xs text-[#64748B]">
                      Recarrega em 2 rodadas
                    </span>
                  </div>
                </div>
                <span className="text-sm">🔒</span>
              </div>
            </div>
          </TactileCard>

          {/* Live Combat Log */}
          <TactileCard className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base text-[#111C2D]">
                Registro de Combate
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#10B981]/10 text-[#059669]">
                <span className="font-bold">{playerName.split(" ")[0]} acertou em 0.6s</span>
                <span className="font-extrabold">+180 PTS</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#F5F0E8] text-[#64748B]">
                <span>Elena respondeu</span>
                <span className="font-bold">+120 PTS</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#FF5722]/10 text-[#FF5722]">
                <span className="font-bold">{playerName.split(" ")[0]} atingiu 6x Combo!</span>
                <span className="font-extrabold">Fogo Ativo</span>
              </div>
            </div>
          </TactileCard>
        </div>
      </div>
    </div>
  );
}
