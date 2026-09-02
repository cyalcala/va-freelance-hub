# SP-22 — Durable Shadow Dispatcher and Observation Store — Day 1 Evidence

Date: 2026-09-03 (session continuous with 2026-09-02's SP-21 work)
Unit: SP-22, `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md` Phase 2.5
Dependency: SP-21 (`TERMINAL — KEEP`, `docs/SYSTEM_SAVEPOINT.md` Run 39)

## What this unit builds

Turns SP-07's one-shot `runCandidateShadowProbe` into a dispatchable,
registry-driven mechanism with a durable observation history:

- `packages/db/migrations/0038_shadow_observations.sql` — additive
  `source_shadow_observations` table. No existing table altered.
- `packages/scraper/shadow-dispatcher.ts` — pure `selectEligibleForDispatch`
  (registry-driven, not a hard-coded adapter list), pure
  `validateProviderProfileForDispatch` (rejects a provider profile that would
  fail the live `provider_profiles` CHECK constraints — the exact class of
  bug the 2026-08-31 audit found in `lever-canary.ts`'s
  `contentScope: "minimal_with_truncated_summary"`), pure
  `buildObservationRecord` (derives a persisted row + SHA-256 evidence hash
  from a probe result), and the `dispatchShadowObservations` orchestrator
  (all I/O dependency-injected).
- `apps/web/src/pages/api/cron/shadow-dispatch.ts` — auth-gated route wiring
  the dispatcher to real D1 reads/writes and the real `runCandidateShadowProbe`.

## Deliberately not built: any GitHub Actions schedule

Mirrors the precedent set by SP-10 (Workable, Run 34, 2026-08-30): "Standing
up new autonomous scheduled CI infrastructure... is independently a new
standing integration (unattended, indefinite, hitting a real third party)
that needs the owner's explicit, specific review before being turned on, not
blanket 'proceed with all' authorization." SP-22's dispatcher makes bounded,
read-only network requests to third-party job-board endpoints (Lever,
Greenhouse, SmartRecruiters, Teamtailor, Recruitee, Workable, or whatever
providers a future registry row names) — a materially different risk class
from SP-21's schedule, which only ever calls this project's own existing,
already-authorized `/api/cron/scrape` endpoint.

The route is deployed dormant, exactly like SP-16's employer-intake route: it
exists, is auth-gated the same way as every other cron route, and can be
invoked manually or scheduled later once the owner explicitly reviews and
approves that specific standing integration.

## Real, live evidence gathered this unit

**Fresh read-only production check (2026-09-02, this session):**
`source_registry` has **zero rows** (`docs/SYSTEM_SAVEPOINT.md` Run 36's
fresh D1 query: `source_registry=0, provider_profiles=0, source_decisions=0`,
unchanged as of Run 39). This means a real invocation of this route today
would dispatch nothing: `{"totalRegistryRows": 0, "eligible": 0,
"dispatched": 0}`. The dispatcher's design already treats this correctly —
`dispatchShadowObservations` returns a clean zero-valued summary on an empty
registry (covered by its own test), not an error.

**Local (non-production) migration validation.** Applied
`0038_shadow_observations.sql` to a **local** D1 SQLite instance
(`wrangler d1 execute DB --local --env production`, never `--remote` —
confirmed no production D1 was touched) to verify SQL syntax before merging:

```
$ npx wrangler@4.120.0 d1 execute DB --local --env production --config wrangler.jsonc --file=packages/db/migrations/0038_shadow_observations.sql
[... "success": true x3 (table + 2 indexes) ...]
```

Then verified the `outcome` CHECK constraint actually enforces the intended
enum, live, not just by reading the SQL:

```
$ npx wrangler d1 execute DB --local ... --command "INSERT ... outcome='HEALTHY_EMPTY' ..."
"success": true

$ npx wrangler d1 execute DB --local ... --command "INSERT ... outcome='NOT_A_REAL_OUTCOME' ..."
Error: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_CHECK)
```

## Verification

- 25 new fixture tests over `selectEligibleForDispatch` (registry-driven
  enumeration, shadow-only, compliance defense-in-depth, opt-out exclusion,
  missing-provider handling, cadence floor — default and provider-specified,
  boundary case), `validateProviderProfileForDispatch` (accepts valid,
  rejects the real Lever `contentScope` mismatch verbatim, rejects invalid
  mechanism/authClass/visibilityFilter, reports every violation at once),
  `buildObservationRecord` (field derivation, stable/changing evidence hash),
  and `dispatchShadowObservations` (dispatches all eligible, never calls
  `runProbe` for an invalid provider, never dispatches an ineligible row,
  honors the per-run cap, empty-registry clean summary, outcome tallying).
- Full local gate at behavior commit (pending): `bun run test` **1037 pass /
  0 fail / 3230 assertions / 98 files** (+25 from SP-21's 1012),
  `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` clean
  (no Node-builtin leak — the route's D1/fetch wiring lives in
  `apps/web`, not in the `@va-hub/scraper` barrel).

## Terminal decision

Not yet assigned — pending PR, exact-SHA CI, and merge. Non-publishing
invariant preserved throughout: no write to `opportunities`,
`source_registry`, `provider_profiles`, or `source_decisions` at any point.
The only new write path is `source_shadow_observations`, and even that path
is currently unreachable in production (no schedule trigger, empty registry).

Rollback: delete or leave unreferenced `apps/web/src/pages/api/cron/
shadow-dispatch.ts` (no schedule ever calls it); the
`source_shadow_observations` table can be dropped or simply ignored since
nothing else reads it yet.
