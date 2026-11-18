export interface ReconstructionAnchor {
  date: string;
  topic: string;
  targetLang: string;
  throughLang: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  storyText: string;
  translation: string;
  completedOn: string | null;
}

export function reconstructionDue(anchor: ReconstructionAnchor | null, today: string): ReconstructionAnchor | null {
  if (!anchor || anchor.completedOn) {
    return null;
  }
  return daysBetween(anchor.date, today) >= 2 ? anchor : null;
}

export function scheduleReconstruction(
  pending: ReconstructionAnchor | null,
  next: ReconstructionAnchor | null,
  incoming: ReconstructionAnchor,
): { pending: ReconstructionAnchor | null; next: ReconstructionAnchor | null } {
  const fresh = { ...incoming, completedOn: null };
  if (!pending || pending.completedOn) {
    return { pending: fresh, next: null };
  }
  if (pending.date === incoming.date) {
    return { pending: { ...fresh, completedOn: pending.completedOn }, next };
  }
  return { pending, next: fresh };
}

export function finishReconstruction(
  pending: ReconstructionAnchor | null,
  next: ReconstructionAnchor | null,
  today: string,
): { pending: ReconstructionAnchor | null; next: ReconstructionAnchor | null } {
  if (!pending) {
    return { pending: null, next };
  }
  if (next && next.date !== pending.date) {
    return { pending: { ...next, completedOn: null }, next: null };
  }
  return { pending: { ...pending, completedOn: today }, next: null };
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000);
}
