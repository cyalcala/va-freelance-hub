# Deep Architectural, Pipeline, and Test Infrastructure Investigation
**VA Freelance Hub — Explorer 2 Technical Report**
Date: 2026-10-10
Investigator: `explorer_2` (`teamwork_preview_explorer`)
Project Root: `c:\Users\admin\Desktop\va-freelance-hub`

---

## Executive Summary

An exhaustive read-only investigation of VA Freelance Hub was conducted to analyze its end-to-end data pipelines, verification and gating layers, test harnesses, database mocking approaches, safety invariants, and git configuration.

The platform is designed to index remote opportunities open to Filipino freelancers while maintaining rigorous safety, compliance, and freshness gates. The system operates across a multi-tier infrastructure:
1. **Acquisition / Ingestion**: RSS feeds, JSON APIs, ATS integrations (Greenhouse, Lever, Ashby, Breezy, Workable), and background miner scripts.
2. **Acquisition Reservoir**: Turso (LibSQL) serving as candidate reservoir and ingestion lake.
3. **Serving Mart**: Cloudflare D1 (SQLite at the edge), accessed via Drizzle ORM.
4. **Public Serving Layer**: Astro SSR with `@astrojs/cloudflare` running on Cloudflare Pages.
5. **Background Execution**: Google Cloud Platform (Cloud Run / Cloud Scheduler) as primary background orchestration, with Cloudflare Workers (`freshness-cron`) and Inngest as task processors.
6. **Canonical Source Control**: Google Cloud Secure Source Manager (`origin`), with GitLab as secondary mirror and GitHub as legacy remote.

---

## 1. End-to-End Architecture and Pipeline Flow

```
[Raw Sources: RSS / JSON / ATS APIs]
         │
         ▼
[1. Ingestion Phase]
  ├── Cron: apps/web/src/pages/api/cron/scrape.ts
  ├── Direct API: apps/web/src/pages/api/ingest.ts
  └── Miners: scripts/lake/run-lake-miner.ts, remotive-full.ts, etc.
         │
         ▼
[2. Ingestion Verification & Gating]
  ├── packages/scraper/geoGate.ts (Deterministic geo-eligibility: PH/APAC/worldwide vs country-locked)
  ├── packages/scraper/publication-remote.ts (Explicit onsite/hybrid rejection)
  ├── packages/scraper/source-posting-date.ts (Wall calendar validation before Date rollover)
  ├── packages/scraper/publication-freshness.ts (assessPostingFreshness: 30-day window, calendar check)
  ├── packages/scraper/publication-outbound.ts (URL length <= 1024, protocol sanitization)
  └── packages/scraper/contentHash.ts (16-char contentHash on title + sourceUrl)
         │
         ├─── (Raw observations & discovery) ───► [3. Turso Data Lake Reservoir]
         │                                          ├── lake_raw_observations
         │                                          ├── lake_candidate_jobs
         │                                          └── scripts/lake/sync-to-d1.ts
         │                                              (FENCED: RawLakePublicationBlockedError)
         ▼
[4. Publication Gateway]
  ├── packages/scraper/publication-gateway.ts (publishPublicExposure)
  ├── checks: source_registry (allowed/conditional/active/lease expiry)
  ├── checks: source_opt_outs
  ├── checks: canary tick caps (source_publication_reservation)
  ├── Physical Persistence: db.insert(opportunities)
  ├── Post-Persistence Ownership Check (hasCurrentOwnership in opportunities)
  ├── Append Ledger: source_publication_ledger (retry_key, tick_key, published_ids)
  ├── Portfolio Exposure Checks: <=25% source, <=40% family
  └── Manila Day Tracking: source_publication_manila_day & still_public
         │
         ▼
[5. Cloudflare D1 Database]
  ├── 59 Migrations applied (packages/db/migrations/0000..0058)
  ├── opportunities table (is_active, ph_eligibility, posted_at, etc.)
  ├── opportunities_fts (FTS5 search index via triggers)
  └── source_publication_ledger (audit history)
         │
         ▼
[6. Public Serving & Presentation]
  ├── apps/web/src/lib/public-opportunities.ts (publicOpportunityFilters)
  ├── apps/web/src/lib/public-serving-snapshot.ts (LKG pre-render cache)
  ├── Astro Pages:
  │     ├── / (Home job board)
  │     ├── /opportunities (Search & filter)
  │     ├── /jobs/[id] (Job detail & JSON-LD)
  │     ├── /directory (VA-friendly company directory)
  │     └── /categories/[category] (Categorized listings)
  └── apps/web/src/pages/api/click/[id].ts (Outbound redirect with active+PH live gate)
```

