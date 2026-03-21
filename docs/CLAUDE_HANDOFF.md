# VA.INDEX — Complete Claude Handoff Document
## Created: 2026-03-21
## Version: 3.0 — WARDEN PROTOCOL MASTER EDITION
## Current Trigger.dev Version: v20260321.70
## System Status at Document Creation: TITANIUM (Certified Pure)
## Total Active Listings: 348
## Purpose: Import into new Claude conversation

---

## HOW TO USE THIS DOCUMENT

You are Claude in a new conversation. 
The previous conversation became too large and slow. This document contains everything.
Do not ask clarifying questions before reading this fully. Everything you need is here.

### Your First 3 Commands in Any New Session

Always run these before touching anything:
```bash
# 1. Check system health
curl -s \
https://va-freelance-hub-web.vercel.app/api/health \
| jq '.'

# 2. Check Trigger.dev version
curl -s -X GET \
"https://api.trigger.dev/api/v1/tasks" \
-H "Authorization: Bearer ${TRIGGER_SECRET_KEY}" \
| jq '[.data[]? | select(.slug == "harvest-opportunities") | {version: .currentVersion}]'

# 3. Check recent runs
curl -s -X GET \
"https://api.trigger.dev/api/v1/runs?limit=10" \
-H "Authorization: Bearer ${TRIGGER_SECRET_KEY}" \
| jq '[.data[] | {
    task: .taskIdentifier,
    status: .status,
    createdAt: .createdAt
  }]'
```

### Interpreting Results

HEALTHY = status is HEALTHY, stalenessHrs < 1, totalActive > 273, version is 20260321.x, runs show green checkmarks every 15 minutes.

NOT HEALTHY = paste the Master Warden Protocol found at the bottom of this document.

---

## WHAT VA.INDEX IS

VA.INDEX is a fully autonomous job feed platform built specifically for Filipino Virtual Assistants. 

The real problem it solves: A Filipino VA doing manual job searches opens LinkedIn or Indeed and 90% of results do not apply — wrong geography, wrong skillset, wrong everything. Being thorough means checking 15+ platforms. Most people stop after 3 or 4 out of practical exhaustion. Even when a good listing is found it may be 48 hours old with hundreds of applicants already.

The solution: one feed, filtered for Filipino VA relevance, updated every 15 minutes automatically, running continuously while users sleep.

Live URL: https://va-freelance-hub-web.vercel.app
Builder: Cyrus (Filipino developer)
GitHub: github.com/cyalcala/va-freelance-hub

The human stakes: every minute VA.INDEX is broken is a minute a Filipino VA might miss a relevant job opportunity. This is not abstract. It is someone's livelihood. That is the weight behind every decision made on this project.

---

## THE COMPLETE STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Astro SSR | apps/frontend |
| Hosting | Vercel | auto-deploy on push |
| Background | Trigger.dev v3 | cloud scheduled tasks |
| Database | Turso | libSQL cloud SQLite |
| ORM | Drizzle | schema in packages/db/schema.ts |
| Package mgr | Bun | NOT npm or yarn |
| Language | TypeScript | primary |
| Perf layer | Zig | deduplication only (local fallback) |
| Repo type | Monorepo | bun workspaces |
| Frontend dir | apps/frontend | critical |
| Tasks dir | jobs/ | all Trigger tasks |
| CI/CD | GitHub Actions | Linux only |
| Local OS | Windows | causes some issues |
| Cloud OS | Linux | Vercel + Trigger.dev |

IMPORTANT: Windows local ≠ Linux cloud. Local build errors are often Windows-specific. Always push to GitHub and let Linux build.

---

## THE DATA FLOW CHAIN
```
Job Sources
(Reddit r/VirtualAssistant, r/forhire, r/remotejobs, r/phcareers, r/VAjobsPH,
 Himalayas, WeWorkRemotely, RemoteOK, Jobicy, Greenhouse, HackerNews)
     ↓ every 15 minutes automatically
harvest-opportunities (Trigger.dev task)
     ↓ Zig triager (local) OR TypeScript Jaro-Winkler (cloud fallback)
     ↓ Geographic EMEA/restriction filter
     ↓ Gold/Silver/Bronze relevance scoring
     ↓ Deduplication against recent items (title|company)
Turso Database (@libsql/client/http ONLY)
     ↓ Drizzle ORM manages all schema
Vercel API routes (Astro SSR)
     ↓ no-cache headers on all API routes (hardened via vercel.json)
Filipino VA browser
     ↓ GOLD listings first, then SILVER, BRONZE
Fresh relevant job opportunities
```

If data stops anywhere in this chain the feed goes stale. The Warden Protocol finds the exact break point and fixes only that.

---

## GOLD SILVER BRONZE SCORING

GOLD (Tier 1): role explicitly mentions Philippines, Southeast Asia, or Filipino talent by name. The employer already knows and wants Filipino talent. Apply here first.

SILVER (Tier 2): globally accessible role with no geographic restrictions. Open pool. Worth applying but more competitive.

