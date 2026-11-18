import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import { motion, AnimatePresence } from "framer-motion";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa } from "@/context/prosa-context";
import { Flag } from "@/components/shell/flag";
import { useSession } from "@/lib/session";
import { languageName } from "@/lib/languages";
import { tap } from "@/lib/haptics";
import {
  Timer,
  Sparkles,
  Zap,
  Play,
  Check,
  Lock,
  LockKeyhole,
  Swords,
  Crown,
  BookOpen,
  Volume2,
  Trophy,
  Star,
  Brain,
  MessageSquare,
  Gift,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

const EINSTEIN_AVATAR = "/cast/einstein.png";
const HELENA_AVATAR = "/cast/clara.png";
const LUCAS_AVATAR = "/cast/bento.png";
const ANOUK_AVATAR = "/cast/lia.png";

const TRAIL_CONTENT: Record<
  string,
  {
    moduleTag: string;
    moduleTitle: string;
    moduleQuote: string;
    node1Title: string;
    node2Title: string;
    node3Tooltip: string;
    node3Lesson: string;
    node3Badge: string;
    mentorQuote: string;
  }
> = {
  en: {
    moduleTag: "Módulo 03 · Trilha da Sabedoria",
    moduleTitle: "Mente Quântica & Filosofia Natural",
    moduleQuote: "“God does not play dice with the universe.” — Deus não joga dados com o universo.",
    node1Title: "1. Causalidade & Lógica",
    node2Title: "2. Relatividade Léxica",
    node3Tooltip: "Lição 7: Conectores (Because vs Although)",
    node3Lesson: "Lição 7 • Partículas & Conexões",
    node3Badge: "START!",
    mentorQuote: "Especialista em Causalidade (Inglês)",
  },
  de: {
    moduleTag: "Módulo 03 · Trilha da Sabedoria",
    moduleTitle: "Mente Quântica & Filosofia Natural",
    moduleQuote: "“Gott würfelt nicht mit dem Universum.” — Deus não joga dados com o universo.",
    node1Title: "1. Causalidade & Grund",
    node2Title: "2. Relatividade Léxica",
    node3Tooltip: "Lição 7: Conectores (Denn vs Weil)",
    node3Lesson: "Lição 7 • Partículas & Conexões",
    node3Badge: "START!",
    mentorQuote: "Especialista em Causalidade (Alemão)",
  },
  es: {
    moduleTag: "Módulo 03 · Trilha da Sabedoria",
    moduleTitle: "Mente Cuántica & Filosofía Natural",
    moduleQuote: "“Dios no juega a los dados con el universo.” — Deus não joga dados com o universo.",
    node1Title: "1. Causalidad & Lógica",
    node2Title: "2. Relatividad Léxica",
    node3Tooltip: "Lección 7: Conectores (Porque vs Aunque)",
    node3Lesson: "Lección 7 • Partículas & Conexiones",
    node3Badge: "START!",
    mentorQuote: "Especialista em Causalidade (Espanhol)",
  },
  fr: {
    moduleTag: "Módulo 03 · Trilha da Sabedoria",
    moduleTitle: "Esprit Quantique & Philosophie Naturelle",
    moduleQuote: "“Dieu ne joue pas aux dés avec l'univers.” — Deus não joga dados com o universo.",
    node1Title: "1. Causalité & Logique",
    node2Title: "2. Relativité Lexicale",
    node3Tooltip: "Leçon 7: Connecteurs (Parce que vs Bien que)",
    node3Lesson: "Leçon 7 • Particules & Connexions",
    node3Badge: "START!",
    mentorQuote: "Especialista em Causalidade (Francês)",
  },
  it: {
    moduleTag: "Módulo 03 · Trilha da Sabedoria",
    moduleTitle: "Mente Quantistica & Filosofia Naturale",
    moduleQuote: "“Dio non gioca a dadi con l'universo.” — Deus não joga dados com o universo.",
    node1Title: "1. Causalità & Logica",
    node2Title: "2. Relatività Lessicale",
    node3Tooltip: "Lezione 7: Connettori (Perché vs Benché)",
    node3Lesson: "Lezione 7 • Particelle & Connessioni",
    node3Badge: "START!",
    mentorQuote: "Especialista em Causalidade (Italiano)",
  },
  ja: {
    moduleTag: "Módulo 03 · Trilha da Sabedoria",
    moduleTitle: "量子精神 & 自然哲学",
    moduleQuote: "“神はサイコロを振らない。” — Deus não joga dados com o universo.",
    node1Title: "1. 因果関係 & 論理",
    node2Title: "2. 語彙の相対性",
    node3Tooltip: "第7課: 接続詞 (から vs けれども)",
    node3Lesson: "第7課 • 助詞 & 接続",
    node3Badge: "START!",
    mentorQuote: "Especialista em Causalidade (Japonês)",
  },
};

export default function AdventureTrailScreen() {
  const session = useSession();
  const { xp, gems, addGems, targetLang } = useProsa();
  const [claimedGems, setClaimedGems] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const currentLang = languageName(targetLang || "en");
  const trail = TRAIL_CONTENT[targetLang && targetLang in TRAIL_CONTENT ? targetLang : "en"];
  const currentUserName = session?.user?.display_name || (session?.user?.email ? session.user.email.split("@")[0] : "Você");

  // Espaço dispara a Sessão Diária de 20m
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        router.push("/daily");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleClaimGems() {
    if (!claimedGems) {
      void tap("success");
      addGems(25);
      setClaimedGems(true);
    }
  }

  function handleOpenChest() {
    if (!chestOpened) {
      void tap("success");
      addGems(50);
      setChestOpened(true);
    }
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-16">
      {/* ======================================================== */}
      {/* 1. TOP HIGHLIGHTS BANNER: DAILY FOCUS & QUICK STATUS     */}
      {/* ======================================================== */}
      <section className="w-full mb-8">
        <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 transition-transform">
          {/* Decorative blurs */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#0D9488]/10 pointer-events-none blur-3xl" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#F59E0B]/10 pointer-events-none blur-2xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#0D9488] flex items-center justify-center text-white shadow-[0_6px_0_#0F766E]">
                  <Timer className="w-11 h-11 animate-pulse" />
                </div>
                <div className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-[#FF5722] text-white font-extrabold text-[11px] shadow-sm tracking-wider uppercase">
                  Ao Vivo
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-3 py-0.5 rounded-full bg-[#F5F0E8] text-[#111C2D] font-extrabold text-[11px] uppercase tracking-wider">
                    Ritual Diário · Módulo 3
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-extrabold text-[11px] flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> +120 XP
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111C2D] tracking-tight">
                  Sessão de Imersão: 20 Minutos
                </h2>
                <p className="text-sm text-[#64748B] mt-0.5">
                  <strong className="text-[#111C2D]">14:20 restante hoje</strong> • 8 de 12 micro-desafios concluídos.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#F5F0E8] text-[#111C2D] font-bold text-xs">
                <Brain className="w-5 h-5 text-[#06B6D4]" />
                <span>Modo Foco Ativado</span>
              </div>

              <TactileButton
                onClick={() => router.push("/daily")}
                variant="primary"
                size="lg"
                className="flex items-center justify-center gap-3 px-8 py-4 font-black"
              >
                <span>Continuar Sessão 🚀</span>
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-white/20 rounded text-white">
                  Espaço
                </kbd>
              </TactileButton>
            </div>
          </div>

          <div className="mt-6 pt-5 bg-[#FDFBF7] rounded-2xl p-4 border border-stone-200/60">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
              <span className="font-extrabold text-[#111C2D]">Progresso do Ritual (68%)</span>
              <span className="text-[#64748B]">Meta: Nível Causalidade B2</span>
            </div>
            <div className="w-full h-3 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div
                className="h-full bg-[#0D9488] rounded-full transition-all duration-700 ease-out"
                style={{ width: "68%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. MAIN GRID: S-CURVED TRAIL (8 COLS) + RAIL (4 COLS)    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: INTERACTIVE QUEST TRAIL                     */}
        {/* ======================================================== */}
        <section className="lg:col-span-8 flex flex-col items-center relative w-full">
          {/* Module Header Card */}
          <div className="w-full bg-white rounded-3xl p-6 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 mb-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] font-black text-[11px] uppercase tracking-wider">
                    {trail.moduleTag.split(" · ")[0]}
                  </span>
                  <span className="text-[#64748B] text-xs font-medium">· {trail.moduleTag.split(" · ")[1]}</span>
                </div>
                <h1 className="text-2xl font-black text-[#111C2D] tracking-tight">
                  {trail.moduleTitle}
                </h1>
                <p className="text-sm font-serif italic text-[#64748B] mt-1">
                  {trail.moduleQuote}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  className="p-3 rounded-2xl bg-[#F5F0E8] text-[#111C2D] hover:text-[#0D9488] shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  title="Guia Gramatical"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-3 rounded-2xl bg-[#F5F0E8] text-[#111C2D] hover:text-[#0D9488] shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  title="Áudio da Trilha"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* The Map Canvas with S-Curve Nodes */}
          <div className="relative w-full max-w-lg flex flex-col items-center py-6 px-4">
            {/* Background Visual Path Layer (SVG Curving S-Path) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 400 900"
            >
              <path
                d="M 200,60 C 270,120 310,180 280,240 C 240,320 120,320 110,410 C 100,500 290,520 280,630 C 270,720 150,750 200,840"
                stroke="#F5F0E8"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="1 1"
              />
              <path
                d="M 200,60 C 270,120 310,180 280,240 C 240,320 120,320 110,410 C 100,500 290,520 280,630 C 270,720 150,750 200,840"
                stroke="#CBD5E1"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="14 16"
                opacity="0.8"
              />
            </svg>

            {/* NODE 1: Completed Node (Mastered) */}
            <div className="relative z-10 flex flex-col items-center mb-16 transform translate-x-0">
              <div className="flex items-center gap-1 mb-1.5 animate-bounce">
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ y: 3 }}
                onClick={() => router.push("/daily")}
                className="relative w-20 h-20 rounded-full bg-[#F59E0B] flex items-center justify-center text-white shadow-[0_6px_0_#D97706] cursor-pointer"
              >
                <Check className="w-9 h-9 stroke-[3]" />
                <div className="absolute -top-3 -right-2 w-7 h-7 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center text-xs font-black shadow-md">
                  👑
                </div>
              </motion.button>
              <div className="mt-3 px-3 py-1 bg-white rounded-full shadow-[0_2px_0_#CBD5E1] border border-stone-200/80 text-center">
                <span className="text-xs font-bold text-[#111C2D]">{trail.node1Title}</span>
              </div>
            </div>

            {/* NODE 2: Completed Node (3 Stars) */}
            <div className="relative z-10 flex flex-col items-center mb-16 transform translate-x-16 sm:translate-x-24">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ y: 3 }}
                onClick={() => router.push("/daily")}
                className="relative w-20 h-20 rounded-full bg-[#10B981] flex items-center justify-center text-white shadow-[0_6px_0_#059669] cursor-pointer"
              >
                <Check className="w-9 h-9 stroke-[3]" />
              </motion.button>
              <div className="mt-2.5 px-3 py-1 bg-white rounded-full shadow-[0_2px_0_#CBD5E1] border border-stone-200/80 text-center">
                <span className="text-xs font-bold text-[#111C2D]">{trail.node2Title}</span>
              </div>
            </div>

            {/* NODE 3: ACTIVE CURRENT NODE (Einstein Avatar + Tooltip + Pulsing) */}
            <div className="relative z-20 flex flex-col items-center mb-16 transform -translate-x-12 sm:-translate-x-20">
              {/* Tooltip Speech Balloon */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-24 left-1/2 transform -translate-x-1/2 w-64 bg-white p-3 rounded-2xl shadow-[0_6px_0_#CBD5E1] flex items-center gap-3 border-2 border-[#0D9488]/40 pointer-events-none"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#0D9488]/20">
                  <img
                    src={EINSTEIN_AVATAR}
                    alt="Albert Einstein"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-[#0D9488] uppercase font-black tracking-wider">
                    Próximo Passo
                  </span>
                  <span className="text-xs text-[#111C2D] font-bold">
                    {trail.node3Tooltip}
                  </span>
                </div>
                {/* Speech arrow */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r-2 border-b-2 border-[#0D9488]/40" />
              </motion.div>

              {/* Button Container with Concentric Pulsing Aura */}
              <div className="relative flex items-center justify-center">
                {/* Concentric Pulsing Ring */}
                <div className="absolute -inset-2.5 rounded-full bg-[#0D9488]/25 animate-ping pointer-events-none" />

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ y: 3 }}
                  onClick={() => router.push("/daily")}
                  className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-[0_8px_0_#0F766E] active:shadow-[0_2px_0_#0F766E] transition-all cursor-pointer group"
                >
                  <Play className="w-10 h-10 fill-white text-white ml-1 group-hover:scale-110 transition-transform" />
                  {/* START! Badge with Concentric Pulsing Dot Centered Inside */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#FF5722] text-white font-extrabold text-[11px] tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 select-none whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                    <span>START!</span>
                  </div>
                </motion.button>
              </div>

              <div className="mt-4 px-3 py-1 bg-[#0D9488] text-white rounded-full shadow-[0_2px_0_#0F766E] text-center">
                <span className="text-xs font-black">{trail.node3Lesson}</span>
              </div>
            </div>

            {/* NODE 4: Locked Node (Stone / Concrete Style) */}
            <div className="relative z-10 flex flex-col items-center mb-16 transform translate-x-12 sm:translate-x-20 opacity-85">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#F5F0E8] flex items-center justify-center text-[#64748B] shadow-[0_5px_0_#CBD5E1]">
                <Lock className="w-8 h-8" />
              </div>
              <div className="mt-2.5 px-3 py-1 bg-white rounded-full shadow-[0_2px_0_#CBD5E1] border border-stone-200/80 text-center flex items-center gap-1">
                <LockKeyhole className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="text-[11px] font-bold text-[#64748B]">Requer 400 XP</span>
              </div>
            </div>

            {/* NODE 5: Mystery Treasure Chest Node */}
            <div className="relative z-10 flex flex-col items-center mb-16 transform -translate-x-8 sm:-translate-x-14">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ y: 3 }}
                onClick={handleOpenChest}
                className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-[#D97706] to-[#F59E0B] flex items-center justify-center text-white shadow-[0_6px_0_#855300] cursor-pointer group"
              >
                <Gift className="w-9 h-9 text-white group-hover:rotate-12 transition-transform" />
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#06B6D4] text-white flex items-center justify-center text-[11px] font-bold shadow-sm animate-pulse">
                  💎
                </div>
              </motion.button>
              <div className="mt-2.5 px-3 py-1 bg-white rounded-full shadow-[0_2px_0_#CBD5E1] border border-stone-200/80 text-center">
                <span className="text-xs font-bold text-[#111C2D]">
                  {chestOpened ? "Baú Aberto (+50 Gemas!)" : "Baú de Expressões Idiomáticas"}
                </span>
              </div>
            </div>

            {/* NODE 6: Boss Battle Milestone (Da Vinci Synthesis Duel) */}
            <div className="relative z-10 flex flex-col items-center mb-8 transform translate-x-0 w-full">
              <div className="relative w-full max-w-md">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FF5722] via-[#F59E0B] to-[#EC4899] blur-sm opacity-70 animate-pulse" />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ y: 3 }}
                  onClick={() => router.push("/duel")}
                  className="relative w-full px-6 py-5 rounded-2xl bg-[#111C2D] text-white flex items-center gap-4 shadow-[0_8px_0_#0A111C] cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#FF5722] flex items-center justify-center text-white shadow-inner flex-shrink-0">
                    <Swords className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#FF5722] font-black tracking-widest uppercase">
                        Grande Desafio Final
                      </span>
                      <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </div>
                    <div className="text-base font-black text-white">
                      Duelo de Síntese: Leonardo da Vinci
                    </div>
                    <div className="text-xs text-[#94A3B8]">Defenda seu raciocínio em {currentLang} • 120s</div>
                  </div>
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: GAMIFIED SIDEBAR RAIL                      */}
        {/* ======================================================== */}
        <aside className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* Active Polymath Mentor Status Card */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-base font-black text-[#111C2D]">Mentor Ativo</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] font-black text-[11px]">
                Nível 7 • Físico Brincalhão
              </span>
            </div>

            <div className="flex items-center gap-4 bg-[#F5F0E8] p-3.5 rounded-2xl mb-4 border border-stone-200/80">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-white border border-[#0D9488]/30 shadow-sm">
                <img
                  src={EINSTEIN_AVATAR}
                  alt="Albert Einstein"
                  className="w-full h-full object-cover object-top"
                />
                <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-[8px] text-white text-center font-extrabold py-0.5 tracking-wider backdrop-blur-xs">
                  98% AFINIDADE
                </span>
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-black text-[#111C2D]">Albert Einstein</h4>
                <p className="text-xs text-[#64748B]">Especialista em Causalidade ({currentLang})</p>
                <div className="flex items-center gap-1.5 mt-1 text-[#0D9488] font-black text-xs">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Bônus: +15% Retenção FSRS</span>
                </div>
              </div>
            </div>

            <TactileButton
              onClick={() => router.push("/persona")}
              variant="secondary"
              size="md"
              className="w-full flex items-center justify-center gap-2 text-xs font-black"
            >
              <MessageSquare className="w-4 h-4 text-[#0D9488]" />
              <span>Conversar em {currentLang} com Albert</span>
            </TactileButton>
          </div>

          {/* Missões de Hoje */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF5722]" />
                <h3 className="text-base font-black text-[#111C2D]">Missões de Hoje</h3>
              </div>
              <span className="text-[11px] font-bold text-[#64748B]">Expira em 9h</span>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Quest 1: Completed & Claimable */}
              <div className="p-3.5 rounded-2xl bg-[#F5F0E8] flex flex-col gap-2 border border-stone-200/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-[#111C2D]">
                        Treino de Cadência Sonora
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        Pronuncie 5 orações complexas
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ y: 2 }}
                    onClick={handleClaimGems}
                    disabled={claimedGems}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 cursor-pointer ${
                      claimedGems
                        ? "bg-[#E2E8F0] text-[#64748B] shadow-none cursor-default"
                        : "bg-[#06B6D4] text-white shadow-[0_3px_0_#0891B2] active:translate-y-0.5 active:shadow-[0_1px_0_#0891B2]"
                    }`}
                  >
                    <span>{claimedGems ? "Coletado ✓" : "Coletar 25"}</span>
                    <span>💎</span>
                  </motion.button>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full bg-[#10B981] w-full" />
                </div>
              </div>

              {/* Quest 2: In Progress */}
              <div className="p-3.5 rounded-2xl bg-[#F5F0E8] flex flex-col gap-2 border border-stone-200/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Brain className="w-5 h-5 text-[#0D9488] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-[#111C2D]">
                        15 Flashcards de Repetição Espaçada
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        12 de 15 revisões corretas
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#111C2D]">12/15</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full bg-[#0D9488] rounded-full" style={{ width: "80%" }} />
                </div>
              </div>

              {/* Quest 3: Duel Challenge */}
              <div className="p-3.5 rounded-2xl bg-[#F5F0E8] flex flex-col gap-2 border border-stone-200/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <Swords className="w-5 h-5 text-[#FF5722] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-[#111C2D]">
                        Vencer 1 Duelo Relâmpago 120s
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        Desafie outro estudante ao vivo
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ y: 2 }}
                    onClick={() => router.push("/duel")}
                    className="px-3 py-1.5 rounded-xl bg-[#FF5722] text-white font-black text-xs shadow-[0_3px_0_#C2410C] active:translate-y-0.5 active:shadow-[0_1px_0_#C2410C] transition-all cursor-pointer"
                  >
                    Desafiar
                  </motion.button>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                  <div className="h-full bg-[#FF5722] w-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard: Diamond Polymath League */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#06B6D4]" />
                <h3 className="text-base font-black text-[#111C2D]">Liga Diamante</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#06B6D4]/10 text-[#0891B2] font-black text-[11px]">
                2d 14h restante
              </span>
            </div>

            <div className="bg-[#F5F0E8] p-2.5 rounded-2xl mb-3 flex items-center justify-between border border-stone-200/60">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-xs text-[#111C2D]">
                  Zona de Promoção: <strong className="font-extrabold">Top 3 sobem para Lendária</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-stone-200/80">
              {/* Rank 1 */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#D97706] w-4 text-center">1</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0D9488]/20 flex-shrink-0">
                    <img src={HELENA_AVATAR} alt="Helena" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-[#111C2D] flex items-center gap-1.5">
                      Helena Meyer <Flag code="de" size={16} />
                    </span>
                    <span className="text-[11px] text-[#64748B]">3.890 XP</span>
                  </div>
                </div>
                <Trophy className="w-5 h-5 text-[#F59E0B]" />
              </div>

              {/* Rank 2 */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#64748B] w-4 text-center">2</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#E2E8F0] flex-shrink-0">
                    <img src={LUCAS_AVATAR} alt="Lucas" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-[#111C2D] flex items-center gap-1.5">
                      Lucas Santos <Flag code="br" size={16} />
                    </span>
                    <span className="text-[11px] text-[#64748B]">3.420 XP</span>
                  </div>
                </div>
                <Trophy className="w-5 h-5 text-[#94A3B8]" />
              </div>

              {/* Rank 3 */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#B45309] w-4 text-center">3</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FEF3C7] flex-shrink-0">
                    <img src={ANOUK_AVATAR} alt="Anouk" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-[#111C2D] flex items-center gap-1.5">
                      Anouk Dubois <Flag code="fr" size={16} />
                    </span>
                    <span className="text-[11px] text-[#64748B]">3.110 XP</span>
                  </div>
                </div>
                <Trophy className="w-5 h-5 text-[#B45309]" />
              </div>

              {/* Current User (Rank 4) Highlighted */}
              <div className="py-2.5 px-2 bg-[#0D9488]/10 rounded-xl flex items-center justify-between my-1 border border-[#0D9488]/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#0D9488] w-4 text-center">4</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#0D9488] flex-shrink-0 bg-[#0D9488] flex items-center justify-center text-white font-bold text-xs">
                    {session?.user?.display_name ? session.user.display_name[0].toUpperCase() : "V"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-[#0D9488] flex items-center gap-1.5">
                      {currentUserName} <Flag code="br" size={16} />
                    </span>
                    <span className="text-[11px] text-[#0D9488] font-bold">
                      {xp} XP • Faltam {Math.max(0, 3110 - xp)} XP p/ Top 3
                    </span>
                  </div>
                </div>
                <TrendingUp className="w-4 h-4 text-[#0D9488]" />
              </div>
            </div>

            <div className="mt-3 pt-2 text-center border-t border-stone-200/60">
              <button
                type="button"
                className="text-xs font-bold text-[#0D9488] hover:underline cursor-pointer"
              >
                Ver Tabela Completa (30 Alunos)
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
