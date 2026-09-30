export function spanishGlossLeak(text: string): boolean {
  return /ñ|¿|¡|cción\b|ción\b|sión\b|ía\b/iu.test(text.normalize("NFC"));
}

export function cardsForThrough<T extends { back_translation: string }>(cards: T[], throughLang: string): T[] {
  if (throughLang !== "pt") {
    return cards;
  }
  return cards.filter((card) => !spanishGlossLeak(card.back_translation));
}