### Detailed Pipeline Components

1. **Ingestion Layer**:
   - `packages/scraper/rss.ts`: Fetches and parses RSS/Atom feeds using `fast-xml-parser`. Extracts titles, locations (`<region>`, `<location>`), categories, and raw dates.
   - `packages/scraper/json.ts`: Fetches and parses JSON feeds (e.g. RemoteOK API).
   - `packages/scraper/ats.ts`: Normalizes ATS feeds (Breezy, Greenhouse, Lever, Ashby, Workable).
   - `apps/web/src/pages/api/cron/scrape.ts`: The primary ingestion cron handler. Performs feed conditional fetching (ETag/Last-Modified via `packages/scraper/conditional.ts`), deduplication against existing database URLs/content hashes, AI triage ladder (Cloudflare Workers AI or OpenRouter), and routes approved items to `publishGroupedInserts`.
   - `apps/web/src/pages/api/ingest.ts`: Direct authenticated ingestion API endpoint. Normalizes incoming payloads, enforces server-controlled fields, runs `geoGate` and `assessPostingFreshness`, and passes items to the publication gateway.

2. **Ingestion Verification & Invariant Enforcement**:
   - Verification runs before any row can be marked active.
   - Location strings are strictly gated: explicit `onsite` or `hybrid` values are immediately rejected (`hasExplicitNonRemoteLocationType`).
   - Dates must represent valid wall-clock calendar instants within 30 days of the observation time.

3. **Acquisition Reservoir (Turso / LibSQL)**:
   - Defined in `scripts/lake/init-lake.ts` and managed via `scripts/lake/client.ts`.
   - Schema tables: `lake_raw_observations`, `lake_intake_batches`, `lake_candidate_jobs`, `lake_source_registry`, `lake_source_state`, `lake_sync_status`.
   - Note on Lake-to-D1 Sync: `scripts/lake/sync-to-d1.ts` line 372 contains an explicit safety fence:
     ```ts
     if (dryRun !== true) throw new RawLakePublicationBlockedError();
     ```
     Real publication from Turso directly to D1 is intentionally blocked pending governed lake publication controls.

4. **Publication Preparation and Gating**:
   - `packages/scraper/publication-gateway.ts` is the single authoritative gateway for public exposure.
   - It validates:
     - Registry compliance (`allowed` or `conditional`).
     - Registry operational state (`active` or `canary`).
     - Opt-out status (`source_opt_outs`).
     - Lease validity (`now < policyExpiry`).
     - Canary rate limits per tick.
   - Post-persistence verification (`hasCurrentOwnership`):
     After physical insertion into `opportunities`, queries the database in batches of 80 to verify that every inserted ID has:
     - `is_active = 1`
     - `ph_eligibility IN ('eligible_verified', 'eligible_likely')`
     - `posted_at` within window (`assessPostingFreshness`)
     - Valid outbound URL (`resolvePublicationOutboundUrl`)
     - No explicit non-remote `location_type`.
     If any check fails, gateway records uncertainty and returns `POST_PERSISTENCE_FAILURE`.

5. **D1 Synchronization & Database Layer**:
   - `packages/db/client.ts`: Strictly requires Cloudflare D1 binding (`env.DB`). Does not allow fallback to local LibSQL in production.
   - Schema defined in `packages/db/schema.ts`.
   - 59 SQL migrations in `packages/db/migrations/` covering schema evolution, FTS5 triggers, lifecycle states, and audit ledgers.

6. **Astro Public Serving Pages**:
   - Public query predicate: `apps/web/src/lib/public-opportunities.ts`:
     ```ts
     export function publicOpportunityFilters(): SQL {
       return and(
         eq(opportunities.isActive, true),
         inArray(opportunities.phEligibility, [...PUBLIC_PH_ELIGIBILITIES]),
       )!;
     }
     ```
   - Pages use Server-Side Rendering (SSR) via `@astrojs/cloudflare`:
     - `/`: `apps/web/src/pages/index.astro`
     - `/opportunities`: `apps/web/src/pages/opportunities.astro`
     - `/jobs/[id]`: `apps/web/src/pages/jobs/[id].astro`
     - `/directory`: `apps/web/src/pages/directory.astro`
     - `/categories/[category]`: `apps/web/src/pages/categories/[category].astro`
     - `/api/click/[id]`: `apps/web/src/pages/api/click/[id].ts` verifies `is_active = 1` and PH eligibility in real time before redirecting outbound applications.

