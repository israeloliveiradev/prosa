/**
 * Compatibilidade: o agendamento do app é FSRS (`@/lib/fsrs`).
 * Este módulo só reexporta o tipo da nota para o código que ainda importa daqui.
 */
import { applyFsrs } from "@/lib/fsrs";

export type { ReviewQuality } from "@/lib/fsrs";

/** @deprecated Use `applyFsrs` de `@/lib/fsrs`; agenda com FSRS, não com SM-2. */
export const applySm2 = applyFsrs;
