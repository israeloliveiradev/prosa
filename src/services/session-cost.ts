export type CostLane = "full" | "cheap";
export type CostProvider = "gemini" | "groq" | "openrouter" | "cache" | "edge";

export interface UsageNote {
  task: string;
  provider: CostProvider;
  lane: CostLane;
  cached: boolean;
}

const RATE_MICROS: Record<CostProvider, Record<CostLane, number>> = {
  gemini: { full: 400, cheap: 80 },
  groq: { full: 80, cheap: 20 },
  openrouter: { full: 300, cheap: 60 },
  edge: { full: 15, cheap: 15 },
  cache: { full: 0, cheap: 0 },
};

export function costMicros(note: UsageNote): number {
  if (note.cached || note.provider === "cache") {
    return 0;
  }
  return RATE_MICROS[note.provider][note.lane];
}

export function perSessionMicros(totalMicros: number, sessions: number): number | null {
  if (sessions <= 0) {
    return null;
  }
  return Math.round(totalMicros / sessions);
}

export function usdFromMicros(micros: number): string {
  return (Math.max(0, micros) / 1_000_000).toFixed(3);
}
