import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  server: {
    host: false,
    allowedHosts: [],
  },
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  session: {
    driver: 'memory',
  },
  integrations: [react(), tailwind()],
});
