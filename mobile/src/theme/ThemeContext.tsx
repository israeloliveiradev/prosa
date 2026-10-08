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
    // Novos tokens da spec
    "--paper": palette.paper,
    "--card": palette.card,
    "--sunken": palette.sunken,
    "--line": palette.line,
    "--ink": palette.ink,
    "--muted": palette.muted,

    "--primary": palette.primary,
    "--primary-edge": palette.primaryEdge,
    "--on-primary": palette.onPrimary,
    "--primary-soft": palette.primarySoft,

    "--success": palette.success,
    "--success-edge": palette.successEdge,
    "--on-success": palette.onSuccess,
    "--success-soft": palette.successSoft,

    "--danger": palette.danger,
    "--danger-edge": palette.dangerEdge,
    "--on-danger": palette.onDanger,
    "--danger-soft": palette.dangerSoft,

    "--streak": palette.streak,
    "--streak-edge": palette.streakEdge,
    "--on-streak": palette.onStreak,

    "--xp": palette.xp,
    "--xp-edge": palette.xpEdge,
    "--on-xp": palette.onXp,
    "--xp-soft": palette.xpSoft,

    "--pro": palette.pro,
    "--pro-edge": palette.proEdge,
    "--on-pro": palette.onPro,

    // Aliases legados para não quebrar componentes existentes
    "--ember": palette.primary,
    "--ember-soft": palette.primarySoft,
    "--on-ember": palette.onPrimary,
    "--moss": palette.success,
    "--moss-soft": palette.successSoft,
    "--rose-soft": palette.dangerSoft,
    "--rose-ink": palette.danger,
    "--sand": palette.sunken,
    "--sand-ink": palette.ink,
  });
}

function applyDocumentTheme(scheme: ThemePreference, surface: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(scheme);
  root.style.colorScheme = scheme;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", surface);
}

function bootTheme(): ThemePreference {
  const scheme = readPreference();
  applyDocumentTheme(scheme, scheme === "dark" ? darkPalette.surface : lightPalette.surface);
  colorScheme.set(scheme);
  return scheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(bootTheme);
  const palette = preference === "dark" ? darkPalette : lightPalette;

  useEffect(() => {
    colorScheme.set(preference);
    applyDocumentTheme(preference, palette.surface);
  }, [preference, palette.surface]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    kv.set(THEME_KEY, next);
    colorScheme.set(next);
    applyDocumentTheme(next, next === "dark" ? darkPalette.surface : lightPalette.surface);
  }

  return (
    <ThemeContext.Provider value={{ preference, scheme: preference, palette, setPreference }}>
      <View className="flex-1 bg-paper" style={[{ flex: 1, backgroundColor: palette.surface }, themeVars(palette)]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function peekSurfaceColor(): string {
  return readPreference() === "dark" ? darkPalette.surface : lightPalette.surface;
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
