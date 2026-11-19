import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProsa } from "@/context/prosa-context";

interface ShopItem {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  image: string;
  imageAlt: string;
  description: string;
  price: number;
  icon: string;
  category: "streak" | "arena" | "memory";
  inHand?: string;
}

const SHOP_ITEMS: ShopItem[] = [
  // Section 1: Streak
  {
    id: "freeze",
    name: "Congelamento de Ofensiva (Frasco Criogênico)",
    badge: "Criogenia",
    badgeColor: "bg-cyan-600 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBHBp5ERb5u3-thLZjO0FC1WBbrzR78lywT8QoKBWBRl7Hl8J6tGR26t3aKYTpy4OZI_IPYBLd9Jc7mGUSOc-Y7qHi7z__wcCm272IPh1PXb7II6EQII1jTVAuDCvUGm8ZDHfoOGu_Av8YYcBs3CItvJsg7RFAgx9gIfYOk9QhSsaaPLcbM9xe2zND8Q9o7LKeV0h2KaeZD-P_6vcyR-ZmJH1VgFRdKizKzW-WQc1s",
    imageAlt: "Frasco criogênico de latão e cristal",
    description: "Mantém seu streak de 14 dias intacto se você perder um dia por imprevisto de estudo. Ativação automática ao expirar a meia-noite.",
    price: 200,
    icon: "shield",
    category: "streak",
    inHand: "1 / 2 Em Mãos",
  },
  {
    id: "repair",
    name: "Reparação Retroativa de Chama",
    badge: "Cronômese",
    badgeColor: "bg-[#FF5722] text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeu75zsFaBI1nYTesDyFvegCK406KG6f_-MQemJoGMaMrzeFgT_OD2ZkeTjbKQgbhuI9ZZYivXRyTB1op3fO1Ah9N7hmtLLlgLAF3DQlgn0PGOYRuksbjmM6psXxjO3ukL3gv1TmbOHf3Ll7LLpaNf0u8SbquBJOBAw0pZLkiz704nf3YVPbd4aZOvPBcpHpAlH8llMQqOz2g9FkHnz7TWLDm3gNC4IMp4EIXoJq4",
    imageAlt: "Relógio de ouro com ponteiros girando ao contrário",
    description: "Restaura um dia perdido na semana anterior, reintegrando o elo partido no seu gráfico de consistência e pontuação de liga.",
    price: 450,
    icon: "history",
    category: "streak",
  },
  {
    id: "circadian",
    name: "Acelerador Circadiano de Fim de Semana",
    badge: "Circadiano",
    badgeColor: "bg-amber-600 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkSydgiNwy-tCMYju1n948qFfGZh3rss7TUq_9Er0g4bUDiFlPxYuGqdE95kGiKLJP-ThO67Ke0roECJ-Mf1-ilwXhRJVcJjXY1IKiSMlmLgUGdlFNrBWooMgqcjpwBrDImqzlpNKTqi-tWHt_d8wHfeeo6KYeGzEMgMwF-t9s369Y0iY4BYEs2sT0jGvyfS6EwDg-AYJb0-50SO1i4p-efSzI8yCZE_RdP1waF3U",
    imageAlt: "Astrolábio solar de latão vintage",
    description: "Multiplica por 2x as gemas obtidas em todas as sessões realizadas aos sábados e domingos durante um ciclo completo de 30 dias.",
    price: 150,
    icon: "bolt",
    category: "streak",
  },
  // Section 2: Arena
  {
    id: "hourglass",
    name: "Ampulheta de Feynman (Pausa 15s)",
    badge: "Tempo Congelado",
    badgeColor: "bg-pink-700 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAoondj_jlMiMznnIi7BWwI7m_kupT7B-TCPXjLSO-s5xeekG2yxozg1aLpu_DPQfLGoHcRg-lT4JXbpNB_lwWxS6EhvTmKFHiH00uHNjDnMbpHqyiPf67Y7Qysa24j0n-rFKeE9XOgRLTsQPPMhcoJ6qxt3c8IFxtTb8onf4hcgr-viXHxkX9rfaQ6Ezu9FiYn8pM9iZr0JskxqF6zUwCT3eHp2D7cVkK-ZPHPKZg",
    imageAlt: "Ampulheta cristalina levitando",
    description: "Pausa o cronômetro do Duelo 120s por 15 segundos enquanto você decodifica frases complexas sem penalidade de tempo.",
    price: 80,
    icon: "hourglass_top",
    category: "arena",
  },
  {
    id: "resonance",
    name: "Ressonância Neural 2x XP",
    badge: "Impulso XP",
    badgeColor: "bg-purple-600 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDw8Iqg5xUfjltDKE1Y9QnWODKfSSeLP85nBodmk_2-6qN3xcgC_-blbC-t-i_2t2k2T3E5ycIAM18sGprn_6XomGeEWOcd8rSYxAZ4NZtS_CvIfkFwtjtxKmRcPREb1iTvJR9lmfTnXRiBRnhqxtUAG4ergaZgiae9PzABxyBjYh7CSbo6grI2BkcVKy8mDRUdHfED7jrYNt--P2ubWaAl5XXKHjF4VJa95e2P1w",
    imageAlt: "Orbe esférico com relâmpagos neurais",
    description: "Dobra todos os pontos de experiência ganhos nas próximas 3 partidas competitivas disputadas na Arena.",
    price: 120,
    icon: "psychology",
    category: "arena",
  },
  {
    id: "curie_lens",
    name: "Lente Mnemônica de Curie",
    badge: "Descarte 50/50",
    badgeColor: "bg-emerald-600 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCJd6nmZs6iEIseWciDMysv2Rvr07KYffvEwnGHMdi8aAF9p1vcajkhfV2Tilz1d9NJEAXS4cYOw_AW_bRLHvXNftnk2kvy_sW-JfOdCzB-t6gNHgZiT1TCdIekw5kFW1yad1bQgAeYI5yweYwi_6rWlSjFk4_RcMcO0dBtM5GUZUx517tOXszw-Y6jisuI9dRrajtCojHgkR3SuHLmmUbo11QjV9EnNRpRrUds5TM",
    imageAlt: "Monóculo de cobre com lente esmeralda",
    description: "Elimina instantaneamente duas alternativas erradas em momentos de dúvida crítica durante duelos acirrados.",
    price: 100,
    icon: "visibility",
    category: "arena",
  },
  // Section 3: Themes
  {
    id: "davinci_theme",
    name: "Códice Renascentista (Pergaminho)",
    badge: "Da Vinci",
    badgeColor: "bg-amber-700 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBmKk8v40aC5DHskG5yf-DIpPDGHRPA9qoPnQOhHUGe6tfIKhaDTGsOOQ9c7iwDOHfLicTFMFZOKst04PRRMzBOV932N5phK2x_ucWKV06sWN7CbGnStS3iVk6sztt3zB7p23d22BBnHmpt5XuL4JAVCo8AzLboTVbBzfPHDhw9c7WeJ6IJWNwCb_olY8IRjo9uLqpj251mvRhYm7BF8Ys0tyxEL1uLUBzgtIauh8w",
    imageAlt: "Manuscrito de Leonardo Da Vinci em pergaminho sépia",
    description: "Visual clássico de estúdio florentino para seus flashcards FSRS, com tipografia caligráfica e texturas de pergaminho vegetal.",
    price: 500,
    icon: "brush",
    category: "memory",
  },
  {
    id: "einstein_dark",
    name: "Observatório Noturno de Einstein",
    badge: "Modo Escuro",
    badgeColor: "bg-stone-900 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFtG2t5FsT79BBGjX8k9s7IDDwlL46ViOdlgddYa0q2MmFHHqYXZb8cUS3OG8Ngxv8x76R_TWLuQooR1FHvJn1z52H0cKxmy9V-V1zL0TExfgeLU1DasbAldoP1YtoChHLfTeoZClSZAButLAozQtNpV8wgs4c1US3jqAfrZgBYRrJOnCsIigbgyPfZAGfyF0uMCK03QZrkaT3BbynnB3WM672Vl3vduwOKZLsJbg",
    imageAlt: "Observatório astronômico revelando galáxias celestes",
    description: "Modo escuro astronômico aveludado onde regras gramaticais se transformam em constelações brilhantes na abóbada celeste.",
    price: 650,
    icon: "dark_mode",
    category: "memory",
  },
  {
    id: "curie_particles",
    name: "Laboratório de Radiação de Curie",
    badge: "Partículas FX",
    badgeColor: "bg-emerald-700 text-white",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAd35kYA-JzkPKGKWKBWxX8FFdCJMMjKicF5hqpXUBXBIjonDh5cYnTggYOf5x2T998w72wETZUvVozTGAH9FzNOtDmu1bsnyheBw00NNpsc1r8R_yB-6DmTjxhig0I0ec7khRbNIfiVq9r87fYEsBuf6Rw8WwnsJvlvlJpFoy6uMQTicOjUg4RxcPpyfsC4l0FCBhnjwI6iZAMbiMhpi3CeFEu6WYkut2K2BWdnRk",
    imageAlt: "Partículas verdes luminosas de rádio em laboratório",
    description: "Efeito visual de partículas luminescentes verde-esmeralda emitidas toda vez que você consolida um card FSRS com nota 'Fácil'.",
    price: 400,
    icon: "flare",
    category: "memory",
  },
];

