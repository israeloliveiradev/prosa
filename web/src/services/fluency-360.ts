export const TARGET_FLUENCY_SECONDS = 360 * 3600; // 360 hours = 1,296,000 seconds
export const MILESTONE_INTERVAL_HOURS = 30;

export interface Fluency360Status {
  totalActiveSeconds: number;
  totalActiveHours: number;
  targetHours: number;
  remainingSeconds: number;
  remainingHours: number;
  progressPercent: number;
  cefrLevel: string;
  weeklyVelocityHours: number;
  estimatedDaysToCompletion: number;
  estimatedCompletionDate: string;
  nextMilestoneHours: number;
  unlockedMilestones: number[];
}

export interface MilestoneBadge {
  hours: number;
  title: string;
  description: string;
  unlocked: boolean;
}

export function calculate360Status(
  totalActiveSeconds: number,
  weeklyActiveSeconds = 12600, // Default 3.5h/week (20m/day * 7 + bonus)
  now = new Date(),
): Fluency360Status {
  const sanitizedSeconds = Math.max(0, Math.round(totalActiveSeconds));
  const totalActiveHours = Math.round((sanitizedSeconds / 3600) * 10) / 10;
  const targetHours = 360.0;
  const remainingSeconds = Math.max(0, TARGET_FLUENCY_SECONDS - sanitizedSeconds);
  const remainingHours = Math.round((remainingSeconds / 3600) * 10) / 10;
  const progressPercent = Math.min(100, Math.round((sanitizedSeconds / TARGET_FLUENCY_SECONDS) * 1000) / 10);

  const cefrLevel = getCefrLevel(totalActiveHours);
  const weeklyVelocityHours = Math.max(0.5, Math.round((weeklyActiveSeconds / 3600) * 10) / 10);
  const estimatedDaysToCompletion =
    remainingHours === 0 ? 0 : Math.ceil((remainingHours / weeklyVelocityHours) * 7);

  const completionDateObj = new Date(now.getTime() + estimatedDaysToCompletion * 24 * 60 * 60 * 1000);
  const estimatedCompletionDate = completionDateObj.toISOString().split("T")[0] ?? "";

  const unlockedMilestones: number[] = [];
  for (let m = MILESTONE_INTERVAL_HOURS; m <= 360; m += MILESTONE_INTERVAL_HOURS) {
    if (totalActiveHours >= m) {
      unlockedMilestones.push(m);
    }
  }

  const nextMilestoneHours = Math.min(
    360,
    (unlockedMilestones.length + 1) * MILESTONE_INTERVAL_HOURS,
  );

  return {
    totalActiveSeconds: sanitizedSeconds,
    totalActiveHours,
    targetHours,
    remainingSeconds,
    remainingHours,
    progressPercent,
    cefrLevel,
    weeklyVelocityHours,
    estimatedDaysToCompletion,
    estimatedCompletionDate,
    nextMilestoneHours,
    unlockedMilestones,
  };
}

export function getCefrLevel(activeHours: number): string {
  if (activeHours < 30) return "A1 (Discovery)";
  if (activeHours < 90) return "A2 (Elementary)";
  if (activeHours < 180) return "B1 (Intermediate)";
  if (activeHours < 300) return "B2 (Functional Fluency)";
  if (activeHours < 360) return "B2+ (Advanced Fluency)";
  return "C1 (Fluent Autonomous)";
}

export function getAllMilestones(totalActiveHours: number): MilestoneBadge[] {
  const milestones: MilestoneBadge[] = [];
  for (let h = 30; h <= 360; h += 30) {
    milestones.push({
      hours: h,
      title: getMilestoneTitle(h),
      description: getMilestoneDescription(h),
      unlocked: totalActiveHours >= h,
    });
  }
  return milestones;
}

function getMilestoneTitle(hours: number): string {
  switch (hours) {
    case 30:
      return "Primeiros Passos (30h)";
    case 60:
      return "Construção de Léxico (60h)";
    case 90:
      return "Autonomia A2 (90h)";
    case 120:
      return "Compreensão Auditiva (120h)";
    case 150:
      return "Imersão Intermediária (150h)";
    case 180:
      return "Ponte B1 (180h)";
    case 210:
      return "Fluência em Expansão (210h)";
    case 240:
      return "Expressão Complexa (240h)";
    case 270:
      return "Domínio de Matizes (270h)";
    case 300:
      return "Consolidação B2 (300h)";
    case 330:
      return "Refino Cultural (330h)";
    case 360:
      return "Fluência 360h Atingida! (360h)";
    default:
      return `Marco ${hours}h`;
  }
}

function getMilestoneDescription(hours: number): string {
  switch (hours) {
    case 30:
      return "Domínio inicial de cadência e estruturas básicas de sobrevivência.";
    case 60:
      return "Reconhecimento rápido de cognatos e acervo de 500+ frases ativas.";
    case 90:
      return "Consolidação do nível A2: capacidade de conversar em contextos cotidianos.";
    case 120:
      return "Ajuste fino de escuta com foco nos contrastes de pronúncia nativos.";
    case 150:
      return "Capacidade de acompanhar áudios nativos sem legenda em velocidade reduzida.";
    case 180:
      return "Metade da jornada concluída! Entrada no nível B1 funcional.";
    case 210:
      return "Construção espontânea de argumentos e narrativas sem tradução mental.";
    case 240:
      return "Uso seguro de construções gramaticais avançadas e idioms regionais.";
    case 270:
      return "Velocidade de escuta e fala igual à velocidade natural de conversação.";
    case 300:
      return "Alcançou o nível B2! Capacidade de trabalhar e estudar na língua alvo.";
    case 330:
      return "Compreensão profunda de piadas, ironias e referências culturais.";
    case 360:
      return "Meta Prosa 360h concluída com sucesso! Autonomia de comunicação garantida.";
    default:
      return `Concluídas ${hours} horas de estudo ativo acumulado.`;
  }
}
