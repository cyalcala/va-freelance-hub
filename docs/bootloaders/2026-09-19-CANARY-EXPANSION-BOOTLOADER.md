# VA FREELANCE HUB — CANARY EXPANSION & CAPACITY BOOTLOADER

**Authoring Timestamp**: 2026-09-19T09:55:00+08:00  
**Baseline Commit**: `ea81366`  
**Governing Mandate**: `AGENTS.md` + `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` (ADR-007)  
**Prime Directive**: Sustaining **100–150 qualified net-new remote Filipino-accessible jobs/day**.

---

## 0 — COPY/PASTE RESUME PROMPT FOR NEXT SESSION

```text
You are resuming the Autonomous Source-Expansion Gauntlet for cyalcala/va-freelance-hub.

0. PRIME DIRECTIVE
Sustain 100–150 qualified net-new remote Filipino-accessible jobs/day:
  qualified_yield = fresh × Philippines-eligible × role-relevant × legitimate × applyable × non-duplicate × discoverable

1. CURRENT PRODUCTION REALITY (VERIFIED IN REMOTE D1)
- Database: Cloudflare D1 `DB` (08072f16-d3d1-436a-9104-b057a162db7c), SQLite-compatible.
- Migrations: 0000–0043 applied cleanly. Migration 0043 trigger alignment and canary cap backfill live.
- Canary Portfolio (5 live sources):
  - breezy:20four7va (Event ID 22, cap 2/tick, rev 1)
  - breezy:sourcefit (Event ID 23, cap 2/tick, rev 1)
  - breezy:remote-craft (Event ID 24, cap 2/tick, rev 1)
  - breezy:value-virtual-assistants (Event ID 25, cap 2/tick, rev 1)
  - breezy:yokly (Event ID 26, cap 2/tick, rev 1)
  Over 350 active remote Philippine roles in historical observation across these 5 agencies.
- Shadow Portfolio (16 active sources):
  - Workable x7: coconutva, crewbloom, hello-rache, hunt-st, pearltalent, pineapple-staffing, rocketams
  - Greenhouse x6: ghost, gitlab, grafanalabs, nearform, remotecom, wikimedia
  - Recruitee x1: myjewellery
  - Teamtailor x1: career.teamtailor.com
  - Breezy x1: time-etc
- Candidate Backlog: 14 candidates in needs_review/candidate (Ashby x5 quarantined under COMP-01C, Breezy x1, Workable x7, Lever x1).
- Exact Source Attribution: 100.0% coverage (0 null source_id rows out of 5,348).
- Measured strict 7d supply baseline: 86 jobs / 7 days = 12.29 jobs/day.

2. NON-NEGOTIABLE GOVERNANCE & SAFETY
- Exact-six public feeds remain active: we-work-remotely, remotive, real-work-from-anywhere, remote-ok, jobicy-supporting-apac, jobicy-admin-support-apac.
- Canary sources are constitutional: publication is gated strictly through `publishPublicExposure` in `packages/scraper/publication-gateway.ts` and audited in `source_publication_ledger` (0041).
- Per-tick canary cap is strictly 2 items per tick (`canary_max_new_items_per_tick = 2`).
- Never propose more items than `canary_max_new_items_per_tick` to `publishPublicExposure`, as `input.proposedNewItems > input.canaryMaxNewItemsPerTick` triggers automatic rollback to shadow (`canary_cap_breach`).
- Zero unlogged exposure. Band 4 forbidden hosts (SmartRecruiters, OnlineJobs.ph HTML scraping) remain strictly blocked. Ashby sources remain quarantined under COMP-01C pending partner feed keys.

3. IMMEDIATE NEXT UNIT: EX-CANARY-INGESTION
Goal: Enable the 5 graduated canary sources to be fetched by the scheduled ingestion worker and publish up to their canary cap (2 items/tick).
- Task 1: Update `isEnabledForFetch` in `packages/scraper/policy-resolver.ts` to return `true` for `operational === "canary"` when publishable (`allowed` or `conditional`, not opted out).
- Task 2: In `apps/web/src/lib/publish-opportunities.ts`, update `publishGroupedInserts` and `publishGroupedActivations` to inspect `loadPublicationPolicy`. If `operational === "canary"`, clamp proposed batch to `canaryMaxNewItemsPerTick` (2 items) so `proposedCount <= cap` and prevents `canary_cap_breach`.
- Task 3: Verify all 1,329+ unit tests pass (`bun test`), typecheck passes (`bun run typecheck`), and production guardrails pass (`bun run audit:guardrails`).
- Task 4: Push to `main` and observe live `source_fetch_events` and `source_publication_ledger`.

4. CANONICAL RECOVERY DOCS
- Savepoint: docs/SYSTEM_SAVEPOINT.md (Run 79)
- Trail: docs/AI_RECOVERY_TRAIL.md
- Implementation Status: docs/IMPLEMENTATION_STATUS.md
- Plan: implementation_plan.md
- Current Pointer: docs/bootloaders/CURRENT.md
- Masterplan: docs/SOURCE_REPLENISHMENT_MASTERPLAN.md
```

