/**
 * Nome de um idioma no idioma da interface, via Intl.DisplayNames
 * ("inglês" → "Inglês" em pt, "Englisch" em de, "英語" em ja).
 * Puro: recebe a tag BCP-47 e um fallback para motores sem Intl.DisplayNames.
 */
export function displayLanguageName(code: string, bcp47: string, fallback?: (code: string) => string): string {
  try {
    const DisplayNames = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: "language" }) => { of(code: string): string | undefined } }).DisplayNames;
    if (DisplayNames) {
      const name = new DisplayNames([bcp47], { type: "language" }).of(code);
      if (name && name !== code) {
        return capitalize(name, bcp47);
      }
    }
  } catch {
    // Sem Intl.DisplayNames (alguns motores nativos): cai no fallback.
  }
  return fallback ? fallback(code) : code.toUpperCase();
}

function capitalize(text: string, bcp47: string): string {
  const first = text.charAt(0);
  return first.toLocaleUpperCase(bcp47) + text.slice(1);
}