function ArtifactIllustration({ id }: { id: string }) {
  switch (id) {
    case "freeze":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #0e7490 0%, #042f2e 50%, #0f172a 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-cyan-400/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #22d3ee, #5eead4)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(6,182,212,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-slate-950/80 backdrop-blur flex items-center justify-center text-4xl">
                🧪
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 text-2xl">🧊</div>
            <div className="absolute -top-1 -left-2 text-xl animate-spin" style={{ animationDuration: "8s" }}>❄️</div>
          </div>
        </div>
      );
    case "repair":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #7c2d12 0%, #431407 50%, #1c1917 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-amber-500/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #f59e0b, #fb7185)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-stone-950/80 backdrop-blur flex items-center justify-center text-4xl">
                🔥
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 text-2xl">⏳</div>
            <div className="absolute -top-2 -right-1 text-lg">✨</div>
          </div>
        </div>
      );
    case "circadian":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #78350f 0%, #451a03 50%, #1c1917 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-yellow-400/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #facc15, #b45309)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(234,179,8,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-stone-950/80 backdrop-blur flex items-center justify-center text-4xl">
                🧭
              </div>
            </div>
            <div className="absolute -bottom-1 -right-2 text-2xl">⚡</div>
            <div className="absolute -top-2 -left-1 text-xl">☀️</div>
          </div>
        </div>
      );
    case "hourglass":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #701a75 0%, #4a044e 50%, #18181b 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-pink-500/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #ec4899, #c026d3)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(236,72,153,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-stone-950/80 backdrop-blur flex items-center justify-center text-4xl">
                ⌛
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 text-2xl">🔮</div>
            <div className="absolute -top-2 -left-1 text-lg">⏱️</div>
          </div>
        </div>
      );
    case "resonance":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #312e81 0%, #3b0764 50%, #0f172a 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-purple-500/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #818cf8, #d946ef)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(168,85,247,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-slate-950/80 backdrop-blur flex items-center justify-center text-4xl">
                🧠
              </div>
            </div>
            <div className="absolute -bottom-1 -right-2 text-2xl">⚡</div>
            <div className="absolute -top-2 -left-1 text-lg">💫</div>
          </div>
        </div>
      );
    case "curie_lens":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #064e3b 0%, #042f2e 50%, #1c1917 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-emerald-400/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #34d399, #06b6d4)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(16,185,129,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-stone-950/80 backdrop-blur flex items-center justify-center text-4xl">
                👁️
              </div>
            </div>
            <div className="absolute -bottom-1 -right-2 text-2xl">💎</div>
            <div className="absolute -top-2 -left-1 text-lg">🔬</div>
          </div>
        </div>
      );
    case "davinci_theme":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #78350f 0%, #292524 50%, #1c1917 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-amber-500/25 blur-2xl" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #d97706, #a8a29e)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_25px_rgba(217,119,6,0.6)]"
            >
              <div className="w-full h-full rounded-[22px] bg-stone-950/80 backdrop-blur flex items-center justify-center text-4xl">
                📜
              </div>
            </div>
            <div className="absolute -bottom-1 -right-2 text-2xl">🖋️</div>
            <div className="absolute -top-2 -left-1 text-lg">🎨</div>
          </div>
        </div>
      );
    case "einstein_dark":
      return (
        <div
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #172554 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute w-32 h-32 rounded-full bg-blue-400/30 blur-2xl animate-pulse" />
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #60a5fa, #c084fc)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_30px_rgba(59,130,246,0.7)]"
            >
              <div className="w-full h-full rounded-[22px] bg-slate-950/80 backdrop-blur flex items-center justify-center text-4xl">
                🔭
              </div>
            </div>
            <div className="absolute -bottom-1 -right-2 text-2xl">🌌</div>
            <div className="absolute -top-2 -left-1 text-lg">🌟</div>
          </div>
        </div>
      );
    default:
      return (
        <div
          style={{ background: "linear-gradient(135deg, #042f2e 0%, #1c1917 50%, #0f172a 100%)" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="relative flex flex-col items-center justify-center">
            <div
              style={{ background: "linear-gradient(135deg, #14b8a6, #34d399)" }}
              className="w-20 h-20 rounded-3xl p-0.5 shadow-[0_0_25px_rgba(13,148,136,0.6)]"
            >
              <div className="w-full h-full rounded-[22px] bg-stone-950/80 backdrop-blur flex items-center justify-center text-4xl">
                ✨
              </div>
            </div>
          </div>
        </div>
      );
  }
}

