# Lake Maintainer Bootloader — Turso Lake → D1 → 100–150 Jobs/Day

**Created:** 2026-09-26. **Start SHA:** `511dd52` (main == origin/main, clean).
**Status:** Active bootloader. Supersedes `datalake777.txt` (1471-line draft retired).
**Companions:** `SOURCE_PERPETUITY_BOOTLOADER.md` (governance), `MASTER_OPERATING_PROMPT.md` (full ops), `CURRENT.md` (resume pointer), `docs/DATA_LAKE_OPERATIONS.md` (lake runbook), `docs/FEDERATED_ACQUISITION_MATRIX.md` (42-feeder map).

> Legacy Next.js/Vercel/Turso OLTP in `apps/web-nextjs-backup/` is quarantined. This bootloader covers only `scripts/lake/` + Turso Cloud → D1 → Astro site.

---

## 1. How to use (every session)

1. Paste the **Copy/paste prompt** (§2) into a fresh session.
2. Fill the **State block** (§7) with live values — never copy old counts as fact.
3. Agent runs the **Session loop** (§3): recover → audit slice → one improvement → verify → document → backup → next step.
4. End of session **must** leave: commit on `origin/main`, CI run ID, updated savepoint/status/handoff/trail entries, and a named NEXT unit. No session ends without a measurable gain or a recorded reason it was blocked.

## 2. Copy/paste prompt

```text
You are the maintainer/improver for cyalcala/va-freelance-hub, resuming from docs/bootloaders/2026-09-26-LAKE-MAINTAINER-BOOTLOADER.md.

OUTCOME: sustain 100/day floor, 150/day stretch of qualified, unique, net-new, PH-accessible remote jobs made publicly discoverable. A job counts only if: legitimate + relevant taxonomy + safe; remote FROM the Philippines (not office/APAC/reputation alone); fresh under versioned policy with exact-source authority, attribution, opt-out; deduplicated canonical; usable apply link passing public eligibility; first-time discoverable in the window with durable evidence. Report fetched/stored/accepted/first-published/reactivated/removed/active separately. Backlog imports ≠ daily flow. Never invent, weaken, recycle, or re-stamp timestamps.

MODE: state PLAN, EXECUTE, AUDIT, or RECOVER first. Ambiguous = read-only RECOVER + recommend next unit. EXECUTE = exactly one approved unit, ending KEEP/REVISE/REVERT/BLOCKED/ESCALATE/PAUSED.

PREFLIGHT (read-only): git status --short --branch; git rev-parse HEAD; git fetch origin; git rev-parse origin/main; restate START_SHA + origin SHA. Preserve dirty/untracked work — never reset/clean/force-push. D1 SELECTs via repo-pinned wrangler --command --json only (success=true, changed_db=false, rows_written=0, UTC as-of). bun run lake:state -- --json for lake truth. Reconcile pasted state block with live evidence; label claims VERIFIED/HISTORICAL/UNKNOWN/CONFLICTING.

OWNERSHIP: Turso remembers (lake_raw_observations, lake_candidate_jobs, lake_sightings, lake_replay_events, lake_ats_discovery, lake_runs in scripts/lake/); D1 publishes (source_registry, ledger, caps, leases, withdrawals via apps/web/src/lib/publish-opportunities.ts). No direct-opportunities INSERT that skips the gateway. Jev (packages/scraper/jev-client.ts) advises only; deterministic policy enforces. Exact-six + 5 Breezy agencies + accepted canaries = boundary until Autonomy Cutover Predicate passes. Compliance: public APIs/RSS/documented endpoints, minimal metadata, linkback, opt-out; no login/paywall/CAPTCHA/robots/rate-limit bypass.

LOOP: biggest demonstrated bottleneck → smallest reversible slice → verify (lake tests → full bun test → typecheck → audit:guardrails → build if serving touched; fixtures + historical replay for geo/dedup/parser changes; lake:sync --dry-run before live) → document (savepoint/status/handoff/trail + CURRENT.md NEXT) → commit/push → watch Sovereign CI → checkpoint (SHA, run ID, evidence, next unit).
```

## 3. Session loop (maintainer + improver)

| Step | Action | Output |
|---|---|---|
| 1. Recover | Preflight + read savepoint top entry, DATA_LAKE_OPERATIONS, matrix, CURRENT.md | START_SHA, divergence, capsule |
| 2. Measure | `lake:state --json`, D1 active/registry counts, site spot-check, flow (net-new/7d) | Flow gap to 100/day |
| 3. Audit slice | One area from §4 checklists (rotate; never boil the ocean) | Ranked defect with file:line |
| 4. One fix | Smallest reversible slice in priority P0→P3 (§5) | Code + test |
| 5. Verify | Gates in prompt; disclose Bun drift (repo pin 1.3.14) | Pass/fail evidence |
| 6. Document | Savepoint/status/handoff/trail + this file's NEXT | Acceptance docs |
| 7. Backup | Commit → push → record CI run ID | origin/main SHA |
| 8. Next | Name exactly one NEXT unit with files + acceptance | §8 updated |

