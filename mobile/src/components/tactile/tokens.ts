/**
 * Paleta do visual tátil (botões 3D, cartões com sombra de base).
 * Um só lugar para as cores que o shell, a conta, Hoje e Trilha compartilham.
 */
export const tactile = {
  bg: "#FDFBF7",
  surface: "#FFFFFF",
  raised: "#F5F0E8",
  border: "#E7E5E4",
  borderStrong: "#CBD5E1",
  ink: "#111C2D",
  body: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  primary: "#0D9488",
  primaryDark: "#0F766E",
  primaryInk: "#00685F",
  primarySoft: "#E6F4F1",
  streak: "#EA580C",
  streakSoft: "#FFF1E8",
  amber: "#B45309",
  amberSoft: "#FEF3C7",
  danger: "#B91C1C",
  dangerSoft: "#FEF2F2",
  success: "#047857",
  successSoft: "#ECFDF5",
  font: "Plus Jakarta Sans",
  serif: "Newsreader",
} as const;

/** Sombra de base (o "degrau" do visual tátil). */
export function ledge(color: string = tactile.border, depth = 4): string {
  return `0 ${depth}px 0 ${color}`;
}
