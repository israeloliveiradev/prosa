import React, { useState } from "react";
import { router } from "expo-router";
import { motion } from "framer-motion";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa, type Mentor } from "@/context/prosa-context";
import { useTranslation } from "@/i18n/use-translation";
import { tap } from "@/lib/haptics";
import { Flag } from "@/components/shell/flag";
import { signOut, useSession } from "@/lib/session";
import {
  Sparkles,
  Award,
  Flame,
  Zap,
  Brain,
  Mic,
  Globe,
  Plus,
  CheckCircle2,
  Users,
  Repeat,
  Download,
  Sliders,
  ArrowRight,
  Check,
  LogOut,
  Edit2,
  Save,
} from "lucide-react";

const GABRIEL_AVATAR = "/cast/bento.png";
const DA_VINCI_AVATAR = "/cast/davinci.png";
const FEYNMAN_AVATAR = "/cast/feynman.png";
const CURIE_AVATAR = "/cast/curie.png";
const EINSTEIN_AVATAR = "/cast/einstein.png";

const MENTORS_LIST: Mentor[] = [
  {
    id: "davinci",
    name: "Leonardo da Vinci",
    title: "Sintaxe & Decomposição",
    avatar: DA_VINCI_AVATAR,
    level: 8,
    quote: "“Dissecar a frase é como compreender as engrenagens de uma asa mecânica.”",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    title: "Palácio & FSRS",
    avatar: FEYNMAN_AVATAR,
    level: 9,
    quote: "“Se você não consegue explicar para uma criança, ainda não dominou a palavra.”",
  },
  {
    id: "curie",
    name: "Marie Curie",
    title: "Fonética Acústica",
    avatar: CURIE_AVATAR,
    level: 7,
    quote: "“Nada na linguagem deve ser temido, apenas gradualmente compreendido.”",
  },
  {
    id: "einstein",
    name: "Albert Einstein",
    title: "Mentor Primário",
    avatar: EINSTEIN_AVATAR,
    level: 10,
    quote: "“A imaginação é mais importante que o léxico estático; pense em seu idioma alvo.”",
  },
];

const TARGET_COURSES = [
  { code: "de", nativeName: "Deutsch", badgeColor: "#0D9488" },
  { code: "en", nativeName: "English", badgeColor: "#0284C7" },
  { code: "fr", nativeName: "Français", badgeColor: "#D97706" },
  { code: "es", nativeName: "Español", badgeColor: "#EA580C" },
  { code: "it", nativeName: "Italiano", badgeColor: "#10B981" },
  { code: "ja", nativeName: "日本語", badgeColor: "#FB7185" },
];

const ALL_LANGUAGES: Array<{ code: string; name: string; nativeName: string; flag: string }> = [
  { code: "pt-BR", name: "Português", nativeName: "Português", flag: "br" },
  { code: "en", name: "Inglês", nativeName: "English", flag: "gb" },
  { code: "de", name: "Alemão", nativeName: "Deutsch", flag: "de" },
  { code: "fr", name: "Francês", nativeName: "Français", flag: "fr" },
  { code: "es", name: "Espanhol", nativeName: "Español", flag: "es" },
  { code: "it", name: "Italiano", nativeName: "Italiano", flag: "it" },
  { code: "ja", name: "Japonês", nativeName: "日本語", flag: "jp" },
];

