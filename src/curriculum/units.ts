import type { PathBand, UnitSkeleton } from "./types.js";

/**
 * Esqueleto funcional da trilha (igual para todos os idiomas-alvo).
 * NÃO renumere nem remova ids: o progresso salvo (path_progress) aponta para eles.
 */
export const UNITS: readonly UnitSkeleton[] = [
  // A1
  { id: "a1-01", band: "A1", order: 1, topic: "greeting people, introducing yourself, saying where you are from", focus: ["speaking", "listening"] },
  { id: "a1-02", band: "A1", order: 2, topic: "family and the people around you, simple descriptions of people", focus: ["speaking", "reading"] },
  { id: "a1-03", band: "A1", order: 3, topic: "numbers, telling the time, days of the week, dates and simple schedules", focus: ["listening", "reading"] },
  { id: "a1-04", band: "A1", order: 4, topic: "ordering food and drinks, saying what you like and dislike", focus: ["speaking", "listening"] },
  { id: "a1-05", band: "A1", order: 5, topic: "places in town, asking for and understanding simple directions", focus: ["listening", "speaking"] },
  { id: "a1-06", band: "A1", order: 6, topic: "daily routine and habits", focus: ["writing", "speaking"] },
  { id: "a1-07", band: "A1", order: 7, topic: "shopping, prices, quantities and clothes", focus: ["speaking", "listening"] },
  { id: "a1-08", band: "A1", order: 8, topic: "your home, rooms and furniture, describing where you live", focus: ["reading", "writing"] },
  // A2
  { id: "a2-01", band: "A2", order: 9, topic: "talking about last weekend and other past events", focus: ["speaking", "writing"] },
  { id: "a2-02", band: "A2", order: 10, topic: "travel and transport: tickets, hotels, delays", focus: ["listening", "speaking"] },
  { id: "a2-03", band: "A2", order: 11, topic: "work and studies: describing your job or course", focus: ["speaking", "reading"] },
  { id: "a2-04", band: "A2", order: 12, topic: "health and the body, at the doctor or pharmacy", focus: ["listening", "speaking"] },
  { id: "a2-05", band: "A2", order: 13, topic: "future plans, invitations and arranging to meet", focus: ["speaking", "writing"] },
  { id: "a2-06", band: "A2", order: 14, topic: "comparing things and stating simple preferences", focus: ["speaking", "reading"] },
  { id: "a2-07", band: "A2", order: 15, topic: "short messages, emails and phone calls", focus: ["writing", "listening"] },
  { id: "a2-08", band: "A2", order: 16, topic: "life experiences and short biographies", focus: ["reading", "speaking"] },
  // B1
  { id: "b1-01", band: "B1", order: 17, topic: "telling stories and anecdotes with background and events", focus: ["speaking", "writing"] },
  { id: "b1-02", band: "B1", order: 18, topic: "giving opinions with reasons, agreeing and disagreeing", focus: ["speaking", "listening"] },
  { id: "b1-03", band: "B1", order: 19, topic: "solving problems with services, making complaints", focus: ["speaking", "writing"] },
  { id: "b1-04", band: "B1", order: 20, topic: "news and media: understanding and summarising a report", focus: ["reading", "listening"] },
  { id: "b1-05", band: "B1", order: 21, topic: "hypothetical situations, conditions and advice", focus: ["speaking", "writing"] },
  { id: "b1-06", band: "B1", order: 22, topic: "work situations, meetings and formal versus informal register", focus: ["speaking", "listening"] },
  { id: "b1-07", band: "B1", order: 23, topic: "culture and traditions, comparing cultures", focus: ["reading", "speaking"] },
  { id: "b1-08", band: "B1", order: 24, topic: "society and the environment, describing change over time", focus: ["reading", "writing"] },
  // B2
  { id: "b2-01", band: "B2", order: 25, topic: "arguing a point: pros and cons, debate", focus: ["speaking", "writing"] },
  { id: "b2-02", band: "B2", order: 26, topic: "reporting what others said and describing processes", focus: ["reading", "writing"] },
  { id: "b2-03", band: "B2", order: 27, topic: "explaining abstract topics in science and technology", focus: ["reading", "listening"] },
  { id: "b2-04", band: "B2", order: 28, topic: "nuance: hedging, degrees of certainty, speculation", focus: ["speaking", "writing"] },
  { id: "b2-05", band: "B2", order: 29, topic: "professional presentations and negotiations", focus: ["speaking", "listening"] },
  // C1
  { id: "c1-01", band: "C1", order: 30, topic: "persuasive, nuanced argument and rhetoric", focus: ["writing", "speaking"] },
  { id: "c1-02", band: "C1", order: 31, topic: "register, idioms and implied meaning", focus: ["listening", "reading"] },
  { id: "c1-03", band: "C1", order: 32, topic: "synthesising complex sources in academic or professional writing", focus: ["reading", "writing"] },
];

export const UNIT_IDS: readonly string[] = UNITS.map((unit) => unit.id);

export function unitById(id: string): UnitSkeleton | undefined {
  return UNITS.find((unit) => unit.id === id);
}

export function unitsOfBand(band: PathBand): UnitSkeleton[] {
  return UNITS.filter((unit) => unit.band === band);
}

/** Banda da trilha para um nível CEFR do aluno (C2 usa o fim da trilha, C1). */
export function pathBandFor(level: string): PathBand {
  const upper = level.toUpperCase();
  return upper === "C2" ? "C1" : (["A1", "A2", "B1", "B2", "C1"].includes(upper) ? upper : "A1") as PathBand;
}
