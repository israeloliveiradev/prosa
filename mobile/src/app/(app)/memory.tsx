import React, { useState } from "react";
import { router } from "expo-router";
import { motion } from "framer-motion";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa } from "@/context/prosa-context";
import { tap } from "@/lib/haptics";
import {
  Brain,
  Sparkles,
  ArrowRight,
  Search,
  Download,
  Volume2,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
} from "lucide-react";

const MARIE_CURIE_AVATAR = "/cast/curie.png";

interface MemoryWord {
  lemma: string;
  meaning: string;
  level: string;
  retention: string;
  stability: string;
  status: "consolidated" | "learning" | "critical";
  statusLabel: string;
  nextReview: string;
}

const MEMORY_VOCAB: Record<string, MemoryWord[]> = {
  en: [
    {
      lemma: "predominate",
      meaning: "preponderar • Verbo",
      level: "B2",
      retention: "98%",
      stability: "S = 42d",
      status: "consolidated",
      statusLabel: "Consolidada",
      nextReview: "em 14 dias",
    },
    {
      lemma: "attentively",
      meaning: "atentamente • Advérbio de Modo",
      level: "B1",
      retention: "92%",
      stability: "S = 24d",
      status: "consolidated",
      statusLabel: "Consolidada",
      nextReview: "em 8 dias",
    },
    {
      lemma: "sophistication",
      meaning: "sofisticação • Substantivo Abstrato",
      level: "B2",
      retention: "64%",
      stability: "S = 4.2d",
      status: "learning",
      statusLabel: "Em Fixação",
      nextReview: "Amanhã",
    },
    {
      lemma: "deliberate",
      meaning: "deliberado • Adjetivo",
      level: "B2",
      retention: "45%",
      stability: "S = 1.1d",
      status: "critical",
      statusLabel: "Crítica",
      nextReview: "Hoje às 20h",
    },
  ],
  de: [
    {
      lemma: "fliegen",
      meaning: "voar • Verbo Forte",
      level: "A1",
      retention: "98%",
      stability: "S = 42d",
      status: "consolidated",
      statusLabel: "Consolidada",
      nextReview: "em 14 dias",
    },
    {
      lemma: "Gedanken",
      meaning: "pensamentos • Plural Masc.",
      level: "A2",
      retention: "92%",
      stability: "S = 24d",
      status: "consolidated",
      statusLabel: "Consolidada",
      nextReview: "em 8 dias",
    },
    {
      lemma: "Verbindung",
      meaning: "conexão / ligação • Feminino",
      level: "B1",
      retention: "64%",
      stability: "S = 4.2d",
      status: "learning",
      statusLabel: "Em Fixação",
      nextReview: "Amanhã",
    },
    {
      lemma: "Entscheidung",
      meaning: "decisão • Feminino",
      level: "B1",
      retention: "45%",
      stability: "S = 1.1d",
      status: "critical",
      statusLabel: "Crítica",
      nextReview: "Hoje às 20h",
    },
  ],
};

interface MnemonicCard {
  word: string;
  meaning: string;
  level: string;
  errorRate: string;
  mnemonic: string;
}

const CRITICAL_MNEMONICS: Record<string, MnemonicCard[]> = {
  en: [
    {
      word: "Serendipity",
      meaning: "Acaso afortunado • Substantivo Abstrato",
      level: "B2",
      errorRate: "65%",
      mnemonic: "Serene + Dip: um mergulho sereno em descobertas felizes não planejadas no caminho do saber.",
    },
    {
      word: "Ephemeral",
      meaning: "Efêmero, transitório • Adjetivo",
      level: "B1",
      errorRate: "68%",
      mnemonic: "Epi (sobre) + hemera (dia): algo belo que dura apenas o sopro fugaz de um único dia.",
    },
    {
      word: "Resilience",
      meaning: "Resiliência • Substantivo Abstrato",
      level: "B1",
      errorRate: "62%",
      mnemonic: "Re (de volta) + salire (saltar): a mola de aço que salta de volta à sua forma original após a tensão.",
    },
  ],
  de: [
    {
      word: "der Schmetterling",
      meaning: "Borboleta • Substantivo Masculino",
      level: "A2",
      errorRate: "65%",
      mnemonic: "Schmettern (bater ruidosamente) + Ling (pequeno ser). Imagine o bater de asas que provoca um vendaval de cores.",
    },
    {
      word: "die Sehnsucht",
      meaning: "Anseio nostálgico • Substantivo Feminino",
      level: "B1",
      errorRate: "68%",
      mnemonic: "Sehnen (ansiar) + Sucht (busca ardente). Uma busca compassada da alma por um lar interior.",
    },
    {
      word: "das Fernweh",
      meaning: "Saudade do desconhecido • Neutro",
      level: "B1",
      errorRate: "62%",
      mnemonic: "Fern (longe) + Weh (dor/anseio). A dor visceral de estar ancorado enquanto o mundo chama.",
    },
  ],
};

