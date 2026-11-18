import React from "react";
import { router } from "expo-router";
import { motion } from "framer-motion";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa, type Mentor } from "@/context/prosa-context";
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
} from "lucide-react";

const GABRIEL_AVATAR = "/cast/bento.png";
const DA_VINCI_AVATAR = "/cast/davinci.png";

const FEYNMAN_AVATAR = "/cast/feynman.png";
const CURIE_AVATAR = "/cast/curie.png";
const EINSTEIN_AVATAR = "/cast/einstein.png";

interface CourseInfo {
  code: string;
  flag: string;
  name: string;
  nativeName: string;
  level: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  badgeColor: string;
}

const COURSES: CourseInfo[] = [
  {
    code: "de",
    flag: "🇩🇪",
    name: "Alemão",
    nativeName: "Deutsch",
    level: "Nível B1/B2",
    completedLessons: 42,
    totalLessons: 60,
    progressPercent: 68,
    badgeColor: "#0D9488",
  },
  {
    code: "fr",
    flag: "🇫🇷",
    name: "Francês",
    nativeName: "Français",
    level: "Nível A2",
    completedLessons: 18,
    totalLessons: 52,
    progressPercent: 35,
    badgeColor: "#D97706",
  },
  {
    code: "ja",
    flag: "🇯🇵",
    name: "Japonês",
    nativeName: "日本語",
    level: "Nível A1",
    completedLessons: 6,
    totalLessons: 50,
    progressPercent: 12,
    badgeColor: "#FB7185",
  },
];

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
    quote: "“A imaginação é mais importante que o léxico estático; pense em alemão.”",
  },
];

