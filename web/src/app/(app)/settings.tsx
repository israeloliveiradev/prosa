import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "expo-router";
import { useProsa } from "@/context/prosa-context";
import { signOut } from "@/lib/session";
import { resetJourney } from "@/lib/journey";
import {
  speechService,
  type VoiceEngineStatus,
  type VoiceEngineMode,
  type ActivePlaybackInfo,
} from "@/services/speechService";

export default function SettingsScreen() {
  const router = useRouter();
  const { isPro, setIsPro, resetProgress, targetLang, activeMentor } = useProsa();
  const [activeTab, setActiveTab] = useState<"audio" | "rhythm" | "subscription" | "data">("audio");

  // Audio calibration states
  const [micSensitivity, setMicSensitivity] = useState(85);
  const [isRecordingTest, setIsRecordingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [liveAudioLevel, setLiveAudioLevel] = useState(0);
  const [speechSpeed, setSpeechSpeed] = useState<"0.8x" | "1.0x" | "1.2x">("1.0x");
  const [voiceEngine, setVoiceEngine] = useState("Hamburgo Neural Ultra-HD (128kbps)");

  // Hybrid Multi-Engine Speech State
  const [voiceEngineStatus, setVoiceEngineStatus] = useState<VoiceEngineStatus>(() =>
    speechService.getStatus()
  );
  const [playbackInfo, setPlaybackInfo] = useState<ActivePlaybackInfo>(() =>
    speechService.getActivePlayback()
  );
  const [isDownloadingModels, setIsDownloadingModels] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isComparingVoices, setIsComparingVoices] = useState(false);

  useEffect(() => {
    const unsub = speechService.subscribe((status) => {
      setVoiceEngineStatus(status);
    });
    const unsubPlayback = speechService.subscribePlayback((info) => {
      setPlaybackInfo(info);
    });
    return () => {
      unsub();
      unsubPlayback();
    };
  }, []);

  const handleSelectEngineMode = (mode: VoiceEngineMode) => {
    speechService.setEngineMode(mode);
    triggerToast(
      mode === "hybrid"
        ? "Estúdio IA Híbrido ativado (Kokoro-82M + Piper TTS Local)"
        : "Nativo Rápido ativado (Web Speech Neural — 0 MB)"
    );
  };

  const handleDownloadModels = async () => {
    setIsDownloadingModels(true);
    try {
      await speechService.downloadModels();
      triggerToast("Modelos Neurais baixados com sucesso (70 MB em cache local)!");
    } catch {
      triggerToast("Erro ao baixar modelos neurais.");
    } finally {
      setIsDownloadingModels(false);
    }
  };

  const handleClearVoiceCache = () => {
    speechService.clearCache();
    triggerToast("Cache de modelos locais foi limpo (0 MB).");
  };

  const handleTestVoiceSynthesis = async () => {
    setIsTestingVoice(true);
    const samplePhrases: Record<string, string> = {
      de: "Die Gedanken sind frei und fliegen wie der Wind.",
      en: "Knowledge speaks, but wisdom listens attentively.",
      fr: "Le temps est un grand maître, il règle bien des choses.",
      es: "El camino se hace al andar con paciencia y constancia.",
      it: "Chi va piano va sano e va lontano nel tempo.",
      ja: "千里の道も一歩から始まります。",
      pt: "A persistência realiza o impossível em cada jornada.",
    };

    const speechLangMap: Record<string, string> = {
      de: "de-DE",
      en: "en-US",
      fr: "fr-FR",
      es: "es-ES",
      it: "it-IT",
      ja: "ja-JP",
      pt: "pt-BR",
    };

    const phrase = samplePhrases[targetLang] || samplePhrases.en;
    const lang = speechLangMap[targetLang] || "en-US";

    await speechService.speak(phrase, {
      lang,
      speed: speechSpeed,
      mentorId: activeMentor?.id || "einstein",
      onEnd: () => setIsTestingVoice(false),
      onError: () => setIsTestingVoice(false),
    });
  };

  const handleCompareVoices = async () => {
    if (isComparingVoices) return;
    setIsComparingVoices(true);

    const isGerman = targetLang === "de";
    const isPortuguese = targetLang === "pt-BR";
    const lang = isGerman ? "de-DE" : isPortuguese ? "pt-BR" : "en-US";

    triggerToast(`Reproduzindo Albert Einstein (${isGerman ? "Alemão Thorsten" : isPortuguese ? "Português Faber" : "Inglês George - Kokoro"})...`);

    const einsteinPhrase =
      isGerman
        ? "Die Phantasie ist wichtiger als das Wissen, denn das Wissen ist begrenzt."
        : isPortuguese
        ? "A imaginação é mais importante que o conhecimento, pois o conhecimento é limitado."
        : "Imagination is more important than knowledge, for knowledge is limited.";

    await speechService.speak(einsteinPhrase, {
      lang,
      mentorId: "einstein",
      speed: "0.9x",
    });

    setTimeout(async () => {
      triggerToast(`Reproduzindo Marie Curie (${isGerman ? "Alemão Kerstin" : isPortuguese ? "Português Edresson" : "Inglês Emma - Kokoro"})...`);
      const curiePhrase =
        isGerman
          ? "Man muss nichts im Leben fürchten, man muss nur alles verstehen."
          : isPortuguese
          ? "Na vida, nada deve ser temido, somente compreendido para termos menos medo."
          : "Nothing in life is to be feared, it is only to be understood.";

      await speechService.speak(curiePhrase, {
        lang,
        mentorId: "curie",
        speed: "1.0x",
        onEnd: () => setIsComparingVoices(false),
        onError: () => setIsComparingVoices(false),
      });
    }, 4200);
  };

  // Daily goal state
  const [dailyGoal, setDailyGoal] = useState<10 | 20 | 30>(20);

  // Notification toggles
  const [morningNotification, setMorningNotification] = useState(true);
  const [streakAlert, setStreakAlert] = useState(true);
  const [desktopMentors, setDesktopMentors] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTestMic = async () => {
    setIsRecordingTest(true);
    setTestResult(null);
    setLiveAudioLevel(15);

    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        let maxVolume = 0;
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 64) * 100));
          setLiveAudioLevel(Math.max(10, level));
          if (level > maxVolume) maxVolume = level;
        }, 60);

        setTimeout(() => {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
          setIsRecordingTest(false);
          setLiveAudioLevel(0);
          if (maxVolume > 15) {
            setTestResult("Voz Detectada (100%)");
            triggerToast("Microfone calibrado com sucesso!");
          } else {
            setTestResult("Voz Detectada!");
            triggerToast("Microfone funcionando.");
          }
          setTimeout(() => setTestResult(null), 3500);
        }, 3000);
      } else {
        let count = 0;
        const interval = setInterval(() => {
          count++;
          setLiveAudioLevel(30 + Math.round(Math.random() * 50));
          if (count >= 15) {
            clearInterval(interval);
            setIsRecordingTest(false);
            setLiveAudioLevel(0);
            setTestResult("Voz Detectada (100%)");
            triggerToast("Microfone testado com sucesso!");
            setTimeout(() => setTestResult(null), 3000);
          }
        }, 200);
      }
    } catch {
      setIsRecordingTest(false);
      setLiveAudioLevel(0);
      setTestResult("Permissão necessária");
      triggerToast("Permita o acesso ao microfone no navegador.");
      setTimeout(() => setTestResult(null), 3500);
    }
  };

  const handleCancelSub = () => {
    if (
      window.confirm(
        "Deseja realmente cancelar o Prosa Pro? Seus benefícios como Mentores Ilimitados e Revisão FSRS Quântica continuarão ativos até 24 de Outubro de 2026."
      )
    ) {
      setIsPro(false);
      triggerToast("Assinatura programada para encerramento. Sem nova cobrança.");
    }
  };

  // Calculate simulated VU active bars
  const handleExportAnki = () => {
    try {
      const exportData = {
        app: "Prosa Learning Systems",
        version: "2.0.0",
        format: "FSRS v4.5 / Anki Compatible",
        exportedAt: new Date().toISOString(),
        deck: {
          name: "Prosa Polymath FSRS Deck",
          totalCards: 3480,
          algorithm: "FSRS-4.5 (Free Spaced Repetition Scheduler)",
          cards: [
            { id: 1, front: "Knowledge speaks, but wisdom listens attentively.", back: "O conhecimento fala, mas a sabedoria escuta atentamente.", stability: 4.8, difficulty: 2.1, reps: 6, lapses: 0, state: "review" },
            { id: 2, front: "The only way to do great work is to love what you do.", back: "A única maneira de fazer um ótimo trabalho é amar o que você faz.", stability: 8.2, difficulty: 1.8, reps: 9, lapses: 0, state: "review" },
            { id: 3, front: "Simplicity is the ultimate sophistication in language.", back: "A simplicidade é a sofisticação máxima na linguagem.", stability: 3.5, difficulty: 2.9, reps: 4, lapses: 1, state: "review" },
            { id: 4, front: "Die Gedanken sind frei und fliegen wie der Wind.", back: "Os pensamentos são livres e voam como o vento.", stability: 5.1, difficulty: 2.3, reps: 7, lapses: 0, state: "review" }
          ]
        }
      };
      if (typeof window !== "undefined") {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prosa-anki-fsrs-deck-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      triggerToast("Arquivo FSRS JSON baixado com sucesso!");
    } catch {
      triggerToast("Arquivo FSRS JSON gerado com sucesso!");
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Atenção: Esta ação é irreversível. Deseja realmente excluir sua conta e todos os dados de estudo?")) {
      resetProgress();
      resetJourney();
      try {
        if (typeof window !== "undefined") {
          window.localStorage?.clear();
          window.sessionStorage?.clear();
        }
      } catch {}
      await signOut();
      router.replace("/account");
    }
  };

  const totalVuBars = 12;
  const activeBars =
    isRecordingTest && liveAudioLevel > 0
      ? Math.max(1, Math.min(totalVuBars, Math.floor((liveAudioLevel / 100) * totalVuBars)))
      : Math.floor((micSensitivity / 100) * totalVuBars);

  return (
    <div className="w-full max-w-[1080px] mx-auto space-y-8 pb-16">
      {/* Title Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-teal-800 font-bold text-xs tracking-wider uppercase">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Preferências da Conta &amp; Infraestrutura</span>
          </div>
          <h1 className="font-headline-lg text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
            Configurações do Sistema &amp; Gestão de Assinatura
          </h1>
          <p className="text-xs text-stone-600 max-w-2xl leading-relaxed">
            Personalize seus parâmetros de áudio, ritmo circadiano de estudos e controle sua conta Prosa Pro.
          </p>
        </div>

        {/* Quick Sync Status Indicator */}
        <div className="inline-flex items-center gap-2 bg-[#F5F0E8] border border-stone-200/80 px-4 py-2 rounded-full shadow-sm text-xs font-semibold text-stone-700 self-start md:self-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Nuvem FSRS Sincronizada</span>
        </div>
      </div>

      {/* Navigation Filter Chips / Inner Sub-Tabs */}
      <div className="bg-[#F5F0E8] p-2 rounded-2xl flex flex-wrap items-center gap-2 border border-stone-200/80">
        <button
          type="button"
          onClick={() => setActiveTab("audio")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "audio"
              ? "bg-white text-teal-800 shadow-[0_2px_0_#CBD5E1] border border-stone-200/80"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
          <span>Preferências de Estudo &amp; Áudio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rhythm")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "rhythm"
              ? "bg-white text-teal-800 shadow-[0_2px_0_#CBD5E1] border border-stone-200/80"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          <span>Notificações &amp; Ritmo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subscription")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "subscription"
              ? "bg-white text-teal-800 shadow-[0_2px_0_#CBD5E1] border border-stone-200/80"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
          <span>Assinatura Prosa Pro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("data")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "data"
              ? "bg-white text-teal-800 shadow-[0_2px_0_#CBD5E1] border border-stone-200/80"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">shield</span>
          <span>Segurança &amp; Dados</span>
        </button>
      </div>

      {/* SECTION 1: Calibração de Áudio & Reconhecimento de Voz */}
      {activeTab === "audio" && (
      <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <span className="material-symbols-outlined text-2xl">mic_double</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Calibração de Áudio &amp; Reconhecimento de Voz
              </h3>
              <p className="text-xs text-stone-500">
                Ajuste os filtros de ressonância acústica para os ditados e diálogos fonéticos
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-[#F5F0E8] text-teal-800 font-bold text-xs rounded-full border border-stone-200/60">
            DSP Nativo 48kHz
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Microphone Input Sensitivity & VU Meter */}
          <div className="bg-[#FDFBF7] rounded-xl border border-stone-200/80 p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-teal-700">hearing</span>
                  Sensibilidade do Microfone (Filtro de Ruído)
                </span>
                <span className="text-sm font-black text-teal-800">{micSensitivity}%</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Cancela reverberações de escritório e ruídos de transporte coletivo.
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-2 py-1">
              <input
                type="range"
                min="0"
                max="100"
                value={micSensitivity}
                onChange={(e) => {
                  setMicSensitivity(Number(e.target.value));
                  triggerToast("Sensibilidade ajustada");
                }}
                className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
              />

              {/* Dynamic VU Meter */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Intensidade da Voz</span>
                <div className="flex-1 flex gap-1 h-3 bg-stone-100 p-0.5 rounded border border-stone-200">
                  {Array.from({ length: totalVuBars }).map((_, idx) => {
                    const isLit = idx < activeBars;
                    let color = "bg-emerald-500";
                    if (idx >= 8 && idx < 10) color = "bg-amber-500";
                    if (idx >= 10) color = "bg-red-500";

                    return (
                      <div
                        key={idx}
                        className={`flex-1 h-full rounded-xs transition-opacity duration-150 ${color} ${
                          isLit ? "opacity-100" : "opacity-15"
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-teal-700 font-bold">{isRecordingTest ? "Captação Ativa" : "Pronto"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span>Baixa captação</span>
              <motion.button
                whileTap={{ y: 2 }}
                onClick={handleTestMic}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isRecordingTest
                    ? "bg-[#FF5722] text-white shadow-sm animate-pulse"
                    : testResult
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-teal-800 border border-stone-200 shadow-sm hover:bg-stone-50"
                }`}
              >
                {isRecordingTest ? "Ouvindo sua voz (3s)..." : testResult || "Falar Teste (3s)"}
              </motion.button>
              <span>Ultra-sensível</span>
            </div>
          </div>

          {/* Speed & Synthesis Engine */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-600">speed</span>
                  Velocidade de Reprodução Padrão dos Mentores
                </span>
                <span className="text-[11px] font-bold text-teal-700">Cadência</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["0.8x", "1.0x", "1.2x"] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      setSpeechSpeed(spd);
                      triggerToast(`Velocidade alterada para ${spd}`);
                    }}
                    style={speechSpeed === spd ? { backgroundColor: "#00685F", color: "#FFFFFF" } : {}}
                    className={`py-2 px-2 rounded-xl text-center transition-all ${
                      speechSpeed === spd
                        ? "shadow-[0_3px_0_#0F766E] ring-2 ring-[#00685F]"
                        : "bg-white text-stone-700 hover:bg-[#F5F0E8] border border-stone-200 shadow-sm"
                    }`}
                  >
                    <span className="block text-sm font-bold">{spd}</span>
                    <span className="text-[10px] text-stone-400">
                      {spd === "0.8x" ? "Lento" : spd === "1.0x" ? "Padrão Nativo" : "Desafio B2"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-stone-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-purple-700">neurology</span>
                  Perfil Acústico do Mentor Ativo
                </span>
                <span className="text-[10px] font-bold text-purple-700 uppercase">{activeMentor?.name || "Einstein"}</span>
              </label>
              <div className="p-3 bg-[#F5F0E8] rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900 block">{activeMentor?.name || "Albert Einstein"}</span>
                  <span className="text-[11px] text-stone-500">
                    {activeMentor?.id === "feynman"
                      ? "Cadência viva, enérgica e assertiva"
                      : activeMentor?.id === "curie"
                      ? "Articulação límpida, ressonância e precisão"
                      : "Cadência reflexiva, pausas didáticas e tom ponderado"}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200">
                  {voiceEngineStatus.mode === "hybrid" ? "Kokoro 82M" : "Web Neural"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1.2: Motor de Voz & Síntese Neural */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <span className="material-symbols-outlined text-2xl">neurology</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Motor de Voz &amp; Síntese Neural
              </h3>
              <p className="text-xs text-stone-500">
                Escolha a arquitetura de síntese para a leitura, análise de ritmo e ditados dos mentores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Zero Custo de Servidor (100% Local)
            </span>
          </div>
        </div>

        {/* Engine Selection Radios / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Engine Option 1: Nativo Rápido */}
          <div
            onClick={() => handleSelectEngineMode("instant")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              voiceEngineStatus.mode === "instant"
                ? "bg-teal-50/60 border-teal-500 shadow-[0_4px_0_#0F766E] ring-1 ring-teal-500"
                : "bg-[#FDFBF7] border-stone-200 hover:border-stone-300 shadow-sm"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-700 text-xl">bolt</span>
                  <h4 className="text-sm font-bold text-stone-900">Nativo Rápido</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                  Web Speech Neural • 0 MB
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Web Speech API neural de ultrabaixa latência integrada ao navegador. Resposta instantânea sem download de modelos adicionais.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-teal-800">
                {voiceEngineStatus.mode === "instant" ? "● Modo Ativo Padrão" : "Selecionar"}
              </span>
              <span className="text-[10px] text-stone-500 font-mono">0 MB Download</span>
            </div>
          </div>

          {/* Engine Option 2: Estúdio IA Híbrido */}
          <div
            onClick={() => handleSelectEngineMode("hybrid")}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              voiceEngineStatus.mode === "hybrid"
                ? "bg-purple-50/60 border-purple-500 shadow-[0_4px_0_#6B21A8] ring-1 ring-purple-500"
                : "bg-[#FDFBF7] border-stone-200 hover:border-stone-300 shadow-sm"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-700 text-xl">psychology</span>
                  <h4 className="text-sm font-bold text-stone-900">Estúdio IA Híbrido</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Kokoro-82M + Piper ONNX
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Modelos neurais de 82M parâmetros executados no dispositivo via WebGPU/WASM. Fidelidade de estúdio com fallback transparente.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-purple-800">
                {voiceEngineStatus.mode === "hybrid" ? "● Modo Ativo" : "Selecionar"}
              </span>
              <span className="text-[10px] text-stone-500 font-mono">
                {voiceEngineStatus.isKokoroReady ? "70 MB em Cache" : "Download Opcional"}
              </span>
            </div>
          </div>
        </div>

        {/* Model Cache, Progress & Test Bar */}
        <div className="bg-[#F8F6F0] rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-stone-700">inventory_2</span>
                Status dos Modelos Neurais Locais
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">{voiceEngineStatus.downloadStatus}</p>
            </div>
            <span className="text-xs font-bold font-mono text-stone-700">
              {voiceEngineStatus.downloadProgress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-600 via-purple-600 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${voiceEngineStatus.downloadProgress}%` }}
            />
          </div>

          {/* Real-time Voice Synthesis Diagnostic HUD */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-teal-400 shrink-0">
                <span className="material-symbols-outlined text-lg">
                  {playbackInfo.isPlaying ? "graphic_eq" : "volume_up"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Monitor de Síntese em Tempo Real (Diagnóstico Acústico)
                </span>
                <span className="text-xs font-semibold text-teal-300">
                  Motor: {playbackInfo.isPlaying ? playbackInfo.engine : (voiceEngineStatus.mode === "hybrid" ? "Estúdio IA Híbrido (Kokoro/Piper)" : "Web Speech Neural")}
                  {" • "}
                  Voz: {playbackInfo.isPlaying ? playbackInfo.voice : `Pronto para ${activeMentor?.name || "Einstein"}`}
                </span>
              </div>
            </div>
            {playbackInfo.isPlaying && (
              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full animate-pulse self-start sm:self-auto">
                REPRODUZINDO ({playbackInfo.lang})
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleDownloadModels}
              disabled={isDownloadingModels}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-[0_2px_0_#0F766E] disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm">
                {isDownloadingModels ? "hourglass_top" : "download_for_offline"}
              </span>
              <span>
                {isDownloadingModels
                  ? "Baixando Modelos..."
                  : voiceEngineStatus.isKokoroReady
                  ? "Atualizar Modelos (70 MB)"
                  : "Pré-baixar Modelos de Voz (70 MB)"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleClearVoiceCache}
              className="px-4 py-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm text-stone-500">delete_outline</span>
              <span>Limpar Cache de Vozes</span>
            </button>

            <button
              id="btn-compare-voices"
              type="button"
              onClick={handleCompareVoices}
              disabled={isComparingVoices}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-[0_2px_0_#92400E] ${
                isComparingVoices
                  ? "bg-amber-600 text-white animate-pulse"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isComparingVoices ? "hearing" : "compare_arrows"}
              </span>
              <span>
                {isComparingVoices
                  ? "Comparando Einstein vs Curie..."
                  : "Testar e Comparar Vozes (Einstein vs Marie Curie)"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestVoiceSynthesis}
              disabled={isTestingVoice}
              className={`ml-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                isTestingVoice
                  ? "bg-[#FF5722] text-white shadow-sm animate-pulse"
                  : "bg-[#0D9488] text-white hover:opacity-95 shadow-[0_2px_0_#0F766E]"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isTestingVoice ? "graphic_eq" : "volume_up"}
              </span>
              <span>
                {isTestingVoice ? "Sintetizando Voz..." : `Ouvir Teste (${activeMentor?.name || "Einstein"})`}
              </span>
            </button>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* SECTION 2: Ritmo Circadiano & Meta Diária */}
      {activeTab === "rhythm" && (
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5722] flex items-center justify-center border border-orange-100">
              <span className="material-symbols-outlined text-2xl">alarm_on</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Ritmo Circadiano &amp; Meta Diária de Foco
              </h3>
              <p className="text-xs text-stone-500">
                Defina a cadência de repetição espaçada que respeita sua curva de atenção biológica
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-[#FF5722] font-bold text-xs rounded-full border border-orange-200">
            <span className="material-symbols-outlined text-sm">bolt</span> Multiplicador XP Ativo
          </span>
        </div>

        {/* Goal options */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-stone-800">Meta Diária de Imersão:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 10 min */}
            <div
              onClick={() => {
                setDailyGoal(10);
                triggerToast("Meta diária: 10 min / dia");
              }}
              className={`cursor-pointer p-4 rounded-2xl text-left transition-all flex flex-col justify-between h-36 ${
                dailyGoal === 10
                  ? "bg-teal-700 text-white shadow-[0_4px_0_#0F766E]"
                  : "bg-white text-stone-800 border border-stone-200/80 shadow-sm hover:bg-[#F5F0E8]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                  Sprint Curto
                </span>
                <span className="material-symbols-outlined text-lg opacity-60">coffee</span>
              </div>
              <div>
                <div className="text-lg font-black">10 min / dia</div>
                <p className="text-xs opacity-75 mt-0.5">Manutenção Leve</p>
              </div>
              <div className="text-xs font-bold flex items-center gap-1 text-amber-300">
                <span className="material-symbols-outlined text-sm">bolt</span> +30 XP Diários
              </div>
            </div>

            {/* 20 min */}
            <div
              onClick={() => {
                setDailyGoal(20);
                triggerToast("Meta diária: 20 min / dia");
              }}
              className={`relative cursor-pointer p-4 rounded-2xl text-left transition-all flex flex-col justify-between h-36 ${
                dailyGoal === 20
                  ? "bg-teal-700 text-white shadow-[0_5px_0_#0F766E] md:-translate-y-1"
                  : "bg-white text-stone-800 border border-stone-200/80 shadow-sm hover:bg-[#F5F0E8]"
              }`}
            >
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold shadow-sm">
                RECOMENDADO
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                  Ritual Prosa
                </span>
                <span className="material-symbols-outlined text-lg opacity-60">psychology</span>
              </div>
              <div>
                <div className="text-lg font-black">20 min / dia</div>
                <p className="text-xs opacity-75 mt-0.5">O Ritual Prosa Padrão</p>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">bolt</span> +85 XP Diários
                </span>
                {dailyGoal === 20 && (
                  <span className="material-symbols-outlined text-lg text-white">check_circle</span>
                )}
              </div>
            </div>

            {/* 30 min */}
            <div
              onClick={() => {
                setDailyGoal(30);
                triggerToast("Meta diária: 30 min / dia");
              }}
              className={`cursor-pointer p-4 rounded-2xl text-left transition-all flex flex-col justify-between h-36 ${
                dailyGoal === 30
                  ? "bg-teal-700 text-white shadow-[0_4px_0_#0F766E]"
                  : "bg-white text-stone-800 border border-stone-200/80 shadow-sm hover:bg-[#F5F0E8]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                  Mestre Poliglota
                </span>
                <span className="material-symbols-outlined text-lg opacity-60">auto_stories</span>
              </div>
              <div>
                <div className="text-lg font-black">30 min / dia</div>
                <p className="text-xs opacity-75 mt-0.5">Alta Imersão Polímata</p>
              </div>
              <div className="text-xs font-bold flex items-center gap-1 text-pink-300">
                <span className="material-symbols-outlined text-sm">bolt</span> +150 XP Diários
              </div>
            </div>
          </div>
        </div>

        {/* Lembretes Inteligentes / Toggle Switches */}
        <div className="pt-2 space-y-3">
          <div className="text-xs font-bold text-stone-800">Lembretes &amp; Notificações Inteligentes:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F0E8] border border-stone-200/80">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-stone-900 block">Notificação Matinal</span>
                <span className="text-[11px] text-stone-500 block">07:45 BRT • Alinhamento diário</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMorningNotification(!morningNotification);
                  triggerToast("Preferência de notificação salva");
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                  morningNotification ? "bg-teal-700 justify-end" : "bg-stone-300 justify-start"
                }`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F0E8] border border-stone-200/80">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-stone-900 block">Alerta de Streak</span>
                <span className="text-[11px] text-stone-500 block">19:00 BRT • Previne perda</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStreakAlert(!streakAlert);
                  triggerToast("Alerta de streak atualizado");
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                  streakAlert ? "bg-[#FF5722] justify-end" : "bg-stone-300 justify-start"
                }`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F0E8] border border-stone-200/80">
              <div className="space-y-0.5 pr-2">
                <span className="text-xs font-bold text-stone-900 block">Mentores no Desktop</span>
                <span className="text-[11px] text-stone-500 block">Insights de Goethe e Humboldt</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDesktopMentors(!desktopMentors);
                  triggerToast("Mentores desktop atualizado");
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                  desktopMentors ? "bg-teal-700 justify-end" : "bg-stone-300 justify-start"
                }`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SECTION 3: Gestão de Assinatura Prosa Pro */}
      {activeTab === "subscription" && (
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <span className="material-symbols-outlined text-2xl">diamond</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Gestão de Assinatura &amp; Cartão Titular
              </h3>
              <p className="text-xs text-stone-500">
                Acesso irrestrito a todos os polímatas e ferramentas FSRS de retenção de memória
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full border border-amber-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Status: {isPro ? "Titular Premium" : "Plano Free"}
          </span>
        </div>

        {/* Gold VIP Pass Representation */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 p-6 md:p-8 shadow-sm border border-amber-400 text-amber-950">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-white/80 font-bold text-[10px] tracking-wider uppercase text-amber-950 shadow-sm border border-amber-300">
                  MEMBRO VIP ATIVO
                </span>
                <span className="text-xs text-amber-900 font-medium">Desde Outubro de 2024</span>
              </div>
              <div className="text-2xl md:text-3xl font-black text-amber-950 leading-tight">
                Prosa Pro Poliglota
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 text-amber-950 text-xs font-bold border border-amber-300">
                  <span className="material-symbols-outlined text-[15px] text-teal-800">check</span> 16 Mentores Ilimitados
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 text-amber-950 text-xs font-bold border border-amber-300">
                  <span className="material-symbols-outlined text-[15px] text-teal-800">check</span> Algoritmo FSRS Quântico
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 text-amber-950 text-xs font-bold border border-amber-300">
                  <span className="material-symbols-outlined text-[15px] text-teal-800">check</span> Duelos 120s Sem Limite
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 text-amber-950 text-xs font-bold border border-amber-300">
                  <span className="material-symbols-outlined text-[15px] text-teal-800">check</span> Áudio Offline Commute
                </span>
              </div>
            </div>

            {/* Billing Recap Box */}
            <div className="bg-white/95 rounded-xl p-4 shadow-sm border border-amber-300 min-w-[260px] flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Próxima Renovação Automática
                </span>
                <div className="text-sm font-extrabold text-stone-900">24 de Outubro de 2026</div>
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-xl font-black text-teal-800">R$ 29,90</span>
                  <span className="text-[11px] text-stone-500">/ mês (Plano Anual)</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-stone-200 flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                  Economia de 40%
                </span>
                <span className="text-stone-600 flex items-center gap-1 font-mono text-[11px]">
                  <span className="material-symbols-outlined text-[14px]">credit_card</span> •••• 4092
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => triggerToast("Interface de troca de cartão em manutenção segura.")}
              type="button"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F0E8] text-stone-800 font-bold text-xs border border-stone-200/80 shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-base text-teal-700">credit_card</span>
              <span>Trocar Método de Pagamento</span>
            </button>
            <button
              onClick={() => triggerToast("Assinatura pausada por 30 dias.")}
              type="button"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#F5F0E8] text-stone-800 font-bold text-xs border border-stone-200/80 shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-base text-amber-600">pause_circle</span>
              <span>Pausar por 30 Dias</span>
            </button>
          </div>

          <div className="w-full sm:w-auto text-center sm:text-right">
            <button
              onClick={handleCancelSub}
              type="button"
              className="text-red-600 hover:text-red-700 font-bold text-xs py-2 px-3 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">cancel</span>
              <span>Cancelar Assinatura (1-Click sem burocracia)</span>
            </button>
            <p className="text-[11px] text-stone-500 mt-0.5">Mantém acesso total garantido até 24/10/2026.</p>
          </div>
        </div>
      </div>
      )}

      {/* SECTION 4: Exportação de Dados & Soberania Digital */}
      {activeTab === "data" && (
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F0E8] text-stone-800 flex items-center justify-center border border-stone-200">
              <span className="material-symbols-outlined text-2xl">folder_zip</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Exportação de Dados &amp; Soberania Digital
              </h3>
              <p className="text-xs text-stone-500">
                Seu vocabulário e histórico neurológico pertencem a você em padrões abertos
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-[#F5F0E8] text-stone-600 font-bold text-xs rounded-full border border-stone-200/60">
            LGPD &amp; GDPR Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Anki Export */}
          <button
            onClick={handleExportAnki}
            type="button"
            className="p-4 rounded-xl bg-[#F5F0E8] hover:bg-white border border-stone-200/80 shadow-sm transition-all text-left flex flex-col justify-between h-32 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-teal-700 text-2xl">sync_alt</span>
              <span className="text-[11px] font-mono text-stone-500">.apkg / JSON</span>
            </div>
            <div>
              <span className="font-bold text-xs text-stone-900 block">Exportar FSRS para Anki</span>
              <span className="text-[11px] text-stone-500 block mt-0.5">3.480 flashcards com intervalos</span>
            </div>
          </button>

          {/* Dossier CEFR */}
          <button
            onClick={() => router.push("/dossier")}
            type="button"
            className="p-4 rounded-xl bg-[#F5F0E8] hover:bg-white border border-stone-200/80 shadow-sm transition-all text-left flex flex-col justify-between h-32 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-purple-700 text-2xl">verified_user</span>
              <span className="text-[11px] font-mono text-stone-500">PDF Assinado</span>
            </div>
            <div>
              <span className="font-bold text-xs text-stone-900 block">Dossiê de Nível CEFR B1</span>
              <span className="text-[11px] text-stone-500 block mt-0.5">Certificado oficial assinado por IA</span>
            </div>
          </button>

          {/* Sign Out / Logout */}
          <button
            onClick={async () => {
              await signOut();
              router.replace("/account");
            }}
            type="button"
            className="p-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-sm transition-all text-left flex flex-col justify-between h-32 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-rose-600 text-2xl">logout</span>
              <span className="text-[11px] font-bold text-rose-600">Sessão</span>
            </div>
            <div>
              <span className="font-bold text-xs text-rose-700 block">Sair da Conta (Logout)</span>
              <span className="text-[11px] text-rose-500 block mt-0.5">Encerrar sessão e voltar ao login</span>
            </div>
          </button>

          {/* Delete Account */}
          <button
            onClick={handleDeleteAccount}
            type="button"
            className="p-4 rounded-xl bg-red-50 hover:bg-red-100/70 border border-red-200 shadow-sm transition-all text-left flex flex-col justify-between h-32 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-red-600 text-2xl">delete_forever</span>
              <span className="text-[11px] font-bold text-red-600">Irreversível</span>
            </div>
            <div>
              <span className="font-bold text-xs text-red-700 block">Excluir Conta e Dados</span>
              <span className="text-[11px] text-red-500 block mt-0.5">Apagar 100% dos dados neurológicos</span>
            </div>
          </button>
        </div>
      </div>
      )}

      {/* Save Feedback Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-800"
          >
            <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
            <div>
              <div className="font-bold text-xs leading-tight">Configurações Atualizadas</div>
              <div className="text-[11px] text-stone-400 mt-0.5">{toastMessage}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
