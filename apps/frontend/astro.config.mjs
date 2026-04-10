import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: vercel({
    maxDuration: 60,
  }),
  integrations: [tailwind()],


  vite: {
    resolve: {
      alias: {
        '@va-hub/db': path.resolve(__dirname, '../../packages/db'),
        '@va-hub/config': path.resolve(__dirname, '../../packages/config'),
        '@va-hub/pulse': path.resolve(__dirname, './src/lib/inngest/client.ts'),
        '@va-hub/ai': path.resolve(__dirname, './src/lib/ai'),
      },
      conditions: ['node', 'import']
    },
    ssr: {
      noExternal: ['@va-hub/db', '@va-hub/config', '@va-hub/pulse', '@va-hub/ai']
    }
  }
});