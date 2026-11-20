import type { PathUnit } from "@/api/schemas/path";

/** Estatísticas de "Eu consigo" da tela Você, só a partir da trilha real (GET /path). */
export interface CanDoSummary {
  done: number;
  total: number;
  /** Metas (can_do) da unidade em curso, vazio se não houver. */
  current: { id: string; title: string; goals: string[] } | null;
}

export function summarizeCanDo(units: readonly Pick<PathUnit, "id" | "status" | "title" | "can_do">[], currentUnitId: string | null): CanDoSummary {
  const done = units.filter((unit) => unit.status === "mastered" || unit.status === "validated").length;
  const current = currentUnitId ? units.find((unit) => unit.id === currentUnitId) : undefined;
  return {
    done,
    total: units.length,
    current: current ? { id: current.id, title: current.title, goals: current.can_do.filter((goal) => goal.trim().length > 0) } : null,
  };
}
