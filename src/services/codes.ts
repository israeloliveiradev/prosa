import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function digestCode(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

export function sameDigest(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
