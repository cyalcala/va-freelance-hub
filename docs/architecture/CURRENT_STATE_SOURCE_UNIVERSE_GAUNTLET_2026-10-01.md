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

## 7. PHASE 3 — RECONCILIATION (delivered, follow-on session same day)

- **`scripts/lake/reconcile-discovered-corpus.ts` (new) + 4 tests:** the repeatable flywheel
  mechanism — deterministic stratified slices of the `discovered` corpus through the
  sanctioned `runBulkAtsDiscovery` engine; lake_runs ledger records evidence.
- **Live reconciliation (90 boards, 30/family):** scanned=90, tenants found=56,
  **1 admitted (`lever:sofarsounds`, 10 jobs, 20.0% PH, 2 QUALIFIED_READY)**, 2 shadowed,
  53 auto-rejected. **Marginal qualified yield: 0.0222/probe** — the bulk corpus's
  direct-ingestion value is measured LOW; outlier mining is the value.
- **Governance observation (VERIFIED, working as designed):** `lake:sync` correctly HELD
  Sofar Sounds' 2 jobs — the sync's publication layer computes the Wilson lower bound
  per source (2/10 → ~3.7% < 20% floor → HOLD) while the admission layer admitted on the
  raw-rate threshold (20% ≥ 20%). Dual-gate defense-in-depth: admission ≠ publication
  authority (MATH-06 / Constitution Part XV). The 2 rows remain pending in the lake.

## 8. PHASE 4 — PH HIGH-PRIOR COHORT DISPOSITION (measured, same day)

Research (verified, live webfetch) determined the real ATS for the Gauntlet's 32-name PH cohort:

| Disposition | Companies | Evidence |
| :--- | :--- | :--- |
| **Already admitted** (Workable/Breezy/Ashby ATS, 15 live tenants) | MultiplyMii, Coconut, CrewBloom, Hunt St (+ 20Four7VA, Sourcefit, Yokly earlier) | Workable widget APIs fetched live; confirmed in Turso |
| **No standard ATS / own platform** | Emapta (OutSystems), VirtualStaff.ph (own platform), Remote Staff (WP+HereFish), RecruitGo (own), My Amazon Guy (HubSpot forms; Greenhouse 404 NOT confirmed), System Six (WP), Outsourced (WP; internal JobAdder hint, no external ATS) | Careers pages fetched, fingerprints absent |
| **Blocked by anti-bot — NEVER bypass** | Satellite Office (SiteGround captcha), Access Offshoring (HTTP 522), Flex Philippines (JS challenge) | Fetch attempts blocked; compliance rules prohibit bypass |
| **Empty boards** | Outsourced Doers (`outsourceddoers.breezy.hr/json` → `[]`), superstaff widget → `{"jobs":[]}` | Fetched JSON live |
| **Defunct board** | Wing Assistant (JazzHR `wing.applytojob.com` inactive) | Redirects to JazzHR generic page |
| **Large BPO, no public JSON** | Foundever (SuccessFactors RMK), TTEC (Radancy+Taleo), Booth & Partners (Zoho Recruit, JS-rendered), Cool Blue VA (RecruitCRM, JS-rendered) | Fingerprints verified, no public API |
| **Wired PH agency cohort — NEGATIVE RESULT** | VAA Philippines, Vault Outsourcing, ConnectOS, Global Strategic, MyOutDesk, Outsource Access, Staff Domain, SuperStaff, Virtual Staff 365: 9/9 seeds non-productive (alive-but-empty or dead endpoints) | `ingest-ph-agency-cohort.ts` live run: 0 tenants found; direct checks: breezy `[]`, workable `{"jobs":[]}`, lever conn-fail |

**Conclusion:** the PH cohort is mostly represented through its already-admitted ATS
tenants; the remaining candidates have no compliant public-JSON access path. No new PH
source admission was warranted by the evidence.

## 9. PHASE 5 — WORKDAY CXS BOUNDED REMOTE-YIELD PROBE (NEGATIVE RESULT, same day)

- **Bounded probe** (`tmp/workday-remote-probe.ts`, 20 jobs each via the CXS POST pattern):
  - Concentrix (`cnx`): 20 jobs, 0 PH-eligible, 1 remote (non-PH)
  - TaskUs: 20 jobs, 2 PH-eligible (Pasig, Pampanga), 0 remote, 2 PH-onsite
  - Accenture: 20 jobs, 0 PH-eligible, 0 remote
- **PH-REMOTE yield: 0/60 = 0.0%** on the sampled slice. The trio's ~4,000 raw postings
  do NOT justify a Workday CXS adapter build for the REMOTE floor — PH roles are onsite.
- **Falsification condition:** a deeper paginated probe (100–200 jobs) finding material
  remote-indicated PH roles would reopen the adapter decision. Until then: negative
  result recorded; the adapter is NOT built (Gauntlet: do not keep it merely because
  research effort was spent).

## 10. SESSION CLOSEOUT (Constitution Part LXIII)

```text
CURRENT BOTTLENECK: PH-qualified fresh supply (35.9/day vs 100/day floor); broad-corpus
mining measured at 0.0222 qualified/probe — the productive path is PH-dedicated agencies
and outlier mining, now mechanized.

REALITY CHANGES: 9,741 LastRound discovery claims in Turso (provenance-preserved);
90-board stratified validation; 2 outlier tenants admitted (16 jobs → D1 840);
reconciliation flywheel mechanized; PH cohort + Workday adapter measured as negative.

BASELINE: 35.9 fresh/day, gap -64.1 (2026-09-23→09-30, VERIFIED).

HYPOTHESIS: expanding the live-validated first-party ATS universe increases qualified
flow — CONFIRMED for targeted outlier admission (16 jobs), REJECTED for bulk-corpus
ingestion (1.8% raw PH) and Workday BPO adapters (0/60 PH-REMOTE).

ACTION: discovery-only import + stratified reconciliation + outlier admission.

STATE: SHADOW (9,685 corpus claims) + PRODUCTION (16 outlier jobs published via receipts).

PRIMARY METRIC: net-new fresh qualified PH jobs — +16 published (D1 824→840).

GUARDRAILS: PASS (FalsePH/FalseRemote/Duplicate/BrokenURL thresholds unchanged; sync
gate correctly held borderline source; 59→63 lake tests, typecheck, guardrails clean).

COUNTERFACTUAL: NOT IDENTIFIABLE (no controlled comparison run).

FALSIFICATION: SURVIVED for the import/reconciliation mechanism; the corpus-value
hypothesis was FALSIFIED for bulk ingestion (measured 1.8% raw PH) — recorded.

ROLLBACK: READY — DELETE FROM lake_ats_discovery WHERE review_status='discovered' AND
admission_reason LIKE 'lastround%'; + revert commits.

KILL SWITCH: TESTED-BY-CONSTRUCTION (import never polls; --validate-sample is the
opt-in probe).

NEW EVIDENCE: ~90% of the LastRound snapshot is alive; raw PH yield ~1.8%; marginal
yield 0.0222/probe; publication gate enforces sample-size-aware Wilson authority.

NEGATIVE EVIDENCE: 9/9 PH agency cohort seeds dead/empty; Workday trio 0/60 PH-REMOTE;
bulk-corpus ingestion uneconomical.

NEXT SINGLE ACTION: Run another bounded reconciliation slice (--per-family=30, the
corpus has 9,685 unvalidated claims) or evaluate additional high-PH outliers as the
stratified probes surface them; owner/controller: maintainer; trigger: next marathon
session or scheduler tick.
```
