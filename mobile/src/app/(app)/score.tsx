import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "expo-router";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { Flag } from "@/components/shell/flag";
import { tap } from "@/lib/haptics";

interface BenchmarkCompetitor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  flag: string;
  targetPair: string;
  streak: number;
  xp: number;
  status?: string;
  isCurrentUser?: boolean;
}

const POLYMATH_BENCHMARKS: BenchmarkCompetitor[] = [
  {
    id: "einstein",
    name: "Albert Einstein",
    title: "Mentor Polímata · Físico Teórico",
    avatar: "/cast/einstein.png",
    flag: "de",
    targetPair: "DE / EN",
    streak: 64,
    xp: 3500,
    status: "Cúpula C2",
  },
  {
    id: "curie",
    name: "Marie Curie",
    title: "Mentora Polímata · Cientista Pioneira",
    avatar: "/cast/curie.png",
    flag: "fr",
    targetPair: "FR / EN",
    streak: 42,
    xp: 2800,
    status: "Laboratório C1",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    title: "Mentor Polímata · Físico e Educador",
    avatar: "/cast/feynman.png",
    flag: "us",
    targetPair: "EN / PT",
    streak: 28,
    xp: 2200,
    status: "Mecânica B2",
  },
  {
    id: "aristotle",
    name: "Aristóteles",
    title: "Mentor Polímata · Retórica Clássica",
    avatar: "/cast/aristotle.png",
    flag: "it",
    targetPair: "GR / EN",
    streak: 19,
    xp: 1600,
    status: "Retórica B1",
  },
  {
    id: "lovelace",
    name: "Ada Lovelace",
    title: "Mentora Polímata · Ciência Computacional",
    avatar: "/cast/lovelace.png",
    flag: "gb",
    targetPair: "EN / FR",
    streak: 12,
    xp: 1100,
    status: "Lógica A2",
  },
];