export default function ProfileScreen() {
  const session = useSession();
  const displayName = session?.user?.display_name || "Estudante Polímata";
  const userEmail = session?.user?.email || "estudante@prosa.io";
  const {
    xp,
    gems,
    streak,
    targetLang,
    throughLang,
    interfaceLang,
    activeMentor,
    isPro,
    setTargetLang,
    setThroughLang,
    setInterfaceLang,
    setActiveMentor,
  } = useProsa();

  const handleSelectTargetLang = (code: string) => {
    void tap("light");
    setTargetLang(code);
  };

  const handleSelectThroughLang = (lang: string) => {
    void tap("light");
    setThroughLang(lang);
  };

  const handleSelectInterfaceLang = (lang: string) => {
    void tap("light");
    setInterfaceLang(lang);
  };

  const handleSelectMentor = (mentor: Mentor) => {
    void tap("medium");
    setActiveMentor(mentor);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col gap-8 pb-16">
      {/* ======================================================== */}
      {/* 1. TOP HERO CARD (PERFIL & CEFR MASTER BADGE)            */}
      {/* ======================================================== */}
      <TactileCard className="p-6 lg:p-8 relative overflow-hidden">
        {/* Ambient Tactile Depth Splashes */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#0D9488]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#FEA619]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Esquerda: Identidade & Avatar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-[#0D9488] p-1 shadow-[0_4px_0_#0F766E] border border-stone-200 overflow-hidden flex items-center justify-center text-white font-black text-3xl">
                {displayName[0]?.toUpperCase() ?? "P"}
              </div>
              {isPro && (
                <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#D97706] to-[#FEA619] text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full shadow-[0_2px_0_#92400E] flex items-center gap-1">
                  👑 PRO
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111C2D] tracking-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEA619]/20 text-[#684000] font-bold text-xs shadow-[0_2px_0_#FEA619]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Membro Prosa Pro desde Nov 2024</span>
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

              {/* Barra de Progresso de Nível */}
              <div className="mt-2 flex items-center gap-3 w-full sm:w-80">
                <div className="flex-1 bg-[#F5F0E8] rounded-full h-3.5 p-0.5 shadow-[inset_0_2px_0_#CBD5E1]">
                  <div
                    className="bg-[#0D9488] rounded-full h-full shadow-[0_2px_0_#0F766E] transition-all duration-700"
                    style={{ width: "81.6%" }}
                  />
                </div>
                <span className="text-xs font-extrabold text-[#111C2D] whitespace-nowrap">
                  2.450 <span className="text-[#64748B] font-normal">/ 3.000 XP (Nv 12)</span>
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
              <span className="text-3xl font-black text-[#0D9488]">Nível B2</span>
              <span className="text-sm text-[#111C2D] font-bold">Explorador Avançado</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-white p-2 rounded-xl shadow-[0_2px_0_#E2E8F0] flex flex-col">
                <span className="text-[11px] text-[#64748B] font-semibold">Compreensão Oral</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#111C2D]">88%</span>
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
                  <span className="text-xs font-extrabold text-[#111C2D]">84%</span>
                  <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                </div>
              </div>

              <div className="bg-white p-2 rounded-xl shadow-[0_2px_0_#E2E8F0] flex flex-col">
                <span className="text-[11px] text-[#64748B] font-semibold">Gramática FSRS</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#111C2D]">79%</span>
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
            <div className="text-2xl font-black text-[#111C2D]">14 Dias</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Ofensiva Ininterrupta
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Recorde pessoal: 28 dias · Risco zero de congelamento hoje.
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
            <div className="text-2xl font-black text-[#111C2D]">2.450 XP</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Pontuação Acumulada
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Zona de Promoção na Liga Diamante garantida.
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
            <div className="text-2xl font-black text-[#111C2D]">128 Cartas</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Palácio de Memória
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Retenção projetada de 91,4% para os próximos 30 dias.
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
              142 Sessões
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#111C2D]">94% Acerto</div>
            <div className="text-xs uppercase font-extrabold text-[#64748B] mt-1">
              Cadência &amp; Fonética
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Avaliado pelo analisador de formantes acústicos.
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
                Central de Fluência &amp; Matriz de Idiomas
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Aprenda qualquer idioma através de outro com transferência sintática direta (Through-Language Matrix).
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F0E8] text-xs font-extrabold text-[#111C2D] shadow-[0_2px_0_#E2E8F0]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
            <span>Sincronização Poliglota Ativa</span>
          </div>
        </div>

        {/* Pillars Grid (Split 6:6) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Pillar A: Idioma Alvo (6 cols) */}
          <div className="lg:col-span-6 bg-[#F5F0E8] rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0D9488] text-white text-xs flex items-center justify-center font-bold">
                  A
                </span>
                <span className="font-extrabold text-sm text-[#111C2D]">
                  Idioma Alvo (Em Estudo)
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] font-bold uppercase">
                3 Cursos Ativos
              </span>
            </div>

            {/* Lista de Cursos */}
            <div className="flex flex-col gap-3">
              {COURSES.map((course) => {
                const isActive = targetLang === course.code;
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
                      <Flag code={course.code} size={32} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-[#111C2D]">
                            {course.name}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            ({course.nativeName})
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded bg-[#0D9488] text-white text-[10px] uppercase font-bold">
                              Ativo
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#64748B] mt-0.5">
                          {course.level} · {course.completedLessons} de {course.totalLessons} lições concluídas
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className="text-xs font-black"
                        style={{ color: course.badgeColor }}
                      >
                        {course.progressPercent}%
                      </span>
                      <div className="w-16 bg-[#F5F0E8] rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${course.progressPercent}%`,
                            backgroundColor: course.badgeColor,
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Botão Adicionar Curso */}
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-white text-[#0D9488] font-bold text-xs shadow-[0_4px_0_#CBD5E1] active:translate-y-1 hover:bg-stone-50 transition-all flex items-center justify-center gap-2 border-dashed border-2 border-[#0D9488]/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Novo Idioma à Trilha</span>
              </button>
            </div>
          </div>

          {/* Pillar B & C: Apoio e Interface (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Pillar B: Idioma de Apoio */}
            <div className="bg-[#F5F0E8] rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#855300] text-white text-xs flex items-center justify-center font-bold">
                    B
                  </span>
                  <span className="font-extrabold text-sm text-[#111C2D]">
                    Idioma de Apoio (Base de Ensino)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#FFDDB8] text-[#2A1700] text-[11px] font-bold">
                  Pilar Heurístico
                </span>
              </div>

              <p className="text-xs text-[#64748B]">
                Explicações gramaticais, metáforas sintáticas e notas culturais serão transmitidas neste idioma.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
                {[
                  { code: "pt", flag: "🇧🇷", label: "Português" },
                  { code: "es", flag: "🇪🇸", label: "Español" },
                  { code: "en", flag: "🇺🇸", label: "English" },
                ].map((item) => {
                  const isActive = throughLang === item.code;
                  return (
                    <motion.button
                      key={item.code}
                      type="button"
                      whileTap={{ y: 2 }}
                      onClick={() => handleSelectThroughLang(item.code)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-white border-2 border-[#855300] shadow-[0_4px_0_#653E00]"
                          : "bg-white shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 hover:bg-stone-50"
                      }`}
                    >
                      <Flag code={item.code} size={26} />
                      <div>
                        <div className="text-xs font-bold text-[#111C2D] leading-tight">
                          {item.label}
                        </div>
                        <div
                          className={`text-[10px] font-bold uppercase mt-0.5 ${
                            isActive ? "text-[#0D9488]" : "text-[#64748B]"
                          }`}
                        >
                          {isActive ? "Ativo Primário" : "Trocar"}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Pillar C: Interface do Aplicativo */}
            <div className="bg-[#F5F0E8] rounded-2xl p-5 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white text-xs flex items-center justify-center font-bold">
                    C
                  </span>
                  <span className="font-extrabold text-sm text-[#111C2D]">
                    Interface do Aplicativo
                  </span>
                </div>
                <span className="text-[11px] text-[#64748B] font-bold">
                  Menus &amp; HUD
                </span>
              </div>

              <div className="bg-white p-1.5 rounded-xl shadow-[0_3px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-1.5">
                {[
                  { code: "pt-BR", label: "Português do Brasil (PT-BR)" },
                  { code: "en-US", label: "English (US)" },
                ].map((item) => {
                  const isActive = interfaceLang === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectInterfaceLang(item.code)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#0D9488] text-white shadow-[0_2px_0_#0F766E]"
                          : "text-[#3D4947] hover:bg-stone-100"
                      }`}
                    >
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      <span>{item.label}</span>
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

          <button
            type="button"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white text-[#855300] font-bold text-xs shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 active:translate-y-1 hover:bg-stone-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Repeat className="w-4 h-4" />
            <span>Trocar Mentores Ativos</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MENTORS_LIST.map((mentor) => {
            const isSelected = activeMentor.id === mentor.id;
            return (
              <motion.div
                key={mentor.id}
                whileTap={{ y: 2 }}
                onClick={() => handleSelectMentor(mentor)}
                className={`rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-2 border-[#0D9488] shadow-[0_4px_0_#0F766E]"
                    : "bg-white border border-stone-200/80 shadow-[0_4px_0_#E2E8F0] hover:shadow-[0_2px_0_#E2E8F0]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full ring-2 ring-[#0D9488] p-0.5 relative flex-shrink-0">
                      <img
                        src={mentor.avatar}
                        alt={mentor.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-[#0D9488] text-white text-[10px] font-bold px-1 rounded-full">
                        Nv {mentor.level}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm text-[#111C2D]">
                          {mentor.name}
                        </h3>
                        {isSelected && (
                          <span className="text-amber-500 text-xs">★</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#0D9488] uppercase font-bold">
                        {mentor.title}
                      </span>
                    </div>
                  </div>

                  <p className="font-serif text-xs text-[#111C2D] italic mt-3 leading-relaxed">
                    {mentor.quote}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px] font-semibold">
                    {isSelected ? "Afinidade Pessoal:" : "Efeito Ativo:"}
                  </span>
                  <span
                    className={`font-extrabold ${
                      isSelected ? "text-[#0D9488]" : "text-[#059669]"
                    }`}
                  >
                    {isSelected ? "98% Em Sintonia" : "+15% Bônus FSRS"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. ACHIEVEMENT MEDAL GALLERY (GALERIA DE INSÍGNIAS)      */}
      {/* ======================================================== */}
      <TactileCard className="p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-[#D97706]" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111C2D]">
                Galeria de Conquistas &amp; Insígnias
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Marcos conquistados em duelos, precisão fonética e expansão sináptica.
            </p>
          </div>

          <span className="px-3.5 py-1.5 rounded-full bg-[#F5F0E8] text-[#111C2D] text-xs font-black shadow-[0_2px_0_#E2E8F0] self-start sm:self-auto">
            18 / 24 Insígnias Coletadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Medal 1: Fogo Eterno */}
          <div className="bg-[#F5F0E8] rounded-2xl p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-4 hover:shadow-[0_2px_0_#E2E8F0] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#D97706]/20 text-[#D97706] flex items-center justify-center text-3xl shadow-[0_3px_0_#D97706] shrink-0">
              🏆
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-[#111C2D]">Fogo Eterno</h4>
                <span className="px-1.5 py-0.5 rounded bg-[#D97706] text-white text-[10px] font-bold">
                  OURO
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">Manter 14 dias de ofensiva ininterrupta.</p>
              <span className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Desbloqueado hoje!
              </span>
            </div>
          </div>

          {/* Medal 2: Ouvido de Ouro */}
          <div className="bg-[#F5F0E8] rounded-2xl p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-4 hover:shadow-[0_2px_0_#E2E8F0] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#06B6D4]/20 text-[#06B6D4] flex items-center justify-center text-3xl shadow-[0_3px_0_#06B6D4] shrink-0">
              🎧
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-[#111C2D]">Ouvido de Ouro</h4>
                <span className="px-1.5 py-0.5 rounded bg-[#06B6D4] text-white text-[10px] font-bold">
                  CIANO
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">95%+ em 10 testes de áudio neural de Goethe.</p>
              <span className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Desbloqueado
              </span>
            </div>
          </div>

          {/* Medal 3: Cirurgião Gramatical */}
          <div className="bg-[#F5F0E8] rounded-2xl p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-4 hover:shadow-[0_2px_0_#E2E8F0] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-3xl shadow-[0_3px_0_#059669] shrink-0">
              🔬
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-[#111C2D]">Cirurgião Gramatical</h4>
                <span className="px-1.5 py-0.5 rounded bg-[#10B981] text-white text-[10px] font-bold">
                  ESMERALDA
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">50 frases complexas dissecadas com Da Vinci.</p>
              <span className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Desbloqueado
              </span>
            </div>
          </div>

          {/* Medal 4: Gladiador Polímata */}
          <div className="bg-[#F5F0E8] rounded-2xl p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-4 hover:shadow-[0_2px_0_#E2E8F0] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#EC4899]/20 text-[#EC4899] flex items-center justify-center text-3xl shadow-[0_3px_0_#EC4899] shrink-0">
              ⚔️
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-[#111C2D]">Gladiador Polímata</h4>
                <span className="px-1.5 py-0.5 rounded bg-[#EC4899] text-white text-[10px] font-bold">
                  MAGENTA
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">Vencer 5 duelos de 120s seguidos sem errar.</p>
              <span className="text-[11px] text-[#059669] font-bold mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Desbloqueado
              </span>
            </div>
          </div>

          {/* Medal 5: Mente Renascentista */}
          <div className="bg-[#F5F0E8] rounded-2xl p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-4 hover:shadow-[0_2px_0_#E2E8F0] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#8B5CF6]/20 text-[#8B5CF6] flex items-center justify-center text-3xl shadow-[0_3px_0_#8B5CF6] shrink-0">
              🏛️
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#111C2D]">Mente Renascentista</h4>
                <span className="text-xs font-black text-[#8B5CF6]">80%</span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">16 de 20 mentores históricos desbloqueados.</p>
              <div className="w-full bg-white rounded-full h-2 mt-2 shadow-[inset_0_1px_0_#CBD5E1] overflow-hidden">
                <div className="bg-[#8B5CF6] h-2 rounded-full" style={{ width: "80%" }} />
              </div>
            </div>
          </div>

          {/* Medal 6: Hipervelocidade FSRS */}
          <div className="bg-[#F5F0E8] rounded-2xl p-4 shadow-[0_4px_0_#E2E8F0] border border-stone-200/80 flex items-center gap-4 hover:shadow-[0_2px_0_#E2E8F0] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#D97706]/20 text-[#D97706] flex items-center justify-center text-3xl shadow-[0_3px_0_#D97706] shrink-0">
              ⚡
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-[#111C2D]">Hipervelocidade FSRS</h4>
                <span className="text-xs font-black text-[#D97706]">64%</span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">128 de 200 cartas no patamar "Permanente".</p>
              <div className="w-full bg-white rounded-full h-2 mt-2 shadow-[inset_0_1px_0_#CBD5E1] overflow-hidden">
                <div className="bg-[#D97706] h-2 rounded-full" style={{ width: "64%" }} />
              </div>
            </div>
          </div>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 6. DIAGNOSTIC ACTION & QUICK EXPORT STRIP                */}
      {/* ======================================================== */}
      <section className="bg-[#F5F0E8] rounded-3xl p-6 lg:p-8 shadow-[0_4px_0_#E2E8F0] flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-[#0D9488]/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center text-3xl shadow-[0_4px_0_#0F766E] shrink-0">
            🎯
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-[#111C2D]">
              Pronto para auditar seu salto de nível?
            </h3>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Faça o teste adaptativo CEFR de 5 minutos com Leonardo da Vinci e Marie Curie para recalibrar o algoritmo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <TactileButton
            variant="primary"
            size="md"
            onPress={() => router.push("/placement")}
            label="Refazer Teste de Nivelamento CEFR ➔"
          />
          <button
            type="button"
            className="px-4 py-3 rounded-xl bg-white text-[#111C2D] font-bold text-xs shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 active:translate-y-1 hover:bg-stone-50 transition-all flex items-center gap-2 cursor-pointer"
            title="Exportar Baralho Anki / CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar FSRS</span>
          </button>
          <button
            type="button"
            className="p-3 rounded-xl bg-white text-[#111C2D] shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 active:translate-y-1 hover:bg-stone-50 transition-all cursor-pointer"
            title="Configurações de Acessibilidade"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
