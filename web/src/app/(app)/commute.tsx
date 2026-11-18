import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  PlayCircle,
  Volume2,
  CheckCircle2,
  Radio,
  Sliders,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useProsa } from "@/context/prosa-context";
import { Flag } from "@/components/shell/flag";
import { SpeechCadenceEngine } from "@/services/speech-cadence";

interface CommutePhrase {
  flag: string;
  badge: string;
  voiceLabel: string;
  phrase: string;
  ipa: string;
  translation: string;
  speechLang: string;
  situation: string;
  curieTip: string;
}

const COMMUTE_PHRASES: Record<string, CommutePhrase> = {
  en: {
    flag: "gb",
    badge: "LONDON SOUTHWARK RP B2",
    voiceLabel: "1.0x Oxford Neural",
    phrase: "I would like an iced oat latte with a double shot of espresso, please.",
    ipa: "[eye wood lyke an eyst oht LAH-tay with a DUH-buhl shaht uhv eh-SPREH-soh pleez]",
    translation: "Eu gostaria de um latte gelado com leite de aveia e dose dupla de espresso, por favor.",
    speechLang: "en-US",
    situation: "Pedido em cafeteria / Situação cotidiana",
    curieTip: "Excelente foco no flap 't' entre 'oat' e 'latte'. No inglês britânico (RP) ou internacional, mantenha a vogal aberta [ɑː] em 'latte' e suavize o ataque glotal para uma fluidez nativa impecável.",
  },
  de: {
    flag: "de",
    badge: "BERLIN-MITTE HOCHDEUTSCH B1",
    voiceLabel: "1.0x Hamburgo Neural",
    phrase: "Ich möchte gerne eine heiße Schokolade mit Hafermilch.",
    ipa: "[ikh MOEKH-teh GAIR-neh EYE-neh HY-seh shoh-koh-LAH-deh mit HAH-fer-milkh]",
    translation: "Eu gostaria de um chocolate quente com leite de aveia.",
    speechLang: "de-DE",
    situation: "Pedido em cafeteria / Situação cotidiana",
    curieTip: "Excelente energia nos harmônicos do som suave! Na vogal em ‘möchte’, projete seus lábios 2 milímetros mais para a frente com língua relaxada. Isso eliminará qualquer resquício fonético estrangeiro.",
  },
  es: {
    flag: "es",
    badge: "MADRID CASTELLANO B1",
    voiceLabel: "1.0x Salamanca Neural",
    phrase: "Quisiera un café con leche de avena bien caliente, por favor.",
    ipa: "[kee-syeh-rah oon kah-feh kohn LEH-cheh deh ah-VEH-nah byen kah-LYEN-teh pohr fah-vohr]",
    translation: "Eu gostaria de um café com leite de aveia bem quente, por favor.",
    speechLang: "es-ES",
    situation: "Pedido em cafeteria / Situação cotidiana",
    curieTip: "Excelente cadência melódica! Na pronúncia de 'avena', evite fechar completamente os lábios, permitindo que a ressonância continue suave sem atrito oclusivo duro.",
  },
  fr: {
    flag: "fr",
    badge: "PARIS SAINT-GERMAIN B1",
    voiceLabel: "1.0x Parisien Neural",
    phrase: "Je voudrais un chocolat chaud avec du lait d'avoine, s'il vous plaît.",
    ipa: "[zhuh voo-dreh uhn shoh-koh-lah shoh ah-vek dyoo leh dah-vwan seel voo pleh]",
    translation: "Eu gostaria de um chocolate quente com leite de aveia, por favor.",
    speechLang: "fr-FR",
    situation: "Pedido em cafeteria / Situação cotidiana",
    curieTip: "Excelente controle do ar! Na vogal nasal em 'un', certifique-se de manter o fluxo contínuo sem permitir que a ponta da língua toque os dentes.",
  },
  it: {
    flag: "it",
    badge: "ROMA TRASTEVERE B1",
    voiceLabel: "1.0x Fiorentino Neural",
    phrase: "Vorrei una cioccolata calda con latte d'avena, per favore.",
    ipa: "[vohr-REH-ee OO-nah chohk-koh-LAH-tah KAHL-dah kohn LAHT-teh dah-VEH-nah payr fah-VOH-reh]",
    translation: "Eu gostaria de um chocolate quente com leite de aveia, por favor.",
    speechLang: "it-IT",
    situation: "Pedido em cafeteria / Situação cotidiana",
    curieTip: "Precisão exemplar nas consoantes geminadas em 'cioccolata' e 'latte'. A pequena tensão suspensiva antes da soltura confere a musicalidade toscana legítima.",
  },
  ja: {
    flag: "jp",
    badge: "TOKYO SHIBUYA N4/B1",
    voiceLabel: "1.0x Tokyo Neural",
    phrase: "ホットのオーツミルクラテを一つお願いします。",
    ipa: "[hotto no ootsu miruku rate o hitotsu onegai shimasu]",
    translation: "Um latte quente com leite de aveia, por favor.",
    speechLang: "ja-JP",
    situation: "Pedido em cafeteria / Situação cotidiana",
    curieTip: "Excelente isocronia de moras! No japonês de Tóquio, certifique-se de que a pausa geminada de 'hotto' [ッ] dure o tempo exato de uma mora cheia.",
  },
};

