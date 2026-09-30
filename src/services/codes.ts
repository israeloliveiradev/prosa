import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeOtp(raw: string): string {
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, "");
  const spaced = cleaned.match(/\d(?:[\s\-_.]*\d){5}/);
  if (spaced) {
    return spaced[0].replace(/\D/g, "");
  }
  return cleaned.replace(/\D/g, "").slice(0, 6);
}

export function digestCode(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

export function sameDigest(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
