import React, { useState } from "react";
import { router } from "expo-router";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Flame,
  Globe2,
  GraduationCap,
  Layers,
  Printer,
  Share2,
  Sparkles,
  Target,
  Volume2,
  RotateCcw,
} from "lucide-react";
import { TactileCard } from "@/components/tactile/tactile-card";
import { useProsa } from "@/context/prosa-context";
import { useSession } from "@/lib/session";
import { languageName } from "@/lib/languages";
import { Flag } from "@/components/shell/flag";
import { tap } from "@/lib/haptics";

interface Checkpoint {
  id: string;
  focus: string;
  note: string;
  done: boolean;
  dueOn: string;
}

export function DossierScreen() {
  const session = useSession();
  const { userName, xp, streak, targetLang, activeCourse, courses } = useProsa();
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [newFocus, setNewFocus] = useState("");
  const [newNote, setNewNote] = useState("");

  const displayName = userName || session?.user?.display_name || "Você";
  const userEmail = session?.user?.email || "aluno@prosa.app";
  const userInitial = displayName[0]?.toUpperCase() ?? "V";

  const langKey = targetLang || "en";
  const currentLangLabel = languageName(langKey);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    {
      id: "chk-1",
      focus: "Fixação da ordem sintática canônica em orações principais",
      note: "Completar sessões de recomposição no laboratório de Da Vinci.",
      done: true,
      dueOn: "Concluído",
    },
    {
      id: "chk-2",
      focus: "Equalização de pitch na cadência prosódica",
      note: "Alcançar >90% de alinhamento com a curva nativa no micro-lab.",
      done: false,
      dueOn: "Em 4 dias",
    },
    {
      id: "chk-3",
      focus: "Consolidação de novos vocábulos raros no Palácio FSRS",
      note: "Revisão espaçada ativa diária com os mnemônicos de Marie Curie.",
      done: false,
      dueOn: "Em 7 dias",
    },
  ]);

  const toggleCheckpoint = (id: string) => {
    void tap("success");
    setCheckpoints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
            ...c,
            done: !c.done,
            dueOn: !c.done ? "Concluído" : "Pendente",
          }
          : c
      )
    );
  };

  const handleAddCheckpoint = () => {
    if (!newFocus.trim()) return;
    void tap("success");
    const item: Checkpoint = {
      id: `chk-${Date.now()}`,
      focus: newFocus.trim(),
      note: newNote.trim() || "Meta estabelecida pelo aluno.",
      done: false,
      dueOn: "Em 7 dias",
    };
    setCheckpoints((prev) => [...prev, item]);
    setNewFocus("");
    setNewNote("");
  };

  const handleCopyShareLink = () => {
    void tap("success");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(
        `https://prosa.app/dossier/share/${langKey}-${Date.now().toString(36)}`
      );
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePrintDossier = () => {
    void tap("light");
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportFsrs = () => {
    void tap("success");
    const exportData = {
      version: "2.0.0",
      app: "Prosa Language Engine",
      exportedAt: new Date().toISOString(),
      student: displayName,
      course: {
        targetLang,
        level: activeCourse.level,
        xp: activeCourse.xp,
        prosaScore: activeCourse.prosaScore,
        cardsCount: activeCourse.fsrsCards.length,
        deck: activeCourse.fsrsCards,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prosa-fsrs-${targetLang}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const flagCode = langKey === "en" ? "gb" : langKey === "ja" ? "jp" : langKey;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      <style>{`
        @media print {
          header, aside, nav, .no-print, button, #btn-print { display: none !important; }
          body { background: white !important; }
          #printable-dossier { margin: 0; padding: 12px; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* 1. Header do Dossiê */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white border border-stone-200/80 p-6 md:p-8 shadow-sm relative overflow-hidden"
      >
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-teal-100/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-amber-100/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs uppercase tracking-wider">
                <GraduationCap className="w-4 h-4 text-[#0D9488]" />
                DIAGNÓSTICO COGNITIVO CEFR
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                PASSE PROFISSIONAL
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight font-serif">
              Dossiê de Nível &amp; Mapa de Competência
            </h1>
            <p className="text-stone-600 text-sm max-w-2xl leading-relaxed">
              Relatório oficial de proficiência emitido pela plataforma Prósa. Professores, mentores e avaliadores podem
              inspecionar sua estabilidade lexical FSRS, precisão fonética e prontidão comunicativa.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <button
              type="button"
              onClick={handlePrintDossier}
              className="px-3.5 py-2.5 rounded-xl bg-[#F5F0E8] hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-300 shadow-[0_2px_0_#CBD5E1] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-stone-700" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportFsrs}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-teal-800 font-bold text-xs border border-teal-300 shadow-[0_2px_0_#CBD5E1] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#0D9488]" />
              <span>{downloadSuccess ? "FSRS Exportado!" : "Exportar FSRS"}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/placement")}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-amber-900 font-bold text-xs border border-amber-300 shadow-[0_2px_0_#CBD5E1] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Refazer Teste CEFR</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs shadow-[0_3px_0_#0F766E] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Grid Principal: Perfil do Estudante & 4 Métricas de Domínio */}
      <div id="printable-dossier" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Cartão de Nível & Mentor Signatário (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cartão de Proficiência do Estudante */}
          <TactileCard className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-stone-200">
              <div className="w-16 h-16 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center font-black text-2xl shadow-[0_4px_0_#0F766E]">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-lg text-stone-900 block truncate">
                  {displayName}
                </span>
                <span className="text-xs text-stone-500 block truncate mb-1">
                  {userEmail}
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold text-xs">
                  <Flag code={flagCode} size={14} />
                  <span>Trilha Ativa:</span>
                  <span className="text-[#0D9488]">{currentLangLabel}</span>
                </div>
              </div>
            </div>

            {/* Certificação CEFR em Destaque */}
            <div className="p-5 rounded-2xl bg-teal-50 border-2 border-teal-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 block">
                  Nível Validado CEFR
                </span>
                <span className="text-3xl font-black text-teal-900 font-serif">
                  Nível {activeCourse.level}
                </span>
                <span className="text-xs text-teal-700 block mt-0.5">
                  {activeCourse.level === "A1"
                    ? "Iniciante Elemental no padrão europeu."
                    : activeCourse.level === "A2"
                      ? "Básico Autônomo com estruturas cotidianas."
                      : activeCourse.level === "B1"
                        ? "Intermediário Prático com independência."
                        : activeCourse.level === "B2"
                          ? "Pronto para debates complexos e leitura canônica."
                          : "Mestre Fluente com domínio acadêmico."}
                </span>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex flex-col items-center justify-center shadow-[0_3px_0_#0F766E]">
                <span className="text-[10px] font-bold uppercase">SCORE</span>
                <span className="text-xl font-black">{activeCourse.prosaScore || 780}</span>
              </div>
            </div>

            {/* Foco de Prática Recomendado */}
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-stone-800 block">
                Foco Didático Imediato:
              </span>
              <p className="text-xs text-stone-600 leading-relaxed bg-[#F5F0E8] p-3.5 rounded-xl border border-stone-200">
                Domínio de orações subordinadas e conectores causais adversativos,
                com alinhamento de pitch e ritmo prosódico em tempo real na trilha de {currentLangLabel}.
              </p>
            </div>
          </TactileCard>

          {/* Parecer do Mentor Histórico (Albert Einstein) */}
          <div className="rounded-2xl bg-white border border-stone-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/cast/einstein.png"
                alt="Albert Einstein"
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-amber-400 shadow-sm"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.dataset.tried) {
                    target.dataset.tried = "1";
                    target.src = "/assets/assets/cast/einstein.png";
                  }
                }}
              />
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#D97706] tracking-wider block">
                  Mentor Signatário
                </span>
                <span className="font-extrabold text-sm text-stone-900 block">
                  Albert Einstein
                </span>
                <span className="text-[11px] text-stone-500">Cátedra de Pensamento Polímata</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F0E8] border border-stone-200 text-xs italic text-stone-800 font-serif leading-relaxed">
              “O rigor estrutural da linguagem é a chave para a clareza dos conceitos universais. {displayName} demonstra
              uma retenção sináptica acima da média e ritmo articulatório equilibrado no curso de {currentLangLabel}.”
            </div>
          </div>
        </div>

        {/* Coluna Direita: Métricas Clínicas & Checkpoints de Fixação (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 4 Métricas de Domínio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[#8B5CF6]">
                <Layers className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase text-stone-400">FSRS</span>
              </div>
              <span className="text-2xl font-black text-stone-900 block">
                {activeCourse.fsrsCards.length || 24}
              </span>
              <span className="text-[11px] text-stone-500 font-semibold block">Cartas no Deck</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[#FF5722]">
                <Volume2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase text-stone-400">RITMO</span>
              </div>
              <span className="text-2xl font-black text-stone-900 block">128</span>
              <span className="text-[11px] text-stone-500 font-semibold block">Palavras/min</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[#10B981]">
                <Brain className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase text-stone-400">OUVIDO</span>
              </div>
              <span className="text-2xl font-black text-stone-900 block">92%</span>
              <span className="text-[11px] text-stone-500 font-semibold block">Auditiva Nativa</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[#06B6D4]">
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase text-stone-400">LEITURA</span>
              </div>
              <span className="text-2xl font-black text-stone-900 block">95%</span>
              <span className="text-[11px] text-stone-500 font-semibold block">Sintaxe CEFR</span>
            </div>
          </div>

          {/* Seção de Checkpoints de Fixação */}
          <TactileCard className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#0D9488]" />
                <h3 className="font-extrabold text-base text-stone-900">
                  Checkpoints de Aprendizado &amp; Metas
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-500">
                {checkpoints.filter((c) => c.done).length} de {checkpoints.length} Concluídos
              </span>
            </div>

            {/* Lista de Checkpoints */}
            <div className="space-y-3">
              {checkpoints.map((chk) => (
                <div
                  key={chk.id}
                  onClick={() => toggleCheckpoint(chk.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${chk.done
                    ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                    : "bg-[#F5F0E8] border-stone-200/80 hover:bg-stone-200/50"
                    }`}
                >
                  <div className="pt-0.5">
                    {chk.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-md border-2 border-stone-400 bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-extrabold text-sm ${chk.done ? "line-through text-stone-500" : "text-stone-900"
                          }`}
                      >
                        {chk.focus}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${chk.done
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-white text-stone-600 border border-stone-300"
                          }`}
                      >
                        {chk.dueOn}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">{chk.note}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Novo Checkpoint */}
            <div className="pt-3 border-t border-stone-200/80 space-y-2.5 no-print">
              <span className="text-xs font-bold text-stone-800 block">
                + Adicionar Checkpoint Personalizado
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Meta (ex: Dominar orações causais e flexão de casos)..."
                  value={newFocus}
                  onChange={(e) => setNewFocus(e.target.value)}
                  className="flex-1 p-2.5 text-xs rounded-xl bg-white border border-stone-300 text-stone-900 shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleAddCheckpoint}
                  disabled={!newFocus.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white font-extrabold text-xs shadow-[0_2px_0_#0F766E] cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </TactileCard>
        </div>
      </div>
    </div>
  );
}
