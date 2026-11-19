import React, { useState } from "react";
import {
  BookOpen,
  Volume2,
  Bookmark,
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowRight,
  Highlighter,
  Sliders,
  Award,
  Layers,
  Globe2,
  Cpu,
  Compass,
  Telescope,
} from "lucide-react";
import { useProsa } from "@/context/prosa-context";
import { speechService } from "@/services/speechService";

interface WordAnnotation {
  word: string;
  ipa: string;
  lemma: string;
  grammarTag: string;
  translation: string;
  morphology: string;
  etymology: string;
}

interface ArticleTrack {
  id: string;
  category: "classic" | "ai" | "philosophy" | "science";
  categoryLabel: string;
  title: string;
  author: string;
  period: string;
  chapter: string;
  level: string;
  audioLang: string;
  mentor: {
    id: string;
    name: string;
    role: string;
    avatar: string;
    quote: string;
  };
  paragraphs: Array<{
    dropCap?: string;
    textBefore: string;
    interactiveWord?: WordAnnotation;
    textAfter: string;
  }>;
  savedWordsInitial: string[];
}

const ARTICLES_BY_LANG: Record<string, ArticleTrack[]> = {
  en: [
    {
      id: "sherlock-holmes",
      category: "classic",
      categoryLabel: "Literatura Clássica",
      title: "A Scandal in Bohemia",
      author: "Arthur Conan Doyle",
      period: "1891",
      chapter: "Chapter I (The Bohemian Mystery)",
      level: "B2",
      audioLang: "en-US",
      mentor: {
        id: "aristotle",
        name: "Aristóteles",
        role: "Mestre da Retórica e Lógica",
        avatar: "/cast/aristotle.png",
        quote:
          "“Observe a cadência silogística impecável de Conan Doyle: o vocábulo ‘predominates’ não apenas descreve autoridade, mas estabelece a hegemonia epistêmica de Irene Adler na mente analítica de Holmes.”",
      },
      paragraphs: [
        {
          dropCap: "T",
          textBefore:
            "o Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and ",
          interactiveWord: {
            word: "predominates",
            ipa: "[prih-dah-mih-nayts]",
            lemma: "predominate",
            grammarTag: "Verb (Present 3rd Sing.)",
            translation: "prepondera, sobrepuja, predomina",
            morphology:
              "Verbo derivado do latim 'praedominari' (ter poder supremo antes de outros), indicando primazia absoluta de intelecto.",
            etymology:
              "latim prae- (antes) + dominus (senhor, mestre) -> governar acima de todos os demais.",
          },
          textAfter:
            " the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions were abhorrent to his cold, precise but admirably balanced mind.",
        },
        {
          textBefore:
            "He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer.",
          textAfter: "",
        },
        {
          textBefore:
            "They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.",
          textAfter: "",
        },
      ],
      savedWordsInitial: ["predominates", "eclipses", "abhorrent", "gibe", "sneer"],
    },
    {
      id: "ai-frontier",
      category: "ai",
      categoryLabel: "Inteligência Artificial & Fronteiras",
      title: "Neural Synergy and Modern Reasoning",
      author: "Prosa Tech Review",
      period: "2026",
      chapter: "Edição Especial • Cognição Computacional",
      level: "B2",
      audioLang: "en-US",
      mentor: {
        id: "feynman",
        name: "Richard Feynman",
        role: "Físico e Mentor de Modelagem",
        avatar: "/cast/feynman.png",
        quote:
          "“Se você não consegue simular em blocos de raciocínio simples, você ainda não compreendeu o mecanismo. Observe como a palavra ‘emergent’ descreve comportamentos complexos surgindo de regras simples!”",
      },
      paragraphs: [
        {
          dropCap: "T",
          textBefore:
            "he latest breakthroughs in generative cognition indicate that autonomous models achieve ",
          interactiveWord: {
            word: "emergent",
            ipa: "[ih-mur-juhnt]",
            lemma: "emergent",
            grammarTag: "Adjective",
            translation: "emergente, espontâneo, manifestado",
            morphology:
              "Adjetivo qualificativo referente a propriedades sistêmicas que se manifestam apenas no nível macroscópico.",
            etymology:
              "latim emergere (surgir à superfície, elevar-se para fora da água).",
          },
          textAfter:
            " reasoning patterns when scaling deliberate chain-of-thought protocols. Rather than simply memorizing training corpora, modern architectures demonstrate inductive generalization across multi-modal knowledge domains.",
        },
        {
          textBefore:
            "Researchers emphasize that calibrating feedback loops with verified syntactic structures transforms raw predictive capacity into robust semantic understanding. Language learners who interact with these cognitive partners accelerate their fluency curve exponentially.",
          textAfter: "",
        },
      ],
      savedWordsInitial: ["emergent", "synergy", "inductive", "generalization"],
    },
    {
      id: "philosophy-stoic",
      category: "philosophy",
      categoryLabel: "Filosofia & Cognição",
      title: "Epictetus and Cognitive Fortitude",
      author: "Prosa Classical Ethics",
      period: "2026",
      chapter: "Ensaio • Racionalidade Aplicada",
      level: "B2",
      audioLang: "en-US",
      mentor: {
        id: "aurelius",
        name: "Marco Aurélio",
        role: "Filósofo Estoico",
        avatar: "/cast/aurelius.png",
        quote:
          "“A mente tranquila é a mais inexpugnável das cidadelas. Domine os nomes das coisas que dependem de você e das que não dependem.”",
      },
      paragraphs: [
        {
          dropCap: "M",
          textBefore:
            "en are disturbed not by things, but by the view which they take of them. To build a ",
          interactiveWord: {
            word: "tranquil",
            ipa: "[trang-kwil]",
            lemma: "tranquil",
            grammarTag: "Adjective",
            translation: "sereno, imperturbável, pacífico",
            morphology:
              "Adjetivo latino denotando serenidade imperturbável do espírito perante adversidades externas.",
            etymology:
              "latim tranquillus (calmo, sereno, sem agitação tempestuosa).",
          },
          textAfter:
            " intellect requires distinguishing between internal choices and external fortunes with surgical precision.",
        },
      ],
      savedWordsInitial: ["tranquil", "fortitude", "disturbed", "external"],
    },
  ],
  de: [
    {
      id: "kafka-verwandlung",
      category: "classic",
      categoryLabel: "Literatura Clássica",
      title: "Die Verwandlung",
      author: "Franz Kafka",
      period: "1915",
      chapter: "Erster Abschnitt (Capítulo I)",
      level: "B1",
      audioLang: "de-DE",
      mentor: {
        id: "aristotle",
        name: "Aristóteles",
        role: "Crítica Literária & Estilística",
        avatar: "/cast/aristotle.png",
        quote:
          "“Note a genialidade da escolha lexical de Kafka: ‘Ungeziefer’ remete historicamente a uma criatura indigna de sacrifício perante o sagrado, sublinhando desde o primeiro período o irremediável isolamento existencial de Gregor.”",
      },
      paragraphs: [
        {
          dropCap: "A",
          textBefore:
            "ls Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ",
          interactiveWord: {
            word: "ungeheuren",
            ipa: "[oon-geh-hoy-ern]",
            lemma: "ungeheuer",
            grammarTag: "Akkusativ Masc",
            translation: "monstruoso, colossal, desmedido",
            morphology:
              "Adjetivo com declinação mista (após artigo indefinido einem), regido pela preposição zu (Dativo de transformação).",
            etymology:
              "un- (privativo) + gehiure (antigo alto-alemão: familiar) = aquilo que rompe com a ordem familiar; o aterrador.",
          },
          textAfter:
            " Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken und sah, wenn er den Kopf ein wenig hob, seinen gewölbten, braunen, von bogenförmigen Versteifungen geteilten Bauch.",
        },
      ],
      savedWordsInitial: ["ungeheuren", "Ungeziefer", "Versteifungen"],
    },
  ],
};

