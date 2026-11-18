/**
 * Design System Prosa — Tokens de Design
 * Conforme Seção 7 do plano de refatoração (docs/11-plano-de-refatoracao.md).
 * Estilo Taste: framed-sheet | Semente Impeccable: seed:60018bf9decc636b
 */

export type Palette = {
  // 7.1 Superfícies e neutros
  sheet: string;
  frame: string;
  raised: string;
  active: string;
  border: string;
  borderSoft: string;
  control: string;
  controlStrong: string;
  ink: string;
  muted: string;
  faint: string;
  scrim: string;

  // 7.2 Cores: ação, acento e status
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  accentInk: string;
  positive: string;
  negative: string;
  warning: string;

  // Pílulas de status
  pillPositiveBg: string;
  pillPositiveInk: string;
  pillNegativeBg: string;
  pillNegativeInk: string;
  pillWarningBg: string;
  pillWarningInk: string;
  pillNeutralBg: string;
  pillNeutralInk: string;

  // 7.3 Gráficos
  chart1: string;
  chart2: string;
  chart3: string;
  grid: string;

  // Elenco
  castReading: string;
  castMemory: string;
  castSpeech: string;
  castJournal: string;

  // 7.7 Vidro
  glassFill: string;
  glassBlur: string;
  glassEdge: string;
  glassSolid: string;

  // 7.6 Sombras
  shadowPopover: string;
  shadowToast: string;
  shadowDialog: string;

  // Legados para retrocompatibilidade durante as Tasks 3 a 14
  surface: string;
  surfaceBright: string;
  paper: string;
  card: string;
  sunken: string;
  line: string;
  onSurface: string;
  onSurfaceVariant: string;
  primaryContainer: string;
  primaryEdge: string;
  primarySoft: string;
  success: string;
  successEdge: string;
  onSuccess: string;
  successSoft: string;
  danger: string;
  dangerEdge: string;
  onDanger: string;
  dangerSoft: string;
  streak: string;
  streakEdge: string;
  onStreak: string;
  xp: string;
  xpEdge: string;
  onXp: string;
  xpSoft: string;
  pro: string;
  proEdge: string;
  onPro: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  outline: string;
  outlineVariant: string;
  error: string;
  errorContainer: string;
  onErrorContainer: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
};

