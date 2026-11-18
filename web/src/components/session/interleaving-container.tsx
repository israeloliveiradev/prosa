import React, { useEffect, useState } from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import {
  type InterleavingBlock,
  type SessionPlan,
  evaluateCognitiveFatigue,
  applyAdaptiveCognitiveLoad,
} from "@/services/interleaving-engine";
import { type SessionSaveState, serializeSessionState } from "@/lib/session-clock";

interface InterleavingContainerProps {
  initialPlan: SessionPlan;
  targetLang: string;
  onSaveAndPause?: (serializedState: string) => void;
  onFinishSession?: (activeSecondsLogged: number) => void;
}

export function InterleavingContainer({
  initialPlan,
  targetLang,
  onSaveAndPause,
  onFinishSession,
}: InterleavingContainerProps) {
  const [plan, setPlan] = useState<SessionPlan>(initialPlan);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fatigueNotice, setFatigueNotice] = useState<string | null>(null);

  const currentBlock: InterleavingBlock | undefined = plan.blocks[currentBlockIndex];

  // Timer interval for session elapsed seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Simulate latency/error monitoring for fatigue assessment
  const triggerFatigueCheck = (avgLatencyMs: number, errorRate: number) => {
    const assessment = evaluateCognitiveFatigue({
      avgResponseMs: avgLatencyMs,
      baselineMs: 1500,
      recentErrorRate: errorRate,
      sessionElapsedSeconds: elapsedSeconds,
    });

    if (assessment.fatigueDetected && !plan.adaptiveAudioActive) {
      const adapted = applyAdaptiveCognitiveLoad(plan);
      setPlan(adapted);
      setFatigueNotice(assessment.reason || "Carga adaptativa ativada: transição para modo áudio suave.");
    }
  };

  const handleNextBlock = () => {
    if (currentBlock) {
      setCompletedBlockIds((prev) => [...prev, currentBlock.id]);
    }
    if (currentBlockIndex + 1 < plan.blocks.length) {
      setCurrentBlockIndex((prev) => prev + 1);
    } else {
      onFinishSession?.(elapsedSeconds);
    }
  };

  const handlePauseSession = () => {
    setIsPaused(true);
    const saveState: SessionSaveState = {
      version: "7.5",
      pausedAtTimestamp: Date.now(),
      sessionDurationMode: plan.mode,
      elapsedSeconds,
      completedBlockIds,
      currentBlockIndex,
      targetLang,
      accumulatedActiveSeconds: elapsedSeconds,
    };
    onSaveAndPause?.(serializeSessionState(saveState));
  };

  return (
    <ScrollView className="flex-1 bg-canvas p-4">
      {/* Session Top Bar */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-brand/10 px-3 py-1 border border-brand/20">
            <Text className="text-xs font-bold text-brand uppercase">
              Modo {plan.mode.replace("_", " ")}
            </Text>
          </View>

          {plan.adaptiveAudioActive && (
            <View className="rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/20">
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                🎧 Áudio Adaptativo
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={handlePauseSession}
          className="rounded-xl bg-line px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-bold text-ink">⏸ Pausar & Salvar</Text>
        </Pressable>
      </View>

      {/* Fatigue Banner */}
      {fatigueNotice && (
        <View className="mb-4 rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/30">
          <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
            ⚡ Proteção de Fadiga Cognitiva:
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{fatigueNotice}</Text>
        </View>
      )}

      {/* Block Progress Overview */}
      <View className="mb-6 flex-row items-center gap-1.5">
        {plan.blocks.map((b, idx) => {
          const isDone = completedBlockIds.includes(b.id);
          const isCurrent = idx === currentBlockIndex;
          return (
            <View
              key={b.id}
              className={`h-2 flex-1 rounded-full ${
                isCurrent
                  ? "bg-brand"
                  : isDone
                  ? "bg-emerald-500"
                  : "bg-line"
              }`}
            />
          );
        })}
      </View>

      {/* Current Interleaved Block Header */}
      {currentBlock && (
        <View className="rounded-3xl border border-line bg-card p-6 shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-brand">
              Bloco {currentBlockIndex + 1} de {plan.blocks.length} • {Math.round(currentBlock.durationSeconds / 60)} min
            </Text>
            <View className="rounded-full bg-line px-2.5 py-0.5">
              <Text className="text-[10px] font-bold text-muted uppercase">
                {currentBlock.intensity} intensity
              </Text>
            </View>
          </View>

          <Text className="text-xl font-extrabold text-ink">{currentBlock.title}</Text>
          <Text className="mt-1 text-sm text-muted">{currentBlock.subtitle}</Text>

          {currentBlock.passiveAudioMode && (
            <View className="mt-4 rounded-xl bg-sky-500/10 p-3 border border-sky-500/20">
              <Text className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                💡 Modo Áudio Suave Ativo: Escute atentamente sem necessidade de digitação.
              </Text>
            </View>
          )}

          {/* Action Button */}
          <View className="mt-6 flex-row gap-3">
            <Pressable
              onPress={handleNextBlock}
              className="flex-1 rounded-2xl bg-brand p-4 items-center justify-center active:opacity-90"
            >
              <Text className="text-sm font-bold text-white">
                {currentBlockIndex + 1 < plan.blocks.length ? "Próximo Bloco ➔" : "Concluir Sessão 🎉"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Debug/Simulate Fatigue Trigger Button */}
      <View className="mt-4 items-center">
        <Pressable
          onPress={() => triggerFatigueCheck(3800, 0.42)}
          className="rounded-xl border border-line/50 bg-canvas px-3 py-2"
        >
          <Text className="text-[10px] font-medium text-muted">
            Simular Radar de Cansaço (Test)
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
