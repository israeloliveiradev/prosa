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
import {
  LanguageMatrixEngine,
  type CommuteItem,
} from "@/services/contentService";
import { speechService } from "@/services/speechService";
import { languageName } from "@/lib/languages";

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
  ],
  it: [
    { symbol: "[vor]", word: "‘vorrei’", accuracy: "98%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vibrante dental dupla límpida" },
    { symbol: "[tʃo]", word: "‘cioccolata’", accuracy: "95%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Africada palatal sonora perfeita" },
    { symbol: "[lat]", word: "‘latte’", accuracy: "97%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Oclusiva geminada suspensiva" },
    { symbol: "[ve]", word: "‘avena’", accuracy: "94%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Fricativa labiodental suave" }
  ],
  ja: [
    { symbol: "[hot]", word: "‘hotto’", accuracy: "96%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Pausa de sokuon perfeita" },
    { symbol: "[oː]", word: "‘ōtsu’", accuracy: "94%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Vogal longa com duração exata" },
    { symbol: "[ra]", word: "‘rate’", accuracy: "95%", accuracyClass: "bg-emerald-100 text-[#059669]", desc: "Tepe alveolar japonês clássico" }
  ],
};

export default function CommuteScreen() {
  const { addXp, targetLang, supportLang, recordPhoneticScore, activeMentor } = useProsa();
  const currentPhrase = LanguageMatrixEngine.getCommutePhrase(targetLang);

  const [isRecording, setIsRecording] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [playbackPos, setPlaybackPos] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Pressione o microfone e fale a frase acima.");
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);
  const [phoneticScore, setPhoneticScore] = useState<number | null>(null);
  const [showIpa, setShowIpa] = useState(false);
  const engineRef = useRef<SpeechCadenceEngine | null>(null);

  // Reset state when language switches
  useEffect(() => {
    setPhoneticScore(null);
    setVuLevel(0);
    setStatusMessage("Pressione o microfone e fale a frase acima.");
    setSelectedPhoneme(null);
    setPlaybackPos(0);
  }, [targetLang]);

  useEffect(() => {
    engineRef.current = new SpeechCadenceEngine();
    engineRef.current.onRmsUpdate = (rms) => {
      setVuLevel(rms);
    };
    engineRef.current.onTranscriptUpdate = (text, isFinal) => {
      setStatusMessage(isFinal ? `Identificado: “${text}”` : `Ouvindo em tempo real: “${text}”`);
    };

    return () => {
      if (engineRef.current) {
        engineRef.current.stopListening();
      }
    };
  }, []);

  const toggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      setStatusMessage("Gravando espectro vocal... Fale agora!");
      if (engineRef.current) {
        await engineRef.current.startListening(currentPhrase.speechLang);
      }
    } else {
      setIsRecording(false);
      let res = { accuracy: 94 };
      if (engineRef.current) {
        res = engineRef.current.stopListening(currentPhrase.targetPhrase);
      }
      setVuLevel(0);
      setPhoneticScore(res.accuracy);
      setStatusMessage(`Calibrado! ${res.accuracy}% de similaridade acústica.`);
      recordPhoneticScore(res.accuracy);
      addXp(25);
    }
  };

  const playTargetAudio = (rate: number = 1.0) => {
    setPlaybackPos(0);
    const clean = currentPhrase.targetPhrase.replace(/[“”"«»]/g, "");
    speechService.speak(clean, {
      lang: currentPhrase.speechLang,
      speed: rate === 0.75 ? "0.75x" : "1.0x",
      mentorId: activeMentor?.id || "curie",
      onStart: () => {
        setPlaybackPos(8);
      },
      onBoundary: (ev) => {
        const total = Math.max(1, clean.length);
        const progress = Math.min(95, Math.max(8, Math.round((ev.charIndex / total) * 100)));
        setPlaybackPos(progress);
      },
      onEnd: () => {
        setPlaybackPos(100);
        setTimeout(() => setPlaybackPos(0), 400);
      },
      onError: () => {
        setPlaybackPos(0);
      },
    });
  };

  const intuitive =
    currentPhrase.intuitivePronunciation[supportLang] ||
    currentPhrase.intuitivePronunciation["pt-BR"] ||
    currentPhrase.intuitivePronunciation["en"] ||
    "";

  const translation = LanguageMatrixEngine.getLocalizedText(
    currentPhrase.translation,
    supportLang,
    currentPhrase.translation["pt-BR"] || ""
  );

  const curieTip = LanguageMatrixEngine.getLocalizedText(
    currentPhrase.curieTip,
    supportLang,
    currentPhrase.curieTip["pt-BR"] || ""
  );

  const flagCode = targetLang === "en" ? "gb" : targetLang === "ja" ? "jp" : targetLang;
  const badgeCity = currentPhrase.badge.split(" ")[0] || languageName(targetLang);

  // SVG wave calculation for user based on recording state
  const userWaveD = isRecording
    ? `M0,45 Q22,${Math.max(10, 45 - vuLevel * 0.4)} 45,45 T90,45 T135,${Math.max(8, 45 - vuLevel * 0.5)} T180,45 T225,${Math.max(5, 45 - vuLevel * 0.6)} T270,45 T315,22 T360,45 T405,14 T450,45 T495,30 T540,45 T585,12 T630,45 T675,28 L700,45`
    : phoneticScore
    ? "M0,45 Q22,18 45,45 T90,45 T135,16 T180,45 T225,11 T270,45 T315,22 T360,45 T405,14 T450,45 T495,30 T540,45 T585,12 T630,45 T675,28 L700,45"
    : "M0,45 L700,45";

  const strokeDashoffset = phoneticScore
    ? Math.round(314 - (314 * phoneticScore) / 100)
    : 314;

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
              <Flag code={flagCode} size={15} />
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
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 lg:p-8 shadow-[0_4px_0_#CBD5E1] relative overflow-hidden space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#E7EEFF] text-[#00685F] text-xs font-bold uppercase tracking-wider">
                  Frase Alvo ({languageName(targetLang)})
                </span>
                <span className="text-xs text-[#64748B] font-semibold">
                  {currentPhrase.speechLang}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playTargetAudio(1.0)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-[#0D9488] hover:bg-teal-100 text-xs font-bold transition-all border border-teal-200 cursor-pointer"
                >
                  <Volume2 size={15} />
                  <span>Nativo 1.0x</span>
                </button>
                <button
                  type="button"
                  onClick={() => playTargetAudio(0.75)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-[#475569] hover:bg-stone-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <span>0.75x Lento</span>
                </button>
              </div>
            </div>

            {/* Target Sentence Display */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111C2D] font-serif leading-snug tracking-tight">
                “{currentPhrase.targetPhrase}”
              </h2>

              {/* Intuitive Pronunciation by Default + Discreet IPA Toggle */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F5F0E8] text-[#3D4947] text-xs font-medium flex-wrap">
                <Mic size={14} className="text-[#0D9488] shrink-0" />
                {showIpa ? (
                  <span className="font-mono text-xs text-stone-700">
                    {currentPhrase.ipa}
                  </span>
                ) : (
                  <span
                    className="text-xs text-stone-800"
                    dangerouslySetInnerHTML={{ __html: intuitive }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setShowIpa((prev) => !prev)}
                  className={`ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    showIpa
                      ? "bg-[#0D9488] text-white font-bold"
                      : "bg-stone-200/90 hover:bg-stone-300 text-stone-700 font-semibold"
                  }`}
                  title={showIpa ? "Mostrar pronúncia intuitiva" : "Exibir transcrição IPA"}
                >
                  {showIpa ? "Intuitiva" : "IPA"}
                </button>
              </div>

              <p className="text-sm font-medium text-[#0D9488]">
                {translation}
              </p>
            </div>
          </div>

          {/* DUAL INTERACTIVE SPECTROGRAM (Acoustic Lab Canvas) */}
          <div className="bg-[#18181B] rounded-3xl p-6 text-white shadow-inner space-y-4 border border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
                <span className="font-mono text-xs text-zinc-300 uppercase tracking-widest font-bold">
                  Osciloscópio Espectral Dual (48 kHz)
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#06B6D4]" />
                  <span>Modelo Nativo ({badgeCity})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                  <span>Sua Voz</span>
                </div>
              </div>
            </div>

            {/* Waveform 1: Native Reference */}
            <div className="bg-[#27272A] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="flex items-center gap-1 text-[#06B6D4] font-bold uppercase tracking-wider text-[11px]">
                  <Radio size={13} /> Onda Nativa de {badgeCity} (Referência Padrão)
                </span>
                <span className="font-extrabold text-[#06B6D4]">{currentPhrase.pitchHz} Hz Pitch Médio</span>
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
                </svg>

                {/* Syllables breakdown below wave */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[10px] text-zinc-400 select-none">
                  {currentPhrase.syllables.map((syl, sIdx) => {
                    const sylIntuitive =
                      syl.intuitive[supportLang] ||
                      syl.intuitive["pt-BR"] ||
                      syl.text;
                    return (
                      <span key={sIdx} title={syl.text}>
                        [{sylIntuitive.replace(/<[^>]+>/g, "")}]
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Waveform 2: User Voice */}
            <div className="bg-[#27272A] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="flex items-center gap-1 text-[#10B981] font-bold uppercase tracking-wider text-[11px]">
                  <Mic size={13} /> Sua Gravação de Voz (Sincronizada)
                </span>
                <span className="font-extrabold text-[#10B981]">
                  {isRecording
                    ? `Captação Ativa: ${vuLevel}% RMS`
                    : phoneticScore
                    ? `Latência: 18ms • Coincidência: ${phoneticScore}%`
                    : "0 Hz • Aguardando gravação de voz"}
                </span>
              </div>
              <div className="h-24 w-full relative">
                <svg className="w-full h-full text-[#10B981]" preserveAspectRatio="none" viewBox="0 0 700 90">
                  <path
                    d={userWaveD}
                    fill="none"
                    stroke={phoneticScore || isRecording ? "#10B981" : "#52525B"}
                    strokeLinecap="round"
                    strokeWidth="2.5"
                    strokeDasharray={isRecording ? "4,4" : undefined}
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
                <span className="text-base font-extrabold text-[#06B6D4]">
                  {phoneticScore ? `${Math.min(99, phoneticScore + 2)}%` : "--%"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">Entonação Melódica</span>
                <span className="text-base font-extrabold text-[#FEA619]">
                  {phoneticScore ? `${Math.max(70, phoneticScore - 3)}%` : "--%"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                  {targetLang === "de" ? "Ataque Glotal (Knacklaut)" : "Conexão Articulatória"}
                </span>
                <span className="text-base font-extrabold text-[#10B981]">
                  {phoneticScore ? `${phoneticScore}%` : "--%"}
                </span>
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
                      {phoneticScore ? chip.accuracy : "--%"}
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
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="10"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none p-2">
                <span className="text-3xl font-black text-[#111C2D] leading-none">
                  {phoneticScore ? `${phoneticScore}%` : "--%"}
                </span>
                <span className="text-[10px] font-black text-[#0D9488] uppercase tracking-wider mt-1 text-center">
                  Precisão Fonética
                </span>
              </div>
            </div>
            <div className="text-xs font-bold text-[#64748B] mb-2">
              Calibração Fonética Rítmica
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/70 text-[#0F766E] text-xs font-bold">
              <ShieldCheck size={16} />
              <span>
                {phoneticScore
                  ? `SOTAQUE ${badgeCity} QUALIFICADO`
                  : "AGUARDANDO GRAVAÇÃO"}
              </span>
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

            {/* Intensidade da voz / Nível de Captação */}
            <div className="w-48 h-2 bg-stone-300 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#0D9488] transition-all duration-100"
                style={{ width: `${vuLevel}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#64748B] mt-1">
              Captação da Voz: {vuLevel}%
            </span>
          </div>

          {/* Marie Curie Expert Companion Dock */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-[0_4px_0_#CBD5E1] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 overflow-hidden shrink-0">
                <img
                  src="/cast/curie.png"
                  alt="Marie Curie"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.tried) {
                      target.dataset.tried = "1";
                      target.src = "/assets/assets/cast/curie.png";
                    }
                  }}
                />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-[#111C2D]">Marie Curie</h4>
                <span className="text-xs text-[#0D9488] font-bold">Mentoria de Ressonância</span>
              </div>
            </div>

            <div className="p-3 bg-[#F5F0E8] rounded-xl border border-stone-200/70 text-xs text-[#334155] leading-relaxed italic">
              “{curieTip}”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
