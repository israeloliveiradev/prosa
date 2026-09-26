export function levenshtein(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  let previous = new Array<number>(right.length + 1);
  let current = new Array<number>(right.length + 1);
  for (let column = 0; column <= right.length; column += 1) {
    previous[column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;
    const leftCode = left.charCodeAt(row - 1);
    for (let column = 1; column <= right.length; column += 1) {
      const cost = leftCode === right.charCodeAt(column - 1) ? 0 : 1;
      const deletion = (previous[column] ?? 0) + 1;
      const insertion = (current[column - 1] ?? 0) + 1;
      const substitution = (previous[column - 1] ?? 0) + cost;
      current[column] = Math.min(deletion, insertion, substitution);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }

  return previous[right.length] ?? 0;
}

export function normalizeSpeech(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedAccuracy(left: string, right: string): number {
  if (left.length === 0 && right.length === 0) {
    return 100;
  }
  const denominator = Math.max(left.length, right.length);
  const score = (1 - levenshtein(left, right) / denominator) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function mispronouncedWords(reference: string, hypothesis: string): string[] {
  const referenceWords = reference.length === 0 ? [] : reference.split(" ");
  const hypothesisWords = hypothesis.length === 0 ? [] : hypothesis.split(" ");
  const rows = referenceWords.length;
  const columns = hypothesisWords.length;
  const scores: number[][] = Array.from({ length: rows + 1 }, () => Array<number>(columns + 1).fill(0));

  for (let row = 0; row <= rows; row += 1) {
    const line = scores[row];
    if (line) {
      line[0] = row;
    }
  }
  const first = scores[0];
  if (first) {
    for (let column = 0; column <= columns; column += 1) {
      first[column] = column;
    }
  }

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const cost = referenceWords[row - 1] === hypothesisWords[column - 1] ? 0 : 1;
      const line = scores[row];
      const above = scores[row - 1];
      if (!line || !above) {
        continue;
      }
      line[column] = Math.min((above[column] ?? 0) + 1, (line[column - 1] ?? 0) + 1, (above[column - 1] ?? 0) + cost);
    }
  }

  const missed: string[] = [];
  let row = rows;
  let column = columns;
  while (row > 0 || column > 0) {
    const current = scores[row]?.[column];
    const diagonalBase = scores[row - 1]?.[column - 1];
    const referenceWord = referenceWords[row - 1];
    const hypothesisWord = hypothesisWords[column - 1];
    if (
      row > 0 &&
      column > 0 &&
      referenceWord !== undefined &&
      hypothesisWord !== undefined &&
      diagonalBase !== undefined &&
      current === diagonalBase + (referenceWord === hypothesisWord ? 0 : 1)
    ) {
      if (referenceWord !== hypothesisWord) {
        missed.push(referenceWord);
      }
      row -= 1;
      column -= 1;
      continue;
    }
    const above = scores[row - 1]?.[column];
    if (row > 0 && referenceWord !== undefined && above !== undefined && current === above + 1) {
      missed.push(referenceWord);
      row -= 1;
      continue;
    }
    if (column > 0) {
      column -= 1;
      continue;
    }
    break;
  }

  missed.reverse();
  return missed;
}

export function pronunciationReport(reference: string, hypothesis: string): {
  accuracyScore: number;
  mispronouncedWords: string[];
} {
  const normalizedReference = normalizeSpeech(reference);
  const normalizedHypothesis = normalizeSpeech(hypothesis);
  return {
    accuracyScore: normalizedAccuracy(normalizedReference, normalizedHypothesis),
    mispronouncedWords: mispronouncedWords(normalizedReference, normalizedHypothesis),
  };
}
