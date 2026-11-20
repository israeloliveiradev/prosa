import type { DisplayLocale } from "@/lib/i18n";
import type { SoundNote } from "@/lib/types";

export interface MinimalPair {
  a: string;
  b: string;
}

export interface PronunciationContrast {
  id: string;
  through: string;
  target: string;
  name: Record<DisplayLocale, string>;
  hint: Record<DisplayLocale, string>;
  pairs: MinimalPair[];
}

const CONTRASTS: readonly PronunciationContrast[] = [
  {
    id: "en-th",
    through: "pt",
    target: "en",
    name: {
      pt: "th",
      en: "th",
      de: "th",
      fr: "th",
      es: "th",
      it: "th",
      ja: "th",
    },
    hint: {
      pt: "A língua sai entre os dentes. Não vira f nem s.",
      en: "The tongue sits between the teeth. It does not become f or s.",
      de: "Die Zunge liegt zwischen den Zähnen. Es wird weder f noch s.",
      fr: "La langue se place entre les dents. Ça ne devient ni f ni s.",
      es: "La lengua va entre los dientes. No se convierte en f ni en s.",
      it: "La lingua sta tra i denti. Non diventa né f né s.",
      ja: "舌を歯の間に置きます。fやsの音にはなりません。",
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
    name: {
      pt: "vogal longa e curta",
      en: "long and short vowel",
      de: "langer und kurzer Vokal",
      fr: "voyelle longue et brève",
      es: "vocal larga y corta",
      it: "vocale lunga e breve",
      ja: "長母音と短母音",
    },
    hint: {
      pt: "Ship é curto. Sheep segura o i.",
      en: "Ship is short. Sheep holds the ee.",
      de: "Ship ist kurz. Sheep hält das i lange.",
      fr: "Ship est bref. Sheep tient le i.",
      es: "Ship es corta. Sheep sostiene la i.",
      it: "Ship è breve. Sheep tiene la i.",
      ja: "shipは短く、sheepは「イー」と伸ばします。",
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
    name: {
      pt: "r e rr",
      en: "r and rr",
      de: "r und rr",
      fr: "r et rr",
      es: "r y rr",
      it: "r e rr",
      ja: "rとrr",
    },
    hint: {
      pt: "O rr vibra mais. Pero e perro não são a mesma palavra.",
      en: "The rr trills longer. Pero and perro are not the same word.",
      de: "Das rr rollt länger. Pero und perro sind nicht dasselbe Wort.",
      fr: "Le rr roule plus longtemps. Pero et perro ne sont pas le même mot.",
      es: "La rr vibra más. Pero y perro no son la misma palabra.",
      it: "La rr vibra più a lungo. Pero e perro non sono la stessa parola.",
      ja: "rrは長く震わせます。peroとperroは別の単語です。",
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
    name: {
      pt: "u francês",
      en: "French u",
      de: "französisches u",
      fr: "le u français",
      es: "u francesa",
      it: "u francese",
      ja: "フランス語のu",
    },
    hint: {
      pt: "O u é com os lábios de u e a língua de i.",
      en: "The u uses rounded lips and an ee tongue.",
      de: "Das u entsteht mit gerundeten Lippen und der Zunge wie beim i.",
      fr: "Le u se fait avec les lèvres arrondies et la langue du i.",
      es: "La u se hace con los labios de u y la lengua de i.",
      it: "La u si fa con le labbra della u e la lingua della i.",
      ja: "唇は「ウ」の形、舌は「イ」の位置で発音します。",
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
    name: {
      pt: "vogal nasal",
      en: "nasal vowel",
      de: "Nasalvokal",
      fr: "voyelle nasale",
      es: "vocal nasal",
      it: "vocale nasale",
      ja: "鼻母音",
    },
    hint: {
      pt: "O ar sai pelo nariz. Bon não termina em n falado.",
      en: "The air goes through the nose. Bon does not end in a spoken n.",
      de: "Die Luft geht durch die Nase. Bon endet nicht mit einem gesprochenen n.",
      fr: "L'air passe par le nez. Bon ne se termine pas par un n prononcé.",
      es: "El aire sale por la nariz. Bon no termina en una n pronunciada.",
      it: "L'aria esce dal naso. Bon non finisce con una n pronunciata.",
      ja: "息を鼻に通します。bonの最後のnは発音しません。",
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
    name: {
      pt: "ü e ö",
      en: "ü and ö",
      de: "ü und ö",
      fr: "ü et ö",
      es: "ü y ö",
      it: "ü e ö",
      ja: "üとö",
    },
    hint: {
      pt: "Schön arredonda. Schon não.",
      en: "Schön is rounded. Schon is not.",
      de: "Schön wird mit runden Lippen gesprochen. Schon nicht.",
      fr: "Schön arrondit les lèvres. Schon, non.",
      es: "Schön redondea los labios. Schon no.",
      it: "Schön arrotonda le labbra. Schon no.",
      ja: "schönは唇を丸めます。schonは丸めません。",
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
    name: {
      pt: "ch",
      en: "ch",
      de: "ch",
      fr: "ch",
      es: "ch",
      it: "ch",
      ja: "ch",
    },
    hint: {
      pt: "Ich é suave, no palato. Ach é mais atrás.",
      en: "Ich is soft, at the palate. Ach sits further back.",
      de: "Ich ist weich, am Gaumen. Ach liegt weiter hinten.",
      fr: "Ich est doux, au palais. Ach se fait plus en arrière.",
      es: "Ich es suave, en el paladar. Ach se hace más atrás.",
      it: "Ich è morbido, sul palato. Ach si fa più indietro.",
      ja: "ichは口蓋で柔らかく、achはもっと奥で出します。",
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
    name: {
      pt: "consoante dobrada",
      en: "double consonant",
      de: "Doppelkonsonant",
      fr: "consonne double",
      es: "consonante doble",
      it: "consonante doppia",
      ja: "二重子音",
    },
    hint: {
      pt: "A consoante dobrada segura o som. Note e notte mudam o sentido.",
      en: "A double consonant holds the sound. Note and notte change the meaning.",
      de: "Ein Doppelkonsonant hält den Laut. Note und notte bedeuten Verschiedenes.",
      fr: "La consonne double tient le son. Note et notte changent de sens.",
      es: "La consonante doble sostiene el sonido. Note y notte cambian el sentido.",
      it: "La consonante doppia tiene il suono. Note e notte cambiano significato.",
      ja: "二重子音は音をためます。noteとnotteは意味が違います。",
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
    name: {
      pt: "consoante mole",
      en: "soft consonant",
      de: "weicher Konsonant",
      fr: "consonne molle",
      es: "consonante suave",
      it: "consonante molle",
      ja: "軟子音",
    },
    hint: {
      pt: "A consoante mole encosta a língua no palato. Мат e мать não são iguais.",
      en: "The soft consonant raises the tongue. Мат and мать are not the same.",
      de: "Beim weichen Konsonanten hebt sich die Zunge zum Gaumen. Мат und мать sind nicht gleich.",
      fr: "La consonne molle lève la langue vers le palais. Мат et мать ne sont pas pareils.",
      es: "La consonante suave levanta la lengua hacia el paladar. Мат y мать no son iguales.",
      it: "La consonante molle alza la lingua verso il palato. Мат e мать non sono uguali.",
      ja: "軟子音は舌を口蓋に近づけます。матとматьは同じではありません。",
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
    name: {
      pt: "vogal longa",
      en: "long vowel",
      de: "langer Vokal",
      fr: "voyelle longue",
      es: "vocal larga",
      it: "vocale lunga",
      ja: "長音",
    },
    hint: {
      pt: "A vogal longa dura o dobro. おばさん e おばあさん são pessoas diferentes.",
      en: "The long vowel lasts twice as long. おばさん and おばあさん are different people.",
      de: "Der lange Vokal dauert doppelt so lang. おばさん und おばあさん sind verschiedene Personen.",
      fr: "La voyelle longue dure deux fois plus. おばさん et おばあさん sont des personnes différentes.",
      es: "La vocal larga dura el doble. おばさん y おばあさん son personas distintas.",
      it: "La vocale lunga dura il doppio. おばさん e おばあさん sono persone diverse.",
      ja: "長音は2拍分のばします。おばさんとおばあさんは別の人です。",
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

/**
 * A API devolve as notas de som com o nome e a dica só em pt/en. Elas vêm
 * desta mesma tabela de contrastes, então reencontramos o contraste pelo texto
 * em inglês e mostramos o nome e a dica no idioma da interface.
 */
export function localizeSoundNote(note: Pick<SoundNote, "sound" | "hint">, locale: DisplayLocale): { sound: string; hint: string } {
  const match = CONTRASTS.find((item) => item.hint.en === note.hint.en) ?? CONTRASTS.find((item) => item.name.en === note.sound.en);
  if (match) {
    return { sound: match.name[locale], hint: match.hint[locale] };
  }
  const fallback = locale === "pt" ? "pt" : "en";
  return { sound: note.sound[fallback], hint: note.hint[fallback] };
}
