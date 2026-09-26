export type CadenceNote = "apressou" | "alongou" | "no tempo";

export interface CadenceBar {
  reference: number;
  spoken: number;
  drift: boolean;
  note: CadenceNote;
}

export function cadenceReport(
  referenceMarks: Array<{ offsetMs: number }>,
  spoken: Array<{ durationMs: number }>,
): { score: number; bars: CadenceBar[] } {
  const referenceDurations = durationsFromMarks(referenceMarks);
  const spokenDurations = spoken.map((word) => Math.max(0, word.durationMs)).filter((value) => value > 0);
  const count = Math.min(12, referenceDurations.length, spokenDurations.length);
  if (count === 0) {
    return { score: 0, bars: [] };
  }
  const pairs = Array.from({ length: count }, (_, index) => ({
    reference: referenceDurations[index] ?? 0,
    spoken: spokenDurations[index] ?? 0,
  }));
  const peak = Math.max(...pairs.flatMap((pair) => [pair.reference, pair.spoken]), 1);
  const bars = pairs.map((pair) => {
    const ratio = pair.reference === 0 ? 1 : pair.spoken / pair.reference;
    const note: CadenceNote = ratio < 0.75 ? "apressou" : ratio > 1.35 ? "alongou" : "no tempo";
    return {
      reference: Math.round((pair.reference / peak) * 100),
      spoken: Math.round((pair.spoken / peak) * 100),
      drift: note !== "no tempo",
      note,
    };
  });
  const score = Math.round(
    bars.reduce((total, bar, index) => {
      const ratio = pairs[index]?.reference ? (pairs[index]?.spoken ?? 0) / (pairs[index]?.reference ?? 1) : 1;
      return total + Math.max(0, 100 - Math.min(100, Math.abs(ratio - 1) * 100));
    }, 0) / bars.length,
  );
  return { score, bars };
}

function durationsFromMarks(marks: Array<{ offsetMs: number }>): number[] {
  return marks
    .map((mark, index) => {
      const next = marks[index + 1]?.offsetMs ?? mark.offsetMs + 400;
      return Math.max(80, next - mark.offsetMs);
    })
    .filter((value) => value > 0);
}
