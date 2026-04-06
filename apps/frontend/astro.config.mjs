import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
    edgeMiddleware: false,
    maxDuration: 60, // SRE requirement
    includeFiles: [],
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
      // 🧬 TITANIUM BUNDLE STRATEGY: Inline Monorepo Packages
      noExternal: ['@va-hub/db', '@va-hub/config']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('htmx.org')) return 'htmx';
              if (id.includes('lucide-astro')) return 'icons';
              return 'vendor';
            }
          }
        }
      }
    },
    plugins: [
      {
        name: 'require-polyfill',
        renderChunk(code) {
          return `import { createRequire as __cr } from 'node:module';\nconst require = __cr(import.meta.url);\n${code}`;
        }
      }
    ]
  }
});