import { cast } from "@/design/tokens";

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
  slotTint: { light: string; dark: string };
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
    slotTint: cast.reading,
    line: { pt: "Se não dá para desenhar, ainda não entendeu.", en: "If you cannot picture it, you do not yet understand." },
    bio: { pt: "Experimento mental. Trem, relógio, raio de luz.", en: "Thought experiments. A train, a clock, a beam of light." },
  },
  {
    id: "plato",
    slot: "reading",
    name: "Platão",
    years: "c. 428–348 a.C.",
    slotTint: cast.reading,
    line: { pt: "A história é a parede da caverna. O que é real?", en: "The story is the cave wall. What is real?" },
    bio: { pt: "Diálogo, não decreto. A forma da coisa, não a cópia.", en: "Dialogue, not decree. The form of the thing, not the copy." },
  },
  {
    id: "newton",
    slot: "reading",
    name: "Newton",
    years: "1643–1727",
    slotTint: cast.reading,
    line: { pt: "Se enxerguei longe, foi sobre os ombros de gigantes.", en: "If I have seen further, it is by standing on shoulders of giants." },
    bio: { pt: "Óptica e cálculo. Prisma que separa as cores.", en: "Optics and calculus. The prism that divides color." },
  },
  {
    id: "galileo",
    slot: "reading",
    name: "Galileu",
    years: "1564–1642",
    slotTint: cast.reading,
    line: { pt: "E, no entanto, ela se move.", en: "And yet it moves." },
    bio: { pt: "Telescópio na mão. Meça o que é mensurável.", en: "Telescope in hand. Measure what is measurable." },
  },
  {
    id: "curie",
    slot: "memory",
    name: "Curie",
    years: "1867–1934",
    slotTint: cast.memory,
    line: { pt: "Nada na vida deve ser temido, somente compreendido.", en: "Nothing in life is to be feared, it is only to be understood." },
    bio: { pt: "Toneladas de pechblenda para gramas de rádio.", en: "Tons of pitchblende for grams of radium." },
  },
  {
    id: "aristotle",
    slot: "memory",
    name: "Aristóteles",
    years: "384–322 a.C.",
    slotTint: cast.memory,
    line: { pt: "Somos o que fazemos repetidamente.", en: "We are what we repeatedly do." },
    bio: { pt: "Categorias, causa e hábito. Tudo tem lugar.", en: "Categories, cause and habit. Everything in its place." },
  },
  {
    id: "lovelace",
    slot: "memory",
    name: "Ada Lovelace",
    years: "1815–1852",
    slotTint: cast.memory,
    line: { pt: "A máquina analítica tece padrões algébricos.", en: "The Analytical Engine weaves algebraic patterns." },
    bio: { pt: "Ciência poética. O primeiro algoritmo do mundo.", en: "Poetical science. The world's first algorithm." },
  },
  {
    id: "darwin",
    slot: "memory",
    name: "Darwin",
    years: "1809–1882",
    slotTint: cast.memory,
    line: { pt: "Das menores variações surgem formas sem fim.", en: "Endless forms most beautiful from small variations." },
    bio: { pt: "Caderno B: eu penso. Galápagos, tentilhões.", en: "Notebook B: I think. Galapagos, finches." },
  },
  {
    id: "feynman",
    slot: "speech",
    name: "Feynman",
    years: "1918–1988",
    slotTint: cast.speech,
    line: { pt: "O que não consigo criar, não compreendo.", en: "What I cannot create, I do not understand." },
    bio: { pt: "Bongô e eletrodinâmica quântica. Explique simples.", en: "Bongos and QED. Explain it simply." },
  },
  {
    id: "socrates",
    slot: "speech",
    name: "Sócrates",
    years: "c. 470–399 a.C.",
    slotTint: cast.speech,
    line: { pt: "Uma vida sem exame não vale a pena ser vivida.", en: "The unexamined life is not worth living." },
    bio: { pt: "Apenas perguntas na ágora. A parteira das ideias.", en: "Only questions in the agora. Midwife of ideas." },
  },
  {
    id: "tesla",
    slot: "speech",
    name: "Tesla",
    years: "1856–1943",
    slotTint: cast.speech,
    line: { pt: "O presente é deles; o futuro é meu.", en: "The present is theirs; the future is mine." },
    bio: { pt: "Corrente alternada, motores, relâmpagos em Colorado.", en: "Alternating current, motors, lightning in Colorado." },
  },
  {
    id: "cicero",
    slot: "speech",
    name: "Cícero",
    years: "106–43 a.C.",
    slotTint: cast.speech,
    line: { pt: "Se tens um jardim e uma biblioteca, tens tudo.", en: "If you have a garden and a library, you have everything." },
    bio: { pt: "Retórica romana. Ritmo, pausa e clareza.", en: "Roman rhetoric. Rhythm, pause and clarity." },
  },
  {
    id: "davinci",
    slot: "journal",
    name: "Leonardo",
    years: "1452–1519",
    slotTint: cast.journal,
    line: { pt: "Aprender nunca esgota a mente.", en: "Learning never exhausts the mind." },
    bio: { pt: "Cadernos espelhados, turbulência da água, asas.", en: "Mirror notebooks, water turbulence, wings." },
  },
  {
    id: "confucius",
    slot: "journal",
    name: "Confúcio",
    years: "551–479 a.C.",
    slotTint: cast.journal,
    line: { pt: "Aquele que aprende mas não pensa está perdido.", en: "Learning without thought is labor lost." },
    bio: { pt: "Analectos. Retidão, piedade filial e estudo diário.", en: "Analects. Righteousness, filial piety and daily study." },
  },
  {
    id: "hypatia",
    slot: "journal",
    name: "Hipátia",
    years: "c. 360–415",
    slotTint: cast.journal,
    line: { pt: "Guarde o direito de pensar: errar é melhor que não pensar.", en: "Reserve your right to think, for even to think wrongly is better than not to think at all." },
    bio: { pt: "Matemática em Alexandria. Astrolábios e cônicas.", en: "Mathematics in Alexandria. Astrolabes and conics." },
  },
  {
    id: "aurelius",
    slot: "journal",
    name: "Marco Aurélio",
    years: "121–180",
    slotTint: cast.journal,
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
  if (phase === "journal" || phase === "note") {
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
