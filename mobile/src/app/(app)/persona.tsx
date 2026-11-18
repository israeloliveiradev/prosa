import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Volume2,
  PlayCircle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { useProsa, type Mentor } from "@/context/prosa-context";

interface PolymathData {
  id: string;
  name: string;
  title: string;
  category: "logic" | "linguistics" | "literature";
  tags: string[];
  field: string;
  chair: string;
  quote: string;
  bonus: string;
  bonusIcon: string;
  bonusColor: string;
  avatar: string;
  voiceSample: string;
}

const AVATAR_MAP: Record<string, string> = {
  curie: "/cast/curie.png",
  davinci: "/cast/davinci.png",
  einstein: "/cast/einstein.png",
  feynman: "/cast/feynman.png",
  lovelace: "/cast/lovelace.png",
  aurelius: "/cast/aurelius.png",
  goethe: "/cast/aristotle.png",
  bingen: "/cast/clara.png",
  machado: "/cast/confucius.png",
  tesla: "/cast/tesla.png",
  hypatia: "/cast/hypatia.png",
  humboldt: "/cast/darwin.png",
  spinoza: "/cast/socrates.png",
  descartes: "/cast/galileo.png",
  galilei: "/cast/galileo.png",
  leibniz: "/cast/newton.png",
};

