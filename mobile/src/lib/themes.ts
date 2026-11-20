/**
 * Temas de leitura do aluno (POST /api/v1/onboarding/quiz → users.interests).
 *
 * Os 8 temas fixos são IDs canônicos: o backend (src/services/news-feed.ts)
 * mapeia exatamente estes nomes para as buscas de notícia em cada idioma, então
 * eles viajam sempre assim. A tela mostra o rótulo traduzido (themeLabel).
 * Temas livres viajam como o aluno escreveu, limpos e sem duplicatas.
 *
 * Módulo puro (sem React nem armazenamento) para rodar nos testes unitários.
 */
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

/** Total de temas (fixos + livres) aceito pelo backend. */
export const MAX_THEMES = 12;
/** Tamanho máximo de cada tema aceito pelo backend. */
export const MAX_THEME_LENGTH = 48;

export function newsThemeChoices(saved: readonly string[]): string[] {
  const picked = saved.filter((item) => NEWS_THEMES.includes(item as NewsTheme));
  const rest = NEWS_THEMES.filter((item) => !picked.includes(item));
  return [...picked, ...rest];
}

export function isNewsTheme(value: unknown): value is NewsTheme {
  return typeof value === "string" && (NEWS_THEMES as readonly string[]).includes(value);
}

/** Limpa o texto de um tema: espaços colapsados e corte no limite do backend. */
export function normalizeTheme(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_THEME_LENGTH).trim();
}

/** Chave de comparação: sem acentos, minúscula, para "Música" = "musica". */
export function themeKey(value: string): string {
  return normalizeTheme(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function hasTheme(list: readonly string[], value: string): boolean {
  const key = themeKey(value);
  return key.length > 0 && list.some((item) => themeKey(item) === key);
}

/**
 * Lista limpa: sem vazios, sem duplicatas, no máximo MAX_THEMES. Um tema livre
 * que coincide com um fixo vira o ID canônico do fixo.
 */
export function sanitizeThemes(list: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const clean = canonicalTheme(item);
    if (!clean || hasTheme(out, clean)) continue;
    out.push(clean);
    if (out.length >= MAX_THEMES) break;
  }
  return out;
}

/** Devolve o ID canônico quando o texto corresponde a um tema fixo. */
export function canonicalTheme(raw: string): string {
  const clean = normalizeTheme(raw);
  const key = themeKey(clean);
  const preset = NEWS_THEMES.find((item) => themeKey(item) === key);
  return preset ?? clean;
}

export function toggleTheme(list: readonly string[], theme: string): string[] {
  if (hasTheme(list, theme)) {
    return removeTheme(list, theme);
  }
  return addTheme(list, theme).list;
}

export function removeTheme(list: readonly string[], theme: string): string[] {
  const key = themeKey(theme);
  return list.filter((item) => themeKey(item) !== key);
}

export type AddThemeStatus = "added" | "empty" | "duplicate" | "full";

export function addTheme(list: readonly string[], raw: string): { list: string[]; status: AddThemeStatus } {
  const clean = canonicalTheme(raw);
  if (!clean) {
    return { list: [...list], status: "empty" };
  }
  if (hasTheme(list, clean)) {
    return { list: [...list], status: "duplicate" };
  }
  if (list.length >= MAX_THEMES) {
    return { list: [...list], status: "full" };
  }
  return { list: [...list, clean], status: "added" };
}

/**
 * Se o texto livre é o rótulo traduzido de um tema fixo ("Music" na interface
 * em inglês), devolve o ID canônico desse tema; senão, null.
 */
export function presetFromLabel(raw: string, labels: Readonly<Record<NewsTheme, string>>): NewsTheme | null {
  const key = themeKey(raw);
  if (!key) return null;
  return NEWS_THEMES.find((item) => themeKey(item) === key || themeKey(labels[item]) === key) ?? null;
}

/** Rótulo para a tela: traduz os fixos; os livres aparecem como foram escritos. */
export function themeLabel(theme: string, labels: Readonly<Record<NewsTheme, string>>): string {
  return isNewsTheme(theme) ? labels[theme] : theme;
}
