export const NEWS_THEMES = [
  "Tecnologia e IA",
  "Filosofia",
  "Viagens",
  "Negócios",
  "Cultura pop",
  "Cozinha",
  "Ciência",
  "Música",
] as const;

export type NewsTheme = (typeof NEWS_THEMES)[number];

export function newsThemeChoices(saved: readonly string[]): string[] {
  const picked = saved.filter((item) => NEWS_THEMES.includes(item as NewsTheme));
  const rest = NEWS_THEMES.filter((item) => !picked.includes(item));
  return [...picked, ...rest];
}
