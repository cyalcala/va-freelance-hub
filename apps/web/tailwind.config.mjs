/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm editorial base. Existing token names kept so every current
        // utility class inherits the refined palette; values tuned for a
        // calmer, studio-grade look.
        parchment: "#FBFAF7", // warm paper base
        surface: "#FFFFFF",   // cards / raised surfaces
        sunken: "#F4F1EA",    // recessed fills, chips
        ink: "#17140F",       // warm near-black
        line: "#17140F",      // used at low opacity for hairline borders
        accent: "#DC5A34",    // refined terracotta
        "accent-hover": "#C24A28",
        "accent-soft": "#FBEDE6", // accent tint background
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        // One calm elevation system instead of scattered shadow-lg.
        soft: "0 1px 2px rgb(23 20 15 / 0.04), 0 4px 16px -8px rgb(23 20 15 / 0.10)",
        lift: "0 2px 4px rgb(23 20 15 / 0.05), 0 12px 32px -12px rgb(23 20 15 / 0.16)",
        card: "0 1px 2px rgb(23 20 15 / 0.04)",
      },
      letterSpacing: {
        overline: "0.14em",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