export default function MemoryScreen() {
  const { addXp, targetLang } = useProsa();
  const [selectedFilter, setSelectedFilter] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const langKey = targetLang && targetLang in MEMORY_VOCAB ? targetLang : "en";
  const wordsList = MEMORY_VOCAB[langKey] || MEMORY_VOCAB.en;
  const criticalList = CRITICAL_MNEMONICS[langKey] || CRITICAL_MNEMONICS.en;

  const handlePronounce = (word: string) => {
    void tap("light");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = langKey === "de" ? "de-DE" : "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExportDeck = () => {
    void tap("success");
    addXp(15);
    const header = "Lema\tSignificado\tNivel\tRetencao_FSRS\tEstabilidade\tProxima_Revisao\n";
    const rows = wordsList
      .map(
        (w) =>
          `${w.lemma}\t${w.meaning}\t${w.level}\t${w.retention}\t${w.stability}\t${w.nextReview}`
      )
      .join("\n");
    const content = header + rows;
    const blob = new Blob([content], { type: "text/tab-separated-values;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prosa-deck-fsrs-${targetLang || "en"}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportNotification("Deck FSRS exportado com sucesso! Arquivo .tsv baixado.");
    setTimeout(() => setExportNotification(null), 3500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 pb-16">
      {/* ======================================================== */}
      {/* 1. TOP TITLE BAR WITH LEVEL FILTER PILLS                 */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-bold uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5" />
              <span>Neuro-Repetição</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#7C3AED] text-xs font-bold border border-[#8B5CF6]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
              <span>FSRS v4.5 Otimizado</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111C2D] tracking-tight">
            Palácio da Memória &amp; Algoritmo FSRS
          </h1>
        </div>

        {/* Level Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "Todos (128)" },
            { id: "A1", label: "Nível A1 (42)" },
            { id: "A2", label: "Nível A2 (38)" },
            { id: "B1", label: "Nível B1 • Ativo (48)" },
          ].map((pill) => {
            const active = selectedFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  void tap("light");
                  setSelectedFilter(pill.id);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                    : "bg-[#F5F0E8] border border-stone-200/80 text-[#111C2D] shadow-[0_2px_0_#CBD5E1] hover:bg-stone-200/60"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MARIE CURIE MENTOR REVIEW HERO CARD                   */}
      {/* ======================================================== */}
      <TactileCard className="p-6 bg-[#FDFBF7] border border-stone-200/80">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[#0D9488] shadow-sm bg-[#0D9488]/10">
                <img
                  src={MARIE_CURIE_AVATAR}
                  alt="Marie Curie"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-[#111C2D]">Marie Curie</h3>
                <span className="text-[11px] uppercase font-bold text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-0.5 rounded-full">
                  Cátedra de Fonética &amp; Fixação Molecular
                </span>
              </div>
              <p className="font-serif text-sm text-[#334155] italic max-w-2xl leading-relaxed">
                “A memória de longo prazo é forjada exatamente quando você está prestes a esquecer uma palavra. Vamos fortalecer suas sinapses!”
              </p>
            </div>
          </div>

          <TactileButton
            onClick={() => router.push("/daily")}
            variant="primary"
            size="lg"
            className="w-full lg:w-auto px-6 py-4 font-black flex items-center justify-center gap-2 flex-shrink-0"
          >
            <span>Iniciar Revisão Diária FSRS (12 Cartas)</span>
            <ArrowRight className="w-5 h-5" />
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-white/20 rounded text-white ml-1">
              Espaço
            </kbd>
          </TactileButton>
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 3. FOUR FSRS METRIC CARDS                                */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-[#64748B] tracking-wider">
              Cartas no Deck
            </span>
            <Layers className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <div className="text-3xl font-black text-[#111C2D]">128</div>
            <p className="text-xs text-[#10B981] font-bold mt-1">+4 novas hoje</p>
          </div>
        </TactileCard>

        {/* Card 2 */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-[#64748B] tracking-wider">
              Taxa de Retenção
            </span>
            <Activity className="w-5 h-5 text-[#FF5722]" />
          </div>
          <div>
            <div className="text-3xl font-black text-[#111C2D]">91.4%</div>
            <p className="text-xs text-[#64748B] mt-1">Meta alvo: &gt; 90%</p>
          </div>
        </TactileCard>

        {/* Card 3 */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-[#64748B] tracking-wider">
              Pendentes Hoje
            </span>
            <Clock className="w-5 h-5 text-[#D97706]" />
          </div>
          <div>
            <div className="text-3xl font-black text-[#FF5722]">12 Cartas</div>
            <p className="text-xs text-[#64748B] mt-1">~3 min de sessão</p>
          </div>
        </TactileCard>

        {/* Card 4 */}
        <TactileCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase text-[#64748B] tracking-wider">
              Intervalo Médio
            </span>
            <span>📅</span>
          </div>
          <div>
            <div className="text-3xl font-black text-[#111C2D]">18.4 dias</div>
            <p className="text-xs text-[#0D9488] font-bold mt-1">Estabilidade FSRS</p>
          </div>
        </TactileCard>
      </div>

      {/* Circadian Retentive Index Strip */}
      <TactileCard className="p-4 bg-[#F5F0E8] border border-stone-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#111C2D]">
              Índice Circadiano de Retenção Neuronal
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#059669] font-black text-[10px]">
              91.4% Estável
            </span>
          </div>
          <div className="flex items-center gap-3 text-[#64748B]">
            <span>Degradação Natural: 2.1%/dia</span>
            <span>•</span>
            <span className="text-[#D97706] font-bold">Próximo Ponto Crítico: em 18h</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div className="h-full bg-[#10B981] rounded-full" style={{ width: "91.4%" }} />
        </div>
      </TactileCard>

      {/* ======================================================== */}
      {/* 4. CARTAS CRÍTICAS COM MNEMÔNICOS VISUAIS                 */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#111C2D]">
              Cartas Críticas com Mnemônicos Visuais
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Palavras com &gt;60% de taxa histórica de erro — sintetizadas com âncoras multissensoriais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {criticalList.map((card, idx) => (
            <TactileCard key={idx} className="p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/10 text-[#DC2626] text-[10px] font-black uppercase">
                    ● {card.errorRate} taxa de erro
                  </span>
                  <span className="text-xs font-bold text-[#64748B]">NÍVEL {card.level}</span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-[#111C2D]">{card.word}</h3>
                  <p className="text-xs text-[#64748B]">{card.meaning}</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5F0E8] border border-stone-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[#0D9488] tracking-wider block">
                    🔬 Mnemônico Curie
                  </span>
                  <p className="text-xs text-[#334155] leading-relaxed">
                    {card.mnemonic}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => handlePronounce(card.word)}
                  className="p-2.5 rounded-xl bg-[#F5F0E8] text-[#111C2D] hover:bg-stone-200/60 shadow-[0_2px_0_#CBD5E1] cursor-pointer"
                  title="Ouvir Pronúncia"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <TactileButton
                  onClick={() => router.push("/daily")}
                  variant="primary"
                  size="sm"
                  className="flex-1 font-bold text-xs"
                >
                  Revisar Agora ➔
                </TactileButton>
              </div>
            </TactileCard>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. MATRIZ ATIVA DE RETENÇÃO LEXICAL (TABLE)               */}
      {/* ======================================================== */}
      <TactileCard className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#111C2D]">
              Matriz Ativa de Retenção Lexical
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Estado sináptico individual de cada carta sob parametrização contínua FSRS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar palavra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-[#F5F0E8] border border-stone-200 text-xs font-bold text-[#111C2D] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <button
              type="button"
              onClick={handleExportDeck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D9488] text-white text-xs font-bold shadow-[0_2px_0_#0F766E] hover:bg-[#0F766E] active:translate-y-0.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Exportar Deck</span>
            </button>
          </div>
        </div>

        {exportNotification && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{exportNotification}</span>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] font-black uppercase text-[#64748B] tracking-wider">
                <th className="py-3 px-3">Lema / Significado</th>
                <th className="py-3 px-3 text-center">Nível</th>
                <th className="py-3 px-3">Retenção FSRS</th>
                <th className="py-3 px-3">Status Neural</th>
                <th className="py-3 px-3">Próxima Revisão</th>
                <th className="py-3 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {wordsList
                .filter((w) =>
                  searchTerm
                    ? w.lemma.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      w.meaning.toLowerCase().includes(searchTerm.toLowerCase())
                    : true
                )
                .map((w, wIdx) => (
                  <tr key={wIdx} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#111C2D]">{w.lemma}</span>
                        <button
                          type="button"
                          onClick={() => handlePronounce(w.lemma)}
                          className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-stone-600 hover:text-[#0D9488] hover:bg-teal-50 cursor-pointer"
                        >
                          <Volume2 size={12} />
                        </button>
                      </div>
                      <div className="text-[11px] text-[#64748B]">{w.meaning}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-[#111C2D] font-black text-[10px]">
                        {w.level}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black ${
                            w.status === "consolidated"
                              ? "text-[#10B981]"
                              : w.status === "learning"
                              ? "text-[#D97706]"
                              : "text-[#DC2626]"
                          }`}
                        >
                          {w.retention}
                        </span>
                        <span className="text-[10px] text-[#64748B]">{w.stability}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold ${
                          w.status === "consolidated"
                            ? "text-[#059669]"
                            : w.status === "learning"
                            ? "text-[#D97706]"
                            : "text-[#DC2626]"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            w.status === "consolidated"
                              ? "bg-[#10B981]"
                              : w.status === "learning"
                              ? "bg-[#F59E0B]"
                              : "bg-[#EF4444]"
                          }`}
                        />
                        {w.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#64748B]">{w.nextReview}</td>
                    <td className="py-3 px-3 text-center">
                      <TactileButton onClick={() => router.push("/daily")} variant="primary" size="sm">
                        Treinar
                      </TactileButton>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 border-t border-stone-200/80">
          <span>Mostrando 4 de 128 cartas ativas no modelo neural</span>
          <button type="button" className="font-bold text-[#0D9488] hover:underline cursor-pointer">
            Ver todas as 128 cartas ➔
          </button>
        </div>
      </TactileCard>
    </div>
  );
}
