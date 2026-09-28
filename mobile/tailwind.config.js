/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        ember: "var(--ember)",
        emberSoft: "var(--ember-soft)",
        onEmber: "var(--on-ember)",
        moss: "var(--moss)",
        mossSoft: "var(--moss-soft)",
        card: "var(--card)",
        line: "var(--line)",
        roseSoft: "var(--rose-soft)",
        roseInk: "var(--rose-ink)",
        sand: "var(--sand)",
        sandInk: "var(--sand-ink)",
        sidebar: "#1C1917",
        sidebarInk: "#FFF8F1",
        sidebarMuted: "#F8D9C8",
      },
      fontFamily: {
        display: ["Newsreader", "serif"],
        displayItalic: ["Newsreader", "serif"],
        sans: ["Source Sans 3", "sans-serif"],
        label: ["Source Sans 3 Semibold", "sans-serif"],
      },
      fontSize: {
        display: ["52px", { lineHeight: "62px", letterSpacing: "-0.018em" }],
        headline: ["32px", { lineHeight: "42px", letterSpacing: "-0.012em" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "28px",
      },
    },
  },
  plugins: [],
};
