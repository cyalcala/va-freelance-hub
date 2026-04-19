# VA.INDEX — AI Context File

> **Last updated:** 2026-04-19 (Agent-Skills Refresh)
> **System status:** HEALTHY, Agent-Skills Methodology Active, Nuclear Resurrection Mode

## MANDATORY: Read Before Any Action

1. `docs/AI_GUARDRAILS.md` — what you must never do
2. `docs/SKILLS_HEALTH.md` — Agent-Skills methodology status
3. `.cursorrules` — The Supreme Directive (Mandatory)
4. This file — current system state

---

## What This Is

A self-updating aggregator of **Filipino-accessible VA and remote job opportunities**. 
Autonomous harvesting engine captures signals from 5 source layers every 30 minutes, 
sifts them through a Philippine-First classifier, and serves them via SSR on Vercel.

**Owner:** Filipino freelance technical writer + agentic engineer (github: cyalcala)

---

## Current Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Frontend | **Astro 4** (SSR, `apps/frontend/`) |
| Styling | Tailwind CSS 3 |
| Database | Turso (LibSQL/SQLite edge) via Drizzle ORM |
| Scheduled jobs | **GHA / Fallback Pulse** (Trigger.dev offline, `scripts/fallback-pulse.ts`) |
| Hosting | Vercel (Git auto-deploy from `main`) |
| Skills | **Agent-Skills v1.0** (`va-freelance-hub/.antigravity/skills`) |
| Notifications | ntfy.sh push notifications |
| Repo | GitHub `cyalcala/va-freelance-hub` (public) |

---

## Monorepo Structure

```
apps/frontend/        → Astro 4 SSR (Vercel adapter)
  src/pages/           → index.astro (feed), agencies.astro, terminal.astro
  src/pages/api/       → health.ts (JSON diagnostics)
  src/components/      → SignalCard, MirrorStage, Navbar
  
packages/db/           → Drizzle schema, client, sorting algorithm
packages/config/       → Niche DNA config, ATS source list
packages/scraper/      → RSS parser utilities

jobs/                  → Trigger.dev v3 task definitions
  scrape-opportunities.ts  → Main harvest (cron: */30)
  ats-harvester.ts         → ATS sniper (on-demand)
  database-watchdog.ts     → DB cleanup (cron: */7h)
  resilience-watchdog.ts   → Self-healing (cron: */6h)
  trigger.config.ts        → Trigger.dev project config
  lib/                     → scraper, sifter, reddit, jobicy, ats, trust

scripts/               → save, restore, resurrect, sync-framework
```

---

## Autonomous Loop (How It Works)

```
Every 12 hours (GHA Cron / Manual Fallback):
  fallback-pulse.ts runs →
    Triggers targeted harvest pulses for specific regions (PH-First)
  chef-batch.ts runs →
    Processes AI classification for RAW pantry jobs in Turso
  
Every page request:
  Astro SSR queries Turso live → serves fresh data
  /api/health returns JSON diagnostics (staleness, counts, growth)
```

---

## Database Schema (Turso)

### `opportunities` (main feed)
`id, title, company, type, source_url, source_platform, tags (JSON), 
location_type, pay_range, description, posted_at, scraped_at, is_active, 
tier (0=Platinum,1=Gold,2=Silver,3=Bronze,4=Trash), content_hash, 
latest_activity_ms (indexed), company_logo, metadata (JSON), created_at`

Unique index: `(title, company, source_url)` — Prevents signal collisions
Composite index: `(tier, latest_activity_ms)` — Supports strict `tier ASC, latest_activity_ms DESC` sorting

### `agencies` (directory)
`id, name, slug, website_url, hiring_url, logo_url, description, status, 
last_sync, verified_at, metadata, score, buzz_score, hiring_heat, 
friction_level, created_at`

### `system_health` (source monitoring)
`id, source_name, status, last_success, error_message, updated_at`

### `vitals` (system state)
`id, ai_quota_count, ai_quota_date, lock_status, lock_updated_at, 
successive_failure_count, last_error_hash, last_recovery_at`

### `logs` (telemetry)
`id, message, level, timestamp, metadata`

---

## Sifter v9.0 (Signal Classification)

Philippine-First five-tier classifier in `jobs/lib/sifter.ts`:

1. **HARD KILLS** — Geo exclusions (US/UK/EU only), language kills, company kills (Canonical, GitLab)
2. **TECH KILLS** — Software engineer, developer, etc. (unless "technical support", "prompt engineer")
3. **SENIORITY KILLS** — C-suite, VP, Director (unless "Senior VA", "Social Media Manager")
4. **POSITIVE CHECK** — Must be an achievable role OR have PH signal
5. **TIERING** — Platinum (PH signal), Gold (APAC/SEA), Silver (worldwide remote), Bronze (catch-all)

---

## Environment Variables

```
TURSO_DATABASE_URL=libsql://cyrus-freelance-cyrusalcala.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=<token>
TRIGGER_SECRET_KEY=tr_prod_<key>  (production)
TRIGGER_SECRET_KEY=tr_dev_<key>   (development)
```

---

## Known Pitfalls (Learned the Hard Way)

| Issue | Root Cause | Prevention |
|---|---|---|
| Stale data for hours | database-watchdog was deactivating ALL primary source data | Never `SET is_active=0` by source_platform — sources are PRIMARY data |
| Build won't deploy | `@astrojs/vercel` v7 requires `/serverless` subpath | Always use `@astrojs/vercel/serverless` |
| Canonical/GitLab in feed | Old data inserted before sifter rules existed | database-watchdog now auto-purges killed companies |
| Reddit/Jobicy not inserting | `allItems` array excluded them despite fetching | Always include ALL fetched sources in allItems |
| Trigger.dev tasks frozen | Tasks not redeployed after code changes | Run `bun run trigger:deploy` after changing any job file |

---

## Key Commands

```bash
bun run dev              # Start Astro dev server
bun run build            # Build for Vercel
bun run trigger:dev      # Start Trigger.dev dev mode
bun run trigger:deploy   # Deploy tasks to Trigger.dev cloud
bun run save             # Create restore point
bun run restore <name>   # Restore from snapshot
```
