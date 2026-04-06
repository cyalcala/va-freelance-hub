import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: vercel({
    edgeMiddleware: false,
    maxDuration: 60,
  }),
  redirects: {
    '/logs': '/terminal'
  },
  integrations: [tailwind()],

  vite: {
    resolve: {
      alias: {
        '@va-hub/db': path.resolve(__dirname, '../../packages/db'),
        '@va-hub/config': path.resolve(__dirname, '../../packages/config'),
      },
      conditions: ['node', 'import']
    },
    ssr: {
      noExternal: ['@va-hub/db', '@va-hub/config']
    }
  }
});