export default function NewsScreen() {
  const { addXp, targetLang, activeMentor } = useProsa();
  const availableArticles =
    ARTICLES_BY_LANG[targetLang && targetLang in ARTICLES_BY_LANG ? targetLang : "en"] ||
    ARTICLES_BY_LANG.en;

  const [activeArticleId, setActiveArticleId] = useState<string>(availableArticles[0].id);
  const activeArticle =
    availableArticles.find((a) => a.id === activeArticleId) || availableArticles[0];

  const [scale, setScale] = useState(1);
  const [theme, setTheme] = useState<"vanilla" | "sepia" | "pure">("vanilla");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [highlightVocab, setHighlightVocab] = useState(true);
  const [savedVocab, setSavedVocab] = useState(activeArticle.savedWordsInitial.length);
  const [chapterDone, setChapterDone] = useState(false);

  const getCanvasStyles = () => {
    switch (theme) {
      case "sepia":
        return "bg-[#F4ECD8] text-[#2C2416] border-[#D3C7A8] shadow-[0_4px_0_#D3C7A8]";
      case "pure":
        return "bg-white text-[#111C2D] border-stone-200/80 shadow-[0_4px_0_#E2E8F0]";
      case "vanilla":
      default:
        return "bg-[#FDFBF7] text-[#111C2D] border-stone-200/80 shadow-[0_4px_0_#E2E8F0]";
    }
  };

  const handlePlayNarrator = () => {
    if (isPlayingAudio) {
      speechService.stop();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const fullText = activeArticle.paragraphs
      .map((p) => `${p.dropCap || ""}${p.textBefore}${p.interactiveWord?.word || ""}${p.textAfter}`)
      .join(" ");

    speechService.speak(fullText.slice(0, 300), {
      lang: activeArticle.audioLang,
      speed: "1.0x",
      mentorId: activeMentor?.id || "einstein",
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const playWordVoice = (word: string) => {
    speechService.speak(word, {
      lang: activeArticle.audioLang,
      speed: "0.8x",
      mentorId: activeMentor?.id || "einstein",
    });
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16">
      {/* Top Navigation & Context Bar */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-bold uppercase tracking-wider mb-1">
            <span className="inline-flex items-center gap-1 text-[#0D9488]">
              <BookOpen size={14} />
              {activeArticle.categoryLabel}
            </span>
            <span>/</span>
            <span>{activeArticle.level}</span>
            <span>/</span>
            <span className="text-[#111C2D] font-extrabold">
              {activeArticle.author}: {activeArticle.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-[#111C2D] tracking-tight">Leitor Imersivo Polímata</h1>
            <span className="px-3 py-0.5 rounded-full bg-amber-100 text-[#92400E] text-xs font-bold flex items-center gap-1">
              <Sparkles size={13} />
              Modo Exegese
            </span>
          </div>
        </div>

        {/* Reading Progress Capsule */}
        <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#E2E8F0] self-start lg:self-auto">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-stone-200"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-[#0D9488]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="60, 100"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <span className="absolute text-[10px] font-extrabold text-[#111C2D]">60%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-[#111C2D] leading-none">Imersão Ativa</span>
              <span className="text-[11px] text-[#64748B] mt-0.5">{savedVocab} termos mapeados</span>
            </div>
          </div>
          <div className="h-6 w-px bg-stone-200" />
          <button
            type="button"
            onClick={() => addXp(25)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF5722]/10 text-[#FF5722] text-xs font-extrabold hover:bg-[#FF5722]/20 transition-colors cursor-pointer"
          >
            <Zap size={14} />
            <span>+25 XP</span>
          </button>
        </div>
      </header>

      {/* Themed Article Tabs (Classic Literature & Themed Topics) */}
      <div className="flex flex-wrap items-center gap-2.5 py-2">
        {availableArticles.map((art) => {
          const isSelected = art.id === activeArticle.id;
          return (
            <button
              key={art.id}
              type="button"
              onClick={() => {
                setActiveArticleId(art.id);
                setShowTooltip(false);
                setSavedVocab(art.savedWordsInitial.length);
              }}
              className={`box-border px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-[#0D9488] text-white shadow-[0_3px_0_#0F766E]"
                  : "bg-white text-stone-700 border border-stone-200 shadow-[0_2px_0_#CBD5E1] hover:bg-stone-50"
              }`}
            >
              {art.category === "classic" && <BookOpen size={14} />}
              {art.category === "ai" && <Cpu size={14} />}
              {art.category === "philosophy" && <Compass size={14} />}
              {art.category === "science" && <Telescope size={14} />}
              <span>{art.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isSelected ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
                }`}
              >
                {art.level}
              </span>
            </button>
          );
        })}
      </div>

      {/* Distraction-Free Control Ribbon */}
      <nav aria-label="Controles de Leitura" className="flex flex-wrap items-center justify-between gap-4 bg-white p-2.5 px-4 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#E2E8F0]">
        {/* Font Size & Spacing Controls */}
        <div className="flex items-center gap-1.5 bg-[#F5F0E8] p-1 rounded-xl">
          <span className="text-[#64748B] text-[11px] font-bold px-2">TIPOGRAFIA</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.85, s - 0.08))}
            className="w-8 h-8 rounded-lg bg-white text-[#111C2D] flex items-center justify-center font-bold text-xs border border-stone-200 shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 transition-all hover:bg-stone-50 cursor-pointer"
            title="Diminuir fonte"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(1.35, s + 0.08))}
            className="w-8 h-8 rounded-lg bg-white text-[#111C2D] flex items-center justify-center font-bold text-xs border border-stone-200 shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 transition-all hover:bg-stone-50 cursor-pointer"
            title="Aumentar fonte"
          >
            A+
          </button>
        </div>

        {/* Parchment Atmosphere Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#64748B] mr-1">TEMA</span>
          <button
            type="button"
            onClick={() => setTheme("vanilla")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              theme === "vanilla"
                ? "bg-[#FDFBF7] border-stone-400 text-[#111C2D] shadow-sm"
                : "bg-stone-100 border-transparent text-[#64748B]"
            }`}
          >
            Baunilha
          </button>
          <button
            type="button"
            onClick={() => setTheme("sepia")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              theme === "sepia"
                ? "bg-[#F4ECD8] border-[#B89F70] text-[#2C2416] shadow-sm"
                : "bg-stone-100 border-transparent text-[#64748B]"
            }`}
          >
            Sépia Fólio
          </button>
          <button
            type="button"
            onClick={() => setTheme("pure")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              theme === "pure"
                ? "bg-white border-stone-400 text-[#111C2D] shadow-sm"
                : "bg-stone-100 border-transparent text-[#64748B]"
            }`}
          >
            Puro White
          </button>
        </div>

        {/* Audio Player Module */}
        <div
          onClick={handlePlayNarrator}
          className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all select-none ${
            isPlayingAudio
              ? "bg-[#0D9488] text-white shadow-[0_2px_0_#0F766E]"
              : "bg-[#0D9488]/10 text-[#0D9488] hover:bg-[#0D9488]/20"
          }`}
        >
          <Volume2 size={16} className={isPlayingAudio ? "animate-pulse" : ""} />
          <div className="flex flex-col">
            <span className="text-xs font-extrabold leading-tight">Narrador Nativo Polímata</span>
            <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
              {isPlayingAudio ? "Reproduzindo Áudio" : "Ouvir Capítulo"}
            </span>
          </div>
        </div>

        {/* Lexical Density Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#64748B]">GLOSSÁRIO</span>
          <button
            type="button"
            onClick={() => setHighlightVocab(!highlightVocab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              highlightVocab
                ? "bg-teal-50 text-[#0D9488] border border-teal-200"
                : "bg-[#F5F0E8] text-[#475569] hover:bg-stone-200/70"
            }`}
          >
            <Highlighter size={14} className="text-[#0D9488]" />
            <span>Destacar Vocábulos Raros</span>
          </button>
        </div>
      </nav>

      {/* Main Split Architecture: Literary Canvas + Polymath Companion Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT/CENTER: The Pure Literary Reading Canvas (8 cols) */}
        <section className="lg:col-span-8 flex flex-col relative">
          <article className={`p-8 rounded-2xl border transition-colors duration-200 ${getCanvasStyles()}`}>
            {/* Book Header Inset */}
            <header className="flex items-center justify-between pb-6 mb-6 border-b border-stone-200/70">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#0D9488] uppercase tracking-widest">
                  {activeArticle.title} • {activeArticle.author} ({activeArticle.period})
                </span>
                <h2 className="text-xl font-extrabold text-[#111C2D] mt-1">{activeArticle.chapter}</h2>
              </div>
              <Bookmark size={24} className="text-[#94A3B8]" />
            </header>

            {/* Literary Body Content */}
            <div
              className="font-serif leading-loose tracking-normal space-y-6 select-text"
              style={{
                fontSize: `${20 * scale}px`,
                lineHeight: `${34 * scale}px`,
              }}
            >
              {activeArticle.paragraphs.map((p, pIdx) => (
                <div key={pIdx}>
                  {p.dropCap && (
                    <span className="text-6xl font-extrabold float-left mr-3 text-[#0D9488] leading-none">
                      {p.dropCap}
                    </span>
                  )}
                  {p.textBefore}

                  {p.interactiveWord && (
                    <span className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setShowTooltip(!showTooltip)}
                        className="bg-[#0D9488]/15 text-[#0D9488] font-bold px-1.5 py-0.5 rounded-md underline decoration-[#0D9488] decoration-2 underline-offset-4 cursor-pointer hover:bg-[#0D9488]/25 transition-all"
                      >
                        {p.interactiveWord.word}
                      </button>

                      {/* NON-OVERFLOWING SYNTACTIC TOOLTIP (Positions downwards safely with arrow pointing to word) */}
                      {showTooltip && (
                        <div className="absolute left-0 sm:-left-4 top-full mt-3 w-[320px] sm:w-[380px] bg-white rounded-2xl p-5 shadow-2xl border border-stone-200 z-50 text-left font-sans">
                          {/* Tooltip Arrow UP (pointing directly to word) */}
                          <div className="absolute -top-2 left-6 w-4 h-4 bg-white rotate-45 border-l border-t border-stone-200" />

                          {/* Tooltip Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold text-[#111C2D]">
                                  {p.interactiveWord.word}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => playWordVoice(p.interactiveWord!.word)}
                                  className="w-6 h-6 rounded-full bg-[#F5F0E8] flex items-center justify-center text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition-colors cursor-pointer"
                                  title="Ouvir pronúncia fonética"
                                >
                                  <Volume2 size={13} />
                                </button>
                                <span className="text-xs text-[#64748B] font-mono">
                                  {p.interactiveWord.ipa}
                                </span>
                              </div>
                              <span className="text-xs text-[#64748B]">
                                Lema: <strong className="text-[#111C2D]">{p.interactiveWord.lemma}</strong>
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-[#0891B2] text-[10px] font-bold uppercase">
                              {p.interactiveWord.grammarTag}
                            </span>
                          </div>

                          {/* Meaning in Portuguese */}
                          <div className="bg-[#F5F0E8] p-2.5 rounded-xl mb-3 border border-stone-200/80">
                            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block mb-0.5">
                              Tradução Contextual
                            </span>
                            <div className="text-sm font-extrabold text-[#0D9488] leading-snug">
                              "{p.interactiveWord.translation}"
                            </div>
                          </div>

                          {/* Grammatical Analysis & Etymology Grid */}
                          <div className="space-y-2 mb-4 text-xs">
                            <div className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                              <Layers size={16} className="text-[#0D9488] mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <strong className="text-[#111C2D]">Decomposição Morfológica:</strong>
                                <span className="text-[#475569]">{p.interactiveWord.morphology}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                              <Sparkles size={16} className="text-[#D97706] mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <strong className="text-[#92400E]">Etimologia Profunda:</strong>
                                <span className="text-[#78350F] leading-tight">{p.interactiveWord.etymology}</span>
                              </div>
                            </div>
                          </div>

                          {/* 3D Tactile Primary Button to FSRS Memory Palace */}
                          <button
                            type="button"
                            onClick={() => {
                              setSavedVocab((v) => v + 1);
                              addXp(10);
                              setShowTooltip(false);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#0D9488] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_4px_0_#0F766E] hover:bg-[#0F766E] active:translate-y-1 active:shadow-[0_1px_0_#0F766E] transition-all cursor-pointer"
                          >
                            <Bookmark size={15} />
                            <span>Enviar para o Palácio da Memória (FSRS)</span>
                            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px]">
                              +10 XP
                            </span>
                          </button>
                        </div>
                      )}
                    </span>
                  )}

                  {p.textAfter}
                </div>
              ))}
            </div>

            {/* Subtle Chapter Footnote */}
            <footer className="mt-8 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-[#64748B]">
              <span>Capítulo Ativo • Página 1 de 8</span>
              <div className="flex items-center gap-2 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span>MODO FOCO ATIVO</span>
              </div>
            </footer>
          </article>

          {/* Bottom Chapter Completion Call to Action */}
          <div className="mt-6 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-[#D97706] shadow-[0_3px_0_#D97706] border border-amber-200">
                <Award size={26} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-extrabold text-[#111C2D]">Pronto para a fixação?</h3>
                <p className="text-xs text-[#64748B]">Conclua a leitura e consolide os cartões de repetição espaçada FSRS.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setChapterDone(true);
                addXp(50);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0D9488] text-white text-xs font-extrabold shadow-[0_4px_0_#0F766E] hover:bg-[#0F766E] active:translate-y-1 active:shadow-[0_1px_0_#0F766E] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{chapterDone ? "Capítulo Concluído!" : "Concluir Leitura do Capítulo (+50 XP)"}</span>
            </button>
          </div>
        </section>

        {/* RIGHT RAIL: 3D Figurine Mentor Commentary & Lexical Depot (4 cols) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* SAGE COMMENTARY CARD with 3D FIGURINE AVATAR */}
          <section className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#E2E8F0] relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-4 relative">
              {/* 3D Toy Figurine Avatar */}
              <div className="relative shrink-0 w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-[#D97706] to-[#FEF3C7] shadow-[0_3px_0_#D97706] overflow-hidden">
                <img
                  className="w-full h-full object-cover rounded-xl"
                  src={activeArticle.mentor.avatar}
                  alt={activeArticle.mentor.name}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[10px] font-bold text-[#0D9488] uppercase tracking-wider">
                    Comentário do Mentor
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-[#111C2D]">{activeArticle.mentor.name}</h4>
                <span className="text-[11px] text-[#64748B]">{activeArticle.mentor.role}</span>
              </div>
            </div>

            {/* Speech Balloon */}
            <div className="relative bg-[#F5F0E8] p-4 rounded-2xl text-[#111C2D] mb-4 border border-stone-200/80">
              <div className="absolute -top-2 left-6 w-4 h-4 bg-[#F5F0E8] border-t border-l border-stone-200/80 rotate-45" />
              <p className="font-serif italic text-xs leading-relaxed text-[#334155]">
                {activeArticle.mentor.quote}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Análise de Subtexto</span>
              <button
                type="button"
                onClick={() => addXp(15)}
                className="text-xs font-bold text-[#0D9488] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Explorar Simbolismo</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </section>

          {/* CHAPTER VOCABULARY COLLECTOR */}
          <section className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center font-bold">
                  <Bookmark size={16} />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-extrabold text-[#111C2D]">Vocabulário Salvo</h4>
                  <span className="text-[10px] text-[#64748B]">Capítulo Atual</span>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {savedVocab} salvos
              </span>
            </div>

            <div className="space-y-2">
              {activeArticle.savedWordsInitial.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between hover:bg-stone-100 transition-colors"
                >
                  <span className="font-mono text-xs font-bold text-[#111C2D]">{item}</span>
                  <button
                    type="button"
                    onClick={() => playWordVoice(item)}
                    className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-[#0D9488] hover:bg-[#0D9488] hover:text-white transition-all shadow-sm cursor-pointer"
                  >
                    <Volume2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
