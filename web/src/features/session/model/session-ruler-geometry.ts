import {
  type SessionPhase,
  type SessionPhaseId,
  SESSION_SECONDS,
} from "@/lib/session-clock";

export interface PhaseSegment {
  id: SessionPhaseId;
  start: number;
  end: number;
  duration: number;
}

export function phaseName(copy: any, id: SessionPhaseId): string {
  switch (id) {
    case "review":
      return copy?.reviewingGroup ?? "Revisão";
    case "listen":
      return copy?.listenPhase ?? "Ouvir";
    case "reading":
      return copy?.reading ?? "Leitura";
    case "shadow":
      return copy?.speech ?? "Fala";
    case "journal":
      return copy?.journal ?? "Diário";
    case "note":
      return copy?.note ?? "Fecho";
    default:
      return id;
  }
}

export function calculatePhaseSegments(
  phases: SessionPhase[],
  totalDurationSeconds: number = SESSION_SECONDS,
): PhaseSegment[] {
  return phases.map((phase, idx) => {
    const nextStart = phases[idx + 1]?.start ?? totalDurationSeconds;
    const duration = Math.max(1, nextStart - phase.start);
    return {
      id: phase.id,
      start: phase.start,
      end: nextStart,
      duration,
    };
  });
}
