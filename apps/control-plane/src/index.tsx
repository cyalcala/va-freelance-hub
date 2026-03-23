import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { Layout } from './layout.js';
import api from './api.js';

const app = new Hono();

app.use('*', logger());
app.route('/api', api);

app.get('/', (c) => {
  return c.html(
    <Layout title="Apex Control Plane">
      <div class="space-y-8 animate-in fade-in duration-500">
        <header class="flex flex-col gap-4">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <h2 class="text-4xl font-extrabold tracking-tighter text-blue-900 lowercase italic">
                harvested signals
              </h2>
              <p class="text-blue-700/60 font-medium">
                live intelligence feed from trigger.dev + silicon scout
              </p>
            </div>
            <div 
              class="glass px-6 py-4 rounded-3xl border border-blue-100/50 min-w-[400px]"
              hx-get="/api/pulse"
              hx-trigger="load, every 10s"
            >
              <div class="flex items-center gap-3">
                <div class="pulse-dot"></div>
                <span class="text-[10px] font-bold text-blue-900/40 uppercase tracking-widest italic leading-none">syncing pulse...</span>
              </div>
            </div>
          </div>
        </header>

        <section 
          class="grid grid-cols-1 md:grid-cols-2 gap-6" 
          id="signal-feed"
          hx-get="/api/feed"
          hx-trigger="load, every 30s"
        >
          <div class="glass p-8 rounded-3xl flex flex-col items-center justify-center border-dashed border-2 border-blue-200/50 min-h-[400px] col-span-full">
            <div class="pulse-dot mb-4"></div>
            <p class="text-blue-900/40 italic font-medium">syncing titanium signals...</p>
          </div>
        </section>
      </div>
    </Layout>
  );
});

const port = 3020;
console.log(`🚀 Apex Control Plane live at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
