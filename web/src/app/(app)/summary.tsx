import React from "react";
import { router } from "expo-router";
import { motion } from "framer-motion";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa } from "@/context/prosa-context";
import { tap } from "@/lib/haptics";
import {
  PartyPopper,
  Sparkles,
  Zap,
  Flame,
  Brain,
  Clock,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Share2,
  CheckCircle2,
  Moon,
  Activity,
  Layers,
  Award,
} from "lucide-react";

const FEYNMAN_AVATAR = "/cast/feynman.png";
const EINSTEIN_AVATAR = "/cast/einstein.png";

export default function SummaryScreen() {
  const { streak, xp, gems } = useProsa();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-16">
      {/* ======================================================== */}
      {/* 1. CELEBRATION HEADER                                    */}
      {/* ======================================================== */}
      <section className="flex flex-col items-center text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] text-[#B45309] shadow-[0_3px_0_#D97706]"
        >
          <PartyPopper className="w-5 h-5 text-[#FF5722]" />
          <span className="text-xs uppercase font-black tracking-wider">
            SESSÃO DIÁRIA CONCLUÍDA COM SUCESSO! 🎉
          </span>
        </motion.div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-black text-[#111C2D] tracking-tight">
            20 Minutos de{" "}
            <span className="text-[#0D9488] underline decoration-[#0D9488]/40 decoration-wavy decoration-4">
              Alta Densidade
            </span>{" "}
            Neural!
          </h1>
          <p className="text-base text-[#64748B]">
            Seu ritual matinal está consolidado. Seus circuitos neurais registraram{" "}
            <strong className="text-[#111C2D]">18 novas conexões sinápticas</strong> em Alemão B1.
          </p>
        </div>

        {/* 3 Metric Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-[0_2px_0_#CBD5E1] text-xs font-bold text-[#111C2D]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span>Taxa de Acerto: <strong>96.4%</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-[0_2px_0_#CBD5E1] text-xs font-bold text-[#111C2D]">
            <Clock className="w-4 h-4 text-[#0D9488]" />
            <span>Tempo Ativo: <strong>20m 14s</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 shadow-[0_2px_0_#CBD5E1] text-xs font-bold text-[#111C2D]">
            <TrendingUp className="w-4 h-4 text-[#FF5722]" />
            <span>Velocidade Média: <strong>1.4s/resposta</strong></span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. FOUR QUANTITATIVE SUMMARY CARDS                       */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: XP */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase text-[#D97706] tracking-wider">
                Pontuação de Habilidade
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shadow-[0_2px_0_#FDE68A]">
                <Zap className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111C2D]">
              +85 <span className="text-sm font-bold text-[#64748B]">XP</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Multiplicador de combo 1.25x por sessão sem erros críticos.
            </p>
          </div>
          <div className="w-full bg-[#F5F0E8] rounded-full h-1.5 mt-4 overflow-hidden">
            <div className="bg-[#D97706] h-1.5 rounded-full" style={{ width: "85%" }} />
          </div>
        </TactileCard>

        {/* Card 2: Gems */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase text-[#0891B2] tracking-wider">
                Tesouro de Foco
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#CFFAFE] flex items-center justify-center text-[#0891B2] shadow-[0_2px_0_#A5F3FC]">
                <span>💎</span>
              </div>
            </div>
            <div className="text-3xl font-black text-[#111C2D]">
              +15 <span className="text-sm font-bold text-[#64748B]">Gemas</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Acúmulo total atualizado para {gems + 15} no Cofre Sináptico.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/org")}
            className="text-xs font-bold text-[#0891B2] hover:underline mt-4 text-left cursor-pointer flex items-center gap-1"
          >
            <span>Mercado Aberto</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </TactileCard>

        {/* Card 3: FSRS Stability */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase text-[#0D9488] tracking-wider">
                Estabilidade FSRS
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#E6F7F5] flex items-center justify-center text-[#0D9488] shadow-[0_2px_0_#B2EBF2]">
                <Brain className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111C2D]">
              +3.2%
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Curva de retenção estimada fixada em <strong>94.6%</strong>.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0D9488] mt-4">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Curva Otimizada</span>
          </div>
        </TactileCard>

        {/* Card 4: Streak */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase text-[#FF5722] tracking-wider">
                Ofensiva Estendida
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] flex items-center justify-center text-[#FF5722] shadow-[0_2px_0_#FED7AA]">
                <Flame className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#111C2D] flex items-center gap-2">
              <span className="line-through text-[#94A3B8] text-2xl">{streak}</span>
              <ArrowRight className="w-5 h-5 text-[#FF5722]" />
              <span className="text-[#FF5722]">{streak + 1}</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              {streak + 1} dias consecutivos. Você desbloqueou o bônus de consistência semanal.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF5722]/10 text-[#FF5722] text-[10px] font-black mt-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Escudo Ativo: 1 Protegido</span>
          </div>
        </TactileCard>
      </section>

      {/* ======================================================== */}
      {/* 3. PALÁCIO DA MEMÓRIA: 4 TERMOS ANCORADOS                 */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#0D9488] tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Ancoragem Arquitetônica</span>
            </div>
            <h2 className="text-2xl font-black text-[#111C2D]">
              Palácio da Memória: 4 Termos Ancorados
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Estes lemas foram convertidos em cartões mnemônicos táteis e já habitam o Salão Central do Palácio B1.
            </p>
          </div>

          <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-black">
            Algoritmo FSRS 4.5
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Term 1 */}
          <TactileCard className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#10B981]/15 text-[#059669]">
                  Verbo Forte
                </span>
                <span className="text-[11px] font-bold text-[#10B981]">● 98% Retenção</span>
              </div>
              <h3 className="text-lg font-black text-[#111C2D] italic">vollziehen</h3>
              <p className="text-xs text-[#64748B] mt-0.5">executar / realizar-se</p>
              <p className="font-serif text-xs italic text-[#334155] mt-3 bg-[#F5F0E8] p-2.5 rounded-xl border border-stone-200/60">
                “Die Veränderung hat sich vollzogen.”
              </p>
            </div>
            <div className="mt-3 text-[11px] font-bold text-[#0D9488] flex items-center gap-1">
              <span>💡</span> Raiz: voll + ziehen (puxar para a plenitude)
            </div>
          </TactileCard>

          {/* Term 2 */}
          <TactileCard className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EC4899]/15 text-[#BE185D]">
                  Substantivo Fem.
                </span>
                <span className="text-[11px] font-bold text-[#10B981]">● Mnemônico OK</span>
              </div>
              <h3 className="text-lg font-black text-[#111C2D] italic">die Sehnsucht</h3>
              <p className="text-xs text-[#64748B] mt-0.5">saudade ardente / anseio profundo</p>
              <p className="font-serif text-xs italic text-[#334155] mt-3 bg-[#F5F0E8] p-2.5 rounded-xl border border-stone-200/60">
                “Eine tiefe Sehnsucht nach Erkenntnis.”
              </p>
            </div>
            <div className="mt-3 text-[11px] font-bold text-[#BE185D] flex items-center gap-1">
              <span>📖</span> Goethe: Foco Romântico Clássico
            </div>
          </TactileCard>

          {/* Term 3 */}
          <TactileCard className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#D97706]/15 text-[#B45309]">
                  Sintaxe B1
                </span>
                <span className="text-[11px] font-bold text-[#10B981]">● Verbo-Final</span>
              </div>
              <h3 className="text-lg font-black text-[#111C2D] italic">der Nebensatz</h3>
              <p className="text-xs text-[#64748B] mt-0.5">oração subordinada</p>
              <p className="font-serif text-xs italic text-[#334155] mt-3 bg-[#F5F0E8] p-2.5 rounded-xl border border-stone-200/60">
                “...weil der Geist niemals ruht.”
              </p>
            </div>
            <div className="mt-3 text-[11px] font-bold text-[#B45309] flex items-center gap-1">
              <span>↔️</span> Mecanismo: Verbo no Fim
            </div>
          </TactileCard>

          {/* Term 4 */}
          <TactileCard className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#64748B]/15 text-[#334155]">
                  Adjetivo Expressivo
                </span>
                <span className="text-[11px] font-bold text-[#0D9488]">● Kafkaesco</span>
              </div>
              <h3 className="text-lg font-black text-[#111C2D] italic">ungeheuer</h3>
              <p className="text-xs text-[#64748B] mt-0.5">monstruoso / colossal</p>
              <p className="font-serif text-xs italic text-[#334155] mt-3 bg-[#F5F0E8] p-2.5 rounded-xl border border-stone-200/60">
                “Zu einem ungeheuren Ungeziefer.”
              </p>
            </div>
            <div className="mt-3 text-[11px] font-bold text-[#334155] flex items-center gap-1">
              <span>📖</span> A Metamorfose (1915)
            </div>
          </TactileCard>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. DIÁLOGO DOS MENTORES POLÍMATAS                         */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-[#111C2D]">
            Diálogo dos Mentores Polímatas
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-xs font-black">
            Debate Neuro-Didático
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feynman */}
          <TactileCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#FEA619] ring-2 ring-[#D97706] flex-shrink-0">
                  <img src={FEYNMAN_AVATAR} alt="Richard Feynman" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#111C2D]">Richard Feynman</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#D97706] font-bold">
                    <span>RITMO &amp; IMPROVISO</span>
                    <span>• Prêmio Nobel de Física</span>
                  </div>
                </div>
              </div>

              <p className="font-serif text-sm text-[#334155] italic leading-relaxed bg-[#FDFBF7] p-4 rounded-2xl border border-stone-200/60">
                “Incrível ritmo nos exercícios táteis! Você não hesitou na conjugação do passado de vollziehen. A cadência de 1.4 segundos por oração prova que seu cérebro já parou de traduzir em português e começou a dedilhar diretamente no instrumento alemão. Mantenha essa pulsação!”
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs font-black text-[#D97706]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Cadência Fluida
              </span>
              <span>PONTUAÇÃO FEYNMAN: 9.8 / 10</span>
            </div>
          </TactileCard>

          {/* Einstein */}
          <TactileCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#0D9488] ring-2 ring-[#0F766E] flex-shrink-0">
                  <img src={EINSTEIN_AVATAR} alt="Albert Einstein" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#111C2D]">Albert Einstein</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#0D9488] font-bold">
                    <span>CONSOLIDAÇÃO SINÁPTICA</span>
                    <span>• Físico Teórico</span>
                  </div>
                </div>
              </div>

              <p className="font-serif text-sm text-[#334155] italic leading-relaxed bg-[#FDFBF7] p-4 rounded-2xl border border-stone-200/60">
                “A regularidade diária de 20 minutos dobra o impacto cognitivo em relação a 3 horas de estudo exaustivo no fim de semana. A mente é como o campo gravitacional: precisa de densidade contínua, não de tempestades repentinas. Descanse a mente agora para a consolidação sináptica do sono!”
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs font-black text-[#0D9488]">
              <span className="flex items-center gap-1.5">
                <Moon className="w-4 h-4" /> Sono NREM Recomendado
              </span>
              <span>EQUILÍBRIO CIRCADIANO: ÓTIMO</span>
            </div>
          </TactileCard>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. CIRCADIAN LOCK BANNER                                  */}
      {/* ======================================================== */}
      <TactileCard className="p-6 bg-[#F5F0E8] border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-[#111C2D]">
                Meta Diária Concluída com Excelência
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-black uppercase">
                Portão Ativado
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-xl">
              Recompensas de hoje consolidadas. Para evitar saturação de memória de curto prazo e manter a retenção acima de 90%, encerre por aqui. Retorne amanhã às <strong>07:45 BRT</strong> para sua janela circadiana ótima de repetição espaçada.
            </p>
          </div>
        </div>

        <div className="text-right sm:border-l sm:border-stone-300 sm:pl-6 flex flex-col items-center sm:items-end flex-shrink-0">
          <span className="text-[10px] uppercase font-black text-[#64748B] tracking-wider">
            Próxima Janela Em
          </span>
          <span className="text-xl font-mono font-black text-[#111C2D]">
            21h 31m 32s
          </span>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 6. PRIMARY ACTIONS (TACTILE BUTTONS)                      */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <TactileButton
          onClick={() => router.push("/memory")}
          variant="primary"
          size="lg"
          className="w-full sm:w-auto px-8 py-4 font-black flex items-center justify-center gap-2"
        >
          <span>Ir para o Palácio da Memória FSRS</span>
          <ArrowRight className="w-5 h-5" />
        </TactileButton>

        <TactileButton
          onClick={() => router.push("/")}
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto px-8 py-4 font-bold flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5 text-[#64748B]" />
          <span>Compartilhar Conquista &amp; Voltar à Trilha</span>
        </TactileButton>
      </div>
    </div>
  );
}

