# SP-23 control-plane continuation and independent review

Date: 2026-09-05. Execution unit: SP-23, inactive foundation slice.

## Recovery preflight

- Start SHA: `a5b73f2d00242f37638d9e7314433c080b664679`.
- Branch: `codex/sp-23-transition-plane`.
- Fetched `origin/main`: `3b46e9291eb64912c4e539a6625f90018320f760`.
  Eight automated documentation commits advanced main after the branch base.
- Preserved 16 already-modified tracked files and unrelated `.tmp.driveupload/`.
  The existing changes were SP-23 hardening and recovery documentation; they
  were reviewed as current implementation rather than reset or replaced.
- `AGENTS.md` was read. `.ai/manifest.yaml` is absent. The installed source
  toolkit router ran with `--use-case quality-hardening`; the narrow
  `code-review-and-quality` skill guided independent review.

## Review results and repair

Independent reviews covered transition/SQL parity and the resolver's live
caller separately. The inactive gateway's atomic event/state update, durable
opt-out checks, stale-event rejection, immutable canary cap, canonical timestamp
and integer checks, and SQL-verifiable replay packet had no remaining blocker
for the inactive foundation deployment.

The resolver review found a live integration defect: although
`loadRegistryPolicies` now rejects unavailable registry/opt-out data, the scrape
route still caught that rejection and restored an empty hard-coded fallback.
That could override a paused or opted-out exact-six identity during a governance
read outage. The route now returns a controlled HTTP 503 with
`reason=registry-policy-unavailable` before the run lock, backlog publication,
or outbound source requests. Its policy map is request-local. Authorized,
verified empty tables retain the exact-six fallback; unauthorized requests do
not read governance state.

Four route tests exercise those boundaries, including a fetch spy and zero-write
assertions. A nullable-cap type error in the inherited implementation was also
fixed. No source-admission decision, registry promotion, or new schedule is part
of this slice. Healthy exact-six policy parity is preserved; unavailable policy
state now intentionally stops ingestion.

## Verification

The focused transition/resolver/SQLite suite passed 75 tests and 804 assertions.
The initial full suite passed 1,080 tests. Following the route repair and
read-only release verification, **1,086 tests and 3,450 assertions passed across
104 files**. Typecheck, production guardrails and the Astro build passed. The new fetch assertion initially
inherited two calls from another test's global mock; a fresh mock isolated the
route without weakening the zero-call assertion. Exact-SHA CI remains the
release gate.

`bun scripts/ci/rehearse-d1-migrations.ts` passed both fresh and legacy migration
chains through 0039, with 94 schema assertions passing and zero failures. Local
Astro builds initially failed on Windows ReadOnly attributes on generated cache
directories. Clearing that attribute only under `.astro`, `node_modules/.astro`,
and `dist` restored a successful build; no tracked dependency or build code was
changed to conceal the failure.

## Acceptance limits found in review

The existing production release now runs a fixed, tested SELECT after migrations
and before Pages deployment. It verifies 0039's ledger entry, transition table,
both new registry columns and all 18 named guards, and requires Wrangler's
`success=true`, `changed_db=false`, and `rows_written=0`. Its retained JSON
artifact includes one `as_of`, governance counts and positive-PH eligible active
first-storage proxies over one/seven days with exact-source/NULL grouping.
The SQL uses the read-only query transport (`--command` with the fixed file's
contents); installed Wrangler's `--file` bulk-import path discards SELECT rows.
This uses existing release credentials and adds no scheduler or source request.

The foundation is not a complete admission authority. Its gateway counts all
historical healthy shadow observations; the caller supplies the count threshold,
and an evidence hash is syntax-checked rather than bound to an immutable current
admission snapshot. Those inputs must become server-owned, revision-bound facts
before a source can use it for promotion.

The publication helper evaluates a supplied batch. It does not reserve cumulative
exposure across writers or persist a rollback by itself. Canary fetching stays
disabled in the legacy scraper. Source-scoped exposure, retry idempotency,
automatic persisted rollback, and public/cache withdrawal remain required.

Publication-path inventory for the remaining work:

1. `apps/web/src/pages/api/cron/scrape.ts`: fresh accepted inserts, inline pending
   triage, gate-only pending release, and stale/link-unavailable reactivation.
2. `apps/web/src/pages/api/ingest.ts`: direct authenticated inserts; exact source
   identity must be established server-side because its allow-list omits it.
3. `apps/web/src/lib/inngest/functions/triage-drain.ts`: hidden-to-public updates,
   including when that execution path is dormant today.

Hidden rejected/pending inserts are not exposure. Verifier/pruner withdrawal,
click counters, the historical Next.js app, and quarantined harvest script do not
create another active publication path.

## Decision

The foundation may follow the normal reviewed CI/migration/deploy path as an
inactive, non-admitting slice. **SP-23 remains VERIFYING, not KEEP.** Read-only
production verification and the remaining admission/publication/real-source
evidence cannot be inferred from local tests or deployment success. See the
bounded SP-23 continuation in the implementation plan. The complete Autonomy
Cutover Predicate remains independently unsatisfied.
