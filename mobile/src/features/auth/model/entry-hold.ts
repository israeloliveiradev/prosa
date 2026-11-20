import { useSyncExternalStore } from "react";

/**
 * Enquanto a tela de conta termina a entrada (sessão recém-aberta + sincronização
 * do primeiro dia), o guarda de rota do grupo público espera, para não mandar o
 * aluno a /start antes de saber se a jornada já foi feita em outro aparelho.
 */
let held = false;
const listeners = new Set<() => void>();

export function holdEntry(next: boolean): void {
  if (held === next) {
    return;
  }
  held = next;
  for (const listener of listeners) {
    listener();
  }
}

export function useEntryHold(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => held,
    () => held,
  );
}
