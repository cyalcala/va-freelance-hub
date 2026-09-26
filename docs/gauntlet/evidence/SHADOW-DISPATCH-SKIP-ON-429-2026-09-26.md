# Shadow Dispatch Skip-on-429 + Autonomous Operating Prompt v3.1 — 2026-09-26 (~03:00Z)

**Mode:** EXECUTE
**Unit:** `SHADOW-DISPATCH-SKIP-ON-429` + `AUTONOMOUS-OPERATING-PROMPT-V3.1`
**Authorization:** Owner invocation "Proceed in this. Expertly read, plan and act in this. All approved." with `C:\Users\admin\Downloads\lucky1.md` (Autonomous Operating Prompt v3.1)
**Start SHA:** `44069704cde603ccb7a502eabc0d48e4859cda12` (clean, synchronized with `origin/main`)
**Autonomy Level:** L1 ADVISE both domains (Job Evaluation & Job Flow, unchanged; deterministic envelope respected)

---

## 1. Problem Statement

As established in `WORKABLE-PACING-DIAGNOSTIC-2026-09-26.md`:
- 7 of the 10 shadow sources in `source_registry` are Workable Philippine VA agencies (`coconutva`, `crewbloom`, `hello-rache`, `hunt-st`, `pearltalent`, `pineapple`, `rocketams`).
- All 7 share a single origin host: `apply.workable.com`.
- Although `shadow-dispatcher.ts` applies a 3,000ms delay for consecutive same-host probes, `apply.workable.com` enforces rate limits at a **window level** (per-minute / per-hour egress window).
- When a 429 burst occurred (observed on 2026-09-25 at 13Z and 18Z), all 7 probes were dispatched ~9s apart, and **all 7 probes failed with HTTP 429**.
- Each 429 was recorded in `source_shadow_observations` as `RATE_LIMITED`.
- Under constitutional trigger 0040/0044 (`bad.outcome NOT IN ('HEALTHY_WITH_RESULTS', 'HEALTHY_EMPTY')`), this simultaneously reset the 7-day clean observation streak for all 7 agencies at once.
- Furthermore, sending 6 additional requests to an origin that has already returned HTTP 429 is poor bot citizenship and risks longer IP throttling.

---

## 2. Implementation (`packages/scraper/shadow-dispatcher.ts`)

1. **Version bump:** `DISPATCHER_VERSION = "2.1.0"`.
2. **Summary telemetry:** Extended `ShadowDispatchSummary` with:
   - `skippedRateLimitedHost: number`: count of candidates skipped because their origin was already rate-limited this run.
   - `skippedHostLimits: Array<{ sourceId: string; host: string }>`: explicit audit of which sources were held due to origin limits.
3. **Run-scoped rate-limited host tracking:**
   - In `dispatchShadowObservations`, initialized a run-scoped `rateLimitedHosts = new Set<string>()`.
   - When any probe completes with `result.diagnostic.outcome === "RATE_LIMITED"`, its origin host (`hostOf(endpointUrl)`) is added to `rateLimitedHosts`.
4. **Fast-path skip logic:**
   - Before reading admission authority or dispatching network requests, candidates whose host is in `rateLimitedHosts` are skipped:
     ```ts
     const enumeratedHost = hostOf(enumerated.endpointUrl);
     if (enumeratedHost && rateLimitedHosts.has(enumeratedHost)) {
       summary.skippedRateLimitedHost += 1;
       summary.skippedHostLimits.push({ sourceId: enumerated.sourceId, host: enumeratedHost });
       continue;
     }
     ```
   - Double-check after admission context resolution ensures changes in endpoint URL are also covered.
   - Skipped candidates produce **zero network requests** and write **zero D1 observation rows**, preserving their clean streaks.
5. **Freshness per run:** `rateLimitedHosts` is scoped to the execution of `dispatchShadowObservations` (the single hourly cron tick) and is not persisted across runs. If the origin rate limit clears by the next tick, all sources are probed normally.

---

## 3. Autonomous Operating Prompt v3.1 Integration

- Updated `docs/bootloaders/MASTER_OPERATING_PROMPT.md` with the full text of `C:\Users\admin\Downloads\lucky1.md` (Autonomous Operating Prompt v3.1 — Reality-Grounded / Evidence-Literate Edition).
- Adopts the Reality Recognition Protocol (§0.4A), the Reality State Ladder (`INTENDED` → `PROVEN`), Falsification-First check (§0.4A.4), Anti-Paper-System rule (§0.4A.5), Reality Drift detection (§0.4A.6), and the on-demand engineering canon (Appendix E).

---

## 4. Verification Evidence

1. **Narrow Unit Tests (`packages/scraper/shadow-dispatcher.test.ts`):**
   - 39 tests pass / 0 fail (2 new dedicated tests: `skips subsequent same-host candidates when a probe returns RATE_LIMITED while allowing different hosts` and `resets rate-limited hosts across separate dispatch runs`).
   - Verified that when a probe returns `RATE_LIMITED`, remaining same-host candidates are skipped without network or D1 writes, while different-host candidates (e.g. Greenhouse) dispatch unaffected.
2. **Route Unit Tests (`apps/web/tests/shadow-dispatch-route.test.ts`):**
   - 21 tests pass / 0 fail.
3. **Full Test Suite (`bun run test`):**
   - 1,464 tests pass / 0 fail across 143 test files.
4. **Typecheck (`bun run typecheck`):**
   - Clean, 0 errors.
5. **Production Guardrails (`bun run audit:guardrails`):**
   - Clean, exit 0.
6. **Production Build (`bun run build`):**
   - Complete (Astro server built in 49.88s, client bundled in 13.16s, static routes prerendered).

---

## 5. Reality State & Autonomy Assessment

- **Reality Level:** `IMPLEMENTED` & `LOCALLY VERIFIED` (code + comprehensive unit tests).
- **Deployment State:** Pending CI deploy on push of this commit.
- **Autonomy Level:** L1 ADVISE in both domains (Job Evaluation and Job Flow, unchanged; no autonomous promotion claimed).
- **Next Falsification Test:** On the next live shadow dispatch run encountering a 429 on Workable, verify that `skippedRateLimitedHost` > 0 and only 1 `RATE_LIMITED` row is recorded in `source_shadow_observations`.
