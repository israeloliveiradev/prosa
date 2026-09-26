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
  surface: "#F9F8F6",
  surfaceBright: "#FFFFFF",
  onSurface: "#2A211E",
  onSurfaceVariant: "#5E564F",
  primary: "#4A1E24",
  onPrimary: "#F9F8F6",
  primaryContainer: "#E8D5C8",
  onPrimaryContainer: "#4A1E24",
  secondary: "#3B4A3A",
  onSecondary: "#F9F8F6",
  secondaryContainer: "#E4EBE0",
  onSecondaryContainer: "#243028",
  tertiary: "#D89D80",
  tertiaryContainer: "#E8D5C8",
  onTertiaryContainer: "#4A1E24",
  outline: "#E6DDD6",
  outlineVariant: "#E6DDD6",
  error: "#8E1B2C",
  errorContainer: "#F8D6DB",
  onErrorContainer: "#5C1020",
  inverseSurface: "#181515",
  inverseOnSurface: "#F9F8F6",
  inversePrimary: "#E8D5C8",
};

export const darkPalette: Palette = {
  surface: "#141110",
  surfaceBright: "#241E1C",
  onSurface: "#F9F8F6",
  onSurfaceVariant: "#D9CFC8",
  primary: "#E8D5C8",
  onPrimary: "#4A1E24",
  primaryContainer: "#3A2C2A",
  onPrimaryContainer: "#E8D5C8",
  secondary: "#D7E3D2",
  onSecondary: "#243028",
  secondaryContainer: "#2A3328",
  onSecondaryContainer: "#D7E3D2",
  tertiary: "#D89D80",
  tertiaryContainer: "#3A2E28",
  onTertiaryContainer: "#E8D5C8",
  outline: "#3A3330",
  outlineVariant: "#2C2624",
  error: "#F8D6DB",
  errorContainer: "#4A2030",
  onErrorContainer: "#F8D6DB",
  inverseSurface: "#F9F8F6",
  inverseOnSurface: "#181515",
  inversePrimary: "#4A1E24",
};

export const color = lightPalette;

export const motion = {
  short: 200,
  medium: 320,
  emphasized: 500,
} as const;