export const lightPalette: Palette = {
  // 7.1 Superfícies e neutros (Acolhedor & Tátil - Stitch Design)
  sheet: "#FFFFFF",
  frame: "#FDFBF7",
  raised: "#F5F0E8",
  active: "#E6F7F5",
  border: "#E2E8F0",
  borderSoft: "#F1F5F9",
  control: "#CBD5E1",
  controlStrong: "#64748B",
  ink: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  scrim: "rgba(15, 23, 42, 0.40)",

  // 7.2 Cores: ação, acento e status (Gamificado & Vibrante)
  primary: "#0D9488",
  onPrimary: "#FFFFFF",
  accent: "#F59E0B",
  onAccent: "#FFFFFF",
  accentSoft: "#FEF3C7",
  accentInk: "#B45309",
  positive: "#10B981",
  negative: "#EF4444",
  warning: "#F59E0B",

  // Pílulas de status
  pillPositiveBg: "#ECFDF5",
  pillPositiveInk: "#047857",
  pillNegativeBg: "#FEF2F2",
  pillNegativeInk: "#B91C1C",
  pillWarningBg: "#FFFBEB",
  pillWarningInk: "#B45309",
  pillNeutralBg: "#F1F5F9",
  pillNeutralInk: "#334155",

  // 7.3 Gráficos & Gamificação
  chart1: "#0D9488",
  chart2: "#06B6D4",
  chart3: "#F59E0B",
  grid: "#E2E8F0",

  // Elenco Pedagógico
  castReading: "#E0F2FE",
  castMemory: "#FEF3C7",
  castSpeech: "#ECFDF5",
  castJournal: "#FCE7F3",

  // 7.7 Vidro
  glassFill: "rgba(255, 255, 255, 0.85)",
  glassBlur: "blur(20px) saturate(180%)",
  glassEdge: "rgba(226, 232, 240, 0.8)",
  glassSolid: "#FFFFFF",

  // 7.6 Sombras Táteis
  shadowPopover: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 0 #E2E8F0",
  shadowToast: "0 14px 28px -4px rgba(13, 148, 136, 0.18), 0 4px 0 #0F766E",
  shadowDialog: "0 20px 40px -10px rgba(0, 0, 0, 0.22)",

  // Legados para retrocompatibilidade
  surface: "#FFFFFF",
  surfaceBright: "#FFFFFF",
  paper: "#FDFBF7",
  card: "#FFFFFF",
  sunken: "#F5F0E8",
  line: "#E2E8F0",
  onSurface: "#0F172A",
  onSurfaceVariant: "#64748B",
  primaryContainer: "#CCFBF1",
  primaryEdge: "#0F766E",
  primarySoft: "#E6F7F5",
  success: "#10B981",
  successEdge: "#059669",
  onSuccess: "#FFFFFF",
  successSoft: "#ECFDF5",
  danger: "#EF4444",
  dangerEdge: "#DC2626",
  onDanger: "#FFFFFF",
  dangerSoft: "#FEF2F2",
  streak: "#FF5722",
  streakEdge: "#C2410C",
  onStreak: "#FFFFFF",
  xp: "#F59E0B",
  xpEdge: "#D97706",
  onXp: "#FFFFFF",
  xpSoft: "#FEF3C7",
  pro: "#8B5CF6",
  proEdge: "#6D28D9",
  onPro: "#FFFFFF",
  secondary: "#F59E0B",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#FEF3C7",
  onSecondaryContainer: "#B45309",
  tertiary: "#FB7185",
  tertiaryContainer: "#FFE4E6",
  onTertiaryContainer: "#BE123C",
  outline: "#CBD5E1",
  outlineVariant: "#E2E8F0",
  error: "#EF4444",
  errorContainer: "#FEF2F2",
  onErrorContainer: "#B91C1C",
  inverseSurface: "#18181B",
  inverseOnSurface: "#F8FAFC",
  inversePrimary: "#5EEAD4",
};

