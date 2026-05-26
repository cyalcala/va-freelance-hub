import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#FAF9F6",
        ink: "#1C1917",
        accent: "#E05D3A",
        "accent-hover": "#C54E2D",
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.02)",
      }
    },
  },
  plugins: [],
};

export default config;
