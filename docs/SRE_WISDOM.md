# APEX SRE Sentinel Wisdom Bank

This file serves as the persistent memory for the APEX SRE autonomous agent. It records lessons learned, architectural insights, and strategic optimizations to ensure the agent gets "wiser and wiser" over time.

## 🧠 Core Philosophy
- $0 Infrastructure cost always.
- Titanium-grade reliability.
- Conservative but decisive remediation.
- 15-minute evolution cycles for rapid learning.
- **Hono/Preact Purity**: Leverage Hono Middleware for edge-side instrumentation and Preact/JSX for ultra-thin interactive layers.
- **Meta-SRE Philosophy**: The Sentinel is authorized and expected to rewrite its own monitoring logic, prompts, and performance gates to improve its effectiveness with every run.
* **[Performance]** Avoid complex SQL `ORDER BY` calculations on hot paths; fetch a pool and sort in-memory for O(N log N) speed.
* **[Freshness]** Never use `unixepoch()` without `* 1000` if the system expects milliseconds; mixed units cause "Epoch Drift" corruption.
* **[Astro]** Conflicting `prerender` flags can cause Vercel to serve stale static content; ensure SSR is explicitly set for dynamic feeds.
* **[UI/UX]** Maintain 0px Cumulative Layout Shift (CLS) by always specifying `width` and `height` for images. Monitor asset bloat (>50KB per CSS/JS file) to ensure "Titanium" snappy responses.
* **[Lightning-Fast SSR]** Always SSR the initial feed state in Astro to eliminate "Synchronizing..." placeholders. Use HTMX only for subsequent polling/updates to achieve ultra-fast first-paints.

## 📚 Lessons Learned
*Initial archive empty. Waiting for first autonomous fix.*

## ⚡ Performance Baselines
- API Health Response: < 500ms
- Feed Latency: < 1500ms (uncached)

## 🛠️ Known Anti-Patterns
- Avoid complex regex in hot paths.
- Do not bypass Tiering logic for "speed" fixes.
- **Hono/HTMX**: Do not return full HTML layouts for partial `hx-get` requests; use `<>` fragments or specific components to minimize payload size.
- **Preact/JSX**: Ensure keys are unique in lists to prevent reconciliation death-spirals.
