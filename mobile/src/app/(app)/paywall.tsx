import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "expo-router";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";

export default function PaywallScreen() {
  const router = useRouter();
  const session = useSession();
  const cardHolderName = session?.user?.display_name?.toUpperCase() || "ESTUDANTE POLÍMATA";
  const { isPro, setIsPro } = useProsa();
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleActivatePro = () => {
    setIsPro(true);
    setToastMessage("Parabéns! Prosa Pro VIP ativado com 7 dias grátis.");
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 pb-16">
      {/* Navigation Return Header */}
      <div className="flex items-center justify-between">
        <motion.button
          whileTap={{ y: 2 }}
          onClick={() => router.push("/")}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200/80 shadow-sm hover:bg-[#F5F0E8] transition-colors text-xs font-bold text-stone-800"
        >
          <span className="material-symbols-outlined text-sm text-teal-700 font-bold">arrow_back</span>
          <span>Voltar para o Aprendizado</span>
        </motion.button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
          <span className="material-symbols-outlined text-emerald-600 text-sm">verified</span>
          <span className="text-[11px] font-bold text-emerald-800">Mais de 42.000 Alunos Fluentes</span>
        </div>
      </div>

      {/* Hero Header Section */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 shadow-sm">
          <span className="material-symbols-outlined text-amber-800 text-lg">workspace_premium</span>
          <span className="text-[11px] font-black text-amber-900 tracking-wider uppercase">
            VIP PASS • DESBLOQUEIE O PODER MÁXIMO DO PROSA
          </span>
        </div>

        <h1 className="font-headline-lg text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
          Acelere sua Fluência com as{" "}
          <span className="text-teal-700 underline decoration-amber-400 decoration-4">16 Maiores Mentes</span> da
          História
        </h1>

        <p className="font-serif italic text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto">
          Acesso irrestrito a todos os mentores polímatas, duelos em tempo real sem limite de energia e algoritmo FSRS
          quântico para retenção definitiva.
        </p>
      </section>

      {/* Centerpiece: 3D Holographic Gold VIP Card */}
      <section className="max-w-xl mx-auto relative">
        <div className="relative rounded-[24px] p-7 md:p-8 text-amber-950 border-4 border-amber-300 shadow-xl overflow-hidden bg-gradient-to-br from-[#FDE68A] via-[#F59E0B] to-[#D97706]">
          {/* Holographic Sheen overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 pointer-events-none" />

          {/* Top Row: EMV Chip & Brand Title */}
          <div className="flex items-start justify-between relative z-10">
            {/* Simulated EMV Metallic Chip */}
            <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-amber-100 via-amber-300 to-amber-500 border border-amber-600 shadow-inner flex flex-col justify-between p-1">
              <div className="w-full h-1 bg-amber-700 opacity-40 rounded" />
              <div className="flex justify-between">
                <div className="w-2.5 h-3 border-r border-amber-700 opacity-50" />
                <div className="w-2.5 h-3 border-l border-amber-700 opacity-50" />
              </div>
              <div className="w-full h-1 bg-amber-700 opacity-40 rounded" />
            </div>

            {/* VIP Status Seal */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/20 backdrop-blur-sm border border-amber-950/30">
              <span className="material-symbols-outlined text-amber-950 text-sm">verified_user</span>
              <span className="text-[10px] uppercase font-black text-amber-950 tracking-wider">
                {isPro ? "VIP ATIVO" : "VIP PASS LENDÁRIO"}
              </span>
            </div>
          </div>

          {/* Middle Row: Brand Nomenclature & Mentor Glyphs */}
          <div className="my-6 relative z-10 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black tracking-tight text-amber-950 drop-shadow-sm">
                PROSA PRO
              </span>
              <span className="text-base font-extrabold text-amber-900">POLIGLOTA</span>
            </div>
            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-widest">
              16 MENTES ILIMITADAS • ALGORITMO FSRS ATIVO
            </p>

            {/* Micro Historical Mentor Avatar Row */}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex -space-x-2 overflow-hidden py-1">
                <div className="w-8 h-8 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center font-bold text-xs shadow" title="Leonardo da Vinci">🎨</div>
                <div className="w-8 h-8 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center font-bold text-xs shadow" title="Albert Einstein">⚡</div>
                <div className="w-8 h-8 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center font-bold text-xs shadow" title="Marie Curie">🧪</div>
                <div className="w-8 h-8 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center font-bold text-xs shadow" title="Frida Kahlo">🌺</div>
                <div className="w-8 h-8 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center font-bold text-xs shadow" title="Johann Wolfgang von Goethe">📜</div>
                <div className="w-8 h-8 rounded-full border-2 border-amber-300 bg-amber-100 flex items-center justify-center font-bold text-xs shadow" title="Aristóteles">🏛️</div>
              </div>
              <span className="text-xs font-black text-amber-950 bg-amber-300/80 px-2 py-0.5 rounded-full border border-amber-400">
                +10 Mentes
              </span>
            </div>
          </div>

          {/* Bottom Row: Cardholder & Contactless */}
          <div className="flex items-end justify-between relative z-10 pt-3 border-t border-amber-800/30">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-900/80">TITULAR DA MATRIZ</p>
              <p className="text-sm font-black text-amber-950 tracking-wide">{cardHolderName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-900/80">VALIDADE</p>
                <p className="text-xs font-black text-amber-950">2026 / ELITE</p>
              </div>
              <span className="material-symbols-outlined text-2xl text-amber-950">contactless</span>
            </div>
          </div>
        </div>
      </section>

      {/* Plan Selector */}
      <section className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold text-stone-900">Selecione seu Passe de Maestria</h2>
          <p className="text-xs text-stone-500">7 dias gratuitos sem cobrança hoje. Cancele com 1 clique.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan 1: ANUAL */}
          <div
            onClick={() => setSelectedPlan("annual")}
            className={`relative cursor-pointer flex flex-col justify-between p-5 rounded-2xl transition-all ${
              selectedPlan === "annual"
                ? "bg-white border-4 border-teal-600 shadow-[0_5px_0_#0F766E]"
                : "bg-white border-2 border-stone-200/80 shadow-sm hover:border-teal-500/40"
            }`}
          >
            <div className="absolute -top-3.5 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-[#FF5722] text-white font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
              🔥 40% OFF • MAIS POPULAR
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-stone-900">Plano Anual</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedPlan === "annual" ? "bg-teal-600 text-white" : "border-2 border-stone-300"
                  }`}
                >
                  {selectedPlan === "annual" && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                </div>
              </div>
              <p className="text-xs text-stone-500">O caminho comprovado para a fluência contínua e poliglota.</p>
              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-stone-500">12x</span>
                  <span className="text-2xl font-black text-teal-700">R$ 29,90</span>
                  <span className="text-xs font-bold text-stone-500">/mês</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">ou R$ 358,80 cobrado anualmente</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
              <span className="material-symbols-outlined text-sm">savings</span>
              <span>Equivale a menos de R$ 1,00 por dia</span>
            </div>
          </div>

          {/* Plan 2: MENSAL */}
          <div
            onClick={() => setSelectedPlan("monthly")}
            className={`cursor-pointer flex flex-col justify-between p-5 rounded-2xl transition-all ${
              selectedPlan === "monthly"
                ? "bg-white border-4 border-teal-600 shadow-[0_5px_0_#0F766E]"
                : "bg-white border-2 border-stone-200/80 shadow-sm hover:border-teal-500/40"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-stone-900">Plano Mensal</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedPlan === "monthly" ? "bg-teal-600 text-white" : "border-2 border-stone-300"
                  }`}
                >
                  {selectedPlan === "monthly" && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                </div>
              </div>
              <p className="text-xs text-stone-500">Flexibilidade total para estudos sazonais.</p>
              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-stone-900">R$ 49,90</span>
                  <span className="text-xs font-bold text-stone-500">/mês</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Cobrança mensal recorrente</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 text-stone-500 text-xs font-semibold">
              Sem compromisso • Cancele quando quiser
            </div>
          </div>
        </div>
      </section>

      {/* Big Juicy 3D Pulsating CTA */}
      <section className="max-w-xl mx-auto text-center space-y-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ y: 3 }}
          onClick={handleActivatePro}
          type="button"
          style={{ backgroundColor: "#10B981" }}
          className="w-full py-4 px-6 rounded-2xl text-white font-extrabold text-base shadow-[0_5px_0_#059669] flex items-center justify-center gap-3 transition-colors"
        >
          <span>Começar Meus 7 Dias Grátis Agora</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </motion.button>
        <div className="flex items-center justify-center gap-2 text-stone-500 text-xs">
          <span className="material-symbols-outlined text-emerald-600 text-base">lock</span>
          <span>Sem cobrança hoje. Cancele a qualquer momento com apenas 1 clique nas configurações.</span>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="space-y-4 pt-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Compare o Salto Evolutivo do Seu Aprendizado
          </h2>
          <p className="text-xs text-stone-600">
            Por que os alunos Prosa Pro alcançam o CEFR B2 três vezes mais rápido.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-[#F5F0E8] border-b border-stone-200/80 px-6 py-3.5 items-center">
            <div className="col-span-5 text-xs font-bold text-stone-600 uppercase tracking-wider">
              Recurso &amp; Dimensão
            </div>
            <div className="col-span-3 text-center text-xs font-bold text-stone-600 uppercase tracking-wider">
              Plano Gratuito
            </div>
            <div className="col-span-4 text-center text-xs font-black text-teal-800 uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm text-amber-600">stars</span>
              <span>Prosa Pro Lendário</span>
            </div>
          </div>

          {/* Comparison Rows */}
          <div className="divide-y divide-stone-100">
            {/* Row 1 */}
            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-teal-700 text-lg">psychology</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Mentes Históricas Ativas</p>
                  <p className="text-[11px] text-stone-500">Interação conversacional com mentores IA</p>
                </div>
              </div>
              <div className="col-span-3 text-center text-stone-500 text-xs font-medium">Apenas 4 mentes básicas</div>
              <div className="col-span-4 text-left pl-3 bg-teal-50/70 rounded-xl py-2 px-3 border border-teal-100 text-xs text-stone-900 font-semibold">
                🌟 <strong className="text-teal-800 font-bold">Todas as 16 mentes desbloqueadas</strong> (Einstein, Curie, Feynman, Da Vinci, Frida Kahlo, Goethe, etc.)
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-700 text-lg">timer</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Sessões Diárias de 20 Minutos</p>
                  <p className="text-[11px] text-stone-500">Imersão de alta densidade neural</p>
                </div>
              </div>
              <div className="col-span-3 text-center text-stone-500 text-xs font-medium">1 sessão por dia</div>
              <div className="col-span-4 text-left pl-3 bg-teal-50/70 rounded-xl py-2 px-3 border border-teal-100 text-xs text-stone-900 font-semibold">
                ⚡ <strong className="text-teal-800 font-bold">Sessões Ilimitadas</strong> com imersão adaptativa em qualquer tópico ou contexto profissional
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-700 text-lg">public</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Pares de Idiomas Simultâneos</p>
                  <p className="text-[11px] text-stone-500">Flexibilidade para estudantes poliglotas</p>
                </div>
              </div>
              <div className="col-span-3 text-center text-stone-500 text-xs font-medium">1 par ativo</div>
              <div className="col-span-4 text-left pl-3 bg-teal-50/70 rounded-xl py-2 px-3 border border-teal-100 text-xs text-stone-900 font-semibold">
                🌍 <strong className="text-teal-800 font-bold">Matriz Poliglota Ilimitada</strong> (Alemão, Francês, Japonês, Italiano e mais)
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-600 text-lg">swords</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Arena de Duelo 120s</p>
                  <p className="text-[11px] text-stone-500">Batalhas de vocabulário em tempo real</p>
                </div>
              </div>
              <div className="col-span-3 text-center text-stone-500 text-xs font-medium">3 duelos por dia</div>
              <div className="col-span-4 text-left pl-3 bg-teal-50/70 rounded-xl py-2 px-3 border border-teal-100 text-xs text-stone-900 font-semibold">
                ⚔️ <strong className="text-teal-800 font-bold">Partidas ilimitadas</strong>, torneios de fim de semana e dobro de XP em vitórias
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-purple-700 text-lg">lightbulb</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Palácio da Memória &amp; FSRS</p>
                  <p className="text-[11px] text-stone-500">Repetição espaçada calibrada</p>
                </div>
              </div>
              <div className="col-span-3 text-center text-stone-500 text-xs font-medium">Revisão básica</div>
              <div className="col-span-4 text-left pl-3 bg-teal-50/70 rounded-xl py-2 px-3 border border-teal-100 text-xs text-stone-900 font-semibold">
                🧠 <strong className="text-teal-800 font-bold">Mnemônicos visuais e etimológicos</strong> de IA gerados por Marie Curie
              </div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-12 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-700 text-lg">headphones</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Modo Áudio Commute &amp; Offline</p>
                  <p className="text-[11px] text-stone-500">Aprenda no trânsito sem tela</p>
                </div>
              </div>
              <div className="col-span-3 text-center text-stone-400 text-xs font-medium flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                <span>Bloqueado</span>
              </div>
              <div className="col-span-4 text-left pl-3 bg-teal-50/70 rounded-xl py-2 px-3 border border-teal-100 text-xs text-stone-900 font-semibold">
                🎧 <strong className="text-teal-800 font-bold">Download offline completo</strong> com síntese neural de voz cinematográfica
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 30-Day Guarantee Seal */}
      <section className="p-6 bg-amber-50/90 rounded-2xl border border-amber-300 shadow-sm flex flex-col md:flex-row items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center shrink-0 text-amber-950 shadow-sm border border-amber-500">
          <span className="material-symbols-outlined text-3xl">verified_user</span>
        </div>
        <div className="space-y-1 text-center md:text-left flex-1">
          <h3 className="text-base font-extrabold text-amber-950">Garantia Incondicional de 30 Dias</h3>
          <p className="font-serif italic text-sm text-amber-900 leading-snug">
            Se você não notar uma evolução brutal e tangível na sua fluência durante o primeiro mês, nós devolvemos 100%
            do seu investimento com apenas um e-mail. Sem ressentimentos.
          </p>
        </div>
      </section>

      {/* Student Testimonials Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-10 rounded-full object-cover border-2 border-teal-600"
                src="/cast/clara.png"
                alt="Mariana Costa"
              />
              <div>
                <p className="text-xs font-bold text-stone-900">Mariana Costa</p>
                <p className="text-[11px] text-stone-500">São Paulo • Aluna Pro há 8 meses</p>
              </div>
            </div>
            <div className="flex text-amber-400 text-xs">★★★★★</div>
          </div>
          <p className="font-serif italic text-xs text-stone-700 leading-relaxed">
            "O Prosa Pro me fez atingir o B2 em alemão em 4 meses de imersão diária com Da Vinci e Einstein. A abordagem
            dos diálogos históricos elimina completamente o tédio das apostilas tradicionais."
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-10 rounded-full object-cover border-2 border-teal-600"
                src="/cast/bento.png"
                alt="Lucas Nogueira"
              />
              <div>
                <p className="text-xs font-bold text-stone-900">Lucas Nogueira</p>
                <p className="text-[11px] text-stone-500">Belo Horizonte • Aluno Pro há 1 ano</p>
              </div>
            </div>
            <div className="flex text-amber-400 text-xs">★★★★★</div>
          </div>
          <p className="font-serif italic text-xs text-stone-700 leading-relaxed">
            "Os duelos ilimitados de 120s tornaram o vocabulário uma segunda natureza sem esforço. É como jogar um game
            viciante enquanto você absorve as estruturas mais complexas do idioma."
          </p>
        </div>
      </section>

      {/* Security & Payment Badges */}
      <section className="pt-4 border-t border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-stone-500 text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-base">lock</span>
          <span>Compra 100% Criptografada SSL de 256 bits</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center font-bold text-stone-700">
          <span className="px-3 py-1 bg-white border border-stone-200/80 rounded-lg shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-teal-700">payments</span> Pix
          </span>
          <span className="px-3 py-1 bg-white border border-stone-200/80 rounded-lg shadow-sm">Cartão de Crédito</span>
          <span className="px-3 py-1 bg-white border border-stone-200/80 rounded-lg shadow-sm">Apple Pay</span>
          <span className="px-3 py-1 bg-white border border-stone-200/80 rounded-lg shadow-sm">Google Pay</span>
        </div>
      </section>

      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-800"
          >
            <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
            <div>
              <p className="font-bold text-xs leading-tight">Prosa Pro Ativado!</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
