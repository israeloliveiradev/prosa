import type { DisplayLocale } from "@/lib/i18n";

/**
 * Idioma de interface entre o aparelho e a conta.
 *
 * Desde o M2 o servidor guarda os 7 idiomas de interface em `display_locale`.
 * Até o M1 ele só guardava "pt" ou "en" (os outros viravam "en"), então uma conta
 * antiga pode trazer esse substituto.
 *
 * Regras (funções puras, para os testes):
 * - num aparelho novo para a conta, o idioma da conta vale;
 * - uma escolha feita neste aparelho depois do último acordo com a conta vale e sobe
 *   para a conta, mesmo que chegue uma resposta velha do servidor;
 * - se só a conta mudou (outro aparelho), o aparelho adota.
 */
const DISPLAY_LOCALES: readonly string[] = ["pt", "en", "de", "fr", "es", "it", "ja"];
/** O que o servidor guardava até o M1. */
const LEGACY_SERVER_LOCALES: readonly string[] = ["pt", "en"];

export function isAccountLocale(value: unknown): value is DisplayLocale {
  return typeof value === "string" && DISPLAY_LOCALES.includes(value);
}

export interface LocaleDecision {
  /** Idioma da conta a aplicar na interface, ou null para manter o do aparelho. */
  adopt: DisplayLocale | null;
  /** Idioma do aparelho a gravar na conta, ou null se não há o que enviar. */
  push: DisplayLocale | null;
  /** Último idioma em que aparelho e conta concordaram (null: ainda não houve acordo). */
  synced: DisplayLocale | null;
}

/**
 * Decide quem vence quando o idioma do aparelho (`local`) e o da conta (`server`)
 * diferem, usando o último acordo entre os dois (`synced`) para saber qual lado mudou.
 */
export function reconcileLocale(input: { local: DisplayLocale; server: unknown; synced: DisplayLocale | null }): LocaleDecision {
  const { local, server, synced } = input;
  if (!isAccountLocale(server)) {
    // Servidor antigo sem o campo, ou valor desconhecido: nada muda.
    return { adopt: null, push: null, synced };
  }
  if (server === local) {
    return { adopt: null, push: null, synced: server };
  }
  if (synced === null) {
    // Primeiro encontro deste aparelho com a conta.
    if (LEGACY_SERVER_LOCALES.includes(server) && !LEGACY_SERVER_LOCALES.includes(local)) {
      // Conta do M1 com o substituto (pt/en) e o aparelho num idioma que o M1 não guardava:
      // o aparelho vale e corrige a conta.
      return { adopt: null, push: local, synced: null };
    }
    return { adopt: server, push: null, synced: server };
  }
  if (synced === local) {
    // O aparelho não mudou desde o último acordo: a conta mudou em outro lugar.
    return { adopt: server, push: null, synced: server };
  }
  // O aparelho mudou depois do último acordo (a conta ainda não sabe, ou a resposta é velha).
  return { adopt: null, push: local, synced };
}

/**
 * Atalho para quem só quer saber se adota o idioma da conta (sem histórico de acordo:
 * trata como primeiro encontro).
 */
export function shouldAdoptServerLocale(local: DisplayLocale, server: unknown): server is DisplayLocale {
  return reconcileLocale({ local, server, synced: null }).adopt !== null;
}
