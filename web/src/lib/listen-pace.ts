export const LISTEN_RATES = [0.75, 1, 1.15] as const;

export type ListenRate = (typeof LISTEN_RATES)[number];

export function localDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dayIndex(date: string, length: number): number {
  if (length <= 1) {
    return 0;
  }
  const day = Number(date.replace(/\D/g, ""));
  if (!Number.isFinite(day)) {
    return 0;
  }
  return day % length;
}

export function isListenRate(value: number): value is ListenRate {
  return value === 0.75 || value === 1 || value === 1.15;
}
