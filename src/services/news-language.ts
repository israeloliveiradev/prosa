/**
 * Checagem do idioma da notícia adaptada antes de ela entrar no cache (M3).
 *
 * - ja: precisa de kana (para não aceitar chinês) e a maior parte das letras em kana/kanji.
 * - ru: a maior parte das letras em cirílico.
 * - en, es, de, fr, it: proporção de palavras funcionais de cada idioma. O idioma pedido
 *   precisa passar de um mínimo e não pode perder para outro idioma latino.
 *
 * As listas só têm palavras que pertencem a UM dos idiomas (as repetidas, como "la", "que",
 * "con", "il", são removidas ao carregar), então "texto em espanhol no cache de en" não passa.
 */

const LATIN_STOP_WORDS: Record<string, readonly string[]> = {
  en: ["the", "and", "of", "to", "is", "that", "it", "for", "with", "was", "on", "are", "this", "by", "from", "at", "have", "has", "be", "they", "he", "she", "will", "not", "which", "their", "were", "been", "but", "or", "said", "would", "after", "about", "more", "who", "its", "than", "says", "can", "new", "people", "there", "we", "you", "into", "over"],
  es: ["el", "los", "las", "y", "por", "para", "es", "como", "más", "pero", "sus", "ya", "fue", "este", "esta", "porque", "entre", "cuando", "muy", "sin", "sobre", "también", "hasta", "hay", "donde", "desde", "todo", "nos", "durante", "ni", "contra", "ese", "eso", "han", "según", "dijo", "están", "está", "son", "puede", "año", "gobierno", "mientras"],
  de: ["der", "die", "das", "und", "ist", "nicht", "ein", "eine", "zu", "den", "von", "mit", "sich", "des", "auf", "für", "im", "dem", "auch", "werden", "aus", "er", "hat", "dass", "sie", "nach", "wird", "bei", "einer", "um", "am", "sind", "noch", "wie", "einem", "über", "einen", "zum", "haben", "nur", "oder", "aber", "vor", "zur", "bis", "mehr", "durch", "wurde", "soll"],
  fr: ["les", "des", "du", "et", "est", "une", "qui", "pour", "dans", "pas", "au", "aux", "avec", "ce", "elle", "ne", "son", "sa", "ses", "plus", "par", "mais", "ont", "été", "cette", "sont", "nous", "vous", "leur", "aussi", "comme", "être", "selon", "après", "depuis", "lors", "dont", "ils", "où", "était", "fait", "deux"],
  it: ["gli", "della", "delle", "dei", "degli", "che", "e", "è", "per", "non", "sono", "nel", "nella", "alla", "anche", "più", "ma", "dal", "dalla", "questo", "questa", "ci", "sul", "sulla", "tra", "fra", "loro", "essere", "stato", "hanno", "dopo", "ancora", "molto", "anni", "governo", "secondo", "nei", "agli", "alle", "allo"],
};

const DISTINCT: Record<string, ReadonlySet<string>> = (() => {
  const owners = new Map<string, number>();
  for (const words of Object.values(LATIN_STOP_WORDS)) {
    for (const word of new Set(words)) {
      owners.set(word, (owners.get(word) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    Object.entries(LATIN_STOP_WORDS).map(([lang, words]) => [lang, new Set(words.filter((word) => owners.get(word) === 1))]),
  );
})();

/** Mínimo de palavras funcionais do idioma pedido entre as palavras do texto. */
const MIN_STOP_RATIO = 0.08;
/** Texto curto demais não dá para julgar pela proporção: basta não perder para outro idioma. */
const MIN_WORDS_FOR_RATIO = 12;

export interface LanguageVerdict {
  ok: boolean;
  /** Para log: proporções por idioma (latinos) ou proporção do alfabeto (ja/ru). */
  detail: Record<string, number>;
}

function letters(text: string): string[] {
  return [...text].filter((char) => /\p{L}/u.test(char));
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 1000;
}

function latinVerdict(text: string, lang: string): LanguageVerdict {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}']+/u)
    .map((word) => word.replace(/^'+|'+$/g, "").replace(/^(l|d|qu|j|n|s|c|m|t)'/, ""))
    .filter((word) => word.length > 0);
  const detail: Record<string, number> = {};
  for (const [code, set] of Object.entries(DISTINCT)) {
    detail[code] = ratio(words.filter((word) => set.has(word)).length, words.length);
  }
  const own = detail[lang] ?? 0;
  const rival = Math.max(0, ...Object.entries(detail).filter(([code]) => code !== lang).map(([, value]) => value));
  const nonLatin = letters(text).filter((char) => !/\p{Script=Latin}/u.test(char)).length;
  const latinShare = ratio(letters(text).length - nonLatin, letters(text).length);
  detail.latin = latinShare;
  if (latinShare < 0.8) {
    return { ok: false, detail };
  }
  const enough = words.length < MIN_WORDS_FOR_RATIO ? own > 0 || rival === 0 : own >= MIN_STOP_RATIO;
  return { ok: enough && own >= rival, detail };
}

/** O texto está no idioma-alvo pedido? Idiomas sem regra (não deveria acontecer) passam. */
export function languageVerdict(text: string, lang: string): LanguageVerdict {
  const code = lang.toLowerCase().slice(0, 2);
  if (code === "ja") {
    const all = letters(text);
    const kana = all.filter((char) => /[぀-ヿㇰ-ㇿｦ-ﾟ]/.test(char)).length;
    const japanese = all.filter((char) => /[぀-ヿㇰ-ㇿｦ-ﾟ㐀-䶿一-鿿]/.test(char)).length;
    const detail = { japanese: ratio(japanese, all.length), kana: ratio(kana, all.length) };
    return { ok: kana > 0 && detail.japanese >= 0.6 && detail.kana >= 0.1, detail };
  }
  if (code === "ru") {
    const all = letters(text);
    const cyrillic = all.filter((char) => /\p{Script=Cyrillic}/u.test(char)).length;
    const detail = { cyrillic: ratio(cyrillic, all.length) };
    return { ok: detail.cyrillic >= 0.7, detail };
  }
  if (code in DISTINCT) {
    return latinVerdict(text, code);
  }
  return { ok: true, detail: {} };
}

export function isInLanguage(text: string, lang: string): boolean {
  return languageVerdict(text, lang).ok;
}
