import { mindById, slotForPhase, type MindId } from "@/design/minds";
import { getCast } from "@/lib/cast";

export const CAST_PHASES = [
  { id: "einstein", name: "Einstein", role: "Leitura", phase: "reading", line: "Se não dá para desenhar, ainda não entendeu." },
  { id: "curie", name: "Curie", role: "Memória", phase: "review", line: "Nada a temer. Só a medir de novo." },
  { id: "feynman", name: "Feynman", role: "Fala", phase: "shadow", line: "Se não sai simples da boca, ainda não sabe." },
  { id: "davinci", name: "Leonardo", role: "Diário", phase: "journal", line: "Desenhe, depois escreva. O caderno é a mente." },
] as const;

export type CastId = MindId;

export function castForPhase(phase: string) {
  const mind = mindById(getCast()[slotForPhase(phase)]);
  return {
    id: mind.id,
    name: mind.name,
    role: mind.slot === "reading" ? "Leitura" : mind.slot === "memory" ? "Memória" : mind.slot === "speech" ? "Fala" : "Diário",
    phase,
    line: mind.line.pt,
  };
}
