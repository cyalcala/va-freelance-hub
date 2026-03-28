import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
  }),
  integrations: [tailwind()],
  vite: {
    resolve: {
      alias: {
        '@va-hub/db': path.resolve(__dirname, '../../packages/db')
      },
      // Bun-favored resolution for local development and build speed
      conditions: ['bun', 'node', 'import']
    },
    // 🛡️ SECRET SHIELD: Globally purge server-side credentials from the client module graph
    define: {
      'process.env.TURSO_AUTH_TOKEN': 'undefined',
      'process.env.TRIGGER_SECRET_KEY': 'undefined',
      'process.env.GEMINI_API_KEY': 'undefined',
      'process.env.TRIGGER_API_KEY': 'undefined',
    },
    ssr: {
      // 🧬 SURGICAL EXTERNALIZATION: Bundle workspace packages only.
      // Externalize @libsql/client and drizzle-orm to prevent CJS/ESM shim breakage.
      noExternal: ['@va-hub/db', '@va-hub/config'],
      external: ['@libsql/client', 'drizzle-orm']
    },
    build: {
      rollupOptions: {
        output: {
          // 📦 GRANULAR CHUNKING: Prevent massive vendor.js bloat
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('htmx.org')) return 'htmx';
              if (id.includes('lucide-astro')) return 'icons';
              return 'vendor';
            }
          }
        }
      }
    }
  }
});