export default function ProfileScreen() {
  const session = useSession();
  const { t } = useTranslation();
  const {
    userName,
    setUserName,
    gems,
    streak,
    bestStreak,
    targetLang,
    supportLang,
    uiLang,
    activeMentor,
    isPro,
    courses,
    activeCourse,
    totalXp,
    setTargetLang,
    setSupportLang,
    setUiLang,
    syncSupportWithUi,
    setActiveMentor,
    startCourseFromScratch,
  } = useProsa();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const displayName = userName || session?.user?.display_name || "Estudante Polímata";
  const userEmail = session?.user?.email || "estudante@prosa.io";
  const userInitial = displayName[0]?.toUpperCase() ?? "P";

  const globalLevel = Math.floor(totalXp / 250) + 1;
  const xpInCurrentLevel = totalXp % 250;
  const levelProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / 250) * 100));

  const startedCoursesCount = Object.values(courses).filter((c) => c.started).length;

  const handleSaveName = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleSelectTargetLang = (code: string) => {
    void tap("light");
    const course = courses[code];
    if (!course?.started) {
      startCourseFromScratch(code);
    }
    setTargetLang(code);
  };

  const handleSelectSupportLang = (lang: string) => {
    void tap("light");
    setSupportLang(lang);
  };

  const handleSelectUiLang = (lang: string) => {
    void tap("light");
    setUiLang(lang);
  };

  const handleSelectMentor = (mentor: Mentor) => {
    void tap("medium");
    setActiveMentor(mentor);
  };

  const avgPhonetic = activeCourse.pronunciationScores.length
    ? Math.round(
        activeCourse.pronunciationScores.reduce((a, b) => a + b, 0) /
          activeCourse.pronunciationScores.length
      )
    : 92;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-8 pb-16">
      {/* ======================================================== */}
      {/* 1. TOP HERO CARD (PERFIL & CEFR MASTER BADGE)            */}
      {/* ======================================================== */}
      <TactileCard className="p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#0D9488]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#FEA619]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Esquerda: Identidade & Avatar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-[#0D9488] p-1 shadow-[0_4px_0_#0F766E] border border-stone-200 overflow-hidden flex items-center justify-center text-white font-black text-3xl">
                {userInitial}
              </div>
              {isPro && (
                <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#D97706] to-[#FEA619] text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-[0_2px_0_#92400E] flex items-center gap-1">
                  👑 PRO
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="px-3 py-1 text-xl font-extrabold text-[#111C2D] bg-white border border-[#0D9488] rounded-xl shadow-inner focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-2 rounded-xl bg-[#0D9488] text-white shadow-sm hover:opacity-95 cursor-pointer"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111C2D] tracking-tight">
                      {displayName}
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(displayName);
                        setIsEditingName(true);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-[#0D9488] hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Editar nome de usuário"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEA619]/20 text-[#684000] font-bold text-xs shadow-[0_2px_0_#FEA619]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Membro Prosa Pro desde 2026</span>
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    router.replace("/account");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-sm transition-colors cursor-pointer"
                >
                  <LogOut size={12} />
                  <span>Sair</span>
                </button>
              </div>

              <p className="text-sm text-[#3D4947] flex items-center gap-2 font-medium">
                <span className="font-bold text-[#0D9488]">Aprendiz Polímata</span>
                <span>•</span>
                <span>Liga Diamante · Divisão Humboldt</span>
              </p>

              {/* Barra de Progresso de Nível Dinâmica */}
              <div className="mt-2 flex items-center gap-3 w-full sm:w-80">
                <div className="flex-1 bg-[#F5F0E8] rounded-full h-3.5 p-0.5 shadow-[inset_0_2px_0_#CBD5E1]">
                  <div
                    className="bg-[#0D9488] rounded-full h-full shadow-[0_2px_0_#0F766E] transition-all duration-700"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold text-[#111C2D] whitespace-nowrap">
                  {totalXp} <span className="text-[#64748B] font-normal">/ {globalLevel * 250} XP (Nv {globalLevel})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Direita: CEFR Master Badge & Radar Breakdown */}
          <div className="w-full lg:w-auto bg-[#F5F0E8] rounded-2xl p-4 lg:p-5 shadow-[0_4px_0_#E2E8F0] flex flex-col gap-3 min-w-[290px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#3D4947]">
                Classificação Global CEFR
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#059669] font-extrabold text-[11px]">
                Auditado
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0D9488]">Nível {activeCourse.level}</span>
              <span className="text-sm text-[#111C2D] font-bold">
                {activeCourse.level === "A1"
                  ? "Iniciante Elemental"
                  : activeCourse.level === "A2"
                  ? "Básico Autônomo"
                  : activeCourse.level === "B1"
                  ? "Intermediário Prático"
                  : activeCourse.level === "B2"
                  ? "Explorador Avançado"
                  : "Mestre Fluente"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-white p-2 rounded-xl shadow-[0_2px_0_#E2E8F0] flex flex-col">
                <span className="text-[11px] text-[#64748B] font-semibold">Compreensão Oral</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#111C2D]">90%</span>
                  <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl shadow-[0_2px_0_#E2E8F0] flex flex-col">
                <span className="text-[11px] text-[#64748B] font-semibold">Leitura Sintática</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#111C2D]">92%</span>
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl shadow-[0_2px_0_#E2E8F0] flex flex-col">
                <span className="text-[11px] text-[#64748B] font-semibold">Precisão Fonética</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#111C2D]">{avgPhonetic}%</span>
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl shadow-[0_2px_0_#E2E8F0] flex flex-col">
                <span className="text-[11px] text-[#64748B] font-semibold">Gramática FSRS</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#111C2D]">88%</span>
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 2. 4 MAIN 3D TACTILE METRIC CARDS                        */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Ofensiva */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 hover:shadow-[0_2px_0_#E2E8F0] hover:translate-y-[2px] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#FF5722]/15 text-[#FF5722] flex items-center justify-center text-xl">
              🔥
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#FF5722]/10 text-[#FF5722] font-bold text-[11px]">
              Proteção Ativa
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#111C2D]">{streak} Dias</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Ofensiva Ininterrupta
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Recorde pessoal: {bestStreak} dias · Sem risco de congelamento.
            </p>
          </div>
        </div>

        {/* Stat 2: XP */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 hover:shadow-[0_2px_0_#E2E8F0] hover:translate-y-[2px] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D97706]/15 text-[#D97706] flex items-center justify-center text-xl">
              ⚡
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#FEA619]/20 text-[#684000] font-bold text-[11px]">
              Top 4%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#111C2D]">{totalXp} XP</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Pontuação Acumulada
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Nível Global {globalLevel} · Zona de Promoção na Liga Diamante.
            </p>
          </div>
        </div>

        {/* Stat 3: FSRS Cartas */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 hover:shadow-[0_2px_0_#E2E8F0] hover:translate-y-[2px] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 text-[#06B6D4] flex items-center justify-center text-xl">
              🃏
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#06B6D4]/10 text-[#06B6D4] font-bold text-[11px]">
              FSRS v4.5
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#111C2D]">
              {activeCourse.fsrsCards.length || 24} Cartas
            </div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Palácio de Memória
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Retenção projetada de 91,4% para o curso {ALL_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}.
            </p>
          </div>
        </div>

        {/* Stat 4: Fonética Neural */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 hover:shadow-[0_2px_0_#E2E8F0] hover:translate-y-[2px] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center text-xl">
              🎙️
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#059669] font-bold text-[11px]">
              {activeCourse.pronunciationScores.length || 3} Ensaios
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#111C2D]">{avgPhonetic}% Acerto</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Cadência &amp; Fonética
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Calibrado via espectrograma acústico com Marie Curie.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. THE TRIPLE-LANGUAGE SWITCHER (CENTRAL MATRIX)         */}
      {/* ======================================================== */}
      <TactileCard className="p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-[#0D9488]" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111C2D]">
                {t("profileTitle") || "Central de Fluência & Matriz de Idiomas"}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              {t("profileSubtitle") || "Aprenda qualquer idioma através de outro com transferência sintática direta (Through-Language Matrix)."}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F0E8] text-xs font-extrabold text-[#111C2D] shadow-[0_2px_0_#E2E8F0]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
            <span>{uiLang === "en" ? "Polyglot Sync Active" : uiLang === "de" ? "Polyglotte Synchro Aktiv" : "Sincronização Poliglota Ativa"}</span>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Pillar A: Idioma Alvo (6 cols) */}
          <div className="lg:col-span-6 bg-[#F5F0E8] rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0D9488] text-white text-xs flex items-center justify-center font-bold">
                  A
                </span>
                <span className="font-extrabold text-sm text-[#111C2D]">
                  {t("sectionA") || "Idioma Alvo (Em Estudo)"}
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] font-bold uppercase">
                {startedCoursesCount} {uiLang === "en" ? "Courses Started" : uiLang === "de" ? "Kurse Gestartet" : "Cursos Iniciados"}
              </span>
            </div>

            {/* Lista de Cursos com progresso isolado */}
            <div className="flex flex-col gap-3">
              {TARGET_COURSES.map((course) => {
                const isActive = targetLang === course.code;
                const cData = courses[course.code];
                const isStarted = Boolean(cData?.started);
                const completedLessons = cData?.completedNodeIds?.length || 0;
                const totalLessons = 5;
                const progressPercent = isStarted
                  ? Math.round((completedLessons / totalLessons) * 100)
                  : 0;
                const flagCode = course.code === "en" ? "gb" : course.code === "ja" ? "jp" : course.code;

                return (
                  <motion.div
                    key={course.code}
                    whileTap={{ y: 2 }}
                    onClick={() => handleSelectTargetLang(course.code)}
                    className={`relative rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-white border-2 border-[#0D9488] shadow-[0_4px_0_#0F766E]"
                        : "bg-white border border-stone-200/80 shadow-[0_4px_0_#CBD5E1] hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Flag code={flagCode} size={32} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-[#111C2D]">
                            {ALL_LANGUAGES.find((l) => l.code === course.code)?.name || course.code}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            ({course.nativeName})
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded bg-[#0D9488] text-white text-[10px] uppercase font-bold">
                              Ativo
                            </span>
                          )}
                          {!isStarted && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] uppercase font-bold">
                              Novo
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#64748B] mt-0.5">
                          {isStarted
                            ? `Nível ${cData.level} · ${completedLessons} de ${totalLessons} lições (${cData.xp} XP)`
                            : "Curso ainda não iniciado · Clique para começar do Zero"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className="text-xs font-black"
                        style={{ color: course.badgeColor }}
                      >
                        {progressPercent}%
                      </span>
                      <div className="w-16 bg-[#F5F0E8] rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: course.badgeColor,
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Pillar B & C: Apoio e Interface (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Pillar B: Idioma de Apoio (All 7 languages) */}
            <div className="bg-[#F5F0E8] rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#855300] text-white text-xs flex items-center justify-center font-bold">
                    B
                  </span>
                  <span className="font-extrabold text-sm text-[#111C2D]">
                    {t("sectionB") || "Idioma de Apoio (Base de Ensino)"}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#FFDDB8] text-[#2A1700] text-[11px] font-bold">
                  {uiLang === "en" ? "Heuristic Pillar" : uiLang === "de" ? "Heuristische Basis" : "Pilar Heurístico"}
                </span>
              </div>

              <p className="text-xs text-[#64748B]">
                {t("sectionBSubtitle") || "Traduções, guias fonéticos e notas dos mentores serão transmitidas neste idioma."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {ALL_LANGUAGES.map((lang) => {
                  const isActive = supportLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectSupportLang(lang.code)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-white border-2 border-[#855300] shadow-[0_3px_0_#653E00]"
                          : "bg-white shadow-[0_2px_0_#CBD5E1] border border-stone-200/80 hover:bg-stone-50"
                      }`}
                    >
                      <Flag code={lang.flag} size={20} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#111C2D] truncate">
                          {lang.name}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {isActive ? (uiLang === "en" ? "Active" : "Ativo") : (uiLang === "en" ? "Select" : "Selecionar")}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pillar C: Interface do Aplicativo (All 7 languages) */}
            <div className="bg-[#F5F0E8] rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white text-xs flex items-center justify-center font-bold">
                    C
                  </span>
                  <span className="font-extrabold text-sm text-[#111C2D]">
                    {t("sectionC") || "Interface do Aplicativo (Menus & HUD)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    syncSupportWithUi();
                    void tap("success");
                  }}
                  className="text-[10px] text-[#0D9488] font-bold hover:underline cursor-pointer"
                >
                  {t("syncSupportWithUi") || "Sincronizar com Apoio"}
                </button>
              </div>

              <p className="text-xs text-[#64748B]">
                {t("sectionCSubtitle") || "Menus, navegação, botões táteis e cabeçalhos serão exibidos no idioma selecionado."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {ALL_LANGUAGES.map((lang) => {
                  const isActive = uiLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectUiLang(lang.code)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                          : "bg-white shadow-[0_2px_0_#CBD5E1] border border-stone-200/80 hover:bg-stone-50 text-[#111C2D]"
                      }`}
                    >
                      <Flag code={lang.flag} size={20} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {lang.name}
                        </div>
                        <div
                          className={`text-[10px] ${
                            isActive ? "text-teal-100" : "text-[#64748B]"
                          }`}
                        >
                          {isActive ? "UI Ativa" : "Trocar"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 4. SEU CONSELHO DE SÁBIOS (BARALHO DE MENTORES ATIVOS)   */}
      {/* ======================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-[#855300]" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111C2D]">
                Seu Conselho de Sábios
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Mentores ativos que concedem bônus cognitivos e corrigem seus exercícios em tempo real.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MENTORS_LIST.map((mentor) => {
            const isSelected = activeMentor?.id === mentor.id;
            return (
              <motion.div
                key={mentor.id}
                whileTap={{ y: 2 }}
                onClick={() => handleSelectMentor(mentor)}
                className={`rounded-2xl p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-2 border-[#0D9488] shadow-[0_6px_0_#0F766E]"
                    : "bg-white border-stone-200 shadow-[0_4px_0_#CBD5E1] hover:bg-stone-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 overflow-hidden shrink-0">
                    <img
                      src={mentor.avatar}
                      alt={mentor.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.tried) {
                          target.dataset.tried = "1";
                          target.src = `/assets/assets${mentor.avatar}`;
                        }
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#111C2D]">
                      {mentor.name}
                    </h3>
                    <span className="text-xs text-[#0D9488] font-bold block">
                      {mentor.title}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      Nv. {mentor.level} de Afinidade
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-600 italic font-serif mt-3 pt-3 border-t border-stone-100">
                  {mentor.quote}
                </p>

                <div className="mt-3 pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">
                    {isSelected ? "Mentor Ativo" : "Selecionar"}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
