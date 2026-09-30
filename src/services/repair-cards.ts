export interface RepairCard {
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
}

interface MemoryCount {
  note: string;
  count: number;
}

export function recurringCorrectionCards(
  corrections: Array<{ original: string; corrected: string; reason: string; kind: string }>,
  before: MemoryCount[],
  after: MemoryCount[],
): RepairCard[] {
  const fresh = new Set(
    after
      .filter((item) => item.count >= 2 && countOf(before, item.note) < 2)
      .map((item) => key(item.note)),
  );
  return unique(
    corrections
      .filter((item) => fresh.has(key(item.kind)))
      .map((item) => card(item.corrected, item.reason, item.original)),
  );
}

export function recurringGrammarCards(
  notes: Array<{ original: string; corrected: string; reason: string }>,
  beforeCount: number,
): RepairCard[] {
  if (notes.length === 0 || beforeCount !== 1) {
    return [];
  }
  return unique(notes.map((item) => card(item.corrected, item.reason, item.original)));
}

export function calqueCards(
  literals: Array<{ phrase: string; native_alternative: string; reason: string }>,
): RepairCard[] {
  return unique(literals.map((item) => card(item.native_alternative, item.reason, item.phrase)));
}

export function countOf(errors: MemoryCount[], note: string): number {
  return errors.find((item) => key(item.note) === key(note))?.count ?? 0;
}

function card(front: string, back: string, context: string): RepairCard | null {
  const frontPhrase = clip(front);
  const backTranslation = clip(back);
  const contextSentence = clip(context);
  if (!frontPhrase || !backTranslation || !contextSentence) {
    return null;
  }
  return { front_phrase: frontPhrase, back_translation: backTranslation, context_sentence: contextSentence };
}

function unique(cards: Array<RepairCard | null>): RepairCard[] {
  const seen = new Set<string>();
  const kept: RepairCard[] = [];
  for (const item of cards) {
    if (!item) {
      continue;
    }
    const id = key(item.front_phrase);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    kept.push(item);
  }
  return kept;
}

function clip(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 400);
}

function key(value: string): string {
  return value.trim().toLowerCase();
}
