/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing names remain compatible with every public route.
        parchment: "#FAF9F6",
        surface: "#FFFFFF",
        sunken: "#F1EFEB",
        ink: "#24211E",
        muted: "#68615B",
        line: "#24211E",
        control: "#938B83",
        accent: "#BC482D",
        "accent-hover": "#9F3B24",
        "accent-soft": "#F8EBE5",
        evidence: "#24634C",
        "evidence-soft": "#EDF5F0",
        attention: "#815C18",
        "attention-soft": "#FBF3DF",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        display: ["Manrope", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.5rem",
        "2xl": "0.5rem",
        "3xl": "0.5rem",
      },
      boxShadow: {
        soft: "0 2px 8px rgb(36 33 30 / 0.08)",
        lift: "0 2px 8px rgb(36 33 30 / 0.08)",
        card: "none",
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
