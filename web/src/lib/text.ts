export function keepWords(value: string): string {
  return value.replace(/ /g, "\u00A0");
}
