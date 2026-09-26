export const CAST = [
  {
    id: "clara",
    name: "Clara",
    role: "Leitura",
    phase: "reading",
    line: "Abre o texto e marca o que pesa.",
  },
  {
    id: "bento",
    name: "Bento",
    role: "Memória",
    phase: "review",
    line: "Vira o cartão só depois de tentar.",
  },
  {
    id: "nuno",
    name: "Nuno",
    role: "Fala",
    phase: "shadow",
    line: "Repete o som, no tempo da frase.",
  },
  {
    id: "lia",
    name: "Lia",
    role: "Diário",
    phase: "journal",
    line: "Fecha o dia em poucas linhas.",
  },
] as const;

export type CastId = (typeof CAST)[number]["id"];

export function castForPhase(phase: string) {
  return CAST.find((person) => person.phase === phase) ?? CAST[0];
}
