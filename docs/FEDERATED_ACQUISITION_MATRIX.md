# Federated Acquisition Coverage Matrix

**Canonical Reference:** `docs/FEDERATED_ACQUISITION_MATRIX.md`  
**Last Updated:** 2026-09-26T14:00:00+08:00 (Asia/Manila)  
**Status:** Live Production Baseline + ATS Dataset Intake Expansion  

---

## 1. Executive Summary & Universe Overview

| Metric | Current Value | Notes |
| :--- | :--- | :--- |
| **Known Feeder Universe** | 12,000+ companies mapped | OpenJobs `companies_v2.json` (12,144 companies, 7,007 with ATS links) + curated cohort |
| **Technically Ingestible** | 5 ATS families | Breezy, Greenhouse, Workable, Lever, Ashby public JSON endpoints (native adapters) |
| **Actively Observed in Turso Lake** | 12 sources + 100 ATS tenants | Himalayas, WWR, Remotive, RemoteOK, RWFA, Jobicy (2), Breezy (5) + bulk ATS discovery |
| **ATS Tenants Evaluated** | 100 tenants | 1 auto-approved, 2 shadow-monitored, 97 auto-rejected (all with Jev 1.13 evidence) |
| **Lake Raw Observations** | 16 observations | Preserved in `lake_raw_observations` with SHA-256 payload hash |
| **Duplicate Sightings Captured** | 78+ sightings | Tracked in `lake_sightings` (cross-source provenance preserved) |
| **Historical Replay Events** | 31 audit events | Logged in `lake_replay_events` via `geoGate-v1.2-refinery` (latest replay: 363 evaluated, 0 changed — honest no-op) |
| **Qualified Ready in Lake** | 122 candidates | `greenhouse:canonical` — 122/306 worldwide-remote roles verified by deterministic `geoGate` (held from D1 per ADR-007) |
| **Synced to Cloudflare D1** | 359 opportunities | Idempotently published through governed sync bridge (buffer fully drawn down before expansion) |
| **Production D1 Active Inventory**| 856+ opportunities | Pristine serving mart powering public Astro website |

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
| `greenhouse:canonical` | Greenhouse | Boards API | Public documented job board API | Conditional | Auto-approved | 306 | 122 | 2.0% | Daily | HELD from D1 sync per ADR-007; review then `--allow-auto-approved` |
| `lever:xsolla` | Lever | Postings API | Public unauthenticated JSON | Conditional | Shadow | 179 | 20 | — | Daily | Borderline 11.2% PH rate; monitor, do not sync |
| `lever:spyke-games` | Lever | Postings API | Public unauthenticated JSON | Conditional | Shadow | 11 | 1 | — | Daily | Borderline 9.1% PH rate; monitor, do not sync |
| OpenJobs `companies_v2.json` | Open Dataset | Bulk seed map | Public GitHub repo (12,144 companies) | Allowed | Active reservoir | 400 seeds normalized | 100 tenants probed | — | Weekly | Rotate cohort slices; cache in `tmp/lake-seed-cache/` |
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
