# CURRENT_STATE — Deep Source Universe Expansion Gauntlet (2026-10-01)

**Mode:** AUTONOMOUS_MARATHON_MODE (Supervisor + Bootloader v5.2 + Gauntlet, "maintenance7" session).
**Start HEAD:** `b292614` (clean, in sync with `origin/main`).
**Authorization:** User-supplied Gauntlet (`C:\Users\admin\Desktop\maintenance7.txt`, archived conceptually below) + maintainer bootloader v5.2.
**Provenance research agent:** general subagent, verified via live webfetch (this session).

---

## 1. PHASE 0 — RECOVER REALITY (binding-constraint verification)

### Reality recovered (VERIFIED)

| Fact | Value | Evidence |
| :--- | :--- | :--- |
| Branch / HEAD | `main` `b292614`, clean, fetched | `git status` / `git fetch` |
| Primary runtime | Cloud Run Jobs + Schedulers (GCP `antigravity-494415`) — dual-primary batch | SYSTEM_SAVEPOINT 2026-10-01 |
| D1 synced inventory | 824 opportunities, 0 pending | `bun run lake:state` (this session) |
| Measured fresh flow | **35.9 qualified fresh jobs/day** (7 complete Manila days, 2026-09-23→09-30) | `scripts/diagnostics/measure-first-publication-funnel.ts` live run (2026-10-01 savepoint) |
| Gap to 100/day floor | **-64.1 jobs/day** | same measurement |
| Gap to 150/day stretch | -114.1 jobs/day | same measurement |
| Auto-approved tenants | 13 | `bun run lake:state` |
| Shadow clean-day streaks | `greenhouse:wikimedia` 5/8, `greenhouse:canonical` 4/8 | CURRENT.md pointer |

### Binding constraint verdict (the Gauntlet's CORE HYPOTHESIS check)

**Source supply IS the binding constraint.** The measured flow (35.9/day) is 36% of the
100/day floor, and CURRENT.md names supply as the primary bottleneck. The existing
admission pipeline is healthy (Jev + Wilson bounds, 0 failed ticks) and the publication
runtime is hardened (GCP primary, 0 pending sync). Nothing between an admitted source and
publication is currently starved — the constraint is how few qualified sources exist.
Per the Gauntlet: **the mine may open.** Expansion proceeds as discovery + shadow only.

---

## 2. PHASE 1 — SOURCE UNIVERSE AUDIT

### Existing ATS capability coverage (VERIFIED_CODE — `docs/SOURCE_CAPABILITIES.md`)

| ATS family | Adapter | Status |
| :--- | :--- | :--- |
| Greenhouse | `packages/scraper/greenhouse.ts` | Production qualified |
| Lever | `packages/scraper/lever.ts` | Qualified mechanism |
| Ashby | `packages/scraper/ashby.ts` | Tested / Tier A candidates |
| Workable | `packages/scraper/workable.ts` | Verified mechanism (SP-10) |
| Recruitee | `packages/scraper/recruitee.ts` | Shadow admitted |
| Teamtailor | `packages/scraper/teamtailor.ts` | Shadow admitted |
| Breezy | `packages/scraper/breezy-canary.ts`, `ats.ts` | Qualified, allowlisted |
| RSS/Atom/JSON feeds | exact-six production path | Active |

### Missing provider families (gap, not implemented — per Gauntlet "Do NOT implement all")

High-count families with no native adapter (Workday, BambooHR, Personio, SmartRecruiters,
iCIMS, Rippling, Pinpoint, Zoho Recruit, Teamtailor-tenant-scale, JazzHR, …) are recorded
as a capability-gap backlog. Ranking by expected marginal PH-qualified yield (Phase 5) is
deferred until the LastRound corpus is stratified — raw global posting count is explicitly
not the ranking key.

### Turso discovery universe (this session, VERIFIED_RUNTIME)

