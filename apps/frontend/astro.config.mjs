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
    edgeMiddleware: false,
    maxDuration: 60, // SRE requirement
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
      // 🧬 TITANIUM BUNDLE STRATEGY: Inline EVERYTHING.
      // 1. Mandatory for Windows: Avoids 'EPERM: operation not permitted, symlink' failures in the Vercel NFT trace.
      // 2. Bun Compatibility: Bypasses complex .bun/ symlink trees that often break the Vercel adapter's file tracing.
      // 3. Optimization: Results in faster cold-starts by including all logic in a single server entrypoint.
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