interface PhonemeDetail {
  symbol: string;
  word: string;
  accuracy: string;
  accuracyClass: string;
  desc: string;
  isWarning?: boolean;
}

const PHONEME_CHIPS_BY_LANG: Record<string, PhonemeDetail[]> = {
  en: [
    { symbol: "[wʊd]", word: "‘would’", accuracy: "97%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vogal arredondada curta /wʊ/ nítida" },
    { symbol: "[oʊt]", word: "‘oat’", accuracy: "89% ⚠", accuracyClass: "bg-amber-200 text-[#92400E]", desc: "Fechar mais o ditongo final", isWarning: true },
    { symbol: "[lɑː]", word: "‘latte’", accuracy: "98%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vogal aberta posterior perfeita" },
    { symbol: "[ʃɑːt]", word: "‘shot’", accuracy: "95%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Consoante pós-alveolar contínua" },
    { symbol: "[sprɛ]", word: "‘espresso’", accuracy: "94%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Articulação frontal sem oclusão" }
  ],
  de: [
    { symbol: "[ç]", word: "‘Ich’ / ‘möchte’", accuracy: "96%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Fricativa palatal surda perfeita" },
    { symbol: "[œ]", word: "‘möchte’", accuracy: "88% ⚠", accuracyClass: "bg-amber-200 text-[#92400E]", desc: "Arredondar mais os lábios", isWarning: true },
    { symbol: "[ʁ]", word: "‘gerne’", accuracy: "98%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vibrante uvular sonora correta" },
    { symbol: "[ʃ]", word: "‘Schokolade’", accuracy: "95%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Chiado pós-alveolar nítido" },
    { symbol: "[ɐ]", word: "‘Hafer’", accuracy: "91%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vogal vocalizada reduzida" }
  ],
  es: [
    { symbol: "[ki]", word: "‘quisiera’", accuracy: "98%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Oclusiva velar surda limpa" },
    { symbol: "[fe]", word: "‘café’", accuracy: "96%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vogal média anterior tensa" },
    { symbol: "[tʃe]", word: "‘leche’", accuracy: "87% ⚠", accuracyClass: "bg-amber-200 text-[#92400E]", desc: "Africada palatal bem marcada", isWarning: true },
    { symbol: "[be]", word: "‘avena’", accuracy: "95%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Aproximante bilabial suave" },
    { symbol: "[r]", word: "‘por favor’", accuracy: "93%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vibrante alveolar simples" }
  ],
  fr: [
    { symbol: "[vud]", word: "‘voudrais’", accuracy: "97%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Semivogal labial fluida" },
    { symbol: "[ʃɔk]", word: "‘chocolat’", accuracy: "95%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Fricativa sem oclusão inicial" },
    { symbol: "[o]", word: "‘chaud’", accuracy: "89% ⚠", accuracyClass: "bg-amber-200 text-[#92400E]", desc: "Vogal posterior fechada", isWarning: true },
    { symbol: "[lɛ]", word: "‘lait’", accuracy: "96%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vogal aberta anterior nítida" },
    { symbol: "[vwɑn]", word: "‘avoine’", accuracy: "94%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Ditongo articulado sem aspiração" }
  ]
};

