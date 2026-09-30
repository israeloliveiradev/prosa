export const CEFR_BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrBand = (typeof CEFR_BANDS)[number];

export interface CanDoItem {
  id: string;
  skill: "reading" | "listening" | "speaking" | "writing";
  text: { pt: string; en: string };
}

const DESCRIPTORS: Record<CefrBand, CanDoItem[]> = {
  A1: [
    { id: "a1-read", skill: "reading", text: { pt: "Leio avisos curtos e nomes no cotidiano.", en: "I can read short everyday notices and names." } },
    { id: "a1-listen", skill: "listening", text: { pt: "Entendo saudações e números falados devagar.", en: "I can follow greetings and numbers said slowly." } },
    { id: "a1-speak", skill: "speaking", text: { pt: "Consigo me apresentar e pedir uma coisa simples.", en: "I can introduce myself and ask for one simple thing." } },
    { id: "a1-write", skill: "writing", text: { pt: "Escrevo um recado curto com nome e data.", en: "I can write a short note with a name and a date." } },
  ],
  A2: [
    { id: "a2-read", skill: "reading", text: { pt: "Leio e-mails curtos sobre planos do dia.", en: "I can read short emails about the day's plans." } },
    { id: "a2-listen", skill: "listening", text: { pt: "Entendo o essencial de um aviso na estação.", en: "I can catch the gist of an announcement at a station." } },
    { id: "a2-speak", skill: "speaking", text: { pt: "Peço comida e troco uma informação simples.", en: "I can order food and exchange one simple fact." } },
    { id: "a2-write", skill: "writing", text: { pt: "Escrevo um recado de algumas frases.", en: "I can write a note of a few sentences." } },
  ],
  B1: [
    { id: "b1-read", skill: "reading", text: { pt: "Leio uma prosa curta e extraio o ponto principal.", en: "I can read a short prose piece and get the main point." } },
    { id: "b1-listen", skill: "listening", text: { pt: "Entendo o fio de uma conversa sobre um tema conhecido.", en: "I can follow a conversation on a familiar topic." } },
    { id: "b1-speak", skill: "speaking", text: { pt: "Conto um acontecimento e digo o que acho.", en: "I can recount an event and say what I think." } },
    { id: "b1-write", skill: "writing", text: { pt: "Escrevo um parágrafo ligado com conectivos simples.", en: "I can write a paragraph with simple connectors." } },
  ],
  B2: [
    { id: "b2-read", skill: "reading", text: { pt: "Leio um artigo e distingo fato de opinião.", en: "I can read an article and tell fact from opinion." } },
    { id: "b2-listen", skill: "listening", text: { pt: "Entendo uma discussão e o ponto de cada um.", en: "I can follow a discussion and each person's point." } },
    { id: "b2-speak", skill: "speaking", text: { pt: "Argumento com algum detalhe e peço esclarecimento.", en: "I can argue in some detail and ask for clarification." } },
    { id: "b2-write", skill: "writing", text: { pt: "Escrevo um texto com subordinação e um motivo claro.", en: "I can write a text with subordination and a clear reason." } },
  ],
  C1: [
    { id: "c1-read", skill: "reading", text: { pt: "Leio prosa densa e capto ironia ou ressalva.", en: "I can read dense prose and catch irony or a caveat." } },
    { id: "c1-listen", skill: "listening", text: { pt: "Entendo fala rápida sobre um tema abstrato.", en: "I can follow fast speech on an abstract topic." } },
    { id: "c1-speak", skill: "speaking", text: { pt: "Sustento uma posição e reformulo sem perder o fio.", en: "I can hold a position and rephrase without losing the thread." } },
    { id: "c1-write", skill: "writing", text: { pt: "Escrevo com nuance e organizo um argumento longo.", en: "I can write with nuance and shape a longer argument." } },
  ],
  C2: [
    { id: "c2-read", skill: "reading", text: { pt: "Leio qualquer prosa do curso e vejo o que ficou de fora.", en: "I can read any course prose and see what was left unsaid." } },
    { id: "c2-listen", skill: "listening", text: { pt: "Entendo fala idiomática e o tom por trás dela.", en: "I can follow idiomatic speech and the tone behind it." } },
    { id: "c2-speak", skill: "speaking", text: { pt: "Falo com precisão e ajusto o registro no momento.", en: "I can speak with precision and shift register on the spot." } },
    { id: "c2-write", skill: "writing", text: { pt: "Escrevo no tom certo para o leitor e o propósito.", en: "I can write in the right tone for the reader and the purpose." } },
  ],
};

export function canDoFor(level: string): CanDoItem[] {
  const band = CEFR_BANDS.includes(level as CefrBand) ? (level as CefrBand) : "A2";
  return DESCRIPTORS[band].map((item) => ({ ...item }));
}

export function canDoScore(held: string[], level: string): number {
  const items = canDoFor(level);
  if (items.length === 0) {
    return 0;
  }
  const ids = new Set(held);
  const hits = items.filter((item) => ids.has(item.id)).length;
  return Math.round((hits / items.length) * 100);
}
