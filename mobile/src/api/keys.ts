/**
 * Fábrica de chaves única para TanStack Query (Seção 12.6).
 * Todas as consultas do aplicativo utilizam estas funções para indexar cache e invalidações.
 */
export const keys = {
  health: () => ["health"] as const,
  me: () => ["auth", "me"] as const,
  mail: () => ["auth", "mail"] as const,
  placementStatus: (target?: string) => ["placement", "status", target ?? "default"] as const,
  lesson: (p: { target: string; through: string; level: string; topic?: string; cast: string; date: string }) =>
    ["lessons", p] as const,
  cognates: (through: string, target: string) => ["cognates", { through, target }] as const,
  retention: (target: string) => ["srs", "retention", target] as const,
  cards: () => ["srs", "cards"] as const,
  news: (p: { target: string; level: string; themes: string[] }) => ["news", p] as const,
  duelBoard: (target: string) => ["duel", "board", target] as const,
  accountSettings: () => ["account", "settings"] as const,
  billingStatus: () => ["billing", "status"] as const,
  studyTracks: () => ["study", "tracks"] as const,
  courseProfile: (target: string) => ["profile", target] as const,
  admin: {
    dashboard: () => ["admin", "dashboard"] as const,
    summary: () => ["admin", "summary"] as const,
    events: (kind?: string, limit?: number) => ["admin", "events", { kind, limit }] as const,
    users: (q?: string, plan?: string, role?: string) => ["admin", "users", { q, plan, role }] as const,
    user: (id: string) => ["admin", "users", id] as const,
  },
} as const;