| Layer | Before | After |
| :--- | ---: | ---: |
| `lake_ats_discovery` rows | ~249 evaluated tenants | ~249 evaluated + **9,741 discovery claims** |
| `review_status='discovered'` | (new state) | 9,741 |
| D1 synced | 824 | 824 (unchanged — SHADOW-only contract held) |

---

## 3. PHASE 2 — EXTERNAL REGISTRY INGEST (delivered this session)

### Provenance (VERIFIED — live webfetch research)

- **Dataset:** LastRound AI "ATS Company Directory: 9,935 companies"
- **Raw CSV:** `https://raw.githubusercontent.com/fyrosofttech/lastroundai-hiring-data/main/ats-directory/lastroundai-ats-company-directory-2026-08.csv` (432 KB, fetched + verified: header `ats_vendor,company_name,board_slug,last_crawled`, 9,936 lines = 1 header + 9,935 rows)
- **License:** CC BY 4.0 — attribution "LastRound AI" + link to the pay-transparency study (`github.com/fyrosofttech/lastroundai-hiring-data`, Figshare DOI 10.6084/m9.figshare.33154145). Corrections: contact@lastroundai.com
- **Composition matches the Gauntlet:** Greenhouse 4,966 / Ashby 2,856 / Lever 2,113
- **freehire** (`github.com/strelov1/freehire`, MIT): public and live; its 157k board catalogue lives in its production Postgres, not bulk files — recorded as a discovery-ideas source (boardcatalog/atsdetect patterns), not a bulk-data mine.

### Delivered unit — `scripts/lake/import-source-registry.ts` + CSV ingestion in `bulk-ats-seed.ts`

- `bulk-ats-seed.ts`: added `LAROUND_RAW_URL` + `LAROUND_PROVENANCE` constants, RFC4180
  `parseCsvLine`, `seedsFromLastRoundCsv` (ats_vendor→greenhouse/lever/ashby mapping,
  slugified board_slug), `loadRemoteTextCached` (CSV cache), and `.csv` detection for both
  `--file=` and `--url=` paths.
- `import-source-registry.ts` (new): discovery-only import runner.
  - **SHADOW-only contract:** zero probes during import, zero D1 writes, zero ingestion,
    zero promotion; never overwrites an existing row (`ON CONFLICT DO NOTHING`).
  - **Provenance durability:** new additive `discovery_origin` column (ALTER TABLE
    idempotent + fresh-DB CREATE TABLE updated in `init-lake.ts` and
    `ensureDiscoveryTable`) so future probe updates can never silently overwrite the
    discovery claim; run ledger row written to `lake_runs` (first consumer of that table).
  - **review_status='discovered'** (new additive state): distinct from probed
    `shadow_monitor` — unvalidated claims cannot masquerade as evaluated candidates.
    No scheduled job reads `discovered` rows; nothing auto-polls the corpus.
  - **Failure containment:** batched INSERTs (100 rows/chunk, 800 binds < 999 SQLite
    ceiling), 50 ms inter-chunk pacing, per-chunk error isolation, idempotent re-run
    (dedupe + DO NOTHING replays failed chunks).
- `import-source-registry.test.ts` (new): 10 tests (CSV parsing incl. escaped quotes and
  commas-in-quotes, real dataset head shape, 8-binds/row + 999-bind ceiling, DO NOTHING
  semantics, probe URL patterns, deterministic stratification, synthetic domain).
- `--validate-sample=N` mode: read-only stratified liveness/PH-yield probe (deterministic
  geoGate, no Jev, no writes) for bounded live validation.

### Import execution (VERIFIED_RUNTIME)

- Dry-run: 9,935 normalized → 194 already known (existing evaluated tenants preserved) → 9,741 fresh claims (ashby 2,818 / greenhouse 4,843 / lever 2,080).
- Real import: **9,741 discovery claims imported in 98 batches, 0 failed chunks**, provenance recorded, `review_status='discovered'`.
- D1 unchanged (824 synced, 0 pending) — SHADOW-only contract verified post-import.

