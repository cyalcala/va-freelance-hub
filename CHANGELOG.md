# Internal Engineering Changelog


## [2026-03-19] — [Opportunities: 1155 | Agencies: 95]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: complete architectural solidification with cross-repository sync manifest update (9d42753)
* feat: final integrity layer live with architectural guardrails and one-click failsafe (865155b)

### 🛡️ Reliability & Fixes
* fix: ats harvester constraints and date hydration to enable fresh data injection (eee511f)
* fix: prioritize discovery window in opportunities feed to ensure just-now visibility (443180d)
* fix: restore.ts date hydration to enable atomic failsafe (9d67e77)

---


## [2026-03-19] — [Opportunities: 479 | Agencies: 95]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: complete architectural solidification with cross-repository sync manifest update (9d42753)
* feat: final integrity layer live with architectural guardrails and one-click failsafe (865155b)

### 🛡️ Reliability & Fixes
* fix: prioritize discovery window in opportunities feed to ensure just-now visibility (443180d)
* fix: restore.ts date hydration to enable atomic failsafe (9d67e77)

---


## [2026-03-19] — [Opportunities: 479 | Agencies: 95]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: complete architectural solidification with cross-repository sync manifest update (9d42753)
* feat: final integrity layer live with architectural guardrails and one-click failsafe (865155b)
* feat: automated documentation engine live with real-time Turso metrics (6cbd1fe)

### 🛡️ Reliability & Fixes
* fix: restore.ts date hydration to enable atomic failsafe (9d67e77)

---


## [2026-03-19] — [Opportunities: 0 | Agencies: 0]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: final integrity layer live with architectural guardrails and one-click failsafe (865155b)
* feat: automated documentation engine live with real-time Turso metrics (6cbd1fe)
* feat: testing automated mythic restore points and framework synchronization (3da5b6c)

### 🛡️ Reliability & Fixes
* fix: restore.ts date hydration to enable atomic failsafe (9d67e77)

---


## [2026-03-19] — [Opportunities: 479 | Agencies: 95]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: automated documentation engine live with real-time Turso metrics (6cbd1fe)
* feat: testing automated mythic restore points and framework synchronization (3da5b6c)

### ⚓ Internal Maintenance
* chore: add ats.ts to sync manifest for framework mirroring (5f24290)

---


## [2026-03-19] — [Opportunities: 479 | Agencies: 95]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: automated documentation engine live with real-time Turso metrics (6cbd1fe)
* feat: testing automated mythic restore points and framework synchronization (3da5b6c)
* feat: widen the net with Upwork RSS feeds and direct ATS harvest from Greenhouse and Lever company boards (cded6d5)

### ⚓ Internal Maintenance
* chore: add ats.ts to sync manifest for framework mirroring (5f24290)

---


## [2026-03-19] — [Opportunities: 479 | Agencies: 95]
**Status: AUTO-PROCESSED**

### ✨ Major Features
* feat: testing automated mythic restore points and framework synchronization (3da5b6c)
* feat: widen the net with Upwork RSS feeds and direct ATS harvest from Greenhouse and Lever company boards (cded6d5)
* feat: overlapping chronological origin calculations harmonized intimately with relevancy algorithms isolating scraping logic (5f3c524)

### ⚓ Internal Maintenance
* chore: add ats.ts to sync manifest for framework mirroring (5f24290)

---

## [2026-03-19] — "The Trust & Real-Time Update"
**Status: PRODUCTION DEPLOYED**

### ✨ Major Features
- **REAL-TIME SYNC**: Re-engineered XML/RSS parsing to extract exact millisecond `pubDate`, `published`, `updated`, and `dc:date`.
- **LIVE FEEDS**: Replaced static dates with a dynamic `formatRelativeTime` hook on the frontend (e.g., "Just Now", "2h ago").
- **HACKER NEWS ENGINE**: Interfaced with Hacker News Firebase JSON API to curate high-value tech roles from monthly "Who is Hiring" threads, with strict title sanitation.
- **REDDIT ENGINE**: Harnessed public Subreddit JSON endpoints (`r/forhire`, `r/remotejobs`, etc.) to intercept direct-hiring signals without API keys.

### 🛡️ Trust & Security Protocol
- **ANTI-SCAM SHIELD**: Deployed a heuristic risk-scorer (`lib/trust.ts`) to automatically drop "Easy Money", Telegram/WhatsApp data-entry scams, and fee-based roles.
- **GHOST JOB DETECTOR**: Upgraded `verify-links` from HEAD to GET requests, parsing HTML for "closed" patterns (e.g., Greenhouse/Lever "Position has been filled") before 404s trigger.
- **AGENCY ACCOUNTABILITY**: `verify-directory.ts` now actively strips the "Hiring Now" badge (`status = quiet`) if an agency removes recruitment keywords or redirects their `/careers` page to the homepage.
- **ETHICAL HARVESTING**: Exclusively reading authorized generic XML/JSON syndications with transparent `User-Agent: VA.INDEX/1.0` headers.

### ⚓ Reliability & Maintenance
- **DB BLOAT PROTECTION**: Scheduled task now purges unused `<is_active = 0>` opportunities older than 60 days to respect free-tier database sizes.
- **SCHEMA CRASH FIX**: Completely repaired mapping ID-type conflicts so Drizzle string IDs correctly sync with the remote Turso DB from Trigger.dev.
- **SMART RATE LIMITING**: Added 300ms sleep routines to Reddit parsers and skipped active-link verification for indestructible domain structures (Reddit/HN).

## [2026-03-18] — "The Intelligence Update"
**Status: PRODUCTION DEPLOYED**

### ✨ Major Features
- **UI/UX REVOLUTION**: Transitioned to **Tailwind CSS v4** styling with custom blue/black design system.
- **NAVAR RE-ENGINEERING**: Implemented high-fidelity tab switcher with `ViewTransitions`/`ClientRouter` for seamless page swaps.
- **THE ENGINE (V5.2)**: Autonomous Sync Engine now running on **Trigger.dev v3** with 2-hour signal capture.
- **MISSION PAGE**: Created `/about` to document the "Find Me" discovery signal logic.

### ⚓ Reliability & Rathole Fixes
- **SMART REDIRECT CHECK**: Jobs `verify-links` task now inspects final URLs to detect "Homepage Redirect" expiration traps.
- **RELEVANCY SCORING**: Introduced heuristic keyword filtering (Manila, Cebu, Pinoy, etc.) to prune non-PH signals.
- **SCHEMA UNIFICATION**: Unified `jobs` and `apps/frontend` to use shared `@va-hub/db` package for zero-drift deployments.
- **BUILD STABILITY**: Refactored to stable **Tailwind CSS v3** integration after discovering Vercel/Bun build race conditions.

### 🛠️ Infrastructure
- **RUNTIME**: Bun 1.3.6
- **DATABASE**: Turso (LibSQL)
- **SCHEDULING**: Trigger.dev v3
- **FRAMEWORK**: Astro 6.0 (SSR/Server Mode)

---
*Maintained by Cy Alcala*