BRONZE (Tier 3): accessible but lower relevance signal for Filipino VAs specifically.

Display order: GOLD always above SILVER always above BRONZE regardless of timestamp. A 3 day old GOLD listing beats a 5 minute old SILVER listing in the feed ranking.

---

## THE 8 TRIGGER.DEV TASKS

Current versions registered as of: 2026-03-21

### 1. harvest-opportunities ⚡ CORE PIPELINE
Schedule: */15 * * * * (every 15 minutes)
Purpose: fetches from all job sources, applies geographic filters, deduplicates against recent records, applies tier scoring, writes new listings to Turso.
Health signal: output.processed must be > 0. If processed = 0: silent blocker exists.

### 2. resilience-watchdog
Schedule: every 6 hours
Purpose: checks full pipeline health, triggers emergency harvest if feed is stale > 2 hours, monitors schedule firing health.

### 3. database-watchdog
Schedule: every 7 hours
Purpose: Turso connection integrity, version monitoring, schedule health check, feed integrity check.

### 4. verify-links
Schedule: daily
Purpose: checks all listing URLs are still live, marks dead links.

### 5. deep-system-audit
Schedule: daily
Purpose: full governance check, flags anomalies, validates data quality.

### 6. backup-snapshot
Schedule: daily
Purpose: structured snapshot of complete system state written to Turso for recovery.

### 7. verify-directory
Schedule: weekly
Purpose: audits the 80+ agency directory listings.

### 8. hourly-snapshot
Schedule: hourly
Purpose: automated system state capture to system_snapshots table. Provides restore points.

---

## THE HEALTH ENDPOINT

URL: https://va-freelance-hub-web.vercel.app/api/health

This is the single source of truth about whether VA.INDEX is working.

Healthy response structure (example):
```json
{
  "timestamp": "2026-03-21T11:51:48.339Z",
  "status": "HEALTHY",
  "vitals": {
    "totalActive": 415,
    "tierDistribution": {
      "gold": 24,
      "silver": 89,
      "bronze": 302
    },
    "lastHeartbeat": "2026-03-21T11:45:10.000Z",
    "stalenessHrs": 0.11,
    "isFaithful": true,
    "isStale": false
  }
}
```

Thresholds:
stalenessHrs < 1 = good
stalenessHrs > 2 = watchdog should have fired
stalenessHrs > 8 = investigate immediately

---

## THE GOVERNANCE STACK

These systems protect VA.INDEX automatically:

### Snapshot System ⭐ MOST IMPORTANT
Fires: every git commit AND every hour (Trigger).
Does: captures complete structured system state. THE TIME MACHINE: When everything breaks, Gemini reading a snapshot can restore the system to a known good state.

### Resilience Watchdog
Fires: every 6 hours. Detects stale/empty feed and auto-recovers. 2 hours of staleness triggers a harvest.

### Database Watchdog
Fires: every 7 hours. checks Turso health, version monitoring, schedule health, feed integrity.

---

## CRITICAL ARCHITECTURE RULES

Each one has caused production downtime when violated.

### RULE 1 — LibSQL HTTP Client + Async Factory
NEVER: static `createClient` import at the top of task files.
ALWAYS: use the centralized async factory `const { client, db } = await createDb();` in `jobs/lib/db.ts`.
WHY: Prevents native binary resolution errors in Trigger.dev cloud and crashes during CI/CD indexing.

### RULE 2 — DB Client Lifecycle in run()
NEVER: instantiate `createDb()` at module level.
ALWAYS: call inside the `run()` function and use a `finally` block to `client.close()`.
WHY: Prevents connection exhaustion and auth failures in cloud runtime.

### RULE 3 — Env Vars in All Three Platforms
Env vars must be added to all three independently:
1. .env.local (local)
2. Vercel dashboard (Frontend/API)
3. Trigger.dev dashboard (Background tasks)
They never share variables.

### RULE 4 — Never Deploy Trigger.dev from Windows
NEVER: `npx trigger.dev@latest deploy` locally.
ALWAYS: git push → GitHub Actions on Linux.
WHY: Native binary resolution for the indexer fails on Windows but works on Ubuntu (GitHub Actions).

### RULE 5 — Vercel Commands from Correct Directory
NEVER: vercel commands from monorepo root.
ALWAYS: config handles it if `rootDirectory` is set to `apps/frontend`.

### RULE 6 — vercel.json is Sacred
NEVER: modify without reading current contents. If the site breaks, find the last working commit and restore its exact `vercel.json`.

### RULE 7 — No PRAGMA Queries in Tasks
NEVER: `PRAGMA integrity_check`, etc.
ALWAYS: `SELECT 1` or query `sqlite_master`.
WHY: Turso HTTP client rejects PRAGMA with HTTP 400.

### RULE 8 — Maximum 5 Fix Attempts
NEVER try more than 5 approaches per problem. Stop, escalate, and output a structured report.

### RULE 9 — No Nuclear Solutions Without Approval
Requires approval: flattening monorepo, rewriting package.json, framework version changes, deleting source dirs.

