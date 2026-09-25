# Federated Acquisition Coverage Matrix

**Canonical Reference:** `docs/FEDERATED_ACQUISITION_MATRIX.md`  
**Last Updated:** 2026-09-26T01:30:00+08:00 (Asia/Manila)  
**Status:** Live Production Baseline  

---

## 1. Executive Summary & Universe Overview

| Metric | Current Value | Notes |
| :--- | :--- | :--- |
| **Known Feeder Universe** | 42 identified | Reservoirs (7), Direct Agencies (6), ATS Families (15), Open Datasets (3) |
| **Technically Ingestible** | 22 sources | Native TypeScript adapters & public endpoints verified |
| **Actively Observed in Turso Lake** | 12 sources | Himalayas, WWR, Remotive, RemoteOK, RWFA, Jobicy (2), Breezy (5) |
| **Lake Raw Observations** | 15 observations | Preserved in `lake_raw_observations` with SHA-256 payload hash |
| **Lake Candidates Ingested** | 544 candidates | Extracted into `lake_candidate_jobs` |
| **Duplicate Sightings Captured** | 78 sightings | Tracked in `lake_sightings` (cross-source provenance preserved) |
| **Historical Replay Events** | 31 audit events | Logged in `lake_replay_events` via `geoGate-v1.2-refinery` |
| **Qualified Ready in Lake** | 356 candidates | Strictly verified by deterministic `geoGate` (PH/APAC/Worldwide) |
| **Synced to Cloudflare D1** | 78 opportunities | Idempotently published through governed sync bridge |
| **Production D1 Active Inventory**| 846 opportunities | Pristine serving mart powering public Astro website |

---

## 2. Feeder Coverage Matrix

| Source ID | Family / Reservoir | Mode / Interface | Access Evidence | Compliance | Lake Status | Raw Ingested | Qualified PH | Duplicate % | Cadence | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `himalayas:remote-jobs` | Himalayas | Public REST API | Documented unauthenticated API | Allowed | Active | 39 | 2 | 0.0% | 60 min | Expand search & category endpoints |
| `we-work-remotely` | We Work Remotely | Public RSS feed | Documented RSS feed with linkback | Allowed | Active | 80 | 71 | 11.2% | 15 min | Maintain current pull |
| `remotive` | Remotive | Public RSS + JSON | Documented public API & RSS feed | Allowed | Active | 19 | 11 | 0.0% | 60 min | Evaluate full JSON API pagination |
| `remote-ok` | RemoteOK | Public JSON API | Legal notice with linkback | Allowed | Active | 98 | 10 | 1.0% | 60 min | Extract company domains for ATS detection |
| `real-work-from-anywhere` | RWFA | Public RSS feed | Hourly TTL RSS endpoint | Allowed | Active | 49 | 21 | 2.0% | 60 min | Maintain current pull |
| `jobicy-admin-support-apac` | Jobicy | Public RSS feed | Documented APAC RSS feed | Allowed | Active | 3 | 3 | 0.0% | 60 min | Rotate origin cadence group |
| `jobicy-supporting-apac` | Jobicy | Public RSS feed | Documented APAC RSS feed | Allowed | Active | 39 | 29 | 2.5% | 60 min | Rotate origin cadence group |
| `breezy:20four7va` | Breezy / Agency | Breezy JSON | Public listing feed for PH agency | Conditional | Active | 105 | 104 | 0.9% | Daily | Monitor requisition lifecycle |
| `breezy:sourcefit` | Breezy / Agency | Breezy JSON | Public listing feed for PH agency | Conditional | Active | 77 | 71 | 7.2% | Daily | Monitor requisition lifecycle |
| `breezy:yokly` | Breezy / Agency | Breezy JSON | Public listing feed for PH agency | Conditional | Active | 11 | 11 | 0.0% | Daily | Maintain daily sync |
| `breezy:remote-craft` | Breezy / Agency | Breezy JSON | Public listing feed for PH agency | Conditional | Active | 15 | 14 | 6.7% | Daily | Maintain daily sync |
| `breezy:value-virtual-assistants`| Breezy / Agency | Breezy JSON | Public listing feed for PH agency | Conditional | Active | 9 | 9 | 0.0% | Daily | Maintain daily sync |
| `greenhouse:grafanalabs` | Greenhouse | Boards API | Public documented job board API | Conditional | Canary | — | — | — | 60 min | Ready for Lake intake |
| `greenhouse:gitlab` | Greenhouse | Boards API | Public documented job board API | Conditional | Canary | — | — | — | 60 min | Ready for Lake intake |
| `workable:rocketams` | Workable | Widget API | Public widget endpoint | Conditional | Shadow | — | — | — | Daily | Evaluate memory bounds in Lake |
| `ashby:supabase` | Ashby | Posting API | Public posting API | Needs Review | Candidate | — | — | — | 120 min | Complete compliance review |
| `Freehire` | Reservoir | Open Dataset/API | Public repository locator | Research | Backlog | — | — | — | N/A | Benchmark schema & terms |
| `ats-scrapers` | Tooling / Scraping | Library | Open source MIT code | Research | Reusable | — | — | — | N/A | Extract domain -> ATS mapping logic |
| `ats-jobs` | Tooling / Scraping | Library | Open source MIT code | Research | Reusable | — | — | — | N/A | Port tenant detection heuristics |
| `CareerScout` | Tooling / Discovery | Architecture | Open source MIT code | Research | Reference | — | — | — | N/A | Adopt crawler pool concepts |

---

## 3. High-Value Pool Identification

1. **Largest Unused Permitted Pool:**
   - **Remotive Public JSON API (`https://remotive.com/api/remote-jobs`)**: Contains ~1,000+ active worldwide remote listings. Currently only the 19-item RSS feed is ingested. Expanding to the full JSON API with streaming pagination can yield 100+ net-new qualified opportunities.
   - **Himalayas Category & Search Pagination**: Currently querying 100 limit; Himalayas holds ~10,000 remote jobs searchable by category and region.
   - **Greenhouse / Ashby Active Canaries**: `greenhouse:grafanalabs`, `greenhouse:gitlab`, `ashby:supabase` are pre-wired and can be enrolled into Lake raw observation staging.

2. **Refinery Yield Dynamics:**
   - Agency-direct feeds (`20Four7VA`, `Sourcefit`, `Yokly`, `Remote Craft`, `Value VA`) demonstrate a **95–99% qualification yield** for Philippine remote workers because their business model is explicitly dedicated to hiring talent in the Philippines.
   - Broad reservoirs (`RemoteOK`, `Himalayas`) demonstrate a **5–15% qualification yield** but provide immense company and ATS tenant discovery intelligence.
   - Preserving the broad reservoir observations in Turso protects Cloudflare D1 from noisy ingestion churn while extracting high-value discovery leads.
