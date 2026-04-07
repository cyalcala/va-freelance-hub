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
* **[Social Intelligence]** Prioritize Reddit `.json` and HN Algolia API for "early signals." For the Philippines niche, monitor the "PH Gold Standard" subreddits: `r/buhaydigital`, `r/VirtualAssistantPH`, and `r/RemoteWorkPH`.
* **[Strict Hierarchy]** Prioritize "Tier Grouping" over "Recency Math." Platinum (0) jobs must ALWAYS stay above Gold (1), and Gold above Silver (2), regardless of age. Recency should only be a secondary sort within each tier. Mixed-priority "Decay Algorithms" cause tier interleaving during high-velocity scraping.
* **[Anti-Stupidity Guardrails]** NEVER push code to `main` without running a full `bun run build` in `apps/frontend`. Use `npm run check-build` for mandatory pre-flight certification.
* **[Deployment Resilience]** In monorepo environments on Windows, avoid deep-tracing imports from outside the project root during Vercel builds. Localize core DB and schema dependencies to `src/db-local` if `Module.symlink` errors occur.
* **[Runtime Failsafes]** Always wrap SSR data fetching and API feed calls in `try/catch` blocks. The site MUST remain accessible even if the database layer encounters transient failures.
* **[Thin-First UX]** Maintain a strict 250KB limit for client-side JS. Use Astro + HTMX for high-velocity streaming to prevent "heavy" or "unnavigable" UI regressions.
* **[Hyperflow Mirror]** Implement a dedicated `/api/mirror` endpoint for absolute freshest signals. Use `ThinCard` components to minimize payload size during high-frequency polling.
* **[Fluid Navigation]** Ensure `scrollbar-gutter: stable` and standard overflow behaviors to prevent scrollbar "deadlocks" on Windows/Mobile.
* **[JSON Probes]** Use internal search APIs (Chalice/MobileXHR) for JobStreet and Indeed to capture rich metadata (logos, salary) without DOM overhead.

## 🏛️ Senior SRE Mandates (Cloudflare/Netflix/Google Level)

*   **[Chaos-Resilience]** Don't just handle errors—anticipate them. Every third-party API call MUST have a timeout and a "Stagnant Data" fallback.
*   **[Observability-First]** Every autonomous fix must be logged in `CHANGELOG.md` with its root cause analysis (RCA). If a fix fails twice, it must trigger a "Human-in-the-Loop" block.
*   **[Zero-Hydration Bias]** Treat Client-Side JS as a luxury, not a necessity. If a feature can be done with HTML/CSS or HTMX, never use a React-heavy component.
*   **[Titanium Edge]** Prefer Edge-caching and SSR over client-side fetching. Content must be visible and interactive within 100ms of the first byte.
*   **[Burst-Remediation]** During critical downtime (Hyperhealth Fail), the Sentinel MUST switch to a 1-minute "Conditional Burst" frequency. This burst is limited to 7 consecutive runs to prevent infinite loops and quota exhaustion.
*   **[Anti-Entropy]** Periodically run `scripts/wash-db.ts` and `scripts/ux-audit.ts` to prevent stale data and asset bloat.
*   **[Security-Is-Built-In]** Never bake secrets into code. Always use runtime injection and audit `.env` regularly.

## 📚 Lessons Learned
- [2026-03-25] [CIRCUIT BREAKER] Implemented static JSON fallback in `index.astro` to maintain mission continuity during Turso/Vercel connectivity failures.
- [2026-03-25] [SCHEMA DRIFT] Resolved "Failed query" by manually adding `company_logo` and `metadata` columns to production Turso via `ALTER TABLE`. Lessons learned: `drizzle-kit push` is not always sufficient for complex index-conflicted environments.
*   **[2026-03-24]** **Hydration Lag Awareness**: HTMX `load` triggers can cause perceived slowness on first-paints. For "Titanium-Fast" experiences, the initial state MUST be injected via SSR. 
*   **[2026-03-24]** **Self-Healing Burst**: Downtime remediation is 15x more effective when using 1-minute high-velocity "Burst Cycles" (limit 7) rather than standard 15-minute wait periods.
*   **[2026-03-31]** **The Interleaved Tier Crisis**: Resolved a major UX regression where fresh Silver jobs were leapfrogging older Platinum jobs due to mixed-priority "Decay Math." Lessons learned: Strict Sort (`tier ASC, latestActivityMs DESC`) is the only way to guarantee Platinum > Gold > Silver hierarchy.
*   **[2026-04-08]** **Manual Handoff / Pause**: The Apex SRE was manually paused by the user to prevent autonomous code modification during high-velocity manual development. **Lesson learned**: Even the best autonomous agents should have a clear "Dev-Mode" override to avoid clashing with human intuition during active coding sessions.

## ⚡ Performance Baselines
- API Health Response: < 500ms
- Feed Latency: < 1500ms (uncached)

## 🛠️ Known Anti-Patterns
- Avoid complex regex in hot paths.
- Do not bypass Tiering logic for "speed" fixes.
- **Hono/HTMX**: Do not return full HTML layouts for partial `hx-get` requests; use `<>` fragments or specific components to minimize payload size.
- **Preact/JSX**: Ensure keys are unique in lists to prevent reconciliation death-spirals.

* [STRATEGIC] The system is currently in an 'IDLE' state with no: The system is currently in an 'IDLE' state with no reported failures. The AI quota is high, indicating ample capacity. The memory is critically low (2MB), which is a significant environmental concern that could lead to instability and slow performance. The historical context shows recent auto-processing of opportunities and agencies, with a minor feature update. The core mission is 'STRATEGIC BETTERMENT'. The current state does not present an immediate critical failure, but the low memory is a systemic risk. The proposed strategy should focus on optimizing resource usage and ensuring data freshness without introducing complexity. The 'OPTIMIZER' persona's focus on 'SNAP-FAST' and 'ARCHITECT' persona's focus on 'TITANIUM STABILITY' are most relevant here. A minimal intervention to reduce memory footprint while ensuring data freshness is the prudent path. (Scores: Arc:10, Opt:9, Harv:7)