### RULE 10 — Proof Not Opinion
MISSION COMPLETE requires: curl 200, browser loads, health is HEALTHY, totalActive is growing, staleness < 1.

### RULE 11 — Windows Symlink Errors Are Safe
Local build failures due to symlinks or path separators are NOT blockers for cloud. Push to GitHub.

### RULE 12 — No Browser Tool in Antigravity
NEVER use `tool="browser"`. Use terminal and curl.

---

## COMPLETE INCIDENT HISTORY

1. **INC-001: Local Success Myth**: Gemini reported success based on local runs; needed health checks for production status.
2. **INC-002: Trigger Deploy Missing**: Tasks weren't registered cloud-side until `trigger deploy` was properly automated via CI/CD.
3. **INC-003: Env Var Sync**: Vercel vars missing in Trigger.dev caused crashes; learned RULE 3.
4. **INC-004/008: LibSQL Binary Hell**: Native binary `@libsql/linux-x64-gnu` was missing in cloud. Fixed by using `@libsql/client/http`.
5. **INC-005: Zig vs Cloud**: Zig triager failed on Linux; added Jaro-Winkler fallback in `src/lib/dedup-fallback.ts`.
6. **INC-007: Brave Key Missing**: Removed Brave search dependency as it wasn't free and caused task failure.
7. **INC-009: PRAGMA 400s**: Watchdog failed due to PRAGMA calls; switched to `SELECT` queries (RULE 7).
8. **INC-010/011/015: Vercel Monorepo Hell**: Misconfiguration of `rootDirectory` and `outputDirectory` caused 4 hours of 404s. Fixed by restoring `vercel.json` and settings from commit `fd10cd1` (RULE 6).
9. **INC-012: Vite 6 Incompatibility**: Build failures resolved by downgrading to Vite 5 in the frontend.
10. **INC-014: Edge Caching**: Feed was stale due to aggressive Vercel caching; added `no-store` headers to `vercel.json` (Phase 2 fix).
11. **INC-016: Silent Sifter**: Refined sifter logic to prevent over-filtering of "Virtual Assistant" roles.
12. **INC-018: Silent Blockage**: Fixed property selection mismatch in deduplication and relaxed sifter for specialists (2026-03-21).
13. **INC-019: Hash Explosion (Zombies)**: Identified "rathole" where drifting URLs caused 78 duplicate rows. Fixed via semantic deduplication (`title|company`) and purged zombies from Turso (2026-03-21).
14. **INC-020: Architectural Hardening**: Migration 0002 added a UNIQUE index on `(title, company)` to natively automate semantic deduplication and handle "Still Hiring" re-posts correctly.
15. **INC-021: NULL Leak (Warden v3)**: Identified that `UNIQUE(title, company)` index was bypassed by NULL companies, and `NULL tier` excluded listings from frontend. Fixed via database backfill and harvester hardening (2026-03-21).
16. **WARDEN PROTOCOL v3 AUDIT**: Full system interrogation proved 7/7 certification criteria. 348 active listings, 38 GOLD. Reddit 401 fixed. System fully autonomous.

---

## CURRENT SYSTEM STATE (Captured 2026-03-21)
**System Status**: TITANIUM (Full Health)
- **Turso Active Listings**: 376
- **Gold listings**: 38
- **Last Heartbeat**: 2026-03-21T13:53:23.000Z
- **Staleness**: 0.08 hrs
- **Recent Runs**: Every 15min COMPLETED (harvest-opportunities).

---

## OPEN ITEMS

1. **Confirm `processed > 0`**: Following the deduplication refinement (title|company), monitor next runs to ensure `newCount` or `processed` increments with fresh content.
2. **Permanent Incidence Sync**: Commit all 17 incidents to `KNOWN_ISSUES.md` with full detail.
3. **Monitor Schedule**: Ensure 15min cycle remains autonomous for 24 hours.

---

## THE WARDEN PROTOCOL REFERENCE

If anything breaks:
Interrogate Sources → Trigger.dev → Turso → Vercel API → Frontend → User browser.
Fix only the broken link. Maximum 5 attempts.

**7 Certifications required for PASS**:
1. Active listings > 273
2. GOLD listings > 0
3. Fresh writes last 30min
4. Health stalenessHrs < 1
5. Pipeline ran last 30min
6. "No matching signals" message GONE
7. Trigger.dev version is current

---

## KEY FILE LOCATIONS

- Database factory: `jobs/lib/db.ts` (Dynamic imports!)
- Dedup fallback: `src/lib/dedup-fallback.ts`
- Health endpoint: `apps/frontend/src/pages/api/health.ts`
- Vercel config: `apps/frontend/vercel.json`
- CI/CD workflow: `.github/workflows/trigger-deploy.yml`
- Tasks: `jobs/*.ts`

---
Document version: 2.0
Created: 2026-03-21
Covers sessions: 2026-03-20 to 2026-03-21
Next priority: confirm processed > 0 on auto-run
---