const POLYMATHS: PolymathData[] = [
  {
    id: "curie",
    name: "Marie Curie",
    title: "Mnemônica Molecular",
    category: "linguistics",
    tags: ["linguistics", "active"],
    field: "Física & Química",
    chair: "Cátedra Mnemônica",
    quote: "A precisão da língua assemelha-se à pureza do rádio.",
    bonus: "+18% Retenção FSRS",
    bonusIcon: "verified",
    bonusColor: "bg-emerald-50 text-[#0F766E] border border-emerald-200",
    avatar: "/cast/curie.png",
    voiceSample: "Nada na vida deve ser temido, apenas compreendido.",
  },
  {
    id: "davinci",
    name: "Leonardo da Vinci",
    title: "Sintaxe Estrutural",
    category: "logic",
    tags: ["logic", "linguistics"],
    field: "Polímata Universal",
    chair: "Sintaxe Estrutural",
    quote: "Aprender a anatomia da frase revela a mecânica invisível da mente.",
    bonus: "+15% Precisão Nebensatz",
    bonusIcon: "architecture",
    bonusColor: "bg-amber-50 text-[#B45309] border border-amber-200",
    avatar: "/cast/davinci.png",
    voiceSample: "A simplicidade é o grau máximo de sofisticação.",
  },
  {
    id: "einstein",
    name: "Albert Einstein",
    title: "Fluência Circadiana",
    category: "logic",
    tags: ["logic"],
    field: "Física Teórica",
    chair: "Fluência Circadiana",
    quote: "A imaginação é tudo. O tempo de resposta dilata quando há curiosidade.",
    bonus: "+20% Velocidade em Diálogo",
    bonusIcon: "speed",
    bonusColor: "bg-cyan-50 text-[#0E7490] border border-cyan-200",
    avatar: "/cast/einstein.png",
    voiceSample: "A mente que se abre a uma nova língua jamais voltará ao seu tamanho original.",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    title: "Simplificação Intuitiva",
    category: "logic",
    tags: ["logic", "linguistics"],
    field: "Física Quântica",
    chair: "Simplificação Intuitiva",
    quote: "Se você não sabe explicar com palavras simples de criança, não entendeu.",
    bonus: "+25% Combos no Duelo 120s",
    bonusIcon: "local_fire_department",
    bonusColor: "bg-rose-50 text-[#BE123C] border border-rose-200",
    avatar: "/cast/feynman.png",
    voiceSample: "O que eu não posso criar, eu não compreendo.",
  },
  {
    id: "lovelace",
    name: "Ada Lovelace",
    title: "Padrões de Artigo",
    category: "logic",
    tags: ["logic", "linguistics"],
    field: "Ciência da Computação",
    chair: "Padrões de Artigo",
    quote: "A gramática tece padrões poéticos assim como o tear tece flores.",
    bonus: "-40% Erros der/die/das",
    bonusIcon: "data_object",
    bonusColor: "bg-purple-50 text-[#7E22CE] border border-purple-200",
    avatar: "/cast/lovelace.png",
    voiceSample: "Pense na sintaxe como um algoritmo sagrado.",
  },
  {
    id: "aurelius",
    name: "Marcus Aurelius",
    title: "Resiliência de Hábito",
    category: "literature",
    tags: ["literature"],
    field: "Estoicismo Imperial",
    chair: "Resiliência de Hábito",
    quote: "A constância diária vence o cansaço. Errar um vocábulo é parte da natureza.",
    bonus: "1 Freeze de Ofensiva Grátis/mês",
    bonusIcon: "ac_unit",
    bonusColor: "bg-amber-50 text-[#92400E] border border-amber-200",
    avatar: "/cast/aurelius.png",
    voiceSample: "Você tem poder sobre sua mente, não sobre eventos externos.",
  },
  {
    id: "goethe",
    name: "J. W. von Goethe",
    title: "Léxico & Estilo B2/C1",
    category: "literature",
    tags: ["literature"],
    field: "Literatura Germânica",
    chair: "Léxico & Estilo B2/C1",
    quote: "Quem não conhece línguas estrangeiras nada sabe sobre a sua própria.",
    bonus: "+30 XP em Leituras Clássicas",
    bonusIcon: "menu_book",
    bonusColor: "bg-emerald-50 text-[#0F766E] border border-emerald-200",
    avatar: "/cast/aristotle.png",
    voiceSample: "Seja corajoso e grandes forças virão em sua ajuda.",
  },
  {
    id: "bingen",
    name: "Hildegard von Bingen",
    title: "Cadência & Prosódia",
    category: "linguistics",
    tags: ["linguistics", "literature"],
    field: "Mística & Musicologia",
    chair: "Cadência & Prosódia",
    quote: "A alma humana é sinfônica; o som de cada sílaba cura a mente.",
    bonus: "+12% Cadência & Entonação",
    bonusIcon: "graphic_eq",
    bonusColor: "bg-teal-50 text-[#0F766E] border border-teal-200",
    avatar: "/cast/clara.png",
    voiceSample: "Escute a ressonância sagrada da respiração fonética.",
  },
  {
    id: "machado",
    name: "Machado de Assis",
    title: "Contraste PT/DE & Ironia",
    category: "literature",
    tags: ["literature", "linguistics"],
    field: "Mestre das Letras",
    chair: "Contraste PT/DE & Ironia",
    quote: "Ao verme que primeiro roeu as frias carnes, recomendo o rigor gramatical.",
    bonus: "Dicas Bilingues Contrastivas",
    bonusIcon: "psychology",
    bonusColor: "bg-stone-100 text-[#44403C] border border-stone-200",
    avatar: "/cast/confucius.png",
    voiceSample: "A clareza do estilo é a cortesia do escritor.",
  },
  {
    id: "tesla",
    name: "Nikola Tesla",
    title: "Shadowing 432Hz",
    category: "logic",
    tags: ["logic"],
    field: "Engenharia & Ondas",
    chair: "Shadowing 432Hz",
    quote: "Se você quer encontrar os segredos da linguagem, pense em frequência.",
    bonus: "Filtro Auditivo Ultra-Nítido",
    bonusIcon: "headphones",
    bonusColor: "bg-cyan-50 text-[#0891B2] border border-cyan-200",
    avatar: "/cast/tesla.png",
    voiceSample: "O presente é deles; o futuro, pelo qual realmente trabalhei, é meu.",
  },
  {
    id: "hypatia",
    name: "Hypatia de Alexandria",
    title: "Declinações & Casos",
    category: "logic",
    tags: ["logic", "linguistics"],
    field: "Matemática & Astronomia",
    chair: "Declinações & Casos",
    quote: "Preserve seu direito a pensar; até mesmo errar é melhor que não pensar.",
    bonus: "Matriz Akkusativ & Dativ",
    bonusIcon: "table_chart",
    bonusColor: "bg-amber-50 text-[#B45309] border border-amber-200",
    avatar: "/cast/hypatia.png",
    voiceSample: "A verdade geométrica subsiste independente das opiniões humanas.",
  },
  {
    id: "humboldt",
    name: "Alexander v. Humboldt",
    title: "Imersão DACH",
    category: "literature",
    tags: ["literature", "logic"],
    field: "Geografia & Naturalismo",
    chair: "Imersão DACH",
    quote: "Tudo está interligado na teia da terra e no tecido dos dialetos humanos.",
    bonus: "Fatos Contextuais de Berlim e Viena",
    bonusIcon: "public",
    bonusColor: "bg-emerald-50 text-[#047857] border border-emerald-200",
    avatar: "/cast/darwin.png",
    voiceSample: "O perigo mais temível para a visão do mundo é a de quem nunca viajou.",
  },
  {
    id: "spinoza",
    name: "Baruch Spinoza",
    title: "Clube de Leitura Lento",
    category: "literature",
    tags: ["literature"],
    field: "Ética & Metafísica",
    chair: "Clube de Leitura Lento",
    quote: "Não rir, nem lamentar, nem detestar, mas compreender cada verbo.",
    bonus: "+10% Foco em Textos Longos",
    bonusIcon: "self_improvement",
    bonusColor: "bg-amber-50 text-[#92400E] border border-amber-200",
    avatar: "/cast/socrates.png",
    voiceSample: "A paz não é a ausência de guerra; é uma virtude nascida da força da mente.",
  },
  {
    id: "descartes",
    name: "René Descartes",
    title: "Dúvida Metódica",
    category: "logic",
    tags: ["logic", "literature"],
    field: "Racionalismo",
    chair: "Dúvida Metódica",
    quote: "Divida cada uma das dificuldades fonéticas em tantas partes quanto possível.",
    bonus: "Resolução de Dúvidas 24/7",
    bonusIcon: "account_tree",
    bonusColor: "bg-teal-50 text-[#0F766E] border border-teal-200",
    avatar: "/cast/galileo.png",
    voiceSample: "Penso, logo existo. Falo com precisão, logo me faço compreender.",
  },
  {
    id: "galilei",
    name: "Galileu Galilei",
    title: "Acurácia Empírica",
    category: "logic",
    tags: ["logic"],
    field: "Astronomia & Observação",
    chair: "Acurácia Empírica",
    quote: "E no entanto, ela se move. A língua vive e evolui na voz dos homens.",
    bonus: "+15% Precisão de Pronúncia",
    bonusIcon: "visibility",
    bonusColor: "bg-amber-50 text-[#B45309] border border-amber-200",
    avatar: "/cast/galileo.png",
    voiceSample: "Todas as verdades são fáceis de entender uma vez descobertas.",
  },
  {
    id: "leibniz",
    name: "Gottfried Leibniz",
    title: "Árvores Semânticas",
    category: "logic",
    tags: ["logic", "linguistics"],
    field: "Cálculo & Característica Universal",
    chair: "Árvores Semânticas",
    quote: "Calculemos! Todo pensamento possui uma representação perfeita em símbolos.",
    bonus: "Mapeamento de Famílias Lexicais",
    bonusIcon: "hub",
    bonusColor: "bg-purple-50 text-[#6B21A8] border border-purple-200",
    avatar: "/cast/newton.png",
    voiceSample: "A música é o prazer que a mente humana experimenta ao contar sem saber que está contando.",
  },
];