export default function ShopScreen() {
  const { gems, setGems } = useProsa();
  const [filter, setFilter] = useState<"all" | "streak" | "arena" | "memory">("all");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isGemsModalOpen, setIsGemsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; msg: string } | null>(null);

  const showToast = (title: string, msg: string) => {
    setToast({ title, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePurchase = () => {
    if (!selectedItem) return;
    if (gems >= selectedItem.price) {
      setGems(gems - selectedItem.price);
      showToast("Artefato Adquirido!", `${selectedItem.name} foi adicionado ao seu inventário ativo.`);
      setSelectedItem(null);
    } else {
      showToast("Gemas Insuficientes", `Você precisa de mais ${selectedItem.price - gems} gemas para adquirir este artefato.`);
    }
  };

  const filteredItems = filter === "all" ? SHOP_ITEMS : SHOP_ITEMS.filter((item) => item.category === filter);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* Subtle ambient decorative element */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F0E8] text-teal-800 border border-stone-200/80 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span className="text-xs font-bold uppercase tracking-wider">Mercado Oficial Polímata</span>
            </div>
            <h1 className="font-headline-lg text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
              Mercado de Artefatos &amp; Relíquias Polímatas
            </h1>
            <p className="text-stone-600 text-sm leading-relaxed max-w-xl">
              Troque suas gemas de foco por amplificadores cognitivos, proteções de hábito e personalizações exclusivas para sua jornada intelectual.
            </p>
          </div>

          {/* User Balance Display Card */}
          <div className="min-w-[300px] bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase text-stone-500 tracking-wider">Saldo Disponível</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold">
                <span className="material-symbols-outlined text-[13px]">bolt</span> Ativo
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-black text-stone-900">{gems.toLocaleString()}</span>
              <span className="text-sm font-bold text-cyan-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">diamond</span> Gemas de Foco
              </span>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ y: 2 }}
                onClick={() => setIsGemsModalOpen(true)}
                type="button"
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-[0_4px_0_#b45309] flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[17px]">add_circle</span>
                <span>Obter Mais Gemas</span>
              </motion.button>
              <button
                type="button"
                onClick={() => showToast("Histórico de Compras", "Nenhuma compra anterior registrada.")}
                title="Histórico de Compras"
                className="p-2.5 rounded-xl bg-[#F5F0E8] text-stone-600 hover:text-stone-900 border border-stone-200/80 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2.5 py-2">
        <button
          onClick={() => setFilter("all")}
          style={{ backgroundColor: filter === "all" ? "#0D9488" : "#FFFFFF" }}
          className={`box-border px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
            filter === "all"
              ? "text-white shadow-[0_3px_0_#0F766E]"
              : "text-stone-600 hover:bg-stone-50 border border-stone-200/80 shadow-[0_2px_0_#CBD5E1]"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">apps</span>
          <span>Todos os Artefatos</span>
        </button>
        <button
          onClick={() => setFilter("streak")}
          style={{ backgroundColor: filter === "streak" ? "#0D9488" : "#FFFFFF" }}
          className={`box-border px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
            filter === "streak"
              ? "text-white shadow-[0_3px_0_#0F766E]"
              : "text-stone-600 hover:bg-stone-50 border border-stone-200/80 shadow-[0_2px_0_#CBD5E1]"
          }`}
        >
          <span className="material-symbols-outlined text-[17px] text-[#FF5722]">local_fire_department</span>
          <span>Preservação de Hábito</span>
        </button>
        <button
          onClick={() => setFilter("arena")}
          style={{ backgroundColor: filter === "arena" ? "#0D9488" : "#FFFFFF" }}
          className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
            filter === "arena"
              ? "text-white shadow-[0_3px_0_#0F766E]"
              : "text-stone-600 hover:bg-stone-50 border border-stone-200/80 shadow-sm"
          }`}
        >
          <span className="material-symbols-outlined text-[17px] text-pink-600">swords</span>
          <span>Arena Duelo 120s</span>
        </button>
        <button
          onClick={() => setFilter("memory")}
          style={{ backgroundColor: filter === "memory" ? "#0D9488" : "#FFFFFF" }}
          className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
            filter === "memory"
              ? "text-white shadow-[0_3px_0_#0F766E]"
              : "text-stone-600 hover:bg-stone-50 border border-stone-200/80 shadow-sm"
          }`}
        >
          <span className="material-symbols-outlined text-[17px] text-purple-600">auto_awesome</span>
          <span>Palácio da Memória</span>
        </button>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-200/80 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div>
              <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 border border-stone-200/60 shadow-inner flex items-center justify-center">
                <ArtifactIllustration id={item.id} />
                <span
                  className={`absolute top-2.5 left-2.5 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-md z-10 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
                {item.inHand && (
                  <span className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur font-bold text-[11px] text-stone-800 px-2.5 py-0.5 rounded-full border border-stone-200 shadow-md z-10">
                    {item.inHand}
                  </span>
                )}
              </div>

              <h3 className="text-base font-extrabold text-stone-900 mb-1.5 leading-snug">{item.name}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-5 mt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-1 text-cyan-600 font-extrabold text-base">
                <span className="material-symbols-outlined text-[20px]">diamond</span>
                <span>{item.price}</span>
              </div>
              <motion.button
                whileTap={{ y: 2 }}
                onClick={() => setSelectedItem(item)}
                type="button"
                style={{ backgroundColor: "#0D9488" }}
                className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-[0_3px_0_#0F766E] transition-colors"
              >
                Comprar Artefato
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-teal-700 flex items-center justify-center mb-4 border border-cyan-100">
                <span className="material-symbols-outlined text-2xl">{selectedItem.icon}</span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Confirmação de Transação
              </span>
              <h3 className="text-lg font-extrabold text-stone-900 mt-1 mb-2">{selectedItem.name}</h3>
              <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                Deseja trocar suas gemas acumuladas por este artefato cognitivo?
              </p>

              <div className="bg-[#F5F0E8] rounded-xl p-4 mb-6 space-y-2 border border-stone-200/80">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Preço do Item:</span>
                  <span className="font-extrabold text-stone-900">💎 {selectedItem.price} Gemas</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Saldo Atual:</span>
                  <span className="font-extrabold text-cyan-600">{gems} Gemas</span>
                </div>
                <div className="h-px bg-stone-300 my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-stone-800">Saldo Restante:</span>
                  <span
                    className={`font-extrabold ${
                      gems - selectedItem.price < 0 ? "text-red-600" : "text-teal-700"
                    }`}
                  >
                    {gems - selectedItem.price < 0
                      ? `Saldo Insuficiente (${gems - selectedItem.price})`
                      : `💎 ${gems - selectedItem.price} Gemas`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  type="button"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs border border-stone-300 shadow-sm transition-colors"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ y: 2 }}
                  disabled={gems < selectedItem.price}
                  onClick={handlePurchase}
                  type="button"
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-colors ${
                    gems >= selectedItem.price
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-[0_4px_0_#0F766E]"
                      : "bg-stone-200 text-stone-400 cursor-not-allowed"
                  }`}
                >
                  Confirmar Troca
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gem Acquisition Modal */}
      <AnimatePresence>
        {isGemsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                    Recarga de Concentração
                  </span>
                  <h3 className="text-lg font-extrabold text-stone-900 mt-0.5">Obtenha Mais Gemas de Foco</h3>
                </div>
                <button
                  onClick={() => setIsGemsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#F5F0E8] hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                Gemas são obtidas prioritariamente completando metas diárias de 20 minutos ou por pacotes acadêmicos de apoio:
              </p>

              <div className="space-y-3 mb-6">
                <div
                  onClick={() => {
                    setGems(gems + 300);
                    showToast("Recompensa Coletada!", "+300 Gemas foram adicionadas ao seu saldo.");
                    setIsGemsModalOpen(false);
                  }}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#F5F0E8] hover:bg-amber-50 cursor-pointer transition-colors border border-stone-200/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💎</span>
                    <div>
                      <p className="font-bold text-xs text-stone-900">Baú do Aprendiz (300 Gemas)</p>
                      <p className="text-[11px] text-stone-500">Recompensa ao completar 7 dias seguidos de Sessão Diária</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-[10px] font-bold shadow-sm">
                    Coletar Grátis
                  </span>
                </div>

                <div
                  onClick={() => {
                    setGems(gems + 1200);
                    showToast("Cofre Desbloqueado!", "+1.200 Gemas creditadas via Prosa VIP Pass.");
                    setIsGemsModalOpen(false);
                  }}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#F5F0E8] hover:bg-amber-50 cursor-pointer transition-colors border border-stone-200/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✨</span>
                    <div>
                      <p className="font-bold text-xs text-stone-900">Cofre de Polímata (1.200 Gemas)</p>
                      <p className="text-[11px] text-stone-500">Bônus instantâneo para assinantes Prosa VIP Pass</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-bold shadow-sm">
                    Incluso VIP
                  </span>
                </div>
              </div>

              <motion.button
                whileTap={{ y: 2 }}
                onClick={() => {
                  setGems(gems + 50);
                  showToast("Sessão Concluída!", "+50 Gemas adicionadas.");
                  setIsGemsModalOpen(false);
                }}
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-[0_4px_0_#0F766E] transition-colors"
              >
                Concluir Sessão Diária (+50 Gemas)
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Feedback Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-800"
          >
            <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
            <div>
              <p className="font-bold text-xs leading-tight">{toast.title}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{toast.msg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