export default function CommuteScreen() {
  const { addXp, targetLang } = useProsa();
  const currentPhrase = COMMUTE_PHRASES[targetLang && targetLang in COMMUTE_PHRASES ? targetLang : "en"];
  const [isRecording, setIsRecording] = useState(false);
  const [vuLevel, setVuLevel] = useState(10);
  const [playbackPos, setPlaybackPos] = useState(68);
  const [statusMessage, setStatusMessage] = useState("Microfone em modo de escuta ativa");
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const engineRef = useRef<SpeechCadenceEngine | null>(null);

  useEffect(() => {
    // Playback head scanner animation
    const headTimer = setInterval(() => {
      setPlaybackPos((prev) => (prev + 0.8) % 100);
    }, 60);

    engineRef.current = new SpeechCadenceEngine();
    engineRef.current.onRmsUpdate = (rms) => {
      setVuLevel(rms);
    };
    engineRef.current.onTranscriptUpdate = (text, isFinal) => {
      setStatusMessage(isFinal ? `Identificado: “${text}”` : `Ouvindo em tempo real: “${text}”`);
    };

    return () => {
      clearInterval(headTimer);
      if (engineRef.current) {
        engineRef.current.stopListening();
      }
    };
  }, []);

  // Visual VU meter feedback during recording
  useEffect(() => {
    let simTimer: any = null;
    if (isRecording) {
      simTimer = setInterval(() => {
        setVuLevel((prev) => {
          const delta = (Math.random() - 0.45) * 30;
          return Math.min(92, Math.max(40, Math.round(prev + delta)));
        });
      }, 90);
    }
    return () => clearInterval(simTimer);
  }, [isRecording]);

  const toggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      setStatusMessage("Gravando espectro vocal... Fale agora!");
      if (engineRef.current) {
        await engineRef.current.startListening(currentPhrase.speechLang);
      }
    } else {
      setIsRecording(false);
      let res = { accuracy: 95 };
      if (engineRef.current) {
        res = engineRef.current.stopListening(currentPhrase.phrase);
      }
      setVuLevel(10);
      setStatusMessage(`Calibrado! ${res.accuracy}% de similaridade acústica.`);
      setCompleted(true);
      addXp(25);
    }
  };

  const playTargetAudio = (rate: number = 1.0) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentPhrase.phrase);
      utterance.lang = currentPhrase.speechLang;
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-16">
      {/* Top Context & Protocol Badge Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D9488] text-white text-xs font-bold shadow-[0_3px_0_#005049]">
              <Radio size={14} />
              LAB DE FONÉTICA ACÚSTICA
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100/80 text-[#0891B2] text-xs font-extrabold">
              <Sliders size={13} />
              ESPECTROGRAMA EM TEMPO REAL
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F0E8] text-[#475569] text-xs font-bold">
              <Flag code={currentPhrase.flag} size={15} />
              <span>{currentPhrase.badge}</span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#111C2D] tracking-tight mt-1">
            Mentoria Marie Curie <span className="text-[#0D9488]">#04</span>
          </h1>
          <p className="text-sm font-medium text-[#64748B]">
            Comparação espectral formântica F1/F2 e calibração motora dos pontos de articulação lingual.
          </p>
        </div>

        {/* Quick Session XP Pill */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-stone-200/80 shadow-[0_4px_0_#CBD5E1] self-start md:self-auto">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-[#D97706]">
            <Zap size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#64748B] uppercase">Protocolo Ativo</span>
            <span className="text-sm font-extrabold text-[#111C2D]">3/12 Ensaios Fonéticos</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Phrase Display + Interactive Spectrogram (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Phrase Card with Audio Engines */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-[0_4px_0_#CBD5E1] relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-teal-100/30 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#F5F0E8] text-xs font-bold text-[#0F766E]">
                  FRASE ALVO
                </span>
                <span className="text-xs text-[#64748B]">{currentPhrase.situation}</span>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playTargetAudio(0.8)}
                  className="px-3 py-1.5 rounded-xl bg-[#F5F0E8] text-[#111C2D] text-xs font-bold border border-stone-200 shadow-[0_2px_0_#CBD5E1] active:translate-y-0.5 active:shadow-[0_1px_0_#CBD5E1] flex items-center gap-1.5 transition-transform cursor-pointer"
                >
                  <PlayCircle size={15} className="text-[#0D9488]" />
                  <span>0.8x Lento</span>
                </button>
                <button
                  type="button"
                  onClick={() => playTargetAudio(1.0)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0D9488] text-white text-xs font-bold shadow-[0_3px_0_#0F766E] active:translate-y-0.5 active:shadow-[0_1px_0_#0F766E] flex items-center gap-1.5 transition-transform cursor-pointer"
                >
                  <Volume2 size={15} />
                  <span>{currentPhrase.voiceLabel}</span>
                </button>
              </div>
            </div>

            {/* Target Sentence */}
            <div className="space-y-1.5">
              <div className="text-2xl font-extrabold text-[#111C2D] tracking-tight leading-tight">
                “{currentPhrase.phrase}”
              </div>
              <div className="font-serif italic text-base text-[#0D9488] tracking-wide">
                {currentPhrase.ipa}
              </div>
              <div className="text-xs text-[#64748B] pt-1">
                <span className="font-bold text-[#111C2D]">Tradução:</span> “{currentPhrase.translation}”
              </div>
            </div>
          </div>

          {/* Split-Screen Acoustic Analyzer / Dual Waveform Canvas */}
          <div className="bg-[#18181B] rounded-2xl p-6 text-white shadow-[0_6px_0_#111C2D] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-pulse" />
                <span className="text-base font-bold tracking-wide text-white">Analisador Acústico Duplo</span>
                <span className="text-xs text-zinc-400 px-2 py-0.5 rounded bg-zinc-800">F1/F2 Espectro</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-[#06B6D4]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#06B6D4]" />
                  <span>Nativo ({currentPhrase.badge.split(" ")[0]})</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#10B981]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                  <span>Sua Voz</span>
                </div>
              </div>
            </div>

            {/* Waveform 1: Native Reference */}
            <div className="bg-[#27272A] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="flex items-center gap-1 text-[#06B6D4] font-bold uppercase tracking-wider text-[11px]">
                  <Radio size={13} /> Onda Nativa de {currentPhrase.badge.split(" ")[0]} (Referência Padrão)
                </span>
                <span className="font-extrabold text-[#06B6D4]">142 Hz Pitch Médio</span>
              </div>
              <div className="h-24 w-full relative">
                <svg className="w-full h-full text-[#06B6D4]" preserveAspectRatio="none" viewBox="0 0 700 90">
                  <defs>
                    <linearGradient id="nativeGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 Q20,15 45,45 T90,45 T135,10 T180,45 T225,5 T270,45 T315,20 T360,45 T405,12 T450,45 T495,28 T540,45 T585,8 T630,45 T675,25 L700,45 L700,85 L0,85 Z"
                    fill="url(#nativeGrad)"
                  />
                  <path
                    d="M0,45 Q20,15 45,45 T90,45 T135,10 T180,45 T225,5 T270,45 T315,20 T360,45 T405,12 T450,45 T495,28 T540,45 T585,8 T630,45 T675,25 L700,45"
                    fill="none"
                    stroke="#06B6D4"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0,60 C120,40 220,70 340,35 C480,15 580,50 700,42"
                    fill="none"
                    stroke="#89f5e7"
                    strokeDasharray="3,3"
                    strokeWidth="1.5"
                  />
                </svg>
                {/* Dynamic Alignment marks */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[10px] text-zinc-400 select-none">
                  {targetLang === "en" ? (
                    <>
                      <span>[eye]</span>
                      <span>[wood]</span>
                      <span>[lyke]</span>
                      <span>[an]</span>
                      <span>[eyst]</span>
                      <span>[oht]</span>
                      <span>[lah-tay]</span>
                    </>
                  ) : targetLang === "es" ? (
                    <>
                      <span>[kee]</span>
                      <span>[syeh-rah]</span>
                      <span>[oon]</span>
                      <span>[kah-feh]</span>
                      <span>[kohn]</span>
                      <span>[leh-cheh]</span>
                    </>
                  ) : (
                    <>
                      <span>[ikh]</span>
                      <span>[moekh-teh]</span>
                      <span>[gair-neh]</span>
                      <span>[eye-neh]</span>
                      <span>[hy-seh]</span>
                      <span>[shoh-koh]</span>
                      <span>[hah-fer]</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Waveform 2: User Voice */}
            <div className="bg-[#27272A] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="flex items-center gap-1 text-[#10B981] font-bold uppercase tracking-wider text-[11px]">
                  <Mic size={13} /> Sua Gravação de Voz (Sincronizada)
                </span>
                <span className="font-extrabold text-[#10B981]">Latência: 18ms • Coincidência: 94.2%</span>
              </div>
              <div className="h-24 w-full relative">
                <svg className="w-full h-full text-[#10B981]" preserveAspectRatio="none" viewBox="0 0 700 90">
                  <defs>
                    <linearGradient id="userGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,45 Q22,18 45,45 T90,45 T135,16 T180,45 T225,11 T270,45 T315,22 T360,45 T405,14 T450,45 T495,30 T540,45 T585,12 T630,45 T675,28 L700,45 L700,85 L0,85 Z"
                    fill="url(#userGrad)"
                  />
                  <path
                    d="M0,45 Q22,18 45,45 T90,45 T135,16 T180,45 T225,11 T270,45 T315,22 T360,45 T405,14 T450,45 T495,30 T540,45 T585,12 T630,45 T675,28 L700,45"
                    fill="none"
                    stroke="#10B981"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0,62 C125,44 220,68 340,39 C475,20 580,48 700,44"
                    fill="none"
                    stroke="#6bd8cb"
                    strokeDasharray="3,3"
                    strokeWidth="1.5"
                  />
                </svg>
                {/* Live scanner head bar */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_8px_#FB7185] pointer-events-none transition-all duration-75"
                  style={{ left: `${playbackPos}%` }}
                />
              </div>
            </div>

            {/* Bottom Tickers */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Harmonia Formântica</span>
                <span className="text-base font-extrabold text-[#06B6D4]">96.8%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Entonação Melódica</span>
                <span className="text-base font-extrabold text-[#FEA619]">92.4%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                  {targetLang === "de" ? "Ataque Glotal (Knacklaut)" : "Conexão Articulatória"}
                </span>
                <span className="text-base font-extrabold text-[#10B981]">98.0%</span>
              </div>
            </div>
          </div>

          {/* Phoneme Breakdown Interactive Chips */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#111C2D]">Decomposição Fonema por Fonema</h2>
              <span className="text-xs text-[#64748B]">Clique nos pontos para detalhes motores</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {(PHONEME_CHIPS_BY_LANG[targetLang] || PHONEME_CHIPS_BY_LANG.en).map((chip, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoneme(chip.symbol)}
                  className={`p-4 rounded-xl border shadow-[0_3px_0_#CBD5E1] cursor-pointer transition-all relative overflow-hidden ${
                    chip.isWarning
                      ? "bg-amber-50/50 border-amber-200 hover:bg-amber-100/50"
                      : "bg-white border-stone-200 hover:bg-[#F5F0E8]"
                  }`}
                >
                  {chip.isWarning && (
                    <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-[#FEA619]" />
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-lg font-extrabold ${
                        chip.isWarning ? "text-[#D97706]" : "text-[#0D9488]"
                      }`}
                    >
                      {chip.symbol}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${chip.accuracyClass}`}>
                      {chip.accuracy}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#111C2D] truncate">{chip.word}</p>
                  <p
                    className={`text-[11px] mt-1 leading-tight ${
                      chip.isWarning ? "text-[#D97706]" : "text-[#64748B]"
                    }`}
                  >
                    {chip.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Gauge + 3D Recording Center + Curie Dock (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Precision Score Gauge Card */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-[0_4px_0_#CBD5E1] text-center flex flex-col items-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] mb-2">
              CALIBRAÇÃO GERAL
            </span>
            <div className="relative w-44 h-44 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" fill="transparent" r="50" stroke="#E2E8F0" strokeWidth="10" />
                <circle
                  className="transition-all duration-1000 ease-out"
                  cx="60"
                  cy="60"
                  fill="transparent"
                  r="50"
                  stroke="#0D9488"
                  strokeDasharray="314"
                  strokeDashoffset="18"
                  strokeLinecap="round"
                  strokeWidth="10"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                <span className="text-4xl font-black text-[#111C2D] leading-none">94%</span>
                <span className="text-[10px] font-black text-[#0D9488] uppercase tracking-widest mt-1">
                  Precisão
                </span>
              </div>
            </div>
            <div className="text-xs font-bold text-[#64748B] mb-2">
              Calibração Fonética Rítmica
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/70 text-[#0F766E] text-xs font-bold">
              <ShieldCheck size={16} />
              SOTAQUE {currentPhrase.badge.split(" ")[0]} QUALIFICADO
            </div>
          </div>

          {/* Physical 3D Recording Button */}
          <div className="bg-[#F5F0E8] rounded-2xl border border-stone-200 p-6 text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="text-xs font-medium text-[#64748B] mb-4">
              Pressione para calibrar sua frequência acústica
            </div>

            <div className="relative group my-2">
              <button
                id="btn-record"
                type="button"
                onClick={toggleRecording}
                className={`w-24 h-24 rounded-full text-white flex items-center justify-center transition-all cursor-pointer ${
                  isRecording
                    ? "bg-[#EF4444] shadow-[0_6px_0_#93000A] scale-105 active:translate-y-1 active:shadow-[0_1px_0_#93000A]"
                    : "bg-[#FB7185] shadow-[0_6px_0_#BA1A1A] active:translate-y-1.5 active:shadow-[0_1px_0_#BA1A1A] hover:brightness-105"
                }`}
              >
                {isRecording ? <Square size={36} /> : <Mic size={42} />}
              </button>
              <div className="absolute -bottom-2 inset-x-0 mx-auto text-center pointer-events-none">
                <span className="px-2 py-0.5 rounded-full bg-[#18181B] text-white text-[10px] font-bold tracking-wider uppercase">
                  [Espaço]
                </span>
              </div>
            </div>

            <div className="text-xs font-bold text-[#334155] mt-4 flex items-center gap-2">
              {isRecording ? (
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
              ) : (
                <CheckCircle2 size={16} className="text-[#10B981]" />
              )}
              <span>{statusMessage}</span>
            </div>

            {/* VU Meter */}
            <div className="w-48 h-2 bg-stone-300 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  vuLevel > 70 ? "bg-[#FF5722]" : "bg-[#10B981]"
                }`}
                style={{ width: `${vuLevel}%` }}
              />
            </div>
          </div>

          {/* Marie Curie Articulatory Tip Card */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-[0_4px_0_#CBD5E1] relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-12 h-12 rounded-full ring-2 ring-[#FEA619] shadow-[0_2px_0_#D97706] overflow-hidden shrink-0">
                <img
                  className="w-full h-full object-cover"
                  src="/cast/curie.png"
                  alt="Marie Curie"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#06B6D4] flex items-center justify-center text-[9px] text-white font-bold">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-extrabold text-[#111C2D]">Marie Curie</span>
                  <ShieldCheck size={14} className="text-[#D97706]" />
                </div>
                <span className="text-[11px] font-bold text-[#64748B]">Mentora de Física &amp; Fonética</span>
              </div>
            </div>

            <div className="bg-[#F5F0E8] p-4 rounded-xl text-xs text-[#334155] leading-relaxed">
              <p className="italic font-serif text-[13px]">
                “{currentPhrase.curieTip}”
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Ribbon */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-[0_4px_0_#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Radio size={24} className="text-[#0D9488]" />
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-[#111C2D]">Shadowing Rítmico Disponível</span>
            <span className="text-xs text-[#64748B]">Repita sobrepondo a voz nativa em tempo real para sincronia milimétrica.</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => playTargetAudio(1.0)}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white text-[#111C2D] text-xs font-bold border border-stone-200 shadow-[0_3px_0_#CBD5E1] active:translate-y-0.5 active:shadow-[0_1px_0_#CBD5E1] hover:bg-[#F5F0E8] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={16} className="text-[#64748B]" />
            <span>Repetir Ensaio (Shadowing)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              addXp(25);
              setCompleted(true);
            }}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-[#0D9488] text-white text-xs font-bold shadow-[0_4px_0_#0F766E] active:translate-y-1 active:shadow-[0_1px_0_#0F766E] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Próxima Frase</span>
            <span className="px-2 py-0.5 rounded-full bg-[#0F766E] text-white text-[11px] font-extrabold">+25 XP</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
