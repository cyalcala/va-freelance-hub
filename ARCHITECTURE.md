# VA.INDEX Architecture (v6.0 — Post Health Check)
*Updated: 2026-03-27*

---

## 1. System Overview

VA.INDEX is an autonomous job signal aggregator targeting Filipino-accessible remote/VA opportunities. It operates as a "set-and-forget" pipeline with self-healing capabilities.

```
┌────────────────────────────────┐
│    TRIGGER.DEV CLOUD (v3)      │
│                                │
│  */30  harvest-opportunities   │──→ RSS + Reddit + Jobicy + ATS + JSON
│  */6h  resilience-watchdog     │──→ Staleness detection + burst recovery
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
│  system_health (monitoring)  │
│  vitals (AI Quota Guard)     │
│  extraction_rules (Matrix A) │
│  logs (telemetry)            │
└──────────────┬───────────────┘
               │ Live SSR query
               ▼
┌──────────────────────────────┐
│    VERCEL (Astro 4 SSR)      │
│    Auto-deploy from GitHub   │
│                              │
│  / (feed) → sorted by tier   │
│  /agencies → company list    │
│  /terminal → live logs       │
│  /api/health → JSON vitals   │
└──────────────────────────────┘
```

---

## 2. Data Pipeline (5-Layer Harvest)

Every 30 minutes, `harvest-opportunities` executes:

| Layer | Source | Method | Key Sources |
|---|---|---|---|
| L1 | RSS | `fast-xml-parser` | Himalayas, WWR, RemoteOK, ProBlogger, Jobspresso |
| L2 | Reddit | JSON API | r/VAjobsPH, r/forhire, r/remotejobs, r/phcareers |
| L3 | Jobicy | REST API | Virtual Assistant category |
| L4 | ATS | Greenhouse/Lever/Zoho API | Via `fetchATSJobs()` |
| L5 | JSON | Direct fetch | JobStreet PH regional feed |

**Pipeline:** Fetch → Sift (tier classify) → Healer (Matrix A recovery) → Dedup → Upsert

---

## 3. Matrix A (Agentic Schema Healer)

Located in `jobs/lib/autonomous-harvester.ts`. This tier handles non-standard and mutated JSON sources via **JSONata + AI Discovery Loop**.

1. **Fast Path** — Uses cached JSONata rules from `extraction_rules` table. 1ms execution.
2. **Slow Path** — If source mutations detected:
   - **Gemini 1.5 Flash** analyzes the payload.
   - **Minification**: Payloads are sampled to <100k chars for efficiency.
   - **Self-Correction**: AI verifies its own rule; retries if validation fails.
3. **Telemetry**: Records `failure_reason` and `last_error_log` for failed AI discovery.

---

## 4. AI Quota Guard (Titanium Shield)

To ensure **Gemini 1.5 Flash Free Tier** (15 RPM / 1000 RPD) compliance:

- **RPM Throttling**: 4-second mandatory delay between AI calls stored in `vitals.lockUpdatedAt`.
- **HARD CAP**: 1,000 requests per day hard limit in `vitals.aiQuotaCount`.
- **Bypass**: SRE scripts can bypass AI entirely to ensure data-flow restoration during quota exhaustion.

Located in `jobs/lib/sifter.ts`. Five-tier Philippine-First classifier:

```
HARD KILLS ──→ geo exclusion, language, company blacklist
TECH KILLS ──→ developer/engineer (except support/prompt engineer)
SENIORITY  ──→ C-suite/VP/Director (except Senior VA)
POSITIVE   ──→ must be achievable role OR have PH signal
TIERING    ──→ Platinum(0) > Gold(1) > Silver(2) > Bronze(3) > Trash(4)
```

---

## 4. Self-Healing ("Resilience Watchdog")

`resilience-watchdog.ts` runs every 6 hours:

1. **Pulse Check** — If newest scrape_at > 2 hours old → triggers `harvest-opportunities` in BURST MODE
2. **Gap Check** — If 0 writes in last 20 minutes → triggers minor recovery harvest  
3. **Gold Audit** — Monitors Platinum/Gold tier stability
4. **Source Degradation** — Checks `system_health` for FAIL status sources

---

## 5. Self-Cleaning ("Database Watchdog")

`database-watchdog.ts` runs every 7 hours:

1. **Purge Inactive** — DELETE rows inactive for >60 days
2. **Purge Trash** — DELETE TRASH-tier rows >7 days old
3. **Watermelon Deactivation** — SET is_active=0 for rows stale >72 hours
4. **Killed Company Purge** — DELETE any Canonical, GitLab, GE Healthcare, Nextiva rows

> **CRITICAL RULE:** Never deactivate rows by `source_platform`. That was a bug that
> killed the entire feed. Sources like RemoteOK, WeWorkRemotely are PRIMARY data.

---

## 6. Frontend (Astro 4 SSR on Vercel)

- **Adapter:** `@astrojs/vercel/serverless` (NOT bare `@astrojs/vercel`)
- **Feed Sort:** `getSortedSignals()` in `packages/db/sorting.ts` — sorts by `(tier ASC, latest_activity_ms DESC)`
- **Cache:** SSR on every request (no ISR, no static). `/api/health` has `Cache-Control: no-store`
- **DB imports:** Use relative paths `../../../../packages/db/client` (Vite alias `@va-hub/db` is backup)

---

## 7. Deployments

| System | Deploy Method | Trigger |
|---|---|---|
| **Frontend (Vercel)** | Git auto-deploy | Push to `main` branch |
| **Jobs (Trigger.dev)** | CLI deploy | `bun run trigger:deploy` from `jobs/` |
| **Database (Turso)** | Schema migrations | `bun run db:migrate` |

---

## 8. Monitoring

- **`/api/health`** — JSON endpoint: totalActive, staleness, goldDistribution, isFaithful, isStale
- **ntfy.sh** — Push notifications on harvest success/failure (`va-freelance-hub-task-log-cyrus`)
- **Trigger.dev dashboard** — Run history, logs, schedule status
- **`/terminal`** — Live system logs UI
