# VA.INDEX Architecture (v8.0 — Master Directory Transition)
*Updated: 2026-04-01 (Functional Silos & Gravity Ranking)*

---

## 1. System Overview

VA.INDEX is an autonomous job signal aggregator targeting Filipino-accessible remote/VA opportunities. It operates as a "Master Directory" rather than a flat feed, using a functional taxonomy to organize signals into 10 high-signal domains.

```
┌────────────────────────────────┐
│    TRIGGER.DEV CLOUD (v4)      │
│                                │
│  */30  harvest-opportunities   │──→ RSS + Reddit + Jobicy + ATS + JSON
│  */2h  resilience-watchdog     │──→ 10-Domain Taxonomy + AI Sifter
│  */7h  database-watchdog       │──→ Multi-Silo Cleaner + Blacklist
│  on-demand  ats-sniper         │──→ Surgical Greenhouse/Lever targeting
└──────────────┬─────────────────┘
               │ Drizzle ORM
               ▼
┌──────────────────────────────┐
│    TURSO (LibSQL Edge DB)    │
│    Region: ap-northeast-1    │
│                              │
│  opportunities (Ranked Feed) │──→ relevance_score + display_tags
│  agencies (Directory)        │──→ functional_domain
│  noteslog (Telemetry)        │──→ system_pulse
│  system_health (Monitoring)  │──→ circuit_breaker
└──────────────┬───────────────┘
               │ Live SSR query
               ▼
┌──────────────────────────────┐
│    VERCEL (Astro 4 SSR)      │
│    Auto-deploy from GitHub   │
│                              │
│  / (Master Directory) →      │──→ Organized by Functional Domain
│                                  1. VA & Support
│                                  2. Design & UX
│                                  3. Writing & Content (etc.)
│
│  /api/health → Real-time Pulse │
└──────────────────────────────┘
```

---

## 2. Taxonomy & Ranking (Gravity)

The system has transitioned from a flat list to a functional directory. Every signal is passed through the **Titanium Taxonomy Engine** during ingestion.

- **Domain Categorization**: Signals are mapped to 10 functional domains (silos) based on keywords and role intent.
- **Gravity Scoring**: Jobs are ranked within their silo using a composite score:
  1. **Tier (Primary)**: Platinum > Gold > Silver > Bronze.
  2. **Relevance (Secondary)**: Higher scores for "PH-Direct", "Premium", and "Urgent" signals.
  3. **Freshness (Tertiary)**: `latest_activity_ms` descending.
- **Badging**: `displayTags` (JSON) are injected for rapid UI scannability (e.g., *HIGH PAY*, *PH-TIME*).

---

## 3. Freshness & Invariants

- **lastSeenAt**: Primary signal of life. Staleness > 2 hours triggers autonomous recovery.
- **Indexing**: `uniqueJobIdx` on `(title, company, sourceUrl)` prevents signal collisions.
- **Node.js 20.x Pinning**: Mandatory for Vercel/LibSQL compatibility.
- **Idempotent Deployments**: Pre-commit hooks enforce `sync-framework.ts` to maintain coherency across Edge runtimes.

---

## 4. Resilience & Self-Healing

### Resilience Watchdog (`jobs/resilience-watchdog.ts`)
- **Pulse Audit**: Monitors `max(last_seen_at)` across all silos.
- **AI Sentinel**: Periodically audits signal validity using Gemini 1.5 Flash to detect silent drift or junk data.

### Database Watchdog (`jobs/database-watchdog.ts`)
- **Tier-Aware Retention**: Custom retention periods for different tiers (e.g., 7d for Platinum, 4h for Bronze/Trash).
- **Domain Balancing**: Ensures no single silo is overwhelmed by noise.

---

## 5. Monitoring & Vitals

- **`/api/health`** — Real-time JSON vitals.
- **`noteslog` Table** — Central audit log for all Master Directory updates.
- **System Pulse** — UI component visualizing database freshness localized to the visitor.

---
**MASTER DIRECTORY STATUS: ACTIVE & SYNCHRONIZED.**
