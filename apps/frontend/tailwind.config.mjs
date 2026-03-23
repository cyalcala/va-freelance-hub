/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    '../control-plane/src/**/*.tsx'
  ],
  theme: {
    extend: {
      colors: {
        oat: {
          50: '#F9F8F6',
          100: '#F0EFEA',
          200: '#E6E4DF',
        },
        blueberry: {
          50: '#E8EAF6',
          100: '#C5CAE9',
          400: '#5C6BC0',
          500: '#3F51B5',
          600: '#3949AB',
          800: '#283593',
          900: '#1A237E',
        },
        brand: {
          blue: '#3b82f6',
          dark: '#0a0a0a',
          black: '#000000',
        },
      },
    },
  },
  plugins: [],
}
