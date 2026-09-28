export const CAST_SLOTS = ["reading", "memory", "speech", "journal"] as const;
export type CastSlot = (typeof CAST_SLOTS)[number];

export type MindId =
  | "einstein"
  | "plato"
  | "newton"
  | "galileo"
  | "curie"
  | "aristotle"
  | "lovelace"
  | "darwin"
  | "feynman"
  | "socrates"
  | "tesla"
  | "cicero"
  | "davinci"
  | "confucius"
  | "hypatia"
  | "aurelius";

export interface Mind {
  id: MindId;
  slot: CastSlot;
  name: string;
  years: string;
  ink: string;
  paper: string;
  line: { pt: string; en: string };
  bio: { pt: string; en: string };
}

export const DEFAULT_CAST: Record<CastSlot, MindId> = {
  reading: "einstein",
  memory: "curie",
  speech: "feynman",
  journal: "davinci",
};

export const MINDS: readonly Mind[] = [
  {
    id: "einstein",
    slot: "reading",
    name: "Einstein",
    years: "1879–1955",
    ink: "#3F2A14",
    paper: "#E7C98A",
    line: { pt: "Se não dá para desenhar, ainda não entendeu.", en: "If you cannot picture it, you do not yet understand." },
    bio: { pt: "Experimento mental. Trem, relógio, raio de luz.", en: "Thought experiments. A train, a clock, a beam of light." },
  },
  {
    id: "plato",
    slot: "reading",
    name: "Platão",
    years: "c. 428–348 a.C.",
    ink: "#F4EFE6",
    paper: "#5C4A32",
    line: { pt: "A história é a parede da caverna. O que é real?", en: "The story is the cave wall. What is real?" },
    bio: { pt: "Diálogo, não decreto. A forma da coisa, não a cópia.", en: "Dialogue, not decree. The form of the thing, not the copy." },
  },
  {
    id: "newton",
    slot: "reading",
    name: "Newton",
    years: "1643–1727",
    ink: "#F6EDE6",
    paper: "#6B2D2A",
    line: { pt: "Leis, não palpite. A maçã é uma porta.", en: "Laws, not vibes. The apple is a door." },
    bio: { pt: "Se há movimento, nomeie a força. Exato, um pouco severo.", en: "If there is motion, name the force. Spare, a little severe." },
  },
  {
    id: "galileo",
    slot: "reading",
    name: "Galileu",
    years: "1564–1642",
    ink: "#F4EEE6",
    paper: "#3F3A36",
    line: { pt: "Olhe primeiro. A autoridade não é prova.", en: "Look first. Authority is not evidence." },
    bio: { pt: "Telescópio, queda, medida. A história é coisa para observar.", en: "Telescope, fall, measure. The story is a thing to look at." },
  },
  {
    id: "curie",
    slot: "memory",
    name: "Curie",
    years: "1867–1934",
    ink: "#F3F7F0",
    paper: "#3D5A40",
    line: { pt: "Nada a temer. Só a medir de novo.", en: "Nothing to fear. Only to measure again." },
    bio: { pt: "Caderno de laboratório. Uma passada a mais.", en: "Laboratory notebook. One more pass." },
  },
  {
    id: "aristotle",
    slot: "memory",
    name: "Aristóteles",
    years: "384–322 a.C.",
    ink: "#FAF4EA",
    paper: "#8A4A28",
    line: { pt: "Classifique, depois lembre.", en: "Classify, then remember." },
    bio: { pt: "Cada palavra tem um gênero e uma diferença.", en: "Each word has a genus and a difference." },
  },
  {
    id: "lovelace",
    slot: "memory",
    name: "Lovelace",
    years: "1815–1852",
    ink: "#F4EEFF",
    paper: "#4C1D95",
    line: { pt: "O cartão é uma instrução que você roda de novo.", en: "The card is an instruction you run again." },
    bio: { pt: "Ciência poética. A máquina analítica do vocabulário.", en: "Poetic science. The analytical engine of vocabulary." },
  },
  {
    id: "darwin",
    slot: "memory",
    name: "Darwin",
    years: "1809–1882",
    ink: "#F4EEE6",
    paper: "#4A3B2A",
    line: { pt: "Variação primeiro. Depois o nome.", en: "Variation first. Then the name." },
    bio: { pt: "Cada palavra é um espécime. Caderno do Beagle.", en: "Each word is a specimen. Beagle notebook energy." },
  },
  {
    id: "feynman",
    slot: "speech",
    name: "Feynman",
    years: "1918–1988",
    ink: "#FFF4EC",
    paper: "#C2410C",
    line: { pt: "Se não sai simples da boca, ainda não sabe.", en: "If it will not come out simply, you do not know it yet." },
    bio: { pt: "A regra de Feynman. Fale alto. Pegue o vacilo.", en: "The Feynman rule. Say it aloud. Catch the wobble." },
  },
  {
    id: "socrates",
    slot: "speech",
    name: "Sócrates",
    years: "c. 470–399 a.C.",
    ink: "#F6EFE6",
    paper: "#4A3728",
    line: { pt: "Pergunte antes de declarar. Uma frase é um teste.", en: "Ask before you declare. A sentence is a test." },
    bio: { pt: "Elenchus. Ironia sem crueldade. Sei que não sei.", en: "Elenchus. Irony without cruelty. I know that I do not know." },
  },
  {
    id: "tesla",
    slot: "speech",
    name: "Tesla",
    years: "1856–1943",
    ink: "#F4EEFF",
    paper: "#1E1B4B",
    line: { pt: "A frase é uma bobina. A imagem vem antes da boca.", en: "The sentence is a coil. The image comes before the mouth." },
    bio: { pt: "Corrente, ressonância. Visão sem teatro vazio.", en: "Current, resonance. Vision without empty show." },
  },
  {
    id: "cicero",
    slot: "speech",
    name: "Cícero",
    years: "106–43 a.C.",
    ink: "#FAF4EA",
    paper: "#6B5344",
    line: { pt: "Fale para ser entendido no fórum.", en: "Speak to be understood in the forum." },
    bio: { pt: "Retórica com espinha. Cadência, clareza, persuasão.", en: "Rhetoric with a spine. Cadence, clarity, persuasion." },
  },
  {
    id: "davinci",
    slot: "journal",
    name: "Leonardo",
    years: "1452–1519",
    ink: "#FFF8F1",
    paper: "#7C2D12",
    line: { pt: "Desenhe, depois escreva. O caderno é a mente.", en: "Draw it, then write it. The notebook is the mind." },
    bio: { pt: "Anatomia de um dia. Um esboço em palavras.", en: "Anatomy of a day. A sketch in words." },
  },
  {
    id: "confucius",
    slot: "journal",
    name: "Confúcio",
    years: "551–479 a.C.",
    ink: "#FAF4EA",
    paper: "#7A4A24",
    line: { pt: "Escreva só o que a palavra significa.", en: "Write only what the word means." },
    bio: { pt: "Retificar os nomes. O diário é um retorno diário.", en: "Rectify the names. The journal is a daily return." },
  },
  {
    id: "hypatia",
    slot: "journal",
    name: "Hypatia",
    years: "c. 350–415",
    ink: "#F6EFFF",
    paper: "#5B3A8C",
    line: { pt: "Nomeie as partes do dia. Recuse o que não é razão.", en: "Name the parts of the day. Refuse what is not reason." },
    bio: { pt: "Geometria do pensamento na página. Calma, precisa.", en: "Geometry of thought on the page. Calm, precise." },
  },
  {
    id: "aurelius",
    slot: "journal",
    name: "Marco Aurélio",
    years: "121–180",
    ink: "#FFF8F1",
    paper: "#7C2D12",
    line: { pt: "Escreva para si. O que está no seu controle hoje.", en: "Write to yourself. What is in your control today." },
    bio: { pt: "Meditações. Manhã de intenção, noite de revisão.", en: "Meditations. Morning intention, evening review." },
  },
];

