export type ThemePreference = "system" | "light" | "dark";
export type ResolvedScheme = "light" | "dark";

export const THEME_KEY_V2 = "prosa.theme.v2";
export const THEME_KEY_V1 = "prosa.theme.v1";

/**
 * Resolve a preferência de tema e a migração de v1 para v2.
 * Conforme Decisão D3 e Seção 7.11 de docs/11-plano-de-refatoracao.md.
 */
export function resolveThemeMigration(
  storedV2?: string,
  storedV1?: string
): { preference: ThemePreference; nextV2: ThemePreference | null } {
  if (storedV2 === "system" || storedV2 === "light" || storedV2 === "dark") {
    return { preference: storedV2, nextV2: null };
  }
  // Migração de prosa.theme.v1: quem tinha "dark" continua "dark"
  if (storedV1 === "dark") {
    return { preference: "dark", nextV2: "dark" };
  }
  // "light" ou ausente vira "system" por padrão (Decisão D3)
  return { preference: "system", nextV2: "system" };
}