---

## 2. Command Inventory and Execution Status

All primary project verification commands were executed and verified locally.

| Purpose | Exact Working Command | Current Status | Execution Duration / Metrics |
|---|---|---|---|
| **Package Manager** | `bun --version` | **PASS** | v1.3.14 |
| **Typecheck** | `bun run typecheck` (`bunx tsc --noEmit -p apps/web/tsconfig.json`) | **PASS** | Exited 0, 0 type errors |
| **Production Build** | `bun run build` (`astro build` in `apps/web`) | **PASS** | Exited 0, 74.68s, 23 client modules bundled (60.99 kB gzip) |
| **Guardrails Audit** | `bun scripts/ci/check-production-guardrails.ts` | **PASS** | Exited 0, all production guardrails verified |
| **Parameter Parity** | `bun scripts/ci/audit-parameters.ts` | **PASS** | Exited 0, 100% parity between YAML and code constants |
| **Orchestrator Audit** | `bun scripts/ci/check-orchestrator-modifications.ts` | **PASS** | Exited 0, no unauthorized modifications |
| **Constitution Audit** | `bun scripts/ci/audit-constitution.ts` | **PASS** | Exited 0, cohort partition & queue rules passed |
| **DB Package Tests** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts packages/db` | **PASS** | 72 pass, 0 fail (12 files, 412 assertions, 13.65s) |
| **Publication Gateway Tests** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts packages/scraper/publication-gateway.test.ts` | **PASS** | 82 pass, 0 fail (1 file, 358 assertions, 0.98s) |
| **Publication Integration Tests** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts packages/scraper/publication-gateway.integration.test.ts` | **PASS** | 286 pass, 0 fail (1 file, 2676 assertions, 53.96s) |
| **GeoGate Tests** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts packages/scraper/geoGate.test.ts` | **PASS** | 57 pass, 0 fail (1 file, 142 assertions, 0.19s) |
| **Posting Date Scrape Test** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts` | **PASS** | 38 pass, 0 fail (1 file, 590 assertions, 81.09s) |
| **Lake & Refinery Tests** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts scripts/lake/lake.test.ts` | **PASS** | 28 pass, 0 fail (1 file, 91 assertions, 2.36s) |
| **Raw Publication Fence Test** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts scripts/lake/raw-publication-fence.test.ts` | **PASS** | 6 pass, 0 fail (1 file, 39 assertions, 1.50s) |
| **Broader CI & Workers Test** | `bun test --no-env-file --preload ./scripts/ci/test-environment.ts scripts/ci scripts/gha scripts/diagnostics workers/freshness-cron/src scripts/gcp` | **PASS** | 619 pass, 0 fail (45 files, 307,037 assertions, 115.29s) |

---

## 3. Test Harnesses, Adversarial Testing, and Database Mocking

### A. Environment Sanitization Preload
Every test run uses `--preload ./scripts/ci/test-environment.ts`.
Contents (`scripts/ci/test-environment.ts`):
```ts
for (const name of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "OPENROUTER_API_KEY"]) {
  delete process.env[name];
}
```
This guarantees that tests cannot accidentally connect to production Turso or LLM APIs through inherited environment variables.

### B. High-Fidelity In-Memory Native SQLite Test Harness
In `apps/web/tests/fixtures/native-fresh-scrape-posting-date.ts` and `packages/scraper/publication-gateway.integration.test.ts`:
1. **In-Memory SQLite**: Creates an isolated `new Database(":memory:")` using `bun:sqlite`.
2. **Migration Replay**: Loads all 59 production migrations directly from `packages/db/migrations/` and executes them sequentially.
3. **Trigger Handling & Clock Projection**: Replaces `julianday('now')` with fixed evaluation timestamps to test ledger append-only and uniqueness triggers deterministically.
4. **D1 Mocking**: Builds a synthetic D1 binding interface with `.prepare(query)`, `.bind(...params)`, `.first()`, `.all()`, `.raw()`, and `.run()`. The Drizzle ORM client is initialized with this mock binding via `getDb({ DB: binding })`.
5. **Deterministic Clocks**: Uses `setSystemTime(new Date("2026-10-10T12:00:00.000Z"))`.
6. **Synthetic Transport**: Intercepts `globalThis.fetch` to return controlled raw responses for RSS, JSON, and `robots.txt` without network egress.

### C. Unit-Level Database Mocking
`apps/web/tests/publication-db-fake.ts`:
Implements `PublicationDatabase` interface with a `FakePublicationDatabase` that routes queries (optOut, retry, tickSum, registry, ownership, insert, transition) to pre-queued fake responses.

### D. Adversarial & Stress Test Coverage
The test suites include exhaustive adversarial cases:
- Malformed / corrupted publication acknowledgements (null, undefined, string, NaN, infinite, negative, fractional, duplicate IDs).
- Callback throws during persistence.
- Stolen / lost acknowledgements where DB commits but ledger fails.
- Leases expiring mid-transaction.
- Opt-outs appearing between policy read and physical write.
- Date boundary edge cases: future by 1 nanosecond, exactly 30 days old, 30 days + 1 millisecond old.
- Calendar rollover exploitation: Sept 31 rolling over into Oct 1.
- Inactive rows, duplicate rows, foreign IDs in same-source batches.
- Concentration limit breaches (single source > 25%, provider family > 40%).

---

## 4. Gating Invariants and Safety Rules

| Invariant / Rule | Code Location | Key Logic / Threshold |
|---|---|---|
| **Deterministic Geo Gate** | `packages/scraper/geoGate.ts:247` (`geoGate`) | Prioritized cascade: 0: explicit non-remote workplace contradiction (`onsite`/`hybrid`), 1: positive PH locations/text (`ph_only`, `apac_incl_ph`), 2: language detection (`detectDominantLanguage` rejects Italian/German/Spanish/French/Portuguese/Dutch/Polish), 3: foreign language tags, 4: structured country/US/state locks, 5: title locks, 6: residence/work-permit locks, 7: worldwide regex, 8: unknown/unclear fallback. |
| **Explicit Non-Remote Rejection** | `packages/scraper/publication-remote.ts:3` | `hasExplicitNonRemoteLocationType(v)` strictly checks if `v === 'onsite' \|\| v === 'hybrid'`. Absence of value does not prove remote. |
| **Wall Calendar Date Validation** | `packages/scraper/source-posting-date.ts:16` | Validates raw ISO and RFC 5322 RSS dates before JavaScript `Date` parser can silently roll over invalid days (e.g. Sept 31 -> Oct 1). |
| **Posting Date Freshness** | `packages/scraper/publication-freshness.ts:13` (`assessPostingFreshness`) | Enforces `MAX_POSTING_AGE_MS = 30 * 86_400_000` (30 days). Rejects future timestamps (down to sub-millisecond nanoseconds), stale postings (>30d), unparseable formats, and invalid calendar days. |
| **Outbound URL Safety** | `packages/scraper/publication-outbound.ts`, `packages/scraper/urls.ts` | Maximum URL length: 1024 characters. Enforces valid http/https/mailto schemes. Strips javascript:/data: URIs. Links back to original source. |
| **Deduplication** | `packages/scraper/contentHash.ts:11` | Canonical 16-hex hash derived from `title` and `sourceUrl` (`toContentHash`). DB enforces unique constraint on `content_hash` and `source_url`. |
| **Publication Gateway** | `packages/scraper/publication-gateway.ts:263` (`publishPublicExposure`) | Governs all public visibility transitions. Enforces registry leases, opt-out status, canary rate caps, post-persistence ownership (`hasCurrentOwnership`), append-only ledger entries, and portfolio concentration limits. |
| **Raw Lake Publication Fence** | `scripts/lake/sync-to-d1.ts:372` | Throws `RawLakePublicationBlockedError` on non-dry-run executions to prevent un-governed bulk lake sync into D1. |
| **Public Serving Filter** | `apps/web/src/lib/public-opportunities.ts:11` | All public queries filter by `opportunities.isActive = true AND opportunities.phEligibility IN ('eligible_verified', 'eligible_likely')`. |
| **Outbound Click Live Gate** | `apps/web/src/pages/api/click/[id].ts:48` | Queries database on every click to ensure job is still active and PH-eligible before issuing 302 redirect. |

---

## 5. Git Status, Remotes, and Commit History

### A. Git Status & Remotes
- **Active Branch**: `codex/verified-flow-directory-checkpoint`
- **Branch Divergence**: Local branch is ahead of `origin/codex/verified-flow-directory-checkpoint` by 27 commits.
- **Working Tree**: Clean with respect to tracked files; untracked agent/audit metadata files exist (`.agents/`, `astra777.txt`, `docs/audits/evidence/2026-10-10-ponytail/`, `lucky777.md`, `test-date.ts`).
- **Configured Remotes**:
  - `origin`: Google Cloud Secure Source Manager (Canonical repository, Asia-Northeast1):
    `https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub.git`
  - `gitlab`: Secondary mirror:
    `https://gitlab.com/cyrus-group4793641/va-freelance-hub.git`
  - `github`: Local remote:
    `https://github.com/cyalcala/va-freelance-hub.git`

