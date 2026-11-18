export type SessionDurationMode = "lite_20" | "pro_40" | "sprint_60";

export type InterleavingKind =
  | "speed_drills"
  | "micro_immersion"
  | "spaced_retention"
  | "shadowing_studio"
  | "reverse_writing"
  | "cultural_roleplay";

export interface InterleavingBlock {
  id: string;
  kind: InterleavingKind;
  title: string;
  subtitle: string;
  durationSeconds: number;
  startSeconds: number;
  passiveAudioMode: boolean;
  intensity: "low" | "medium" | "high";
}

export interface CognitiveFatigueAssessment {
  fatigueDetected: boolean;
  cognitiveLoadScore: number;
  reason?: string;
  suggestedAction: "continue_active" | "switch_to_passive_audio";
}

export interface SessionPlan {
  mode: SessionDurationMode;
  totalSeconds: number;
  blocks: InterleavingBlock[];
  adaptiveAudioActive: boolean;
}

export function getSessionDurationSeconds(mode: SessionDurationMode): number {
  switch (mode) {
    case "lite_20":
      return 20 * 60;
    case "pro_40":
      return 40 * 60;
    case "sprint_60":
      return 60 * 60;
    default:
      return 20 * 60;
  }
}

export function buildInterleavingSession(
  mode: SessionDurationMode = "lite_20",
  dueCount = 5,
  options?: { forcePassiveAudio?: boolean },
): SessionPlan {
  const totalSeconds = getSessionDurationSeconds(mode);
  const passive = options?.forcePassiveAudio ?? false;

  let rawBlocks: Array<{
    kind: InterleavingKind;
    title: string;
    subtitle: string;
    seconds: number;
    intensity: "low" | "medium" | "high";
  }>;

  if (mode === "sprint_60") {
    const srsTime = Math.min(900, Math.max(300, 300 + dueCount * 30));
    rawBlocks = [
      {
        kind: "speed_drills",
        title: "Aquecimento Rápido",
        subtitle: "Drills de vocabulário de alta velocidade",
        seconds: 300,
        intensity: "high",
      },
      {
        kind: "spaced_retention",
        title: "Retenção Espaçada & Palácio",
        subtitle: "FSRS e associação mnemônica de imagens",
        seconds: srsTime,
        intensity: "medium",
      },
      {
        kind: "micro_immersion",
        title: "Micro-Imersão de Notícias",
        subtitle: "Insumo compreensível de artigos do seu nicho",
        seconds: 900,
        intensity: "low",
      },
      {
        kind: "reverse_writing",
        title: "Escrita Reversa (PT ➔ Alvo)",
        subtitle: "Reconstrução sintática e precisão gramatical",
        seconds: 600,
        intensity: "high",
      },
      {
        kind: "shadowing_studio",
        title: "Shadowing Studio & Radar",
        subtitle: "Imitação de prosódia nativa e entonação",
        seconds: 720,
        intensity: "high",
      },
      {
        kind: "cultural_roleplay",
        title: "Conversação Cultural",
        subtitle: "Simulação dialogada com persona nativa",
        seconds: 3600 - (300 + srsTime + 900 + 600 + 720),
        intensity: "medium",
      },
    ];
  } else if (mode === "pro_40") {
    const srsTime = Math.min(600, Math.max(240, 240 + dueCount * 20));
    rawBlocks = [
      {
        kind: "speed_drills",
        title: "Aquecimento Rápido",
        subtitle: "Reativação neural de velocidade",
        seconds: 240,
        intensity: "high",
      },
      {
        kind: "spaced_retention",
        title: "Retenção Espaçada",
        subtitle: "Revisões prioritárias FSRS",
        seconds: srsTime,
        intensity: "medium",
      },
      {
        kind: "micro_immersion",
        title: "Micro-Imersão Ativa",
        subtitle: "Leitura guiada com áudio neural sincronizado",
        seconds: 600,
        intensity: "low",
      },
      {
        kind: "reverse_writing",
        title: "Escrita Reversa",
        subtitle: "Tradução bidirecional focada",
        seconds: 480,
        intensity: "high",
      },
      {
        kind: "shadowing_studio",
        title: "Shadowing Studio",
        subtitle: "Treino de entonação e ritmo oral",
        seconds: 420,
        intensity: "high",
      },
      {
        kind: "cultural_roleplay",
        title: "Roleplay Final",
        subtitle: "Consolidação de turno de conversa",
        seconds: 2400 - (240 + srsTime + 600 + 480 + 420),
        intensity: "medium",
      },
    ];
  } else {
    const srsTime = Math.min(360, Math.max(180, 180 + dueCount * 15));
    rawBlocks = [
      {
        kind: "speed_drills",
        title: "Aquecimento Express",
        subtitle: "Estímulo inicial de léxico",
        seconds: 180,
        intensity: "medium",
      },
      {
        kind: "spaced_retention",
        title: "Revisão SRS",
        subtitle: "Retenção essencial de curva de esquecimento",
        seconds: srsTime,
        intensity: "medium",
      },
      {
        kind: "micro_immersion",
        title: "Imersão Noticiário",
        subtitle: "Leitura e áudio de texto autêntico",
        seconds: 360,
        intensity: "low",
      },
      {
        kind: "shadowing_studio",
        title: "Shadowing Oral",
        subtitle: "Ecoamento de frase nativa",
        seconds: 300,
        intensity: "high",
      },
      {
        kind: "cultural_roleplay",
        title: "Fechamento Conversacional",
        subtitle: "Reflexão final da sessão",
        seconds: 1200 - (180 + srsTime + 360 + 300),
        intensity: "low",
      },
    ];
  }

  let cursor = 0;
  const blocks: InterleavingBlock[] = rawBlocks.map((item, index) => {
    const startSeconds = cursor;
    cursor += item.seconds;
    return {
      id: `${mode}_block_${index}_${item.kind}`,
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle,
      durationSeconds: item.seconds,
      startSeconds,
      passiveAudioMode: passive || (passive && item.intensity === "high"),
      intensity: item.intensity,
    };
  });

  return {
    mode,
    totalSeconds,
    blocks,
    adaptiveAudioActive: passive,
  };
}