### Bounded stratified validation probe (VERIFIED_RUNTIME, n=60, read-only)

| Metric | Result |
| :--- | :--- |
| Sample | 60 boards (20 per family, deterministic even spacing) |
| Alive (HTTP 200) | **54/60 (90.0%)** |
| Dead (404) | 3 (`doctorswithoutborders`, `busaracenter`, `placeshowroomcom`) |
| Timeouts | 3 (`slideinsurance`, `townsquaremedia`, `100ms`) — per-board transient |
| Observed open jobs | 979 (~18.1/board across alive boards) |
| Raw PH-qualified estimate | **18/979 = 1.8%** (deterministic geoGate; Wilson interval wide at n=60 — estimate, not a calibrated rate) |
| High-PH outliers | `lever/snappr` 76.5% (13/17), `ashby/the-studio` 60.0% (3/5) |
| Sampled from | `review_status='discovered'` corpus, unvalidated claims |

### Interpretation (honest, per Constitution Part XV)

1. The LastRound snapshot is largely alive (~90% of the sampled boards respond 200),
   confirming live-validation is mandatory but not prohibitive (the dataset's own
   stale-Ashby caveat matched: most failures were per-board transients/404s).
2. **Raw PH yield of the broad universe is LOW (~1.8%)** — even below the 5–15% broad
   reservoir band in FEDERATED_ACQUISITION_MATRIX. Bulk ingestion of all 9,741 boards
   would NOT materially increase qualified flow; it would add duplicate/noise volume.
3. **The corpus's value is discovery intelligence, not direct ingestion**: 9,741
   candidate tenants for the discovery flywheel (employer→ATS→validation→admission),
   and high-PH outliers (`snappr`, `the-studio`) worth deep evaluation through the
   existing Jev+Wilson admission pipeline.
4. Theoretical ceiling if every alive board were ingested: ~175K postings × ~1.8% ≈
   ~3,150 PH-qualified — but freshness, dedup, and request budgets make bulk polling
   uneconomical. MarginalUniqueYield governs; gross volume does not.

---

## 4. HARD GUARDRAILS (unchanged — VERIFIED this session)

`docs/ACCEPTED_PARAMETERS.yaml`: FalsePH ≤ 1.0%, FalseRemote ≤ 0.5%, BrokenURL ≤ 1.0%,
Duplicate ≤ 0.5%, Unsafe = 0.0%, top source share ≤ 25%, top provider-family share ≤ 40%,
cost ≤ $0.05/net-new, freshness ≤ 30 days, unknown-date retain-do-not-publish. No value
weakened. Guardrails + typecheck + 59/59 lake tests clean.

## 5. ROLLBACK / KILL SWITCH

- **Rollback:** `DELETE FROM lake_ats_discovery WHERE review_status = 'discovered' AND admission_reason LIKE 'lastround%';` (removes exactly the imported claims; evaluated rows and provenance evidence untouched). Code rollback: revert the commit.
- **Kill switch:** do not run `--validate-sample` or any probe against the corpus; the import never polls, so no runtime kill switch is required for the corpus itself.
- **Replay:** re-running the import is idempotent (dedupe + DO NOTHING).

## 6. NEXT SINGLE ACTION (Gauntlet Phase 3 — reconciliation)

Evaluate the high-PH outliers (`lever/snappr`, `ashby/the-studio`) through the existing
admission pipeline, then build Phase 3 cross-registry reconciliation: canonicalize
employer/domain/ATS/board across LastRound claims and the existing registry, live-validate
a bounded stratified slice, persist validation evidence to the `discovered` rows
(`job_count`, `ph_rate`, `review_status` transition), and stratify the corpus
(HOT/WARM/EXPLORATION/DORMANT per project conventions). Owner/controller: maintainer;
trigger: next marathon unit or scheduler tick.
