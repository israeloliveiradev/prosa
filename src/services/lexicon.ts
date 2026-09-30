const FUNCTION_WORDS: Record<string, string[]> = {
  en: ["a", "an", "the", "of", "and", "to", "in", "is", "it", "for", "on", "with", "as", "at", "by", "from", "or", "be", "this", "that", "i", "you", "he", "she", "we", "they", "my", "your", "not", "but", "was", "are", "his", "her", "their", "have", "has", "do", "did", "will", "can", "if", "so", "there"],
  es: ["el", "la", "los", "las", "un", "una", "de", "y", "a", "en", "que", "es", "por", "con", "no", "se", "lo", "su", "para", "como", "más", "pero", "sus", "le", "ya", "o", "fue", "este", "sí", "porque", "está", "yo", "tú", "él", "ella"],
  pt: ["o", "a", "os", "as", "um", "uma", "de", "e", "em", "que", "é", "do", "da", "não", "se", "para", "com", "por", "um", "no", "na", "eu", "você", "ele", "ela", "mas", "ou", "foi", "como", "já", "está"],
  fr: ["le", "la", "les", "un", "une", "de", "des", "et", "à", "en", "que", "est", "pour", "dans", "ce", "il", "elle", "je", "tu", "nous", "vous", "pas", "ne", "sur", "avec", "mais", "ou", "son", "sa", "ses"],
  de: ["der", "die", "das", "ein", "eine", "und", "in", "zu", "den", "von", "ist", "nicht", "mit", "sich", "auf", "für", "als", "auch", "es", "an", "ich", "du", "er", "sie", "wir", "aber", "oder", "dass"],
  it: ["il", "lo", "la", "i", "gli", "le", "un", "una", "di", "e", "a", "in", "che", "è", "per", "non", "con", "su", "io", "tu", "lui", "lei", "noi", "ma", "o", "come", "del", "della"],
  ru: ["и", "в", "не", "на", "я", "что", "он", "с", "как", "это", "она", "к", "по", "но", "они", "мы", "ты", "из", "у", "за", "от", "о", "же", "бы", "для", "да"],
};

export interface Coverage {
  ratio: number;
  stray: string[];
}

function fold(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function storyTokens(text: string): string[] {
  return fold(text)
    .split(/[^\p{L}\p{M}'’-]+/u)
    .filter((token) => token.length > 0);
}

function expand(phrases: string[]): Set<string> {
  const set = new Set<string>();
  for (const phrase of phrases) {
    const folded = fold(phrase);
    if (!folded) {
      continue;
    }
    set.add(folded);
    for (const token of storyTokens(folded)) {
      set.add(token);
    }
  }
  return set;
}

export function storyCoverage(story: string, known: string[], fresh: string[], targetLang: string): Coverage {
  const tokens = storyTokens(story);
  if (tokens.length < 30) {
    return { ratio: 1, stray: [] };
  }
  const allowed = expand([...known, ...fresh]);
  const functions = new Set(FUNCTION_WORDS[targetLang.toLowerCase()] ?? FUNCTION_WORDS.en);
  let hits = 0;
  const stray: string[] = [];
  for (const token of tokens) {
    if (allowed.has(token) || functions.has(token) || token.length <= 1) {
      hits += 1;
      continue;
    }
    if (!stray.includes(token) && stray.length < 16) {
      stray.push(token);
    }
  }
  return { ratio: hits / tokens.length, stray };
}

export function missingPhrases(story: string, phrases: string[]): string[] {
  const folded = fold(story);
  return phrases.filter((phrase) => {
    const needle = fold(phrase);
    return needle.length > 0 && !folded.includes(needle);
  });
}
