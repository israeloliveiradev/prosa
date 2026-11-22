export function spanishGlossLeak(text: string): boolean {
  // Igual a src/services/through-lang.ts: "ía" final só depois de consoante ("construía" é português).
  return /ñ|¿|¡|cción\b|ción\b|sión\b|(?:^|[^aeiouáéíóúâêôãõ])ía\b/iu.test(text.normalize("NFC"));
}

export function cardsForThrough<T extends { back_translation: string }>(cards: T[], throughLang: string): T[] {
  if (throughLang !== "pt") {
    return cards;
  }
  return cards.filter((card) => !spanishGlossLeak(card.back_translation));
}