export default function ScoreScreen() {
  const router = useRouter();
  const session = useSession();
  const { xp, streak, targetLang } = useProsa();
  const [activeTab, setActiveTab] = useState<"general" | "friends">("general");
  const [inviteCopied, setInviteCopied] = useState(false);

  const currentUserName = session?.user?.display_name || "Você";
  const currentUserInitial = currentUserName[0]?.toUpperCase() ?? "V";

  const userCompetitor: BenchmarkCompetitor = {
    id: "current-user",
    name: currentUserName === "Você" ? "Você" : `${currentUserName} (Você)`,
    title: `Desbravador(a) em ${targetLang ? targetLang.toUpperCase() : "EN"}`,
    avatar: "",
    flag: "br",
    targetPair: `PT / ${targetLang ? targetLang.toUpperCase() : "EN"}`,
    streak: streak || 1,
    xp: xp || 0,
    isCurrentUser: true,
    status: "Sua Posição",
  };

  const combined = [...POLYMATH_BENCHMARKS, userCompetitor].sort((a, b) => b.xp - a.xp);
  const rankedList = combined.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  const userRankIndex = rankedList.findIndex((item) => item.isCurrentUser);
  const userRank = userRankIndex >= 0 ? rankedList[userRankIndex].rank : 1;
  const nextAbove = userRankIndex > 0 ? rankedList[userRankIndex - 1] : null;

  const scrollToMyPosition = () => {
    void tap("light");
    const el = document.getElementById("current-user-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleCopyInvite = () => {
    void tap("success");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText("https://prosa.app/convite/fundacao");
    }
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Status Banner & Countdown */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-white border border-stone-200/80 p-6 md:p-8 shadow-sm"
      >
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-cyan-100/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs uppercase tracking-wider">
                <span className="text-[14px]">🏛️</span>
                CORTE DE POLÍMATAS
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs uppercase tracking-wider">
                <span className="text-[14px]">🧭</span>
                TEMPORADA DE FUNDAÇÃO
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold text-xs">
                <span className="text-[13px]">⚡</span>
                CICLO ATIVO
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight font-serif">
              Ligas &amp; Benchmarks de Cadência
            </h1>
            <p className="text-stone-600 text-sm max-w-xl leading-relaxed">
              Como a Prósa está em fase de fundação, você compete diretamente contra os{" "}
              <strong className="text-teal-700 font-bold">Benchmarks Intelectuais</strong> estabelecidos pelos mentores
              históricos. Alcance metas semanais de XP para ascender de corte.
            </p>
          </div>

          {/* Countdown Pill & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-[#F5F0E8] border border-stone-200/80 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF5722] flex items-center justify-center text-xl">
                🔥
              </div>
              <div>
                <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Fechamento do Ciclo
                </span>
                <span className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span className="text-[#FF5722]">Domingo às 23:59</span>
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-pulse" />
                </span>
              </div>
            </div>

            <motion.button
              whileTap={{ y: 2 }}
              onClick={scrollToMyPosition}
              type="button"
              className="px-5 py-3 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-sm shadow-[0_4px_0_#0F766E] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Ver Minha Posição</span>
              <span>↓</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* User Spotlight Banner (Active Rank Bar) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-5 text-white shadow-[0_4px_0_#0F766E] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-teal-600/40 bg-gradient-to-r from-[#0D9488] via-[#0F766E] to-[#115E59]"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl font-black text-teal-200 border border-white/20">
            #{userRank}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-white truncate">
                {currentUserName === "Você" ? "Você" : `${currentUserName} (Você)`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs font-bold uppercase tracking-wider">
                {userRank <= 3 ? "PÓDIO DE HONRA" : "ZONA DE PROGRESSO"}
              </span>
            </div>
            <p className="text-xs text-teal-100/90 mt-0.5">
              {nextAbove ? (
                <>
                  Você está a apenas <strong className="text-white">{nextAbove.xp - xp} XP</strong> de superar{" "}
                  {nextAbove.name}!
                </>
              ) : (
                <>Você é o líder absoluto da Corte de Polímatas nesta semana!</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end">
          <div className="text-right">
            <span className="block text-[11px] font-bold text-teal-100 uppercase tracking-wider">
              Rendimento Acumulado
            </span>
            <span className="text-base font-extrabold text-white">
              {xp.toLocaleString()} XP
            </span>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-right">
            <span className="block text-[11px] font-bold text-teal-100 uppercase tracking-wider">
              Ofensiva
            </span>
            <span className="text-base font-extrabold text-white flex items-center gap-1 justify-end">
              <span>🔥</span>
              {streak} Dias
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Grid: Leaderboard (8 cols) + Side Column (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Leaderboard Column */}
        <div className="lg:col-span-8 space-y-4" id="ranking-table">
          {/* Table Controls & Tabs */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void tap("light");
                  setActiveTab("general");
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "general"
                    ? "bg-white text-stone-900 border border-stone-200/80 shadow-sm"
                    : "bg-[#F5F0E8] text-stone-600 hover:text-stone-900"
                }`}
              >
                Corte de Polímatas
              </button>
              <button
                onClick={() => {
                  void tap("light");
                  setActiveTab("friends");
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "friends"
                    ? "bg-white text-stone-900 border border-stone-200/80 shadow-sm"
                    : "bg-[#F5F0E8] text-stone-600 hover:text-stone-900"
                }`}
              >
                Amigos &amp; Círculo
              </button>
            </div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              {activeTab === "general" ? "6 Participantes na Corte" : "0 Amigos Adicionados"}
            </span>
          </div>

          {activeTab === "general" ? (
            /* GENERAL TAB: Dynamic Rank List against Polymath Benchmarks */
            <div className="rounded-2xl bg-white border border-stone-200/80 p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase tracking-wider">
                  <span>🏆</span>
                  <span>Classificação Dinâmica por XP Real</span>
                </div>
                <span className="text-xs font-extrabold text-teal-700">Atualização em Tempo Real</span>
              </div>

              {rankedList.map((item) => {
                if (item.isCurrentUser) {
                  return (
                    <div
                      key={item.id}
                      id="current-user-card"
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-teal-50/90 border-2 border-[#0D9488] shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#0D9488] text-white flex items-center justify-center font-black text-sm shadow-[0_2px_0_#0F766E]">
                          #{item.rank}
                        </div>
                        <div className="relative w-11 h-11 shrink-0">
                          <div className="w-11 h-11 rounded-full bg-[#0F766E] flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white">
                            {currentUserInitial}
                          </div>
                          <div className="absolute -bottom-1 -right-1 overflow-hidden rounded-md shadow-sm">
                            <Flag code={item.flag} size={15} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-stone-900 truncate">{item.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#0D9488] text-white font-bold text-[10px] uppercase">
                              VOCÊ
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span>{item.targetPair}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-[#FF5722] font-semibold">
                              <span>🔥</span>
                              {item.streak} Dias
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                        <span className="text-sm font-extrabold text-teal-900">{item.xp.toLocaleString()} XP</span>
                        <span className="px-3 py-1.5 rounded-xl bg-white text-teal-800 font-bold text-xs border border-teal-200 shadow-sm">
                          Sua Posição
                        </span>
                      </div>
                    </div>
                  );
                }

                const isGold = item.rank === 1;
                const isSilver = item.rank === 2;
                const isBronze = item.rank === 3;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl transition-colors ${
                      isGold
                        ? "bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/50"
                        : "bg-[#FDFBF7] border border-stone-200/60 hover:bg-[#F5F0E8]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isGold
                            ? "bg-amber-500 text-white shadow-[0_2px_0_#B45309]"
                            : isSilver
                            ? "bg-slate-300 text-slate-800 shadow-[0_2px_0_#94A3B8]"
                            : isBronze
                            ? "bg-amber-600/80 text-white shadow-[0_2px_0_#92400E]"
                            : "bg-white text-stone-700 border border-stone-200"
                        }`}
                      >
                        {isGold ? "🥇" : isSilver ? "🥈" : isBronze ? "🥉" : `#${item.rank}`}
                      </div>

                      <div className="relative w-11 h-11 shrink-0">
                        <img
                          className="w-11 h-11 rounded-full object-cover border border-stone-200 shadow-sm"
                          src={item.avatar}
                          alt={item.name}
                        />
                        <div className="absolute -bottom-1 -right-1 overflow-hidden rounded-md shadow-sm">
                          <Flag code={item.flag} size={15} />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900 truncate">{item.name}</span>
                          {item.status && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                              {item.status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span>{item.title}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-[#FF5722] font-semibold">
                            <span>🔥</span>
                            {item.streak} Dias
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                      <span className="text-sm font-extrabold text-stone-900">{item.xp.toLocaleString()} XP</span>
                      <motion.button
                        whileTap={{ y: 2 }}
                        onClick={() => router.push("/duel")}
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-pink-50 text-pink-700 border border-stone-200/80 font-bold text-xs shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>⚔️</span>
                        <span>Duelo 120s</span>
                      </motion.button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FRIENDS TAB: Authentic Empty State with Functional Invite */
            <div className="rounded-2xl bg-white border border-stone-200/80 p-8 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-3xl mx-auto shadow-sm">
                👥
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-extrabold text-base text-stone-900">
                  Nenhum amigo no círculo ainda
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  A Prósa está em fase de fundação fechada. Convide colegas de trabalho, parceiros de estudo ou duplas
                  de conversação para formarem um círculo de estudo sincronizado.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs shadow-[0_3px_0_#0F766E] flex items-center gap-2 cursor-pointer"
                >
                  <span>{inviteCopied ? "✓ Link Copiado!" : "🔗 Copiar Link de Convite"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Humboldt Mentor & Rewards Breakdown */}
        <div className="lg:col-span-4 space-y-6">
          {/* Alexander Companion Dialogue Card */}
          <div className="rounded-2xl bg-white border border-stone-200/80 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-amber-100 p-0.5 ring-2 ring-teal-600 shadow-sm">
                  <img
                    className="w-full h-full rounded-full object-cover"
                    src="/cast/darwin.png"
                    alt="Alexander von Humboldt"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-stone-200 text-xs">
                  🧭
                </div>
              </div>

              <div className="min-w-0">
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">
                  Mentor da Corte
                </span>
                <h2 className="text-base font-extrabold text-stone-900 leading-tight">
                  Alexander von Humboldt
                </h2>
                <span className="text-xs text-stone-500 font-medium">Naturalista &amp; Polímata</span>
              </div>
            </div>

            {/* Speech Balloon */}
            <div className="mt-4 p-4 rounded-2xl bg-[#F5F0E8] border border-stone-200/80 shadow-sm">
              <p className="font-serif italic text-sm text-stone-800 leading-relaxed">
                “A competição afia o espírito, mas a exploração amplia o cosmos interior. Complete suas sessões diárias
                e mantenha a constância para superar meus colegas de corte!”
              </p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-teal-800 pt-2 border-t border-stone-200/60">
                <span className="flex items-center gap-1">
                  <span>⭐</span>
                  Meta Semanal: 2.000 XP
                </span>
                <span className="text-stone-500 font-normal">Corte B2</span>
              </div>
            </div>
          </div>

          {/* Rewards Breakdown Card */}
          <div className="rounded-2xl bg-white border border-stone-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <span>🎖️</span>
                <span>Premiação Semanal da Corte</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                DOMINGO
              </span>
            </div>

            <div className="space-y-2.5">
              {/* 1st Place */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥇</span>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">1º Lugar da Corte</span>
                    <span className="text-[11px] text-stone-500">Baú Lendário Da Vinci + 3x Congelamentos</span>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-amber-800 flex items-center gap-1">
                  <span>💎</span>
                  500
                </span>
              </div>

              {/* 2nd and 3rd */}
              <div className="p-3 rounded-xl bg-[#F5F0E8] border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥈🥉</span>
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">Pódio de Honra (2º e 3º)</span>
                    <span className="text-[11px] text-stone-500">2x Congelamentos de Ofensiva</span>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-stone-900 flex items-center gap-1">
                  <span>💎</span>
                  300
                </span>
              </div>

              {/* Fast XP Callout */}
              <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider block">
                    Precisa de XP Rápido?
                  </span>
                  <p className="text-xs text-stone-700 mt-0.5">
                    Desafie um mentor no Duelo 120s e dobre seus pontos em 2 minutos!
                  </p>
                </div>
                <motion.button
                  whileTap={{ y: 2 }}
                  onClick={() => router.push("/duel")}
                  type="button"
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-[0_3px_0_#9d174d] transition-colors cursor-pointer"
                >
                  ⚔️ Jogar
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