export const darkPalette: Palette = {
  // 7.1 Superfícies e neutros
  sheet: "#17181A",
  frame: "#101112",
  raised: "#1E2023",
  active: "#272A2E",
  border: "#2C2F33",
  borderSoft: "#222427",
  control: "#42474D",
  controlStrong: "#6B7075",
  ink: "#F3F4F5",
  muted: "#B4B7BA",
  faint: "#96999C",
  scrim: "rgba(0, 0, 0, 0.56)",

  // 7.2 Cores: ação, acento e status
  primary: "#F3F4F5",
  onPrimary: "#131416",
  accent: "#5BB3C8",
  onAccent: "#0B1E23",
  accentSoft: "#15343C",
  accentInk: "#A8DCE8",
  positive: "#3FC07A",
  negative: "#E5566F",
  warning: "#E3A447",

  // Pílulas de status
  pillPositiveBg: "#172A1D",
  pillPositiveInk: "#3FC07A",
  pillNegativeBg: "#2C1A20",
  pillNegativeInk: "#E5566F",
  pillWarningBg: "#2B2312",
  pillWarningInk: "#E3A447",
  pillNeutralBg: "#27292C",
  pillNeutralInk: "#D6D8DA",

  // 7.3 Gráficos
  chart1: "#5BB3C8",
  chart2: "#6FA0E0",
  chart3: "#D19A3A",
  grid: "#2C2F33",

  // Elenco
  castReading: "#1A2533",
  castMemory: "#182A21",
  castSpeech: "#252A17",
  castJournal: "#2E1C22",

  // 7.7 Vidro
  glassFill: "rgba(23, 24, 26, 0.78)",
  glassBlur: "blur(20px) saturate(140%)",
  glassEdge: "rgba(255, 255, 255, 0.08)",
  glassSolid: "#17181A",

  // 7.6 Sombras
  shadowPopover: "0 4px 16px rgba(0, 0, 0, 0.40)",
  shadowToast: "0 8px 24px rgba(0, 0, 0, 0.48)",
  shadowDialog: "0 16px 40px rgba(0, 0, 0, 0.56)",

  // Legados para retrocompatibilidade
  surface: "#17181A",
  surfaceBright: "#17181A",
  paper: "#17181A",
  card: "#17181A",
  sunken: "#1E2023",
  line: "#2C2F33",
  onSurface: "#F3F4F5",
  onSurfaceVariant: "#B4B7BA",
  primaryContainer: "#15343C",
  primaryEdge: "#F3F4F5",
  primarySoft: "#15343C",
  success: "#3FC07A",
  successEdge: "#3FC07A",
  onSuccess: "#131416",
  successSoft: "#172A1D",
  danger: "#E5566F",
  dangerEdge: "#E5566F",
  onDanger: "#131416",
  dangerSoft: "#2C1A20",
  streak: "#F3F4F5",
  streakEdge: "#F3F4F5",
  onStreak: "#131416",
  xp: "#5BB3C8",
  xpEdge: "#5BB3C8",
  onXp: "#131416",
  xpSoft: "#15343C",
  pro: "#F3F4F5",
  proEdge: "#F3F4F5",
  onPro: "#131416",
  secondary: "#3FC07A",
  onSecondary: "#131416",
  secondaryContainer: "#172A1D",
  onSecondaryContainer: "#3FC07A",
  tertiary: "#5BB3C8",
  tertiaryContainer: "#1E2023",
  onTertiaryContainer: "#F3F4F5",
  outline: "#2C2F33",
  outlineVariant: "#1E2023",
  error: "#E5566F",
  errorContainer: "#2C1A20",
  onErrorContainer: "#E5566F",
  inverseSurface: "#FFFFFF",
  inverseOnSurface: "#131416",
  inversePrimary: "#1D1F20",
};

export const palette = {
  light: lightPalette,
  dark: darkPalette,
} as const;

export const color = lightPalette;

// 7.4 Tipografia
export type TypeVariant =
  | "display"
  | "title"
  | "section"
  | "subsection"
  | "body"
  | "bodyLarge"
  | "label"
  | "small"
  | "kpi"
  | "kpiLead"
  | "reading"
  | "phrase"
  | "input"
  | "display-lg"
  | "display-sm"
  | "heading-lg"
  | "heading-sm"
  | "body-lg"
  | "body-md"
  | "body-sm"
  | "caption";

export const type = {
  display: { size: 28, line: 34, weight: "600", tracking: -0.02 },
  title: { size: 22, line: 28, weight: "600", tracking: -0.01, sizeDesktop: 24, lineDesktop: 30 },
  section: { size: 16, line: 22, weight: "600", tracking: 0 },
  subsection: { size: 14, line: 20, weight: "600", tracking: 0 },
  body: { size: 14, line: 20, weight: "400", tracking: 0 },
  bodyLarge: { size: 16, line: 24, weight: "400", tracking: 0 },
  label: { size: 14, line: 20, weight: "500", tracking: 0 },
  small: { size: 12, line: 16, weight: "400", tracking: 0 },
  kpi: { size: 24, line: 28, weight: "400", tracking: -0.01, tabular: true },
  kpiLead: { size: 32, line: 36, weight: "400", tracking: -0.02, tabular: true },
  reading: { size: 18, line: 30, weight: "400", tracking: 0, font: "Literata" },
  phrase: { size: 22, line: 32, weight: "400", tracking: -0.01, font: "Literata" },
  input: { size: 16, line: 24, weight: "400", tracking: 0 },
  "display-lg": { size: 28, line: 34, weight: "600", tracking: -0.02 },
  "display-sm": { size: 22, line: 28, weight: "600", tracking: -0.01 },
  "heading-lg": { size: 20, line: 26, weight: "600", tracking: 0 },
  "heading-sm": { size: 16, line: 22, weight: "600", tracking: 0 },
  "body-lg": { size: 16, line: 24, weight: "400", tracking: 0 },
  "body-md": { size: 14, line: 20, weight: "400", tracking: 0 },
  "body-sm": { size: 12, line: 16, weight: "400", tracking: 0 },
  caption: { size: 12, line: 16, weight: "400", tracking: 0 },
} as const;

