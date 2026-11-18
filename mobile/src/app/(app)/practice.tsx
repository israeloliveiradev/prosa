import React, { useState, useEffect } from "react";
import {
  Link as LinkIcon,
  User,
  Activity,
  Settings,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  Zap,
  ListOrdered,
  Layers,
} from "lucide-react";
import { useProsa } from "@/context/prosa-context";

interface Token {
  id: string;
  val: string;
  role: "conector" | "sujeito" | "objeto" | "verbo";
  roleLabel: string;
  color: string;
  shadow: string;
}

interface PracticeStep {
  pos: string;
  word: string;
  label: string;
  isSpecial?: boolean;
}

interface PracticeTrack {
  badge: string;
  topic: string;
  langTitle: string;
  fixedClause: string;
  tokens: Token[];
  correctOrder: string[];
  errorMsg: string;
  hint: string;
  quote: string;
  slotPlaceholders: string[];
  schemeTitle: string;
  schemeBadge: string;
  steps: PracticeStep[];
  vectorLabel: string;
  vectorFormula: { left: string; middle: string; right: string };
  successMsg: string;
  gearLabel?: string;
  gearRule?: string;
}

const PRACTICE_CONFIG: Record<string, PracticeTrack> = {
  en: {
    badge: "Engenharia da Língua Inglesa",
    topic: "Adverbial Clauses of Reason (because / since)",
    langTitle: "Análise Anatômica da Frase Inglesa",
    fixedClause: "He is not going to work today,",
    gearLabel: "SVO Canon",
    gearRule: "Conector ➔ Ordem Canônica SVO",
    tokens: [
      {
        id: "because",
        val: "because",
        role: "conector",
        roleLabel: "Conj.",
        color: "bg-[#8B5CF6] text-white hover:bg-violet-600",
        shadow: "shadow-[0_4px_0_#6D28D9] active:shadow-[0_1px_0_#6D28D9]",
      },
      {
        id: "he",
        val: "he",
        role: "sujeito",
        roleLabel: "Subj.",
        color: "bg-[#06B6D4] text-white hover:bg-cyan-600",
        shadow: "shadow-[0_4px_0_#0891B2] active:shadow-[0_1px_0_#0891B2]",
      },
      {
        id: "has",
        val: "has",
        role: "verbo",
        roleLabel: "Pres. V",
        color: "bg-[#FB7185] text-white hover:bg-rose-500 ring-2 ring-rose-200",
        shadow: "shadow-[0_4px_0_#E11D48] active:shadow-[0_1px_0_#E11D48]",
      },
      {
        id: "a-high-fever",
        val: "a high fever",
        role: "objeto",
        roleLabel: "Obj.",
        color: "bg-[#10B981] text-white hover:bg-emerald-600",
        shadow: "shadow-[0_4px_0_#059669] active:shadow-[0_1px_0_#059669]",
      },
    ],
    correctOrder: ["because", "he", "has", "a high fever"],
    errorMsg: "Atenção à engrenagem! Em inglês, a oração causal segue a ordem estrita Sujeito + Verbo + Objeto (SVO) logo após a conjunção 'because'.",
    hint: "Coloque o conector 'because' primeiro, depois o pronome sujeito 'he', em seguida o verbo 'has' e finalize com o objeto.",
    quote: "“Assim como os órgãos em um corpo vivo, as funções sintáticas em inglês obedecem à ordem canônica SVO com clareza cristalina.”",
    slotPlaceholders: ["Posição 1 (because)", "Posição 2 (Sujeito)", "Posição 3 (Verbo)", "Posição 4 (Objeto)"],
    schemeTitle: "Esquema Canônico: Conector + Ordem SVO",
    schemeBadge: "Regra Fundamental CEFR B1",
    steps: [
      { pos: "Posição I", word: "because / since", label: "Engrenagem de Conexão" },
      { pos: "Posição II", word: "Subject (he/she)", label: "Garante o Acoplamento" },
      { pos: "Posição III", word: "Finite Verb (has)", label: "Ação Imediata do Sujeito" },
      { pos: "Posição IV", word: "Object (a fever)", label: "Carga Informativa Final", isSpecial: true },
    ],
    vectorLabel: "Fluxo Direto Canônico SVO:",
    vectorFormula: { left: "[ because ]", middle: "─── ordem direta SVO ➔➔➔ ───", right: "[ he has a high fever. ]" },
    successMsg: "O conector 'because' foi articulado com precisão canônica na ordem direta Sujeito ('he') + Verbo ('has') + Objeto ('a high fever'). +30 XP adicionados!",
  },
  de: {
    badge: "Engenharia da Língua Alemã",
    topic: "Kausalsätze (Orações Causais com weil/obwohl)",
    langTitle: "Análise Anatômica da Frase Alemã",
    fixedClause: "Er geht heute nicht zur Arbeit,",
    gearLabel: "Verb-End",
    gearRule: "Konnektor ➔ Verbo Deslocado ao Fim",
    tokens: [
      {
        id: "weil",
        val: "weil",
        role: "conector",
        roleLabel: "Subj.",
        color: "bg-[#8B5CF6] text-white hover:bg-violet-600",
        shadow: "shadow-[0_4px_0_#6D28D9] active:shadow-[0_1px_0_#6D28D9]",
      },
      {
        id: "er",
        val: "er",
        role: "sujeito",
        roleLabel: "Subj.",
        color: "bg-[#06B6D4] text-white hover:bg-cyan-600",
        shadow: "shadow-[0_4px_0_#0891B2] active:shadow-[0_1px_0_#0891B2]",
      },
      {
        id: "hohes-fieber",
        val: "hohes Fieber",
        role: "objeto",
        roleLabel: "Akk.",
        color: "bg-[#10B981] text-white hover:bg-emerald-600",
        shadow: "shadow-[0_4px_0_#059669] active:shadow-[0_1px_0_#059669]",
      },
      {
        id: "hat",
        val: "hat",
        role: "verbo",
        roleLabel: "V-Fin",
        color: "bg-[#FB7185] text-white hover:bg-rose-500 ring-2 ring-rose-200",
        shadow: "shadow-[0_4px_0_#E11D48] active:shadow-[0_1px_0_#E11D48]",
      },
    ],
    correctOrder: ["weil", "er", "hohes Fieber", "hat"],
    errorMsg: "Atenção à engrenagem! O verbo conjugado 'hat' deve se mover obrigatoriamente para a última posição da oração subordinada, logo após 'hohes Fieber'.",
    hint: "Lembre-se da regra de ouro: conjunções subordinativas como 'weil' empurram o verbo conjugado para o final da frase.",
    quote: "“A sintaxe é a mecânica dos pensamentos. Quando a engrenagem de uma conjunção subordinativa gira, ela empurra obrigatoriamente o verbo conjugado para a última posição absoluta da oração.”",
    slotPlaceholders: ["Posição 1 (weil)", "Posição 2 (Sujeito)", "Posição 3 (Mittelfeld)", "Posição 4 (Verbo Fim)"],
    schemeTitle: "Esquema de Propulsão Sintática: Verb-End-Regel",
    schemeBadge: "Regra Dourada CEFR A2-B1",
    steps: [
      { pos: "Posição I", word: "weil / obwohl", label: "Engrenagem de Tração" },
      { pos: "Posição II", word: "Subjekt (er/sie)", label: "Garante o Acoplamento" },
      { pos: "Mittelfeld", word: "Objekte / Angaben", label: "Carga Informativa" },
      { pos: "Satzende (Último)", word: "Konjugiertes Verb", label: "Trava Final do Relógio", isSpecial: true },
    ],
    vectorLabel: "Deslocamento Vetorial Forçado:",
    vectorFormula: { left: "[ weil ]", middle: "────── força ➔➔➔ ──────", right: "[ ... hat. ]" },
    successMsg: "O verbo conjugado ‘hat’ foi empurrado com precisão para a posição final pelo conector causal subordinante ‘weil’. +30 XP adicionados!",
  },
  es: {
    badge: "Engenharia da Língua Espanhola",
    topic: "Oraciones Causales (porque / ya que)",
    langTitle: "Análise Anatômica da Frase Espanhola",
    fixedClause: "Hoy no va a trabajar,",
    gearLabel: "SVO Direto",
    gearRule: "Conector ➔ Ordem Canônica SVO",
    tokens: [
      {
        id: "porque",
        val: "porque",
        role: "conector",
        roleLabel: "Conj.",
        color: "bg-[#8B5CF6] text-white hover:bg-violet-600",
        shadow: "shadow-[0_4px_0_#6D28D9] active:shadow-[0_1px_0_#6D28D9]",
      },
      {
        id: "el",
        val: "él",
        role: "sujeito",
        roleLabel: "Subj.",
        color: "bg-[#06B6D4] text-white hover:bg-cyan-600",
        shadow: "shadow-[0_4px_0_#0891B2] active:shadow-[0_1px_0_#0891B2]",
      },
      {
        id: "tiene",
        val: "tiene",
        role: "verbo",
        roleLabel: "Pres. V",
        color: "bg-[#FB7185] text-white hover:bg-rose-500 ring-2 ring-rose-200",
        shadow: "shadow-[0_4px_0_#E11D48] active:shadow-[0_1px_0_#E11D48]",
      },
      {
        id: "fiebre-alta",
        val: "fiebre alta",
        role: "objeto",
        roleLabel: "Obj.",
        color: "bg-[#10B981] text-white hover:bg-emerald-600",
        shadow: "shadow-[0_4px_0_#059669] active:shadow-[0_1px_0_#059669]",
      },
    ],
    correctOrder: ["porque", "él", "tiene", "fiebre alta"],
    errorMsg: "Atenção à engrenagem! Em espanhol, a oração causal mantém a ordem canônica Sujeito + Verbo + Complemento.",
    hint: "Posicione 'porque', depois o sujeito 'él', o verbo 'tiene' e o predicativo 'fiebre alta'.",
    quote: "“As conexões causais em espanhol sustentam o fluxo direto do pensamento com vigor e clareza.”",
    slotPlaceholders: ["Posição 1 (porque)", "Posição 2 (Sujeito)", "Posição 3 (Verbo)", "Posição 4 (Objeto)"],
    schemeTitle: "Esquema Canônico: Conector + Ordem SVO",
    schemeBadge: "Regra Fundamental CEFR B1",
    steps: [
      { pos: "Posição I", word: "porque / ya que", label: "Nexo Causal" },
      { pos: "Posição II", word: "Sujeto (él/ella)", label: "Ponto de Partida" },
      { pos: "Posição III", word: "Verbo Conjugado", label: "Motor da Ação" },
      { pos: "Posição IV", word: "Complemento", label: "Informação Predicativa", isSpecial: true },
    ],
    vectorLabel: "Fluxo Direto SVO:",
    vectorFormula: { left: "[ porque ]", middle: "─── ordem direta SVO ➔➔➔ ───", right: "[ él tiene fiebre alta. ]" },
    successMsg: "Excelente articulação causal! Ordem canônica Sujeito + Verbo + Objeto estruturada com perfeição. +30 XP!",
  },
};

