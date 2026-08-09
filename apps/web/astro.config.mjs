import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import fs from 'node:fs';

export default defineConfig({
  // Development should never listen on a LAN/public interface. This limits the
  // blast radius of dev-server tooling and keeps preview traffic local.
  server: {
    host: false,
    allowedHosts: [],
  },
  output: 'server',
  adapter: cloudflare({
    // The production site has no Astro image transforms. Keep the adapter on
    // a no-transform service so a future <Image> addition cannot expose a
    // Cloudflare image-binding transform surface without a deliberate review.
    imageService: 'passthrough',
  }),
  // The public index has no session feature. Explicitly use an ephemeral
  // driver so the adapter cannot introduce an undeclared KV binding that
  // would fail a Pages request at runtime.
  session: {
    driver: 'memory',
  },
  integrations: [react(), tailwind()],
  vite: {
    plugins: [
      {
        name: 'messagechannel-polyfill',
        apply: 'build',
        transformIndexHtml(html) {
          const polyfill = fs.readFileSync('./polyfill-messagechannel.js', 'utf-8');
          return html.replace('<head>', `<head><script>${polyfill}</script>`);
        },
      },
    ],
  },
});
