export type Palette = {
  surface: string;
  surfaceBright: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  onPrimary: string;
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
  surface: "#FFF8F1",
  surfaceBright: "#FFFFFF",
  onSurface: "#1C1917",
  onSurfaceVariant: "#44403C",
  primary: "#9A3412",
  onPrimary: "#FFFFFF",
  primaryContainer: "#F8D9C8",
  onPrimaryContainer: "#7C2D12",
  secondary: "#047857",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#D1FAE5",
  onSecondaryContainer: "#064E3B",
  tertiary: "#C2410C",
  tertiaryContainer: "#FFEDD5",
  onTertiaryContainer: "#7C2D12",
  outline: "#E4D2C8",
  outlineVariant: "#F0E0D6",
  error: "#B91C1C",
  errorContainer: "#FEE2E2",
  onErrorContainer: "#7F1D1D",
  inverseSurface: "#1C1917",
  inverseOnSurface: "#FFF8F1",
  inversePrimary: "#F8D9C8",
};

export const darkPalette: Palette = {
  surface: "#0E0C0B",
  surfaceBright: "#1A1614",
  onSurface: "#F6EDE6",
  onSurfaceVariant: "#CDBFB4",
  primary: "#E07A4A",
  onPrimary: "#1C0A06",
  primaryContainer: "#3A2218",
  onPrimaryContainer: "#F8D9C8",
  secondary: "#5FCB9A",
  onSecondary: "#06281C",
  secondaryContainer: "#12382C",
  onSecondaryContainer: "#D1FAE5",
  tertiary: "#F0A36A",
  tertiaryContainer: "#2A1C14",
  onTertiaryContainer: "#FFEDD5",
  outline: "#2E2824",
  outlineVariant: "#241E1B",
  error: "#F0A8A8",
  errorContainer: "#5C1A1A",
  onErrorContainer: "#FEE2E2",
  inverseSurface: "#FFF8F1",
  inverseOnSurface: "#1C1917",
  inversePrimary: "#9A3412",
};

export const color = lightPalette;

export const motion = {
  short: 200,
  medium: 320,
  emphasized: 500,
} as const;
