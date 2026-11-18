import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Appearance, Platform, View } from "react-native";
import { colorScheme } from "nativewind";
import type { Palette } from "@/design/tokens";
import { darkPalette, lightPalette } from "@/design/tokens";
import { themeVars } from "@/design/generated/theme-vars";
import { kv } from "@/lib/kv";

import {
  type ThemePreference,
  type ResolvedScheme,
  THEME_KEY_V2,
  THEME_KEY_V1,
  resolveThemeMigration,
} from "./migration";

export {
  type ThemePreference,
  type ResolvedScheme,
  THEME_KEY_V2,
  THEME_KEY_V1,
  resolveThemeMigration,
};

type ThemeValue = {
  preference: ThemePreference;
  scheme: ResolvedScheme;
  palette: Palette;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function readPreference(): ThemePreference {
  const storedV2 = kv.getString(THEME_KEY_V2);
  const storedV1 = kv.getString(THEME_KEY_V1);
  const { preference, nextV2 } = resolveThemeMigration(storedV2, storedV1);
  if (nextV2) {
    kv.set(THEME_KEY_V2, nextV2);
  }
  return preference;
}

function getSystemScheme(): ResolvedScheme {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  const color = Appearance.getColorScheme();
  return color === "dark" ? "dark" : "light";
}

function resolveScheme(preference: ThemePreference, system: ResolvedScheme): ResolvedScheme {
  if (preference === "system") {
    return system;
  }
  return preference;
}

function applyDocumentTheme(preference: ThemePreference, resolved: ResolvedScheme) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;

  const lightMeta =
    document.querySelector('meta[name="theme-color"][media*="light"]') ||
    document.querySelector('meta[name="theme-color"]:not([media])');
  const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');

  if (preference === "system") {
    if (lightMeta) lightMeta.setAttribute("content", lightPalette.frame);
    if (darkMeta) darkMeta.setAttribute("content", darkPalette.frame);
  } else {
    const forcedColor = preference === "dark" ? darkPalette.frame : lightPalette.frame;
    if (lightMeta) lightMeta.setAttribute("content", forcedColor);
    if (darkMeta) darkMeta.setAttribute("content", forcedColor);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemScheme, setSystemScheme] = useState<ResolvedScheme>(getSystemScheme);

  const scheme = resolveScheme(preference, systemScheme);
  const palette = scheme === "dark" ? darkPalette : lightPalette;

  // Ouvinte de mudanças no esquema do sistema
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setSystemScheme(e.matches ? "dark" : "light");
      };
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } else if (Platform.OS !== "web") {
      const sub = Appearance.addChangeListener(({ colorScheme: nextScheme }) => {
        if (nextScheme === "dark" || nextScheme === "light") {
          setSystemScheme(nextScheme);
        }
      });
      return () => sub.remove();
    }
  }, []);

  useEffect(() => {
    colorScheme.set(preference);
    applyDocumentTheme(preference, scheme);
  }, [preference, scheme]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    kv.set(THEME_KEY_V2, next);
    colorScheme.set(next);
    const nextScheme = resolveScheme(next, systemScheme);
    applyDocumentTheme(next, nextScheme);
  }

  return (
    <ThemeContext.Provider value={{ preference, scheme, palette, setPreference }}>
      <View
        className="flex-1 bg-sheet"
        style={[{ flex: 1, backgroundColor: palette.sheet }, themeVars(palette)]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function peekSurfaceColor(): string {
  const pref = readPreference();
  const sys = getSystemScheme();
  const scheme = resolveScheme(pref, sys);
  return scheme === "dark" ? darkPalette.frame : lightPalette.frame;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    return {
      preference: "system",
      scheme: "light",
      palette: lightPalette,
      setPreference: () => undefined,
    };
  }
  return value;
}

export function useThemeTokens() {
  const { scheme, preference, palette, setPreference } = useTheme();
  return {
    scheme,
    preference,
    setPreference,
    colors: {
      surface: {
        page: palette.sheet,
        card: palette.sheet,
        raised: palette.raised,
      },
      text: {
        primary: palette.ink,
        secondary: palette.muted,
        disabled: palette.faint,
      },
      border: {
        subtle: palette.borderSoft,
        strong: palette.border,
      },
      accent: {
        brand: palette.primary,
        brandSoft: palette.accentSoft,
      },
      status: {
        positive: palette.positive,
        negative: palette.negative,
        warning: palette.warning,
      },
      overlay: {
        scrim: palette.scrim,
      },
    },
    spacing: {
      xxs: 4,
      xs: 8,
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      "2xl": 32,
    },
    radius: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      full: 9999,
    },
    palette,
  };
}

export { themeVars };