export default function PracticeScreen() {
  const { addXp, targetLang } = useProsa();
  const config = PRACTICE_CONFIG[targetLang && targetLang in PRACTICE_CONFIG ? targetLang : "en"];
  const [placedTokens, setPlacedTokens] = useState<Token[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    setPlacedTokens([]);
    setIsValidated(false);
    setErrorFeedback(null);
  }, [targetLang]);

  const handlePickToken = (token: Token) => {
    if (placedTokens.some((t) => t.id === token.id)) return;
    setPlacedTokens((prev) => [...prev, token]);
    setIsValidated(false);
    setErrorFeedback(null);
  };

  const handleRemoveToken = (index: number) => {
    setPlacedTokens((prev) => prev.filter((_, i) => i !== index));
    setIsValidated(false);
    setErrorFeedback(null);
  };

  const handleReset = () => {
    setPlacedTokens([]);
    setIsValidated(false);
    setErrorFeedback(null);
  };

  const handleValidate = () => {
    const values = placedTokens.map((t) => t.val);
    const isCorrect =
      values.length === config.correctOrder.length &&
      values.every((val, idx) => val === config.correctOrder[idx]);

    if (isCorrect) {
      setIsValidated(true);
      setErrorFeedback(null);
      addXp(30);
    } else {
      setIsValidated(false);
      setErrorFeedback(config.errorMsg);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16">
      {/* Top Blueprint Header Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#F5F0E8] border border-stone-200 p-6 lg:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488] text-white text-xs font-bold tracking-wider uppercase">
                <Settings size={14} />
                {config.badge}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#475569] text-xs font-bold border border-stone-200 shadow-sm">
                <Layers size={14} className="text-[#0D9488]" />
                {config.topic}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF5722]/10 text-[#FF5722] text-xs font-extrabold">
                <Zap size={14} />
                Nó Mecânico #04
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-[#111C2D] tracking-tight">
                Oficina de Sintaxe &amp; Decomposição Oracional
              </h1>
              <p className="text-sm font-medium text-[#64748B]">
                Mestre Polímata: <span className="font-extrabold text-[#111C2D]">Leonardo da Vinci</span> • {config.langTitle}
              </p>
            </div>
          </div>

          {/* Da Vinci Micro Profile & Level Badge */}
          <div className="flex items-center gap-4 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-sm self-start lg:self-auto">
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center border border-stone-200 shadow-inner">
                <img
                  className="w-full h-full object-cover"
                  src="/cast/davinci.png"
                  alt="Leonardo da Vinci"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FEA619] flex items-center justify-center text-white shadow-sm font-bold text-xs">
                ✦
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488]">Sábio Guia</span>
              <p className="text-base font-extrabold text-[#111C2D] leading-none">Da Vinci</p>
              <p className="text-xs text-[#64748B]">Engenharia Sintática</p>
            </div>
          </div>
        </div>
      </section>

      {/* Da Vinci's Architectural Blueprint Treatise Card */}
      <section className="relative rounded-2xl bg-[#18181B] text-white p-6 lg:p-8 shadow-xl overflow-hidden border border-zinc-800">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Technical Graphic Visual */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-5 rounded-2xl bg-[#27272A] space-y-4 border border-zinc-700/60">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Gear Schematic */}
              <svg className="w-32 h-32 animate-spin [animation-duration:32s]" fill="none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#0D9488" strokeDasharray="4 4" strokeWidth="2" />
                <circle cx="50" cy="50" r="28" stroke="#FEA619" strokeWidth="1.5" />
                <path
                  d="M50 8 L50 20 M50 80 L50 92 M8 50 L20 50 M80 50 L92 50 M21 21 L30 30 M70 70 L79 79 M79 21 L70 30 M21 79 L30 70"
                  stroke="#0D9488"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-[#89f5e7]">
                <Settings size={26} className="text-[#0D9488]" />
                <span className="text-[10px] uppercase font-mono tracking-widest mt-1 text-zinc-300">
                  {config.gearLabel || "Sintaxe"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FEA619]">Princípio da Roldana #1</span>
              <p className="text-xs font-bold text-zinc-100">
                {config.gearRule || "Conector ➔ Ordem Canônica da Frase"}
              </p>
            </div>
          </div>

          {/* Quote & Philosophical Insight */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2 text-[#06B6D4]">
              <Settings size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Codex Atlanticus • Observação Gramatical</span>
            </div>
            <blockquote className="font-serif italic text-base lg:text-lg text-zinc-200 leading-relaxed">
              {config.quote}
            </blockquote>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-0.5 w-12 bg-[#0D9488]" />
              <span className="text-xs text-zinc-400">Cadernos de Anatomia e Mecânica de Línguas Estrangeiras, 1508</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace Split: Puzzle Area + Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Interactive Sentence Construction Sandbox (8 cols) */}
        <section className="lg:col-span-8 space-y-6">
          {/* Exercise Prompt Card */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-4 bg-[#F5F0E8] -mx-6 -mt-6 p-6 rounded-t-2xl border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shadow-[0_3px_0_#0F766E]">
                  <Layers size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Missão de Decomposição</span>
                  <h3 className="text-base font-extrabold text-[#111C2D]">Reconstrua a Oração Subordinada Causal</h3>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-[#92400E] text-xs font-extrabold shadow-sm">
                +30 XP
              </span>
            </div>

            {/* Portuguese Prompt Container */}
            <div className="p-4 rounded-xl bg-[#F5F0E8] border border-stone-200 space-y-1">
              <span className="text-[11px] font-bold uppercase text-[#64748B] tracking-wider">Frase Alvo (Português):</span>
              <p className="text-xl font-extrabold text-[#111C2D]">
                “Ele não vai trabalhar hoje porque está com febre alta.”
              </p>
            </div>

            {/* Dropzone Physical Tray */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <Settings size={15} className="text-[#0D9488]" />
                  Bancada de Montagem (Toque nos Blocos para Posicionar ou Remover)
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-[#64748B] hover:text-[#111C2D] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Resetar Bancada
                </button>
              </div>

              {/* Inset Tactile Track */}
              <div className="p-4 rounded-2xl bg-[#F5F0E8] border border-stone-200 min-h-[140px] flex flex-wrap items-center gap-3">
                {/* Preset Fixed Main Clause Token */}
                <div className="px-4 py-3 rounded-xl bg-[#27272A] text-white text-xs font-bold shadow-[0_4px_0_#18181B] select-none flex items-center gap-2">
                  <span>{config.fixedClause}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181B] text-zinc-300 uppercase font-mono">
                    Oração Principal
                  </span>
                </div>

                {/* Slots / Placed tokens */}
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {placedTokens.length === 0 ? (
                    <>
                      {config.slotPlaceholders.map((slotText, sIdx) => (
                        <div
                          key={sIdx}
                          className="border-2 border-dashed border-stone-300 rounded-xl px-3 h-[48px] flex items-center justify-center text-xs font-bold text-[#64748B] bg-white/70"
                        >
                          {slotText}
                        </div>
                      ))}
                    </>
                  ) : (
                    placedTokens.map((token, idx) => (
                      <div
                        key={token.id}
                        onClick={() => handleRemoveToken(idx)}
                        className="px-4 py-2.5 rounded-xl bg-white font-bold text-xs text-[#111C2D] border border-stone-200 shadow-[0_3px_0_#CBD5E1] flex items-center gap-2 cursor-pointer hover:bg-stone-50 transition-all select-none"
                      >
                        <span>{token.val}</span>
                        <span className="text-[10px] text-[#64748B] font-mono px-1 rounded bg-stone-100">
                          #{idx + 1}
                        </span>
                        <span className="text-xs text-rose-500 font-bold ml-1">×</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Component Token Pool */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <Settings size={15} className="text-[#D97706]" />
                Peças Sintáticas Disponíveis:
              </span>
              <div className="flex flex-wrap gap-3.5 p-4 rounded-xl bg-stone-50 border border-stone-200">
                {config.tokens.map((token) => {
                  const isPlaced = placedTokens.some((t) => t.id === token.id);
                  return (
                    <button
                      key={token.id}
                      type="button"
                      disabled={isPlaced}
                      onClick={() => handlePickToken(token)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer select-none ${
                        token.color
                      } ${token.shadow} ${
                        isPlaced ? "opacity-35 pointer-events-none translate-y-1 shadow-none" : ""
                      }`}
                    >
                      {token.role === "conector" && <LinkIcon size={14} />}
                      {token.role === "sujeito" && <User size={14} />}
                      {token.role === "objeto" && <Activity size={14} />}
                      {token.role === "verbo" && <Settings size={14} className="animate-spin [animation-duration:10s]" />}
                      <span>{token.val}</span>
                      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded uppercase font-mono">
                        {token.roleLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs text-[#64748B] font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                <span>Subjunção (Weil)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#06B6D4]" />
                <span>Sujeito (Nominativ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span>Predicativo / Objeto</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FB7185]" />
                <span>Verbo Conjugado (Fim)</span>
              </div>
            </div>
          </div>

          {/* Dynamic Syntax Rule Visualizer: Target Language Propulsion Flowchart */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-[#111C2D] flex items-center gap-2">
                <Settings size={18} className="text-[#0D9488]" />
                {config.schemeTitle}
              </h4>
              <span className="px-2.5 py-1 rounded-full bg-[#F5F0E8] text-xs font-bold text-[#64748B]">
                {config.schemeBadge}
              </span>
            </div>

            {/* Interactive Vector Flow Diagram */}
            <div className="relative bg-[#F5F0E8] rounded-xl p-5 border border-stone-200 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10 text-center">
                {config.steps.map((st, sIndex) => (
                  <div
                    key={sIndex}
                    className={`p-3 rounded-xl border shadow-sm space-y-1 ${
                      st.isSpecial
                        ? "bg-rose-50 border-2 border-rose-300 text-[#E11D48]"
                        : "bg-white border-stone-200 text-[#111C2D]"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        st.isSpecial ? "text-[#E11D48]" : "text-[#8B5CF6]"
                      }`}
                    >
                      {st.pos}
                    </span>
                    <p className="text-xs font-extrabold">{st.word}</p>
                    <p className="text-[11px] text-[#64748B]">{st.label}</p>
                  </div>
                ))}
              </div>

              {/* Kinetic Vector Line */}
              <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-[#64748B]">
                <div className="flex items-center gap-2 text-[#0D9488] font-bold">
                  <ArrowRight size={16} />
                  <span>{config.vectorLabel}</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-[#E11D48]">
                  <span>{config.vectorFormula.left}</span>
                  <span>{config.vectorFormula.middle}</span>
                  <span>{config.vectorFormula.right}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Feedback & Action Buttons */}
          <div className="space-y-4">
            {isValidated && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-[#111C2D] flex items-start gap-3 shadow-sm animate-in fade-in">
                <CheckCircle2 size={24} className="text-[#059669] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-base font-extrabold text-[#059669]">
                    Engrenagens Alinhadas! Ordem sintática 100% canônica.
                  </p>
                  <p className="text-xs font-medium text-[#334155]">
                    {config.successMsg}
                  </p>
                </div>
              </div>
            )}

            {errorFeedback && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-[#92400E] flex items-start gap-3 shadow-sm animate-in fade-in">
                <Lightbulb size={24} className="text-[#D97706] shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-relaxed">{errorFeedback}</p>
              </div>
            )}

            {hintVisible && (
              <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0E7490] flex items-start gap-3 shadow-sm">
                <Lightbulb size={20} className="text-[#0891B2] shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  💡 <strong>Dica de Da Vinci:</strong> {config.hint}
                </p>
              </div>
            )}

            {/* Deep 3D Primary Action Buttons */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setHintVisible(!hintVisible)}
                className="px-5 py-3 rounded-xl bg-white text-[#111C2D] text-xs font-bold border border-stone-200 shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 active:shadow-[0_1px_0_#CBD5E1] transition-all flex items-center gap-2 hover:bg-[#F5F0E8] cursor-pointer"
              >
                <Lightbulb size={16} className="text-[#FEA619]" />
                <span>Dica de Da Vinci</span>
              </button>

              <button
                type="button"
                onClick={handleValidate}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#0D9488] text-white text-xs font-extrabold shadow-[0_4px_0_#0F766E] hover:bg-[#0F766E] active:translate-y-1 active:shadow-[0_1px_0_#0F766E] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>Verificar Mecanismo Sintático (+30 XP)</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Right Rail: Secondary Exercises Queue & Masteries (4 cols) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Mastery Progress Node Card */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Nó de Domínio</span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] text-xs font-extrabold">
                3 / 8 Concluídos
              </span>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-[#111C2D]">Subordinação Causal &amp; Concessiva</h4>
              <p className="text-xs text-[#64748B]">
                Consolide a regra mecânica do verbo no final antes de avançar para orações relativas com preposição.
              </p>
            </div>

            {/* Mini Progress Bar with Physical Bevel */}
            <div className="w-full bg-[#F5F0E8] rounded-full h-3 p-0.5 shadow-inner border border-stone-200">
              <div className="bg-[#0D9488] h-2 rounded-full transition-all duration-500 shadow-sm" style={{ width: "37.5%" }} />
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-[#475569]">
              <span className="flex items-center gap-1 font-extrabold text-[#0D9488]">
                <Zap size={14} />
                37% Estabilidade FSRS
              </span>
              <span className="text-[#64748B]">Próxima revisão: 2d</span>
            </div>
          </div>

          {/* Exercise Queue List */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h4 className="text-base font-extrabold text-[#111C2D] flex items-center gap-2">
                <ListOrdered size={18} className="text-[#FF5722]" />
                Fila de Montagem
              </h4>
              <span className="text-[11px] font-bold text-[#64748B] uppercase">5 Restantes</span>
            </div>

            <div className="space-y-3">
              {/* Queue Item 1: Active */}
              <div className="p-3.5 rounded-xl bg-[#F5F0E8] border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-[#0D9488]">Atual • Frase 4</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-[#0891B2] text-[10px] font-bold">weil</span>
                </div>
                <p className="text-xs font-bold text-[#111C2D]">
                  Ele não foi trabalhar hoje porque tem febre alta.
                </p>
                <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                  <Sparkles size={12} className="text-[#0D9488]" />
                  <span>Foco: Objeto Acusativo + Verbo Simples</span>
                </div>
              </div>

              {/* Queue Item 2: Up Next */}
              <div className="p-3.5 rounded-xl bg-white hover:bg-[#F5F0E8] border border-stone-200/80 transition-colors space-y-1.5 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">Frase 5</span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-[#7E22CE] text-[10px] font-bold">obwohl</span>
                </div>
                <p className="text-xs font-medium text-[#111C2D]">
                  Embora estivesse chovendo muito, nós saímos para caminhar.
                </p>
                <span className="text-[11px] text-[#64748B] block">Oposição concessiva com verbo composto</span>
              </div>

              {/* Queue Item 3 */}
              <div className="p-3.5 rounded-xl bg-white hover:bg-[#F5F0E8] border border-stone-200/80 transition-colors space-y-1.5 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[#64748B]">Frase 6</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-[#B45309] text-[10px] font-bold">da (visto que)</span>
                </div>
                <p className="text-xs font-medium text-[#111C2D]">
                  Visto que ele não tinha dinheiro, ficou em casa.
                </p>
                <span className="text-[11px] text-[#64748B] block">Inversão de oração subordinada inicial</span>
              </div>
            </div>
          </div>

          {/* Da Vinci Codex Note Mini Card */}
          <div className="rounded-2xl p-5 bg-[#F5F0E8] border border-stone-200 space-y-3">
            <div className="flex items-center gap-2 text-[#0D9488]">
              <Lightbulb size={18} />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Anotação do Inventor</span>
            </div>
            <p className="text-xs text-[#334155] leading-relaxed italic font-serif">
              “Lembre-se: em orações subordinadas, o verbo nunca divide o centro do palco com o sujeito. Ele aguarda pacientemente na retaguarda até que todo o predicado seja pronunciado.”
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
