# Publication Debug State & Hypothesis Verification

**Checkpoint Date**: 2026-09-14  
**Audit Author**: Parallel Debugging Bootloader  
**Repository Branch**: `main`  
**Reference Commit**: `8143c8a feat(experiment): evaluate Crawl4AI OSS and Cloudflare Kitesurf on custom career cohort (EXP-CRAWL4AI-KITESURF)`  
**D1 Database**: Cloudflare Production D1 (`DB` / `08072f16-d3d1-436a-9104-b057a162db7c`)

---

## 1. Diagnostic Verification Matrix

| # | Hypothesis Under Test | Verification Method | Empirical Evidence | Verdict |
| :---: | :--- | :--- | :--- | :---: |
| **H1** | **Internal Pipeline Leaks**: Legitimate jobs are being dropped by feed parsing, URL normalization, or database insertion failures. | Traced code paths in `rss.ts`, `json.ts`, and `scrape.ts`. Queried D1 error logs and batch statistics. | 0 items dropped for malformed URLs; 0 batch insert failures recorded in 7 days; 100% of parseable items reach deduplication. | ❌ **REFUTED** |
| **H2** | **Over-Aggressive Geo-Gate / Triage**: Strict filters or AI skeptic rejections are discarding valid Philippine remote jobs. | Audited all 33 `policy-rejected` items inserted into D1 over the 7-day window (`funnel-audit-output.json`). | Net-new pass rate is **71.55%** (83 of 116). 100% of rejected items were physical on-site retail/trades (RemoteOK noise) or explicitly non-PH geographic locks. Zero false negatives. | ❌ **REFUTED** |
| **H3** | **Publication Gateway Bottleneck**: `publishPublicExposure` is throttling or capping eligible exact-six jobs. | Queried `source_publication_ledger` for all exact-six batches over 7 days. | Exact-six exposure mode is `unlimited`. All 40 proposed batches were published (40 published, 0 dropped). `proposed == published`. | ❌ **REFUTED** |
| **H4** | **Frontend Display Suppression**: Astro UI routes or queries are hiding active jobs from public view. | Inspected `apps/web/src/pages/index.astro` and `opportunities.astro`. | `opportunities.astro` paginates all `is_active = 1` rows with `PAGE_SIZE = 30`. `index.astro` partitions 6 freshest active per category with live count badges. Zero jobs hidden. | ❌ **REFUTED** |
| **H5** | **Source Supply Asymmetry / Turnover Stagnation**: 50% of the exact-six source portfolio has stalled turnover. | Live feed sampling and URL comparison against full D1 database (`scratch/inspect-sources.ts`). | **CONFIRMED**: Remotive yielded 0 active jobs (feed has 16 items, 15 already known from May–July). Jobicy Admin yielded 0 active jobs (5 items, 5 already known). Jobicy Support yielded 1 active job (40 items, 40 already known). 98.8% of volume is carried by WWR, RWFA, and RemoteOK. | ✅ **CONFIRMED** |
| **H6** | **Clock Gaps & Run-Lock Contention**: The automated ingestion clock experiences material gaps, and failover is hindered by run-lock contention. | Queried `source_fetch_state` for `__ingest_diag__` and `__scrape_run_lock__`, and audited GHA Hunter logs. | **CONFIRMED**: 11-hour gap observed (23:20Z to 10:20Z). Hunter failover executed at 06:46Z but was skipped with `run-lock-held` because `__scrape_run_lock__` had not expired or was locked during an aborted tick. | ✅ **CONFIRMED** |

---

## 2. Invariant & Boundary Protection Verification

This parallel debugging investigation has strictly adhered to the non-interference mandate:

1. **Shadow Patience-Mode Observation Experiment**:
   - Status: **UNTOUCHED**.
   - All 21 shadow ATS sources in `source_registry` remain in `operational_state = 'shadow'`.
   - No shadow sources were promoted or mutated.
2. **Crawl4AI Experimental Acquisition**:
   - Status: **UNTOUCHED**.
   - `packages/scraper/crawl4ai-capability.ts` and related experimental code remain intact and unmodified.
3. **Cloudflare Kitesurf Experimental Work**:
   - Status: **UNTOUCHED**.
   - `packages/scraper/kitesurf-capability.ts` and related harness remain intact and unmodified.
4. **Quality & Geo-Eligibility Standards**:
   - Status: **UNTOUCHED**.
   - No quality thresholds, geo-gate criteria, or AI consensus skeptic rules were relaxed or degraded to artificially inflate job volume.

---

## 3. Key Quantitative Findings Summary

- **Total Corpus Size**: 5,357 opportunities in D1 (1,074 active, 4,283 inactive).
- **7-Day New Opportunities**: 116 net-new URLs across the entire internet.
  - Active: 83 (~11.86 / day)
  - Policy-Rejected: 33 (~4.71 / day)
- **Source Contribution to Active Jobs (Last 7 Days)**:
  - We Work Remotely: 47 (56.6%)
  - Real Work From Anywhere: 25 (30.1%)
  - Remote OK: 10 (12.0%)
  - Jobicy Customer Support APAC: 1 (1.2%)
  - Jobicy Admin Support APAC: 0 (0.0%)
  - Remotive: 0 (0.0%)
- **URL Deduplication Ratio**: **99.28%** of polled feed items are already in D1.

---

## 4. Root Cause Synthesis & Recommendations

### Root Cause:
The publication rate of ~10–12 jobs per day is **not caused by a leak, bug, or over-filtering** in the software. It is caused by **source portfolio starvation**:
- The active system is legally and architecturally bounded to the "exact-six" sources.
- Out of these six, three sources (Remotive, Jobicy Admin, Jobicy Support) publish almost zero net-new Philippine-eligible remote jobs per week.
- As a result, the entire site is drawing from only three active feeds (We Work Remotely, Real Work From Anywhere, Remote OK), which together generate approximately 15–20 net-new candidate URLs per day globally, of which ~12 are eligible for Philippine freelancers.

### Non-Invasive Recommendations (Action Status):
1. **Clock Failover Optimization (Fenced Lock Release)**: **[RESOLVED — 2026-09-19]**
   - Implemented `releaseRunLock(db, observedAt)` with atomic fencing in `scrape.ts` executed in a guaranteed `finally` block.
   - Clears `__scrape_run_lock__` on completion or unhandled error so that secondary Hunter failover is not locked out for 8 minutes. Tested via `run-lock.test.ts` and `scrape-unhandled-error.test.ts`.
2. **Constitutional Source Replenishment**: **[IN PROGRESS / MATURING]**
   - Direct D1 measurement on 2026-09-19 confirms 1,565 shadow observations across 14 distinct calendar days; 19 of 21 shadow identities have surpassed the Day 8 / 7-day observation threshold.
   - Ready for canary cutover audit under the Autonomy Cutover Predicate (`docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` and ADR-007).
