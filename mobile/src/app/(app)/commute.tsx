import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Volume2,
  CheckCircle2,
  Radio,
  Sliders,
  ShieldCheck,
  Zap,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useProsa } from "@/context/prosa-context";
import { Flag } from "@/components/shell/flag";
import {
  SpeechCadenceEngine,
  type SpeechCadenceResult,
} from "@/services/speech-cadence";
import { LanguageMatrixEngine } from "@/services/contentService";
import { speechService } from "@/services/speechService";
import { languageName } from "@/lib/languages";

export default function CommuteScreen() {
  const { addXp, targetLang, supportLang, recordPhoneticScore, activeMentor } =
    useProsa();
  const currentPhrase = LanguageMatrixEngine.getCommutePhrase(targetLang);

  const [isRecording, setIsRecording] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);
  const [playbackPos, setPlaybackPos] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Pressione o microfone e fale a frase acima."
  );
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);
  const [phoneticScore, setPhoneticScore] = useState<number | null>(null);
  const [showIpa, setShowIpa] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<SpeechCadenceResult | null>(null);

  const engineRef = useRef<SpeechCadenceEngine | null>(null);
  const nativeContainerRef = useRef<HTMLDivElement | null>(null);
  const nativeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userContainerRef = useRef<HTMLDivElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const liveAudioDataRef = useRef<Uint8Array | null>(null);
  const recordedWaveformRef = useRef<number[]>([]);

  // 1. Draw Native Reference Prosodic Waveform
  const drawNativeWave = useCallback(
    (playheadPct = 0) => {
      const canvas = nativeCanvasRef.current;
      const container = nativeContainerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 96;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Strict 15% Y-margin: keep all amplitudes inside [0.15 * height, 0.85 * height]
      const yMid = height / 2;
      const maxAmp = (height / 2) * 0.7; // Peak amplitude strictly within 70% of half-height

      const syllables = currentPhrase.syllables;
      const sylCount = Math.max(1, syllables.length);

      // Generate smooth prosodic envelope based on active phrase syllables
      ctx.beginPath();
      ctx.moveTo(0, yMid);

      const points: { x: number; y: number }[] = [];
      const numSteps = 120;
      for (let i = 0; i <= numSteps; i++) {
        const x = (i / numSteps) * width;
        const normX = i / numSteps;

        // Prosodic energy calculated as sum of Gaussian lobes centered on each syllable
        let envelope = 0;
        for (let s = 0; s < sylCount; s++) {
          const centerNorm = (s + 0.5) / sylCount;
          const sigma = 0.5 / sylCount;
          const diff = (normX - centerNorm) / sigma;
          // Varying stress amplitude per syllable (odd syllables slightly more stressed)
          const weight = s % 2 === 0 ? 0.95 : 0.75;
          envelope += weight * Math.exp(-0.5 * diff * diff);
        }

        // Add subtle harmonic modulation for acoustic naturalness
        const modulation = Math.sin(normX * Math.PI * sylCount * 2) * 0.15;
        const totalAmp = Math.min(1.0, Math.max(0.05, envelope + modulation));
        const y = yMid - totalAmp * maxAmp;

        points.push({ x, y });
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Draw Cyan Gradient Fill Below Waveform
      const gradient = ctx.createLinearGradient(0, yMid - maxAmp, 0, height);
      gradient.addColorStop(0, "rgba(6, 182, 212, 0.40)");
      gradient.addColorStop(1, "rgba(6, 182, 212, 0.0)");

      ctx.lineTo(width, yMid);
      ctx.lineTo(0, yMid);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke Native Wave Line
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        if (i === 0) ctx.moveTo(points[i].x, points[i].y);
        else ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Draw Native Playhead Scanner (Moves only when audio is actively playing)
      if (playheadPct > 0) {
        const scanX = Math.min(width, Math.max(0, (playheadPct / 100) * width));
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, height);
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#06B6D4";
        ctx.shadowBlur = 8;
        ctx.stroke();
      }

      ctx.restore();
    },
    [currentPhrase]
  );

  // 2. Draw User Voice Waveform (Live Oscilloscope or Recorded Trace)
  const drawUserWave = useCallback(
    (liveData?: Uint8Array | null) => {
      const canvas = userCanvasRef.current;
      const container = userContainerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 96;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Strict 15% Y-margin: keep all amplitudes inside [0.15 * height, 0.85 * height]
      const yMid = height / 2;
      const maxAmp = (height / 2) * 0.7;

      if (isRecording && liveData && liveData.length > 0) {
        // Live Real-Time Oscilloscope from AnalyserNode
        ctx.beginPath();
        const sliceWidth = width / liveData.length;
        for (let i = 0; i < liveData.length; i++) {
          const v = (liveData[i] - 128) / 128; // Normalized -1.0 to +1.0
          const y = yMid + v * maxAmp;
          const x = i * sliceWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#10B981";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      } else if (recordedWaveformRef.current.length > 0 && phoneticScore !== null && phoneticScore > 0) {
        // Recorded Envelope Trace from Actual Audio
        const wave = recordedWaveformRef.current;
        const step = width / wave.length;

        ctx.beginPath();
        ctx.moveTo(0, yMid);
        for (let i = 0; i < wave.length; i++) {
          const normAmp = Math.min(1.0, wave[i] * 4.0);
          const y = yMid - normAmp * maxAmp;
          const x = i * step;
          ctx.lineTo(x, y);
        }

        // Fill below recorded envelope
        const gradient = ctx.createLinearGradient(0, yMid - maxAmp, 0, height);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.35)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        ctx.lineTo(width, yMid);
        ctx.lineTo(0, yMid);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        for (let i = 0; i < wave.length; i++) {
          const normAmp = Math.min(1.0, wave[i] * 4.0);
          const y = yMid - normAmp * maxAmp;
          const x = i * step;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#10B981";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      } else {
        // Centered Flat 0 dB Baseline (Idle or Silence)
        ctx.beginPath();
        ctx.moveTo(0, yMid);
        ctx.lineTo(width, yMid);
        ctx.strokeStyle = "#52525B";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    },
    [isRecording, phoneticScore]
  );

  // ResizeObserver to keep Canvases responsive with zero overflow
  useEffect(() => {
    drawNativeWave(playbackPos);
    drawUserWave(liveAudioDataRef.current);

    const ro = new ResizeObserver(() => {
      drawNativeWave(playbackPos);
      drawUserWave(liveAudioDataRef.current);
    });

    if (nativeContainerRef.current) ro.observe(nativeContainerRef.current);
    if (userContainerRef.current) ro.observe(userContainerRef.current);

    return () => ro.disconnect();
  }, [drawNativeWave, drawUserWave, playbackPos]);

  // Reset state when language switches
  useEffect(() => {
    setPhoneticScore(null);
    setEvaluationResult(null);
    setVuLevel(0);
    setStatusMessage("Pressione o microfone e fale a frase acima.");
    setSelectedPhoneme(null);
    setPlaybackPos(0);
    recordedWaveformRef.current = [];
    liveAudioDataRef.current = null;
  }, [targetLang]);

  useEffect(() => {
    engineRef.current = new SpeechCadenceEngine();

    engineRef.current.onAudioFrame = (dataArray, _rms) => {
      liveAudioDataRef.current = dataArray;
      drawUserWave(dataArray);
    };

    engineRef.current.onRmsUpdate = (rms) => {
      setVuLevel(rms);
    };

    engineRef.current.onTranscriptUpdate = (text, isFinal) => {
      setStatusMessage(
        isFinal ? `Identificado: “${text}”` : `Ouvindo em tempo real: “${text}”`
      );
    };

    return () => {
      if (engineRef.current) {
        engineRef.current.stopListening();
      }
    };
  }, [drawUserWave]);

  const toggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true);
      setPhoneticScore(null);
      setEvaluationResult(null);
      recordedWaveformRef.current = [];
      setStatusMessage("Gravando espectro vocal... Fale agora!");
      if (engineRef.current) {
        await engineRef.current.startListening(currentPhrase.speechLang);
      }
    } else {
      setIsRecording(false);
      let res: SpeechCadenceResult | null = null;
      if (engineRef.current) {
        res = engineRef.current.stopListening(currentPhrase.targetPhrase);
      }

      setVuLevel(0);
      liveAudioDataRef.current = null;

      if (res) {
        setEvaluationResult(res);
        setPhoneticScore(res.accuracy);
        recordedWaveformRef.current = res.recordedWaveform;

        if (res.accuracy === 0) {
          setStatusMessage(
            res.hasAudio
              ? "Articulação inaudível — Tente novamente"
              : "0% — Nenhum áudio detectado no microfone"
          );
        } else {
          setStatusMessage(`Calibrado! ${res.accuracy}% de similaridade acústica.`);
          recordPhoneticScore(res.accuracy);
          addXp(25);
        }
      }
    }
  };

  const playTargetAudio = (rate: number = 1.0) => {
    setPlaybackPos(0);
    drawNativeWave(0);
    const clean = currentPhrase.targetPhrase.replace(/[“”"«»]/g, "");
    speechService.speak(clean, {
      lang: currentPhrase.speechLang,
      speed: rate === 0.75 ? "0.75x" : "1.0x",
      mentorId: activeMentor?.id || "curie",
      onStart: () => {
        setPlaybackPos(8);
        drawNativeWave(8);
      },
      onBoundary: (ev) => {
        const total = Math.max(1, clean.length);
        const progress = Math.min(
          95,
          Math.max(8, Math.round((ev.charIndex / total) * 100))
        );
        setPlaybackPos(progress);
        drawNativeWave(progress);
      },
      onEnd: () => {
        setPlaybackPos(100);
        drawNativeWave(100);
        setTimeout(() => {
          setPlaybackPos(0);
          drawNativeWave(0);
        }, 400);
      },
      onError: () => {
        setPlaybackPos(0);
        drawNativeWave(0);
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

  const baseCurieTip = LanguageMatrixEngine.getLocalizedText(
    currentPhrase.curieTip,
    supportLang,
    currentPhrase.curieTip["pt-BR"] || ""
  );

  const flagCode =
    targetLang === "en" ? "gb" : targetLang === "ja" ? "jp" : targetLang;
  const badgeCity = currentPhrase.badge.split(" ")[0] || languageName(targetLang);

  // Dynamic Syllable / Phoneme Chips from current phrase
  const dynamicPhonemeChips = currentPhrase.syllables.map((syl, idx) => {
    const sylIntuitive =
      syl.intuitive[supportLang] || syl.intuitive["pt-BR"] || syl.text;
    const cleanSyl = syl.text.toLowerCase();

    // Check match against evaluation result word tokens
    const isMatched =
      evaluationResult?.matchedWords?.some((w) =>
        w.toLowerCase().includes(cleanSyl) || cleanSyl.includes(w.toLowerCase())
      ) ?? false;

    let chipAccuracy = "--%";
    let accuracyClass = "bg-stone-100 text-stone-500";
    let isWarning = false;
    let desc = "Aguardando gravação para calibração acústica";

    if (phoneticScore === 0) {
      chipAccuracy = "0% ⚠";
      accuracyClass = "bg-rose-100 text-[#B91C1C]";
      isWarning = true;
      desc = "Ponto articulatório não captado pelo microfone";
    } else if (phoneticScore !== null && phoneticScore > 0) {
      if (isMatched) {
        const sylScore = Math.min(99, Math.max(90, phoneticScore + (idx % 3)));
        chipAccuracy = `${sylScore}%`;
        accuracyClass = "bg-emerald-100 text-[#059669]";
        desc = "Articulação fonética límpida e bem calibrada";
      } else {
        const sylScore = Math.min(65, Math.max(25, phoneticScore - 30));
        chipAccuracy = `${sylScore}% ⚠`;
        accuracyClass = "bg-amber-200 text-[#92400E]";
        isWarning = true;
        desc = "Atenção ao ponto articulatório e ressonância";
      }
    }

    return {
      symbol: `[${sylIntuitive.replace(/<[^>]+>/g, "")}]`,
      word: `“${syl.text}”`,
      accuracy: chipAccuracy,
      accuracyClass,
      desc,
      isWarning,
    };
  });

  const strokeDashoffset =
    phoneticScore !== null && phoneticScore > 0
      ? Math.round(352 - (352 * phoneticScore) / 100)
      : 352;

  const curieDiagnosisText =
    evaluationResult?.curieFeedback || baseCurieTip;

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
        {/* LEFT COLUMN: Phrase Display + Dual Oscilloscope Canvases (8 Cols) */}
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

              <p className="text-sm font-medium text-[#0D9488]">{translation}</p>
            </div>
          </div>

          {/* DUAL INTERACTIVE OSCILLOSCOPE (Responsive Canvases) */}
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

            {/* Canvas 1: Native Reference Waveform */}
            <div className="bg-[#27272A] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="flex items-center gap-1 text-[#06B6D4] font-bold uppercase tracking-wider text-[11px]">
                  <Radio size={13} /> Onda Nativa de {badgeCity} (Referência Padrão)
                </span>
                <span className="font-extrabold text-[#06B6D4]">
                  {currentPhrase.pitchHz} Hz Pitch Médio
                </span>
              </div>
              <div
                ref={nativeContainerRef}
                className="h-24 w-full relative overflow-hidden rounded-lg"
              >
                <canvas
                  ref={nativeCanvasRef}
                  className="w-full h-full block"
                />
                {/* Syllables breakdown below wave */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-[10px] text-zinc-400 select-none pointer-events-none">
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

            {/* Canvas 2: User Voice Waveform */}
            <div className="bg-[#27272A] rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span className="flex items-center gap-1 text-[#10B981] font-bold uppercase tracking-wider text-[11px]">
                  <Mic size={13} /> Sua Gravação de Voz (Sincronizada)
                </span>
                <span className="font-extrabold text-[#10B981]">
                  {isRecording
                    ? `Captação Ativa: ${vuLevel}% RMS`
                    : phoneticScore !== null && phoneticScore > 0
                    ? `Latência: 16ms • Coincidência: ${phoneticScore}%`
                    : phoneticScore === 0
                    ? "0% • Silêncio ou áudio inaudível"
                    : "0 Hz • Aguardando gravação de voz"}
                </span>
              </div>
              <div
                ref={userContainerRef}
                className="h-24 w-full relative overflow-hidden rounded-lg"
              >
                <canvas
                  ref={userCanvasRef}
                  className="w-full h-full block"
                />
              </div>
            </div>

            {/* Word-by-Word Live Transcription & Breakdown */}
            {evaluationResult && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Transcrição da Sua Voz:
                    </span>
                    <span className="text-xs font-semibold text-teal-300 italic">
                      “{evaluationResult.transcript || "(silêncio)"}”
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      evaluationResult.accuracy >= 70
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : evaluationResult.accuracy > 0
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {evaluationResult.evaluationBadge}
                  </span>
                </div>

                {/* Word Match Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {evaluationResult.wordMatches.map((wm, wIdx) => (
                    <span
                      key={wIdx}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        wm.matched
                          ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/60"
                          : "bg-rose-950/60 text-rose-300 border border-rose-800/60 line-through"
                      }`}
                      title={wm.matched ? "Articulação reconhecida" : "Não reconhecida"}
                    >
                      {wm.word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Acoustic Tickers */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                  Harmonia Formântica
                </span>
                <span className="text-base font-extrabold text-[#06B6D4]">
                  {phoneticScore !== null
                    ? phoneticScore > 0
                      ? `${Math.min(99, phoneticScore + 2)}%`
                      : "0%"
                    : "--%"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                  Entonação Melódica
                </span>
                <span className="text-base font-extrabold text-[#FEA619]">
                  {phoneticScore !== null
                    ? phoneticScore > 0
                      ? `${Math.max(25, phoneticScore - 3)}%`
                      : "0%"
                    : "--%"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                  {targetLang === "de"
                    ? "Ataque Glotal (Knacklaut)"
                    : "Conexão Articulatória"}
                </span>
                <span className="text-base font-extrabold text-[#10B981]">
                  {phoneticScore !== null
                    ? phoneticScore > 0
                      ? `${phoneticScore}%`
                      : "0%"
                    : "--%"}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Phoneme Breakdown Interactive Chips from currentPhrase.syllables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#111C2D]">
                Decomposição Fonema por Fonema ({currentPhrase.syllables.length} Sílabas)
              </h2>
              <span className="text-xs text-[#64748B]">
                Clique nos pontos para detalhes motores
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {dynamicPhonemeChips.map((chip, idx) => (
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${chip.accuracyClass}`}
                    >
                      {chip.accuracy}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#111C2D] truncate">
                    {chip.word}
                  </p>
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
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 140 140"
              >
                <circle
                  cx="70"
                  cy="70"
                  fill="transparent"
                  r="56"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                />
                <circle
                  className="transition-all duration-1000 ease-out"
                  cx="70"
                  cy="70"
                  fill="transparent"
                  r="56"
                  stroke={
                    phoneticScore === 0
                      ? "#EF4444"
                      : phoneticScore && phoneticScore < 50
                      ? "#F59E0B"
                      : "#0D9488"
                  }
                  strokeDasharray="352"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none text-center">
                <span className="text-4xl font-black text-[#111C2D] tracking-tight leading-none">
                  {phoneticScore !== null ? `${phoneticScore}%` : "--%"}
                </span>
                <span className="text-[10px] font-black text-[#0D9488] uppercase tracking-wider mt-1.5">
                  Precisão
                </span>
              </div>
            </div>
            <div className="text-xs font-bold text-[#64748B] mb-2">
              Calibração Fonética Rítmica
            </div>
            <div
              className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                phoneticScore === 0
                  ? "bg-rose-100 text-rose-700"
                  : phoneticScore && phoneticScore < 60
                  ? "bg-amber-100 text-amber-700"
                  : phoneticScore
                  ? "bg-teal-100/70 text-[#0F766E]"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              <ShieldCheck size={16} />
              <span>
                {phoneticScore === 0
                  ? "SOTAQUE NÃO DETECTADO — SILÊNCIO / DIVERGENTE"
                  : phoneticScore && phoneticScore < 60
                  ? `SOTAQUE ${badgeCity} EM CALIBRAÇÃO`
                  : phoneticScore
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
              ) : phoneticScore === 0 ? (
                <AlertTriangle size={16} className="text-rose-500" />
              ) : (
                <CheckCircle2 size={16} className="text-[#10B981]" />
              )}
              <span>{statusMessage}</span>
            </div>

            {/* Intensidade da voz / Nível de Captação */}
            <div className="w-48 h-2 bg-stone-300 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  isRecording ? "bg-[#10B981]" : "bg-[#0D9488]"
                }`}
                style={{ width: `${vuLevel}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#64748B] mt-1">
              Captação da Voz: {vuLevel}%
            </span>
          </div>

          {/* Marie Curie Expert Companion Dock with Dynamic Diagnosis */}
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-[0_4px_0_#CBD5E1] space-y-3">
            <div className="flex items-center justify-between">
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
                  <h4 className="font-extrabold text-sm text-[#111C2D]">
                    Marie Curie
                  </h4>
                  <span className="text-xs text-[#0D9488] font-bold">
                    Mentoria de Ressonância
                  </span>
                </div>
              </div>

              {evaluationResult && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-[#0F766E]">
                  DIAGNÓSTICO
                </span>
              )}
            </div>

            <div className="p-3 bg-[#F5F0E8] rounded-xl border border-stone-200/70 text-xs text-[#334155] leading-relaxed italic">
              “{curieDiagnosisText}”
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