export function evaluateCognitiveFatigue(signals: {
  avgResponseMs: number;
  baselineMs: number;
  recentErrorRate: number;
  sessionElapsedSeconds: number;
}): CognitiveFatigueAssessment {
  const { avgResponseMs, baselineMs, recentErrorRate, sessionElapsedSeconds } = signals;

  let fatiguePoints = 0;
  const reasons: string[] = [];

  if (baselineMs > 0 && avgResponseMs > baselineMs * 2.0) {
    fatiguePoints += 45;
    reasons.push("Tempo de resposta 2x acima da sua média basal.");
  }

  if (recentErrorRate >= 0.35) {
    fatiguePoints += 45;
    reasons.push("Taxa de erro recente em elevação.");
  }

  if (sessionElapsedSeconds > 1800) {
    fatiguePoints += 15;
  }

  const fatigueDetected = fatiguePoints >= 60;
  const cognitiveLoadScore = Math.max(10, 100 - fatiguePoints);

  return {
    fatigueDetected,
    cognitiveLoadScore,
    reason: reasons.length > 0 ? reasons.join(" ") : undefined,
    suggestedAction: fatigueDetected ? "switch_to_passive_audio" : "continue_active",
  };
}

export function applyAdaptiveCognitiveLoad(plan: SessionPlan): SessionPlan {
  const updatedBlocks = plan.blocks.map((block) => {
    if (block.intensity === "high" || block.kind === "reverse_writing" || block.kind === "shadowing_studio") {
      return {
        ...block,
        passiveAudioMode: true,
        title: `${block.title} (Modo Áudio Suave)`,
        subtitle: "Adaptado automaticamente para escuta passiva sem fadiga",
      };
    }
    return block;
  });

  return {
    ...plan,
    blocks: updatedBlocks,
    adaptiveAudioActive: true,
  };
}