### B. Recent Commit History
Latest 10 commits on `codex/verified-flow-directory-checkpoint`:
```
0525bb1f (HEAD) Keep foreign still-public id in same-source breach out of completed flow
532e353f Record that foreign still-public id in same-source pair is not a flow
c4b7d187 Keep foreign still-public id in same-source pair out of completed flow
caa742c8 Record that foreign still-public id in same-source breach stays absent
e743ad5d Keep foreign still-public id in same-source breach out of family status
6a26ae3e Record that foreign still-public id in same-source pair stays absent
8a5ad157 Keep foreign still-public id in same-source pair out of family status
c2fe12a0 Record that repeated still-public id in same-source breach is not a flow
bde8be9e Keep repeated still-public id in same-source breach out of completed flow
980d6149 Record that repeated still-public id in same-source pair is not a flow
```

Key milestones in recent commit history:
- `46bc67fc`: Documented Google Cloud Secure Source Manager as canonical Git remote (`origin`).
- `f6753582`: Landed date validation in `packages/scraper/source-posting-date.ts` to validate original posting dates before fresh scrape publication.
- `a14816e8`: Gated unclear-backlog PH upgrades before they become public.
- `a302004a`: Withdrew public rows that drift off remote or the posting window.
- `e56ea9bb`: Handled lost publication acknowledgements.
- `ff031f7d`, `3dcb8efc`: Added non-blocking portfolio exposure and serving book measurement.
- `e0ea80ae`, `6920ac08`, `18ec13dc`: Added Manila-day first-publish tracking and open snapshot recording.
- Commits up to `0525bb1f`: Extensive integration tests and invariants preventing foreign, duplicate, or inactive IDs from being counted as completed Manila-day flows.