const BY_ID = new Map(MINDS.map((mind) => [mind.id, mind]));

export function mindById(id: string): Mind {
  return BY_ID.get(id as MindId) ?? BY_ID.get("einstein")!;
}

export function mindsForSlot(slot: CastSlot): Mind[] {
  return MINDS.filter((mind) => mind.slot === slot);
}

export function parseCast(input: Partial<Record<CastSlot, string>> | undefined): Record<CastSlot, MindId> {
  const next = { ...DEFAULT_CAST };
  for (const slot of CAST_SLOTS) {
    const raw = input?.[slot];
    const mind = raw ? BY_ID.get(raw as MindId) : undefined;
    if (mind && mind.slot === slot) {
      next[slot] = mind.id;
    }
  }
  return next;
}

export function slotForPhase(phase: string): CastSlot {
  if (phase === "review") {
    return "memory";
  }
  if (phase === "shadow") {
    return "speech";
  }
  if (phase === "journal") {
    return "journal";
  }
  return "reading";
}

export const SLOT_ROLE: Record<CastSlot, { pt: string; en: string }> = {
  reading: { pt: "Leitura", en: "Reading" },
  memory: { pt: "Memória", en: "Memory" },
  speech: { pt: "Fala", en: "Speech" },
  journal: { pt: "Diário", en: "Journal" },
};
