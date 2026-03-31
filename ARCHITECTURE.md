# VA.INDEX Architecture (v7.0 — Post Drift Remediation)
*Updated: 2026-03-31*

---

## 1. System Overview

VA.INDEX is an autonomous job signal aggregator targeting Filipino-accessible remote/VA opportunities. It operates as a "set-and-forget" pipeline with self-healing capabilities and real-time freshness tracking.

```
┌────────────────────────────────┐
│    TRIGGER.DEV CLOUD (v3)      │
│                                │
│  */30  harvest-opportunities   │──→ RSS + Reddit + Jobicy + ATS + JSON
│  */2h  resilience-watchdog     │──→ Staleness detection + burst recovery
│  */7h  database-watchdog       │──→ Cleanup + killed-company purge
│  on-demand  ats-sniper         │──→ Surgical Greenhouse/Lever targeting
└──────────────┬─────────────────┘
               │ Drizzle ORM
               ▼
┌──────────────────────────────┐
│    TURSO (LibSQL Edge DB)    │
│    Region: ap-northeast-1    │
│                              │
│  opportunities (feed data)   │
│  agencies (directory)        │
│  noteslog (telemetry)        │
│  system_health (monitoring)  │
│  vitals (AI Quota Guard)     │
└──────────────┬───────────────┘
               │ Live SSR query
               ▼
┌──────────────────────────────┐
│    VERCEL (Astro 4 SSR)      │
│    Auto-deploy from GitHub   │
│    Runtime: Node 20.x (Pinned) │
│                              │
│  / (feed) → sorted by tier   │
│  /api/health → Real-time Pulse │
└──────────────────────────────┘
```

---

## 2. Real-Time Freshness (lastSeenAt)

The system has transitioned from `created_at` to `last_seen_at` as the primary signal of life. This prevents "Staleness False Positives" during periods where existing jobs are being refreshed rather than new ones created.

- **Ingestion**: Every harvester updates `last_seen_at` on every successful scrape, even if the content hasn't changed.
- **Monitoring**: The `/api/health` endpoint and the `resilience-watchdog` now calculate staleness using `max(last_seen_at)`.
- **Threshold**: Staleness > 2 hours triggers an autonomous recovery burst.

---

## 3. Infrastructure Invariants

### Node.js 20.x Pinning
The Vercel environment and local Bun runtime are pinned to **Node 20.x**. This is mandatory to maintain compatibility with the `@libsql/client` driver and bypass Vercel serverless runtime drift.

### Idempotent Trigger.dev Promotion
The CI/CD pipeline in `.github/workflows/trigger-deploy.yml` is hardened with explicit config paths and idempotency:
`bunx trigger.dev@4.4.3 promote $VERSION --env prod --config jobs/trigger.config.ts || true`

---

## 4. Resilience & Self-Healing

### Resilience Watchdog (`jobs/resilience-watchdog.ts`)
Runs every 2 hours (hardened from 6h):
1. **Pulse Check** — Audits `max(last_seen_at)`.
2. **Auto-Trigger** — If stale, triggers `harvest-opportunities` in `BURST` mode.
3. **Lock Cleanup** — Resets stale `vitals` locks to prevent ingestion deadlocks.

### Database Watchdog (`jobs/database-watchdog.ts`)
Runs every 7 hours:
1. **Purge Inactive** — Deletes jobs not seen for >60 days.
2. **Watermelon Deactivation** — Deactivates jobs stale for >72 hours.
3. **Blacklist Enforcement** — Purges "Killed Companies" (e.g., Nextiva, GE).

---

## 5. Monitoring & Vitals

- **`/api/health`** — Real-time JSON vitals pulling from the database.
- **`noteslog` Table** — Central audit log for all autonomous actions and drift corrections.
- **System Pulse** — A client-side UI component (`Welcome.astro`) that visualizes database freshness localized to the visitor's timezone.

---
**TITANIUM STATUS: ACTIVE.**
