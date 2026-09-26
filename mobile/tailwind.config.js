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
        sidebar: "#181515",
        sidebarInk: "#F9F8F6",
        sidebarMuted: "#E8D5C8",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        displayItalic: ["Playfair Display", "serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"],
        label: ["Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        display: ["56px", { lineHeight: "60px", letterSpacing: "-0.03em" }],
        headline: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
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
