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
        '@va-hub/db': path.resolve(__dirname, '../../packages/db'),
        '@va-hub/config': path.resolve(__dirname, '../../packages/config'),
        // 🧬 Titanium Entry Redirect: Map main @libsql/client to absolute web entry
        // This avoids recursive alias resoution during bundling.
        '@libsql/client': path.resolve(__dirname, '../../node_modules/@libsql/client/lib-esm/web.js')
      },
      // Node-first resolution — Vercel CI runs Node.js, not Bun
      conditions: ['node', 'import']
    },
    // 🛡️ SECRET SHIELD: Astro server-mode already isolates frontmatter from client bundles.
    // No compile-time `define` needed — it was destructively replacing secrets in SSR code too.
    ssr: {
      // 🧬 TOTAL BUNDLE STRATEGY: Inline EVERYTHING into the serverless function.
      // 1. Sidesteps Windows EPERM (symlink) issues by not needing runtime node_modules.
      // 2. The @libsql alias ensures no native binding requirement leaks into the bundle.
      // 3. Optimal for Vercel's cold-start performance.
      noExternal: true
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