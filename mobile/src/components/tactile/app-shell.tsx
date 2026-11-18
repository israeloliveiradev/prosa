import React, { useState } from "react";
import { Platform, View, Text, Pressable, Image, ScrollView } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import {
  Compass,
  Timer,
  Swords,
  Brain,
  Sparkles,
  PenTool,
  BookOpen,
  Headphones,
  Trophy,
  ShoppingBag,
  User,
  Crown,
  ChevronDown,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useProsa } from "@/context/prosa-context";
import { ProsaLogo } from "@/components/ProsaLogo";
import { Flag } from "@/components/shell/flag";
import { signOut, useSession } from "@/lib/session";

export interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  isSpecial?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Trilha de Aventura", icon: Compass },
  { href: "/daily", label: "Sessão Diária 20m", icon: Timer },
  { href: "/duel", label: "Duelo 120s", icon: Swords },
  { href: "/memory", label: "Palácio & FSRS", icon: Brain },
  { href: "/persona", label: "Polímatas (Sábios)", icon: Sparkles },
  { href: "/practice", label: "Oficina de Sintaxe", icon: PenTool },
  { href: "/news", label: "Biblioteca & Leitor", icon: BookOpen },
  { href: "/commute", label: "Lab de Fonética", icon: Headphones },
  { href: "/score", label: "Ligas & Ranking", icon: Trophy },
  { href: "/org", label: "Mercado & Loja", icon: ShoppingBag },
  { href: "/profile", label: "Perfil & Conquistas", icon: User },
  { href: "/paywall", label: "Prosa Pro VIP", icon: Crown, isSpecial: true },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const session = useSession();
  const { xp, gems, streak, targetLang, throughLang, activeMentor, isPro, setTargetLang } = useProsa();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/account");
    }
  };

  const formatLanguagePill = () => {
    const name =
      targetLang === "de"
        ? "German"
        : targetLang === "ja"
          ? "Japanese"
          : targetLang === "fr"
            ? "French"
            : targetLang === "es"
              ? "Spanish"
              : targetLang === "it"
                ? "Italian"
                : "English";
    return { name, through: `via ${throughLang.toUpperCase()}` };
  };

  const currentLang = formatLanguagePill();

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFBF7", minHeight: "100%" }}>
      {/* ======================================================== */}
      {/* 1. LATERAL NAVIGATION (SIDEBAR DESKTOP)                  */}
      {/* ======================================================== */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white flex-col justify-between py-6 px-4 z-50 border-r border-stone-200 shadow-[4px_0_0_#F5F0E8]"
        style={{ boxSizing: "border-box" }}
      >
        <div className="flex flex-col gap-6">
          {/* Logo Oficial Prosa Tátil 3D */}
          <div className="px-2">
            <ProsaLogo variant="full" href="/" />
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname === "/(app)" || pathname === "/(app)/"
                  : pathname.startsWith(item.href);
              const IconComp = item.icon;

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href as Href)}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer select-none ${active
                    ? "bg-[#0D9488] text-white shadow-[0_4px_0_#0F766E] translate-y-0"
                    : item.isSpecial
                      ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-[0_3px_0_#D97706] hover:bg-[#FDE68A]"
                      : "bg-white text-[#334155] border border-stone-200/80 shadow-[0_3px_0_#E2E8F0] hover:bg-[#F5F0E8] hover:text-[#0F172A]"
                    }`}
                  style={{
                    outline: "none",
                  }}
                >
                  <IconComp
                    size={18}
                    className={active ? "text-white" : item.isSpecial ? "text-[#D97706]" : "text-[#0D9488]"}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dynamic Active Mentor Card (Albert Einstein) */}
        <div className="relative bg-[#F5F0E8] border border-stone-200 rounded-2xl p-3.5 shadow-[0_4px_0_#E2E8F0]">
          <div className="absolute -top-2 left-6 w-3.5 h-3.5 bg-[#F5F0E8] border-t border-l border-stone-200 rotate-45" />
          <p className="text-xs text-[#1E293B] mb-3 italic font-serif leading-snug">
            {activeMentor.quote}
          </p>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <img
                src={activeMentor.avatar}
                alt={activeMentor.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FEA619]"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[9px] font-black text-white shadow-sm">
                ✓
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#111C2D] truncate">
                {activeMentor.name}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#00685F]">
                {activeMentor.title} • Nv {activeMentor.level}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Settings, Help & Logout */}
        <div className="flex items-center justify-between pt-2 px-1 text-[#64748B] text-xs">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex items-center gap-1 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <Settings size={14} />
            <span>Ajustes</span>
          </button>
          <span className="text-stone-300">•</span>
          <button
            type="button"
            onClick={() => router.push("/placement")}
            className="flex items-center gap-1 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <HelpCircle size={14} />
            <span>Ajuda</span>
          </button>
          <span className="text-stone-300">•</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. TOP HUD HEADER PERSISTENTE                            */}
      {/* ======================================================== */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-[0_2px_0_#F5F0E8] z-40">
          <div className="h-16 w-full max-w-6xl mx-auto px-4 lg:px-6 flex items-center justify-between gap-3">
            {/* Esquerda: Logo Mobile + Seletor de Idioma */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="lg:hidden flex items-center mr-1">
                <ProsaLogo variant="icon" size="sm" href="/" />
              </div>

              {/* Seletor de Idioma com Bandeiras Oficiais em Vetor SVG */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F0E8] border border-stone-200 text-[#111C2D] text-xs font-bold shadow-[0_2px_0_#CBD5E1] hover:bg-stone-200/60 transition-colors cursor-pointer"
                  style={{ outline: "none" }}
                >
                  <Flag code={targetLang} size={18} />
                  <span className="hidden sm:inline">{currentLang.name}</span>
                  <span className="text-[#64748B] text-[11px] font-medium">{currentLang.through}</span>
                  <Flag code={throughLang} size={18} />
                  <ChevronDown size={14} className="text-[#64748B]" />
                </button>

                {/* Dropdown de Idiomas */}
                {langMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/5"
                      onClick={() => setLangMenuOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <span className="px-3 py-1.5 text-[10px] font-black uppercase text-[#64748B] block tracking-wider">
                        Mudar Idioma Alvo
                      </span>
                      {[
                        { code: "de", name: "Alemão (Deutsch)" },
                        { code: "fr", name: "Francês (Français)" },
                        { code: "ja", name: "Japonês (日本語)" },
                        { code: "en", name: "Inglês (English)" },
                        { code: "es", name: "Espanhol (Español)" },
                        { code: "it", name: "Italiano (Italiano)" },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setTargetLang(lang.code);
                            setLangMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${targetLang === lang.code
                            ? "bg-[#0D9488]/10 text-[#0D9488]"
                            : "hover:bg-stone-100 text-stone-700"
                            }`}
                        >
                          <Flag code={lang.code} size={20} />
                          <span>{lang.name}</span>
                          {targetLang === lang.code && (
                            <span className="ml-auto text-[#0D9488] font-bold">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Direita: Ofensiva, XP, Gemas, Duelo & Perfil */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Ofensiva de Fogo */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] text-xs font-extrabold shadow-[0_2px_0_rgba(255,87,34,0.15)]">
                <span>🔥</span>
                <span>{streak} Dias</span>
              </div>

              {/* XP */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97706]/10 border border-[#D97706]/20 text-[#D97706] text-xs font-extrabold shadow-[0_2px_0_rgba(217,119,6,0.15)]">
                <span>⚡</span>
                <span>{xp.toLocaleString()} XP</span>
              </div>

              {/* Gemas */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-[#06B6D4] text-xs font-extrabold shadow-[0_2px_0_rgba(6,182,212,0.15)]">
                <span>💎</span>
                <span>{gems}</span>
              </div>

              {/* Atalho Rápido de Duelo */}
              <button
                type="button"
                onClick={() => router.push("/duel")}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#7C3AED] text-xs font-black shadow-[0_2px_0_rgba(139,92,246,0.2)] hover:bg-[#8B5CF6]/25 transition cursor-pointer"
                style={{ outline: "none" }}
              >
                <span>⚔️</span>
                <span>Duelo</span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse ml-0.5" />
              </button>

              {/* Avatar do Usuário com Menu de Perfil / Sair */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="relative cursor-pointer ml-1 select-none flex items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-black text-xs ring-2 ring-[#0D9488]/40 shadow-sm">
                    {(session?.user?.display_name || session?.user?.email || "E").charAt(0).toUpperCase()}
                  </div>
                  {isPro && (
                    <span className="absolute -bottom-1 -right-1 bg-[#F59E0B] text-black text-[9px] font-black px-1 rounded-full border border-white">
                      PRO
                    </span>
                  )}
                </button>

                {/* Dropdown Menu do Usuário */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/5"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                        <div className="w-10 h-10 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-black text-sm ring-2 ring-[#0D9488]/40 shadow-sm shrink-0">
                          {(session?.user?.display_name || session?.user?.email || "E").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-stone-900 truncate">
                            {session?.user?.display_name || (session?.user?.email ? session.user.email.split("@")[0] : "Estudante")}
                          </span>
                          <span className="text-[11px] text-stone-500 truncate">
                            {session?.user?.email || "aluno@prosa.app"}
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            router.push("/profile");
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <User size={15} className="text-teal-600" />
                          <span>Perfil & Conquistas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            router.push("/settings");
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <Settings size={15} className="text-teal-600" />
                          <span>Configurações</span>
                        </button>
                      </div>

                      <div className="pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <LogOut size={15} />
                          <span>Sair da Conta (Logout)</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 3. CONTEÚDO PRINCIPAL (COM max-w-7xl mx-auto)            */}
        {/* ======================================================== */}
        <main className="w-full pt-20 pb-20 lg:pb-8 flex-1">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </View>
  );
}