export default function PersonaScreen() {
  const { activeMentor, setActiveMentor } = useProsa();
  const [filter, setFilter] = useState<"all" | "logic" | "linguistics" | "literature" | "active">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredPolymaths = POLYMATHS.filter((p) => {
    if (filter === "all") return true;
    if (filter === "active") return p.name === activeMentor.name || (activeMentor.id === "einstein" && p.id === "einstein") || (activeMentor.name.includes("Curie") && p.id === "curie");
    return p.tags.includes(filter);
  });

  const handleSelectMentor = (polymath: PolymathData) => {
    const newMentor: Mentor = {
      id: polymath.id,
      name: polymath.name,
      title: polymath.title,
      avatar: AVATAR_MAP[polymath.id] || polymath.avatar,
      level: 12,
      quote: `“${polymath.quote}”`,
    };
    setActiveMentor(newMentor);
    setToastMessage(`Mentor ativo alterado para ${polymath.name}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePlayVoice = (polymath: PolymathData) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(polymath.voiceSample);
      utterance.lang = "pt-BR";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
    setToastMessage(`Reproduzindo voz sintética de ${polymath.name}...`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16">
      {/* Top Context & Header Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-[#0D9488]" />
              Mestres Arquétipos da Mente
            </span>
            <span className="text-[#64748B] text-xs font-semibold">· 16 Polímatas Calibrados</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-[#111C2D] tracking-tight">
            Conselho de Sábios{" "}
            <span className="italic font-serif font-normal text-[#0D9488]">Aceleradores Cognitivos</span>
          </h1>
          <p className="text-sm font-medium text-[#64748B]">
            Cada mentor polímata potencializa uma dimensão específica da sua neuroplasticidade e retenção linguística no aprendizado do Alemão.
          </p>
        </div>

        {/* Quick Sinergia Sináptica Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-white px-4 py-2.5 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#E2E8F0] shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-[#D97706]">
            <Zap size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Sinergia Sináptica</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-[#111C2D]">98.4%</span>
              <span className="text-xs text-[#059669] font-bold">Ótima</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Spotlight Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200/80 p-6 lg:p-8 shadow-[0_4px_0_#CBD5E1]">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-[0_4px_0_#0F766E] border-2 border-[#0D9488]">
                <img
                  className="w-full h-full object-cover"
                  src={AVATAR_MAP[activeMentor.id] || activeMentor.avatar}
                  alt={activeMentor.name}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0D9488] text-white flex items-center justify-center shadow-[0_2px_0_#005049]">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#0D9488] text-white text-xs font-bold uppercase tracking-wider">
                  Mentor Ativo Agora
                </span>
                <span className="px-3 py-1 rounded-full bg-[#F5F0E8] text-[#0F766E] text-xs font-bold">
                  {activeMentor.title}
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-[#111C2D] leading-tight">
                {activeMentor.name}
              </h2>
              <p className="italic font-serif text-base text-[#475569] max-w-xl">
                {activeMentor.quote}
              </p>
            </div>
          </div>

          {/* Resonance & Audio reflection button */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full lg:w-auto">
            <div className="bg-[#F5F0E8] px-4 py-3 rounded-xl border border-stone-200/80 shadow-[0_3px_0_#CBD5E1] flex-1 sm:flex-initial">
              <span className="text-[11px] font-bold text-[#64748B] uppercase block">Efeito de Ressonância</span>
              <div className="flex items-center gap-1.5 text-[#059669] text-sm font-extrabold mt-0.5">
                <Zap size={16} />
                <span>+18% Retenção FSRS Germânica</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(activeMentor.quote);
                  utterance.lang = "pt-BR";
                  window.speechSynthesis.speak(utterance);
                }
                setToastMessage(`Ouvindo reflexão diária de ${activeMentor.name}...`);
                setTimeout(() => setToastMessage(null), 3000);
              }}
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-[#F5F0E8] text-[#111C2D] text-sm font-bold border border-stone-200 shadow-[0_4px_0_#CBD5E1] active:translate-y-[3px] active:shadow-[0_1px_0_#CBD5E1] transition-transform cursor-pointer"
            >
              <Volume2 size={18} className="text-[#0D9488]" />
              <span>Ouvir Reflexão Diária</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar & Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filter === "all"
                ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                : "bg-white text-[#475569] border border-stone-200 shadow-[0_3px_0_#CBD5E1] hover:bg-[#F5F0E8]"
              }`}
          >
            Todos os Mentores (16)
          </button>
          <button
            onClick={() => setFilter("logic")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filter === "logic"
                ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                : "bg-white text-[#475569] border border-stone-200 shadow-[0_3px_0_#CBD5E1] hover:bg-[#F5F0E8]"
              }`}
          >
            Ciências Exatas &amp; Lógica
          </button>
          <button
            onClick={() => setFilter("linguistics")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filter === "linguistics"
                ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                : "bg-white text-[#475569] border border-stone-200 shadow-[0_3px_0_#CBD5E1] hover:bg-[#F5F0E8]"
              }`}
          >
            Linguística &amp; Fonética
          </button>
          <button
            onClick={() => setFilter("literature")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filter === "literature"
                ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                : "bg-white text-[#475569] border border-stone-200 shadow-[0_3px_0_#CBD5E1] hover:bg-[#F5F0E8]"
              }`}
          >
            Literatura &amp; Filosofia
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${filter === "active"
                ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                : "bg-white text-[#475569] border border-stone-200 shadow-[0_3px_0_#CBD5E1] hover:bg-[#F5F0E8]"
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
            Ativo Atualmente
          </button>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Espaço Disponível: 1 de 1 Ativo
          </span>
        </div>
      </div>

      {/* Polymath Mentor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPolymaths.map((mentor) => {
          const isActive =
            activeMentor.name === mentor.name ||
            (activeMentor.id === "einstein" && mentor.id === "einstein") ||
            (activeMentor.name.includes("Curie") && mentor.id === "curie");

          return (
            <div
              key={mentor.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${isActive
                  ? "border-[#0D9488] shadow-[0_4px_0_#0F766E] ring-1 ring-[#0D9488]/30"
                  : "border-stone-200/80 shadow-[0_4px_0_#CBD5E1] hover:shadow-[0_6px_0_#CBD5E1]"
                }`}
            >
              {isActive && (
                <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-[#0D9488] text-white text-[11px] font-extrabold uppercase shadow-[0_2px_0_#005049]">
                  Mentor Atual
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-stone-200 shadow-[0_3px_0_#CBD5E1]">
                      <img
                        className="w-full h-full object-cover"
                        src={AVATAR_MAP[mentor.id] || mentor.avatar}
                        alt={mentor.name}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs shadow-sm">
                      ✦
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[#0D9488] uppercase tracking-wide block truncate">
                      {mentor.field}
                    </span>
                    <h3 className="text-base font-extrabold text-[#111C2D] truncate">{mentor.name}</h3>
                    <p className="text-xs text-[#64748B] truncate">{mentor.chair}</p>
                  </div>
                </div>

                <p className="italic font-serif text-sm text-[#475569] leading-snug line-clamp-3">
                  “{mentor.quote}”
                </p>

                <div className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold ${mentor.bonusColor}`}>
                  <ShieldCheck size={16} />
                  <span>{mentor.bonus}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => handlePlayVoice(mentor)}
                  className="w-full py-2 px-3 rounded-xl bg-[#F5F0E8] text-[#111C2D] hover:bg-stone-200/70 text-xs font-bold flex items-center justify-center gap-2 border border-stone-200 shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-[0_1px_0_#CBD5E1] transition-transform cursor-pointer"
                >
                  <PlayCircle size={16} className="text-[#0D9488]" />
                  <span>Ouvir Tom de Voz</span>
                </button>

                {isActive ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-3 rounded-xl bg-[#0D9488] text-white text-xs font-extrabold opacity-95 shadow-[0_2px_0_#0F766E] flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <CheckCircle2 size={16} />
                    <span>Mentor Ativo</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectMentor(mentor)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-extrabold shadow-[0_4px_0_#0F766E] active:translate-y-[3px] active:shadow-[0_1px_0_#0F766E] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Definir como Ativo</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Council Bottom Tip */}
      <div className="rounded-2xl bg-[#F5F0E8] border border-stone-200/80 p-5 shadow-[0_3px_0_#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-[0_2px_0_#005049]">
            <Lightbulb size={20} />
          </div>
          <p className="text-sm font-medium text-[#111C2D]">
            <strong className="font-bold">Dica do Conselho:</strong> Você pode alternar de mentor a qualquer momento sem perder seu progresso, anotações fonéticas ou histórico no Palácio da Memória FSRS.
          </p>
        </div>
        <a
          href="#"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0D9488] hover:text-[#0F766E] transition-colors"
        >
          <span>Como funcionam os Bônus de Neuroplasticidade</span>
          <ArrowRight size={16} />
        </a>
      </div>

      {/* Audio Toast Simulator */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-white text-[#111C2D] p-4 rounded-2xl shadow-2xl border border-stone-200 z-50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center shrink-0">
            <Volume2 size={20} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0D9488]">Sintetizador IA</p>
            <p className="text-xs font-semibold text-[#111C2D] truncate">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
