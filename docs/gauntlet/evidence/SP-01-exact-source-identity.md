# SP-01 — Persist exact source identity (TERMINAL — KEEP)

**Program:** Source Perpetuity · **Unit:** SP-01 · **Date:** 2026-08-29

## Outcome

Every newly ingested opportunity now persists the exact configured source
identity in an additive, nullable `opportunities.source_id` column. Source
economics (SP-02) no longer has to infer identity from the display-oriented
`source_platform` label.

## Change

- **Schema + migration `0034_opportunity_source_id.sql`** — additive, nullable
  `source_id TEXT` on `opportunities`. Legacy rows stay `NULL`; no backfill.
- **`attachSourceIdentity` (`apps/web/src/lib/conditional-state.ts`)** — pure
  helper that stamps each fetch result's `sourceId` onto the raw items it
  produced (`null` when a result has no configured id — never a guess).
- **`apps/web/src/pages/api/cron/scrape.ts`** — stamps all four source-result
  groups (RSS / HTML / JSON / ATS) at their `flatMap`. Identity then rides the
  item object through `normalizeScrapedItems` (which spreads `{ ...item }`),
  URL dedup, triage, and all three insert paths — approved (`triagedItems`),
  rejected (`rejectedItems`), and durable pending-triage (`pendingItems`, built
  via `buildPendingTriageItem`, which also spreads `...item`).

Exact identity source: static sources use `source.id`
(e.g. `we-work-remotely`); ATS sources use `atsSourceKey` = `platform:token`
(e.g. `workable:acme`). Two sources that share one display platform — two
Workable tenants, or the two Jobicy APAC feeds — therefore stay distinct.

## Scope boundary

- No change to the exact-six robots enforcement literal, source policy, robots
  mode, cadence, or any workflow.
- The separate digest ingest path (`apps/web/src/pages/api/ingest.ts`) and any
  read-only-first legacy backfill are explicitly **out of scope** and recorded
  as follow-ups.

## Verification

- Focused red→green tests in `apps/web/tests/conditional-state.test.ts` prove
  identity stamping, null-on-missing-id, purity/count preservation, and that
  two sources sharing one display platform stay distinct.
- Local full gate at `ec57ba5`: **661 pass / 0 fail / 1677 assertions**,
  `typecheck` exit 0, `audit:guardrails` exit 0, `build` complete.

## GitHub / CI / deploy

- Behavior SHA (branch `codex/sp-01-source-identity`): `ec57ba5`.
- Merged to `main` as PR #80 → squash commit **`1a5d188`**.
- Branch exact-SHA CI (PR event) run `33240690700`: **success**; deploy skipped.
- `main` exact-SHA CI/deploy run **`33240866482`: success** — all three jobs
  ran: validate (real suite, 661 pass), **Apply D1 migrations** (0034 ✅ at
  `2026-08-29T07:28:00Z`), **Verify D1 full-text index integrity** ✅,
  **Deploy to Cloudflare Pages** ✅. Deploy completed `~2026-08-29T07:28:12Z`.

## Production acceptance (read-only D1)

Window opens at deploy `~07:28:12Z`. First post-deploy scrape tick ran
`2026-08-29T07:30:09.791Z`. Both queries reported `changed_db=false`,
`rows_written=0`.

- Whole table: 5,085 rows total; 10 with `source_id`; 5,075 `NULL`
  (legacy, un-backfilled) — as designed.
- Post-deploy inserts (`scraped_at >= 2026-08-29T07:28:12`): **10 total,
  10 with `source_id`, 0 missing** — every new row is stamped.
- Exact identity distribution (identity ≠ display label):
  `real-work-from-anywhere` (`RealWorkFromAnywhere`) ×7;
  `remote-ok` (`RemoteOK`) ×3.

The single acceptance tick produced only static-source inserts; the ATS path
uses the identical `attachSourceIdentity(atsResults)` helper and is covered by
the focused unit tests, so no separate wait for an ATS insert was required.

## Terminal decision

**KEEP.**

**Rollback:** stop writing the column in `scrape.ts` (revert the four
`attachSourceIdentity` stamps); the additive, nullable schema is retained.

**Next dependency-ready unit:** SP-02 — truthful source yield and funnel
baseline (depends on SP-01).
