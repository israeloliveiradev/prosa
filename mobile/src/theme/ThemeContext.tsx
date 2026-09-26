import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { colorScheme, vars } from "nativewind";
import { darkPalette, lightPalette, type Palette } from "@/design/tokens";
import { kv } from "@/lib/kv";

export type ThemePreference = "light" | "dark";

const THEME_KEY = "prosa.theme.v1";

type ThemeValue = {
  preference: ThemePreference;
  scheme: ThemePreference;
  palette: Palette;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function readPreference(): ThemePreference {
  const stored = kv.getString(THEME_KEY);
  if (stored === "dark") {
    return "dark";
  }
  if (stored !== "light") {
    kv.set(THEME_KEY, "light");
  }
  return "light";
}

export function themeVars(palette: Palette) {
  return vars({
    "--paper": palette.surface,
    "--ink": palette.onSurface,
    "--muted": palette.onSurfaceVariant,
    "--ember": palette.primary,
    "--ember-soft": palette.primaryContainer,
    "--on-ember": palette.onPrimary,
    "--moss": palette.secondary,
    "--moss-soft": palette.secondaryContainer,
    "--card": palette.surfaceBright,
    "--line": palette.outline,
    "--rose-soft": palette.errorContainer,
    "--rose-ink": palette.error,
    "--sand": palette.tertiaryContainer,
    "--sand-ink": palette.onTertiaryContainer,
  });
}

function applyDocumentTheme(scheme: ThemePreference) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(scheme);
  root.style.colorScheme = scheme;
}

function bootTheme(): ThemePreference {
  const scheme = readPreference();
  applyDocumentTheme(scheme);
  colorScheme.set(scheme);
  return scheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(bootTheme);
  const palette = preference === "dark" ? darkPalette : lightPalette;

  useEffect(() => {
    colorScheme.set(preference);
    applyDocumentTheme(preference);
  }, [preference]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    kv.set(THEME_KEY, next);
    colorScheme.set(next);
    applyDocumentTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ preference, scheme: preference, palette, setPreference }}>
      <View className="flex-1 bg-paper" style={[{ flex: 1, backgroundColor: palette.surface }, themeVars(palette)]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    return {
      preference: "light",
      scheme: "light",
      palette: lightPalette,
      setPreference: () => undefined,
    };
  }
  return value;
}
