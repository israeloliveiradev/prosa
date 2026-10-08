export type Palette = {
  // Novos tokens da spec
  paper: string;
  card: string;
  sunken: string;
  line: string;
  ink: string;
  muted: string;

  primary: string;
  primaryEdge: string;
  onPrimary: string;
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

  // Legados para retrocompatibilidade
  surface: string;
  surfaceBright: string;
  onSurface: string;
  onSurfaceVariant: string;
  primaryContainer: string;
  onPrimaryContainer: string;
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
  paper: "#FBF6EF",
  card: "#FFFFFF",
  sunken: "#F3EADF",
  line: "#E8DCCF",
  ink: "#1F1A17",
  muted: "#5C534C",

  primary: "#C2410C",
  primaryEdge: "#9A3412",
  onPrimary: "#FFFFFF",
  primarySoft: "#FCE3D3",

  success: "#15803D",
  successEdge: "#166534",
  onSuccess: "#FFFFFF",
  successSoft: "#DCFCE7",

  danger: "#DC2626",
  dangerEdge: "#991B1B",
  onDanger: "#FFFFFF",
  dangerSoft: "#FEE2E2",

  streak: "#F59E0B",
  streakEdge: "#B45309",
  onStreak: "#1F1A17",

  xp: "#2563EB",
  xpEdge: "#1E40AF",
  onXp: "#FFFFFF",
  xpSoft: "#DBEAFE",

  pro: "#7C3AED",
  proEdge: "#5B21B6",
  onPro: "#FFFFFF",

  // Mapeamentos para componentes existentes
  surface: "#FBF6EF",
  surfaceBright: "#FFFFFF",
  onSurface: "#1F1A17",
  onSurfaceVariant: "#5C534C",
  primaryContainer: "#FCE3D3",
  onPrimaryContainer: "#9A3412",
  secondary: "#15803D",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#DCFCE7",
  onSecondaryContainer: "#166534",
  tertiary: "#C2410C",
  tertiaryContainer: "#F3EADF",
  onTertiaryContainer: "#1F1A17",
  outline: "#E8DCCF",
  outlineVariant: "#F3EADF",
  error: "#DC2626",
  errorContainer: "#FEE2E2",
  onErrorContainer: "#991B1B",
  inverseSurface: "#1F1A17",
  inverseOnSurface: "#FBF6EF",
  inversePrimary: "#FCE3D3",
};

export const darkPalette: Palette = {
  paper: "#14110F",
  card: "#1E1916",
  sunken: "#2A231F",
  line: "#3A312B",
  ink: "#F5EDE6",
  muted: "#C9BBAF",

  primary: "#F07A45",
  primaryEdge: "#B4541F",
  onPrimary: "#1C0A06",
  primarySoft: "#3A2218",

  success: "#4ADE80",
  successEdge: "#15803D",
  onSuccess: "#14110F",
  successSoft: "#12321F",

  danger: "#F87171",
  dangerEdge: "#B91C1C",
  onDanger: "#14110F",
  dangerSoft: "#3B1414",

  streak: "#FBBF24",
  streakEdge: "#B45309",
  onStreak: "#14110F",

  xp: "#60A5FA",
  xpEdge: "#1D4ED8",
  onXp: "#14110F",
  xpSoft: "#172554",

  pro: "#A78BFA",
  proEdge: "#6D28D9",
  onPro: "#14110F",

  // Mapeamentos para componentes existentes
  surface: "#14110F",
  surfaceBright: "#1E1916",
  onSurface: "#F5EDE6",
  onSurfaceVariant: "#C9BBAF",
  primaryContainer: "#3A2218",
  onPrimaryContainer: "#FCE3D3",
  secondary: "#4ADE80",
  onSecondary: "#14110F",
  secondaryContainer: "#12321F",
  onSecondaryContainer: "#DCFCE7",
  tertiary: "#F07A45",
  tertiaryContainer: "#2A231F",
  onTertiaryContainer: "#F5EDE6",
  outline: "#3A312B",
  outlineVariant: "#2A231F",
  error: "#F87171",
  errorContainer: "#3B1414",
  onErrorContainer: "#FEE2E2",
  inverseSurface: "#FBF6EF",
  inverseOnSurface: "#1F1A17",
  inversePrimary: "#C2410C",
};

export const color = lightPalette;

export const motion = {
  press: 120,
  short: 200,
  medium: 320,
  celebrate: 500,
  emphasized: 500,
} as const;