---

## 1 — FINISHED-UNIT LEDGER (2026-09-19 MORNING SESSIONS)

| Unit ID | Phase | Commit / Run | Outcome | Notes |
| :--- | :--- | :--- | :---: | :--- |
| **REL-CLOCK-FAILOVER-LOCK-RELEASE** | RELIABILITY | `b33b51d` / `35409823101` | KEEP | Fenced `releaseRunLock` inside guaranteed `finally` block in `scrape.ts`, eliminating 8-minute failover lockout between primary and secondary clocks. |
| **EX-CANARY-READINESS** | GOVERNANCE | `4f458b8` / `35411373407` | KEEP | Completed formal Autonomy Cutover Predicate audit (`EX_CANARY_READINESS_AUDIT.md`); resolved Workable HTTP 429 bursts via provider-interleaved dispatch and polite delay; audited 14 candidates. |
| **EX-CANARY-PROMOTION** | GOVERNANCE | `543f5d5`, `2806799`, `ea81366` / `35412951998`, `35413370337`, `35413959555` | KEEP | Migration 0043 live; hardened admission packet projection for null canary caps; deployed `/api/cron/source-promote`; graduated 5 Breezy Philippine VA agencies to `canary` in live production D1 (events 22–26). |
| **EX-CANARY-INGESTION** | DATA-PLANE | *Planned & Approved* | READY | Ready for execution: enable canary fetch in `policy-resolver.ts` and cap-safe batch proposals in `publish-opportunities.ts`. |

---

## 2 — VERIFIED LIVE PRODUCTION EVIDENCE

```text
D1 Database: DB (08072f16-d3d1-436a-9104-b057a162db7c)
Canary Sources (SELECT source_id, operational_state, canary_max_new_items_per_tick, governance_revision):
  breezy:20four7va               | canary | 2 | 1
  breezy:sourcefit               | canary | 2 | 1
  breezy:remote-craft            | canary | 2 | 1
  breezy:value-virtual-assistants| canary | 2 | 1
  breezy:yokly                   | canary | 2 | 1

Transition Events (SELECT id, source_id, from_operational, to_operational, cause):
  26 | breezy:yokly                    | shadow -> canary | requested_promotion
  25 | breezy:value-virtual-assistants | shadow -> canary | requested_promotion
  24 | breezy:remote-craft             | shadow -> canary | requested_promotion
  23 | breezy:sourcefit                | shadow -> canary | requested_promotion
  22 | breezy:20four7va                | shadow -> canary | requested_promotion

Monorepo Verification Baseline:
  1,329 passed, 0 failed across 132 test files (bun test)
  Typecheck: 0 errors (bun run typecheck)
  Production Guardrails: 0 violations (bun run audit:guardrails)
  Sovereign CI Guardrail: 100% green on all pushed commits
```