---

## 6. Synthesis and Findings for the 100–150 Jobs/Day Initiative

1. **Root Cause of Date Gating Defect**:
   - As documented in `astra777.txt` and confirmed by our code trace, previously in `apps/web/src/pages/api/cron/scrape.ts`, items were parsed and normalized via `Date.parse()` / `new Date().toISOString()` which repaired invalid calendar dates (e.g. Sept 31 -> Oct 1).
   - Furthermore, `publishGroupedInserts` performed `db.insert(opportunities)` *before* the gateway verified ownership (`hasCurrentOwnership`). When `hasCurrentOwnership` failed, the row had already been inserted as active, making it visible on public pages via `publicOpportunityFilters()` even though the gateway returned an error.
   - Commit `f6753582` introduced `packages/scraper/source-posting-date.ts` to pre-validate raw dates against calendar rollover.
   - Test `apps/web/tests/native-fresh-scrape-posting-date.test.ts` (38 passing tests) now validates that invalid raw dates never reach positive exposure.

2. **Lake Ingestion Bottleneck**:
   - The primary bottleneck to reaching 100–150 jobs/day is that the raw Lake sync in `scripts/lake/sync-to-d1.ts` is fenced with `RawLakePublicationBlockedError`.
   - The platform relies on the live scrape cron (`apps/web/src/pages/api/cron/scrape.ts`) which is rate-limited to 50 items per run.
   - Enabling safe lake synchronization through governed publication authority (under ADR-007 and MATH-06) is the key prerequisite for scaling throughput.
