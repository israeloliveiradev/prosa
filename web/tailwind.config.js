/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");
const generatedTheme = require("./src/design/generated/tailwind-theme.cjs");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        ...colors,
        ...generatedTheme.colors,
        // PRD Section 6 & Stitch Design System Tokens
        background: "#FDFBF7",
        "background-vanilla": "#FDFBF7",
        surface: "#FFFFFF",
        "surface-white": "#FFFFFF",
        "surface-raised": "#F5F0E8",
        primary: "#0D9488",
        "primary-dark": "#0F766E",
        "primary-shade": "#0F766E",
        "primary-container": "#008378",
        streak: "#FF5722",
        "streak-fire": "#FF5722",
        gems: "#06B6D4",
        "gem-focus": "#06B6D4",
        combo: "#EC4899",
        "border-default": "#E2E8F0",
        "border-strong": "#CBD5E1",
        "text-muted": "#64748B",
        "on-surface": "#111C2D",
        "amber-shade": "#D97706",
        "violet-legendary": "#8B5CF6",
        "success-emerald": "#10B981",
        "error-crimson": "#EF4444",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
        reading: ["Newsreader", "Georgia", "serif"],
        stats: ["Outfit", "Plus Jakarta Sans", "sans-serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"],
        serif: ["Newsreader", "serif"],
      },
      borderRadius: generatedTheme.borderRadius,
      spacing: generatedTheme.spacing,
      fontSize: {
        display: ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
        title: ["22px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        section: ["16px", { lineHeight: "22px" }],
        subsection: ["14px", { lineHeight: "20px" }],
        body: ["14px", { lineHeight: "20px" }],
        bodyLarge: ["16px", { lineHeight: "24px" }],
        label: ["14px", { lineHeight: "20px" }],
        small: ["12px", { lineHeight: "16px" }],
        kpi: ["24px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        kpiLead: ["32px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        reading: ["18px", { lineHeight: "30px" }],
        phrase: ["22px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
        input: ["16px", { lineHeight: "24px" }],

        // Legados mapeados para a nova escala
        h1: ["22px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        headline: ["22px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        h2: ["16px", { lineHeight: "22px" }],
        h3: ["14px", { lineHeight: "20px" }],
        micro: ["12px", { lineHeight: "16px" }],
      },
    },
  },
  plugins: [],
};
