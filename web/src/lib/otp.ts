export function normalizeOtp(raw: string): string {
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, "");
  const spaced = cleaned.match(/\d(?:[\s\-_.]*\d){5}/);
  if (spaced) {
    return spaced[0].replace(/\D/g, "");
  }
  return cleaned.replace(/\D/g, "").slice(0, 6);
}
