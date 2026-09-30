export interface MinimalPair {
  a: string;
  b: string;
}

export interface PronunciationContrast {
  id: string;
  through: string;
  target: string;
  name: { pt: string; en: string };
  hint: { pt: string; en: string };
  pairs: MinimalPair[];
}

const CONTRASTS: readonly PronunciationContrast[] = [
  {
    id: "en-th",
    through: "pt",
    target: "en",
    name: { pt: "th", en: "th" },
    hint: {
      pt: "A língua sai entre os dentes. Não vira f nem s.",
      en: "The tongue sits between the teeth. It does not become f or s.",
    },
    pairs: [
      { a: "think", b: "sink" },
      { a: "three", b: "tree" },
      { a: "thin", b: "fin" },
      { a: "thought", b: "fought" },
    ],
  },
  {
    id: "en-vowel",
    through: "pt",
    target: "en",
    name: { pt: "vogal longa e curta", en: "long and short vowel" },
    hint: {
      pt: "Ship é curto. Sheep segura o i.",
      en: "Ship is short. Sheep holds the ee.",
    },
    pairs: [
      { a: "ship", b: "sheep" },
      { a: "pull", b: "pool" },
      { a: "full", b: "fool" },
      { a: "live", b: "leave" },
    ],
  },
  {
    id: "es-rr",
    through: "pt",
    target: "es",
    name: { pt: "r e rr", en: "r and rr" },
    hint: {
      pt: "O rr vibra mais. Pero e perro não são a mesma palavra.",
      en: "The rr trills longer. Pero and perro are not the same word.",
    },
    pairs: [
      { a: "pero", b: "perro" },
      { a: "caro", b: "carro" },
      { a: "ahora", b: "ahorra" },
    ],
  },
  {
    id: "fr-u",
    through: "pt",
    target: "fr",
    name: { pt: "u francês", en: "French u" },
    hint: {
      pt: "O u é com os lábios de u e a língua de i.",
      en: "The u uses rounded lips and an ee tongue.",
    },
    pairs: [
      { a: "tu", b: "tout" },
      { a: "su", b: "sous" },
      { a: "rue", b: "roue" },
    ],
  },
  {
    id: "fr-nasal",
    through: "pt",
    target: "fr",
    name: { pt: "vogal nasal", en: "nasal vowel" },
    hint: {
      pt: "O ar sai pelo nariz. Bon não termina em n falado.",
      en: "The air goes through the nose. Bon does not end in a spoken n.",
    },
    pairs: [
      { a: "beau", b: "bon" },
      { a: "bas", b: "ban" },
      { a: "paix", b: "pain" },
    ],
  },
  {
    id: "de-umlaut",
    through: "pt",
    target: "de",
    name: { pt: "ü e ö", en: "ü and ö" },
    hint: {
      pt: "Schön arredonda. Schon não.",
      en: "Schön is rounded. Schon is not.",
    },
    pairs: [
      { a: "schön", b: "schon" },
      { a: "für", b: "vier" },
      { a: "Tür", b: "Tier" },
    ],
  },
  {
    id: "de-ch",
    through: "pt",
    target: "de",
    name: { pt: "ch", en: "ch" },
    hint: {
      pt: "Ich é suave, no palato. Ach é mais atrás.",
      en: "Ich is soft, at the palate. Ach sits further back.",
    },
    pairs: [
      { a: "ich", b: "ach" },
      { a: "mich", b: "mach" },
      { a: "dich", b: "doch" },
    ],
  },
  {
    id: "it-double",
    through: "pt",
    target: "it",
    name: { pt: "consoante dobrada", en: "double consonant" },
    hint: {
      pt: "A consoante dobrada segura o som. Note e notte mudam o sentido.",
      en: "A double consonant holds the sound. Note and notte change the meaning.",
    },
    pairs: [
      { a: "note", b: "notte" },
      { a: "casa", b: "cassa" },
      { a: "caro", b: "carro" },
    ],
  },
  {
    id: "ru-soft",
    through: "pt",
    target: "ru",
    name: { pt: "consoante mole", en: "soft consonant" },
    hint: {
      pt: "A consoante mole encosta a língua no palato. Мат e мать não são iguais.",
      en: "The soft consonant raises the tongue. Мат and мать are not the same.",
    },
    pairs: [
      { a: "мать", b: "мат" },
      { a: "брать", b: "брат" },
      { a: "уголь", b: "угол" },
    ],
  },
  {
    id: "ja-length",
    through: "pt",
    target: "ja",
    name: { pt: "vogal longa", en: "long vowel" },
    hint: {
      pt: "A vogal longa dura o dobro. おばさん e おばあさん são pessoas diferentes.",
      en: "The long vowel lasts twice as long. おばさん and おばあさん are different people.",
    },
    pairs: [
      { a: "おばさん", b: "おばあさん" },
      { a: "きて", b: "きいて" },
      { a: "ここ", b: "こうこう" },
    ],
  },
];

export interface HvptTrial {
  pair: number;
  side: 0 | 1;
  voice: number;
}

export function contrastById(id: string): PronunciationContrast | undefined {
  return CONTRASTS.find((item) => item.id === id);
}

export function contrastsFor(through: string, target: string): PronunciationContrast[] {
  const from = code(through);
  const to = code(target);
  const exact = CONTRASTS.filter((item) => item.through === from && item.target === to);
  if (exact.length > 0) {
    return [...exact];
  }
  if (from === "pt") {
    return [];
  }
  return CONTRASTS.filter((item) => item.through === "pt" && item.target === to).map((item) => ({ ...item }));
}

export function contrastForDay(through: string, target: string, date: string): PronunciationContrast | null {
  const list = contrastsFor(through, target);
  if (list.length === 0) {
    return null;
  }
  return list[dayNumber(date) % list.length] ?? null;
}

export function hvptTrials(contrast: PronunciationContrast, voiceCount: number, date: string): HvptTrial[] {
  const voices = Math.max(1, Math.min(3, Math.floor(voiceCount)));
  const day = dayNumber(date);
  return [0, 1, 2].map((step) => ({
    pair: (day + step) % contrast.pairs.length,
    side: ((day + step) % 2) as 0 | 1,
    voice: step % voices,
  }));
}

export function trialWord(contrast: PronunciationContrast, trial: HvptTrial): string {
  const pair = contrast.pairs[trial.pair] ?? contrast.pairs[0];
  if (!pair) {
    return "";
  }
  return trial.side === 0 ? pair.a : pair.b;
}

function code(lang: string): string {
  return lang.trim().toLowerCase().slice(0, 2);
}

function dayNumber(date: string): number {
  const day = Number(date.replace(/\D/g, ""));
  return Number.isFinite(day) ? day : 0;
}
