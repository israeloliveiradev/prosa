import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Brain,
  Award,
  Globe,
  Flame,
  Languages,
  Check,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/tactile/app-shell";
import { TactileCard } from "@/components/tactile/tactile-card";
import { TactileButton } from "@/components/tactile/tactile-button";
import { useProsa } from "@/context/prosa-context";
import { tap } from "@/lib/haptics";
import { speechService } from "@/services/speechService";
import { SpeechCadenceEngine } from "@/services/speech-cadence";
import { LanguageMatrixEngine } from "@/services/contentService";
import {
  MentorChatService,
  type MentorChatSession,
  type ChatMessage,
  type ChatSuggestion,
} from "@/services/mentorChatService";
import { languageName } from "@/lib/languages";

export default function MentorChatScreen() {
  const router = useRouter();
  const {
    activeMentor,
    targetLang,
    supportLang,
    activeCourse,
    addXp,
  } = useProsa();

  const [session, setSession] = useState<MentorChatSession>(() =>
    MentorChatService.startSession({
      mentorId: activeMentor?.id || "einstein",
      mentorName: activeMentor?.name || "Albert Einstein",
      avatar: activeMentor?.avatar || "/cast/einstein.png",
      targetLang: targetLang || "en",
      supportLang: supportLang || "pt-BR",
      cefrLevel: activeCourse?.level || "B1",
    })
  );

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const engineRef = useRef<SpeechCadenceEngine | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const speechLang = LanguageMatrixEngine.getBCP47(targetLang);
  const targetLangLabel = languageName(targetLang);
  const mentorFirstName = activeMentor?.name ? activeMentor.name.split(" ")[0] : "Mentor";

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  // Audio speech on initial mentor message
  useEffect(() => {
    if (session.messages.length === 1 && session.messages[0].sender === "mentor") {
      speechService.speak(session.messages[0].targetText, {
        lang: speechLang,
        mentorId: activeMentor?.id || "einstein",
      });
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleTranslation = (msgId: string) => {
    void tap("light");
    setShowTranslations((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handlePlayAudio = (text: string) => {
    void tap("medium");
    setIsPlayingAudio(true);
    speechService.speak(text, {
      lang: speechLang,
      mentorId: activeMentor?.id || "einstein",
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const handleToggleRecording = async () => {
    void tap("medium");
    if (!isRecording) {
      setIsRecording(true);
      triggerToast(`Gravando sua voz em ${targetLangLabel}... Fale agora!`);

      if (!engineRef.current) {
        engineRef.current = new SpeechCadenceEngine();
      }

      engineRef.current.onTranscriptUpdate = (interim) => {
        if (interim) setInputText(interim);
      };

      await engineRef.current.startListening(speechLang, (res) => {
        if (res.transcript) {
          setInputText(res.transcript);
        }
      });
    } else {
      setIsRecording(false);
      if (engineRef.current) {
        const res = engineRef.current.stopListening();
        if (res.transcript) {
          setInputText(res.transcript);
        }
      }
      triggerToast("Gravação capturada!");
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    void tap("success");
    setInputText("");

    if (isRecording && engineRef.current) {
      engineRef.current.stopListening();
      setIsRecording(false);
    }

    const result = await MentorChatService.processUserTurn(session, text);

    setSession((prev) => ({
      ...prev,
      turn: result.updatedTurn,
      messages: [...prev.messages, result.userMessage, result.mentorReply],
      currentSuggestions: result.newSuggestions,
    }));

    // Auto-read mentor's response
    speechService.speak(result.mentorReply.targetText, {
      lang: speechLang,
      mentorId: activeMentor?.id || "einstein",
    });

    if (result.isFinished) {
      setSessionCompleted(true);
      addXp(25);
    }
  };

  const handleFinishEarly = () => {
    void tap("success");
    addXp(25);
    setSessionCompleted(true);
  };

  return (
    <AppShell>
      <div className="w-full max-w-[1080px] mx-auto flex flex-col gap-6 pb-20">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_0_#CBD5E1] border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              type="button"
              className="w-10 h-10 rounded-2xl bg-[#F5F0E8] hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Voltar à Trilha"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#F5F0E8] border border-[#0D9488]/30 shadow-sm shrink-0">
              <img
                src={activeMentor?.avatar || "/cast/einstein.png"}
                alt={activeMentor?.name || "Mentor"}
                className="w-full h-full object-cover object-top"
              />
              <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-[7px] text-white text-center font-black py-0.5 tracking-wider">
                {activeMentor?.affinity || 98}% AFINIDADE
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#111C2D]">
                  Sala de Diálogo com {activeMentor?.name || "Albert Einstein"}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ao Vivo
                </span>
              </div>
              <p className="text-xs text-[#64748B] flex items-center gap-2 mt-0.5">
                <span className="font-bold text-[#0D9488]">{session.topic}</span>
                <span>•</span>
                <span>Nível {session.cefrLevel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-[#F5F0E8] border border-stone-200 text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Flame size={14} className="text-[#FF5722]" />
              <span>Turno {Math.min(session.turn, session.maxTurns)} / {session.maxTurns}</span>
            </div>

            <button
              onClick={handleFinishEarly}
              type="button"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-[0_2px_0_#0F766E] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Award size={14} />
              <span>Concluir (+25 XP)</span>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="bg-[#FDFBF7] rounded-3xl border border-stone-200/80 p-4 sm:p-6 min-h-[440px] max-h-[560px] overflow-y-auto space-y-5 shadow-inner">
          {session.messages.map((msg) => {
            const isMentor = msg.sender === "mentor";
            const showTranslation = showTranslations[msg.id];

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3.5 ${isMentor ? "justify-start" : "justify-end"}`}
              >
                {isMentor && (
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white border border-[#0D9488]/30 shadow-xs shrink-0 self-end mb-1">
                    <img
                      src={activeMentor?.avatar || "/cast/einstein.png"}
                      alt={activeMentor?.name || "Mentor"}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[70%] space-y-2`}>
                  {/* Balloon */}
                  <div
                    className={`p-4 sm:p-5 rounded-3xl relative text-sm ${
                      isMentor
                        ? "bg-white text-stone-900 border border-stone-200/90 shadow-[0_4px_0_#E2E8F0] rounded-bl-xs"
                        : "bg-[#0D9488] text-white shadow-[0_4px_0_#0F766E] rounded-br-xs font-medium"
                    }`}
                  >
                    <p className="leading-relaxed font-semibold text-base sm:text-[17px]">
                      {msg.targetText}
                    </p>

                    {/* Mentor Phonetics and Translation Bar */}
                    {isMentor && (
                      <div className="pt-3 mt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        {msg.intuitivePronunciation && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F0E8] text-teal-800 text-xs font-mono font-medium">
                            <span className="material-symbols-outlined text-[13px] text-teal-700">mic</span>
                            <span>{msg.intuitivePronunciation}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(msg.targetText)}
                            className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-all cursor-pointer"
                            title="Ouvir com voz do mentor"
                          >
                            <Volume2 size={16} />
                          </button>

                          {msg.translation && (
                            <button
                              type="button"
                              onClick={() => handleToggleTranslation(msg.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Languages size={13} />
                              <span>{showTranslation ? "Ocultar" : "Traduzir"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Translation Dropdown */}
                    {isMentor && showTranslation && msg.translation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2.5 p-2.5 rounded-xl bg-teal-50/70 text-teal-900 text-xs font-medium border border-teal-100"
                      >
                        <span className="font-bold text-[10px] text-teal-700 uppercase block mb-0.5">
                          Tradução em Português:
                        </span>
                        <span>{msg.translation}</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Pedagogical Mentor Note on Student utterances */}
                  {!isMentor && msg.mentorNote && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-2xl p-3 border border-amber-200/80 shadow-[0_2px_0_#CBD5E1] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-800 flex items-center gap-1">
                          <Sparkles size={13} className="text-amber-600" />
                          <span>Nota de {mentorFirstName}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            msg.mentorNote.verdict === "impecável"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {msg.mentorNote.verdict === "impecável" ? "✓ Impecável" : "★ Ótimo Avanço"}
                        </span>
                      </div>
                      <p className="text-stone-700 leading-snug">{msg.mentorNote.feedback}</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggestions Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Sugestões de Resposta em {targetLangLabel}:</span>
            </span>
            <span>Clique para enviar ou ouvir</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {session.currentSuggestions.map((sug, i) => (
              <div
                key={i}
                className="bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col justify-between gap-2"
              >
                <div
                  onClick={() => handleSend(sug.text)}
                  className="cursor-pointer space-y-1"
                >
                  <span className="block text-xs font-bold text-stone-900 hover:text-teal-700 leading-snug">
                    {sug.text}
                  </span>
                  {sug.translation && (
                    <span className="block text-[11px] text-stone-500 font-medium">
                      {sug.translation}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayAudio(sug.text);
                    }}
                    className="p-1 rounded text-teal-700 hover:bg-teal-50 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 size={13} />
                    <span>Ouvir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend(sug.text)}
                    className="px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-black cursor-pointer uppercase"
                  >
                    Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-[0_4px_0_#CBD5E1] flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleRecording}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isRecording
                ? "bg-[#FF5722] text-white shadow-sm animate-pulse"
                : "bg-[#F5F0E8] text-stone-700 hover:bg-stone-200"
            }`}
            title={isRecording ? "Parar gravação" : "Falar pelo microfone"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Responda em ${targetLangLabel} para ${mentorFirstName}...`}
            className="flex-1 bg-transparent text-sm font-medium text-stone-900 px-2 py-2 focus:outline-none placeholder:text-stone-400"
          />

          <TactileButton
            onClick={() => handleSend()}
            variant="primary"
            size="md"
            className="px-5 py-2.5 rounded-xl flex items-center gap-2"
          >
            <span>Enviar</span>
            <Send size={15} />
          </TactileButton>
        </div>

        {/* Completed Modal */}
        <AnimatePresence>
          {sessionCompleted && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 text-center space-y-5"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <Award size={32} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-stone-900">
                    Sessão Concluída com Sucesso!
                  </h3>
                  <p className="text-xs text-stone-600">
                    Você dialogou com {activeMentor?.name} e fortaleceu suas conexões de fala ativa.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 py-2">
                  <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100">
                    <span className="block text-lg font-black text-teal-800">+25 XP</span>
                    <span className="text-[10px] text-teal-600 font-bold uppercase">Imersão Total</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                    <span className="block text-lg font-black text-amber-800">+1% Afinidade</span>
                    <span className="text-[10px] text-amber-600 font-bold uppercase">{mentorFirstName}</span>
                  </div>
                </div>

                <TactileButton
                  onClick={() => router.push("/")}
                  variant="primary"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2 py-3.5"
                >
                  <Check size={18} />
                  <span>Retornar à Trilha Principal</span>
                </TactileButton>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-stone-900 text-white text-xs font-bold shadow-lg flex items-center gap-2"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