## 4. Audit checklists (rotate one per session; full sweep quarterly)

**Web/serving (`apps/web/`):** list↔detail eligibility parity (`opportunities.astro` vs `jobs/[id].astro` — `unclear` 404s); `publishGroupedInserts/Activations` callers never falling back to raw `db.insert` when DB binding missing; batch size vs 10-min tick overruns; `SELECT *` + `GROUP BY source_platform` scans (missing index); per-isolate homepage cache; `apps/web/migrations/` vs `packages/db/migrations/` drift; FTS backfill scope; ledger-trigger clock-skew aborts.
**Scraper (`packages/scraper/`):** unknown-`sourceId` unlimited exposure (`publication-gateway.ts:89-102`); bare-`anywhere`/Himalayas-missing=Worldwide inflation + `ph`-substring match; 1500-char truncation before geoGate; shadow 3-requests-vs-2-budget undercount + robots-unknown-proceeds; skeptic fail-open vs triage fail-closed; `needs_review` fetched as enabled; structured-location false `ineligible` ("join us"→US); pre-gate relevance drops + unsorted `maxItems` slices; unnormalized `title::url` cross-source dupes.
**DB (`packages/db/`):** migration reversibility (esp. mass-deactivation 0047); `coalesce(posted_at,scraped_at)` index health; FTS trigger coverage on reactivation.
**Clocks (`workers/freshness-cron/`, `.github/workflows/`):** 10-min worker `waitUntil` unawaited; hunter-pulse fence bypass via dispatch; shadow-dispatch :20 overlap → double dispatch; NO lake cron — lake diverges unless scheduled.
**Lake (`scripts/lake/`):** P0 bypass/starvation/freshness/auto-approval (§5); `lake_runs` empty (zero INSERTs — wire every CLI); raw coverage unknown (full vs sample vs metadata); replay limited to AMBIGUOUS/EXCLUDED LIMIT 2000; unbounded retention (1M chars/obs, no TTL/VACUUM); fingerprint `company:title:domain` missing req-IDs/canonical URLs.
**Compliance:** every collector = documented public path + linkback + opt-out; ATS probes = unauthenticated JSON only, polite delays; eval sets = features/labels/hashes, never assumed training rights.

## 5. Fix priority (governance before growth)

- **P0:** gateway bypass (`sync-to-d1.ts:115-131` → route through `publishPublicExposure`); `auto_approved→sync` (`sync-to-d1.ts:49-81` → shadow-only until registry lifecycle + cutover); unknown-source unlimited (`publication-gateway.ts:89-102` → deny/conditional default).
- **P1:** starvation (`SELECT LIMIT` → auth-in-SQL/cursor); `posted_at||now()` (`sync-to-d1.ts:109`, `scripts/gha/harvest.ts` → unknown-stays-unknown); list/detail parity; skeptic fail-open → fail-closed.
- **P2:** canonical identity (req-IDs, canonical apply URLs, normalized hash); shadow budget accounting; geoGate false +/-; `lake_runs` wiring + `lake:state` backlog-age/funnel/storage views; retention TTLs.
- **P3:** throughput (Remotive JSON ~1000+, Himalayas 18-cat sweep, Jobicy/RWFA/RemoteOK depth, Greenhouse/Ashby canaries) + batch/tick budgets + lake cron. Only after P0/P1 closed.

## 6. Flow math (why this order)

Baseline `CURRENT.md`: ~28.86 net-new/day (202/7d) vs 100 floor → gap ≈ 71/day. Breezy agencies yield 95–99% but are volume-capped; reservoirs yield 5–15% with discovery value. P0/P1 leaks (bypass miscategorization, starvation hiding authorized rows, freshness corruption, false in/eligible) must close before scaling harvest, or more fetching just grows noise. Report stock and flow separately every session.

## 7. State block (paste with prompt; refresh live)

```text
START_SHA: (full HEAD) | ORIGIN_SHA: (origin/main) | BRANCH: main | DIRTY: (none/list)
D1_ACTIVE: (n, as-of UTC) | REGISTRY: (a/c/s/cand/q) | FLOW_7D: (net-new n, n/day)
LAKE: raw n (unproc n) | QUALIFIED_READY n (unsynced n, by-source top5) | SYNCED n | replay n | auto_approved n
SITE: (HTTP + spot listing) | LAST_REAL_SYNC: (UTC + count) | LAKE_CRON: (none/manual)
MODE: (PLAN/EXECUTE/AUDIT/RECOVER) | PROPOSED_UNIT: (one only + acceptance)
```

## 8. NEXT (update every session — one unit only)

- **NEXT-2026-09-26a (AUDIT, read-only):** verify P0 bypass live — `lake:sync -- --dry-run` sample vs `publish-opportunities.ts` ledger/cap path; record whether any `SYNCED_TO_D1` row lacks registry/canary authority. Acceptance: finding note with 3 sample rows, no D1 writes.
- Queued: P1 starvation fix (auth-in-SQL) → P1 freshness split → list/detail parity → `lake_runs` wiring → lake cron proposal.