// 7.5 Espaço
export const space = {
  gutter: { mobile: 16, desktop: 24 },
  gap: { mobile: 16, desktop: 24 },
  cardPad: { mobile: 16, desktop: 20 },
  section: { mobile: 32, desktop: 48 },
  titleTop: { mobile: 24, desktop: 32 },
  fieldGap: 16,
  labelGap: 8,
  formTop: 24,
} as const;

// 7.5 Tamanho
export const size = {
  sidebar: 228,
  topBar: { desktop: 48, mobile: 52 },
  tabBar: 56,
  sheetInset: 8,
  content: 1152,
  reading: "68ch",
  control: { desktop: 32, touch: 44 },
  field: { desktop: 40, touch: 48 },
  row: 48,
  rowDouble: 64,
  navRow: 34,
  hit: 44,
  icon: {
    nav: 16,
    control: 20,
    empty: 24,
  },
} as const;

// 7.6 Raio
export const radius = {
  chip: 999,
  control: 6,
  card: 8,
  sheet: 16,
} as const;

// 7.6 Borda
export const border = {
  width: 1,
  focusRing: 2,
  focusOffset: 2,
} as const;

// 7.6 Sombras
export const shadow = {
  none: "none",
  popover: {
    light: lightPalette.shadowPopover,
    dark: darkPalette.shadowPopover,
  },
  toast: {
    light: lightPalette.shadowToast,
    dark: darkPalette.shadowToast,
  },
  dialog: {
    light: lightPalette.shadowDialog,
    dark: darkPalette.shadowDialog,
  },
} as const;

// 7.6 Camadas (z-index)
export const z = {
  base: 0,
  sticky: 10,
  nav: 20,
  scrim: 30,
  sheet: 40,
  popover: 50,
  toast: 60,
  tooltip: 70,
} as const;

// 7.7 Vidro
export const glass = {
  light: {
    fill: lightPalette.glassFill,
    blur: lightPalette.glassBlur,
    edge: lightPalette.glassEdge,
    solid: lightPalette.glassSolid,
  },
  dark: {
    fill: darkPalette.glassFill,
    blur: darkPalette.glassBlur,
    edge: darkPalette.glassEdge,
    solid: darkPalette.glassSolid,
  },
} as const;

// 7.8 Movimento
export const motion = {
  press: 120,
  quick: 160,
  state: 200,
  stage: 240,
  tabIndicator: 250,
  toastIn: 300,
  toastOut: 250,
  celebrate: 640,
  // retrocompatibilidade com componentes existentes que usam motion.short / medium / emphasized
  short: 200,
  medium: 240,
  emphasized: 250,
  ease: {
    out: "cubic-bezier(0.23, 1, 0.32, 1)",
    inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
    sheet: "cubic-bezier(0.32, 0.72, 0, 1)",
    linear: "linear",
  },
  spring: {
    settle: { duration: 400, dampingRatio: 1 },
    snapBack: { duration: 400, dampingRatio: 0.8 },
    sheet: { duration: 300, dampingRatio: 0.8 },
  },
  scale: {
    press: 0.97,
    enter: 0.96,
  },
  stagger: {
    step: 40,
    max: 240,
  },
} as const;

// 7.3 Tons do elenco
export const cast = {
  reading: { light: lightPalette.castReading, dark: darkPalette.castReading },
  memory: { light: lightPalette.castMemory, dark: darkPalette.castMemory },
  speech: { light: lightPalette.castSpeech, dark: darkPalette.castSpeech },
  journal: { light: lightPalette.castJournal, dark: darkPalette.castJournal },
} as const;
