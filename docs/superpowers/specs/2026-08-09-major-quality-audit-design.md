# Major Quality Audit Design — 2026-08-09

## Objective

Raise the active Cloudflare/Astro/D1 production path's confidence without
changing the public product scope. This tranche targets confirmed correctness,
performance, observability, and release-order defects that can produce a green
workflow while users receive degraded results.

## Evidence-led priorities

| Rank | Finding | User impact | Chosen treatment |
| --- | --- | --- | --- |
| P0 | Strict TypeScript is not a CI gate and currently reports four source errors. | Invalid Cloudflare binding assumptions and unsafe scraper output can reach production. | Fix the errors and add an explicit typecheck command to CI. |
| P0 | D1 migrations can run concurrently with the Pages deploy. | New search code can deploy before its FTS schema is ready, producing empty search results. | Make the normal release path migration-first; retain a manual migration recovery workflow. |
| P0 | The external-content FTS index was initially populated from active rows only. | Index/content drift can yield incomplete search and makes integrity validation fail. | Rebuild the index from all source rows and scope update triggers to indexed columns only. |
| P1 | Cron workflow summaries use success language even when endpoint calls fail or return malformed JSON. | Operators can miss a failing automated maintenance path. | Fail fast on malformed responses and report the actual HTTP outcome. |
| P1 | Tests and type checks are invoked ad hoc. | A broad `bun test` can traverse linked dependencies and create noisy, misleading results. | Define deterministic root verification scripts for project-owned test paths. |
| P2 | Homepage payload, date normalization, source health, and data-quality backfill remain known risks. | Performance/data-quality drag remains, but the evidence does not justify destructive automated cleanup. | Record metrics and staged follow-up thresholds; do not auto-delete based on a single snapshot. |

## Design decisions

1. Preserve opportunity records during FTS repair. Search filters `is_active`
   in the main table, so the FTS table must index every source row to stay
   consistent with its external content table.
2. Limit FTS updates to `title`, `company`, and `tags`. Verification, click,
   freshness, and archival updates do not affect indexed text and should not
   generate delete/insert churn.
3. Use normal CI as the production release orchestrator: validate, build,
   migrate D1, run the FTS integrity check, then deploy Pages. The standalone
   migration workflow becomes explicit manual recovery rather than a racing
   second deploy path.
4. Treat successful transport separately from successful maintenance. Scheduled
   jobs must reject malformed JSON and surface their returned HTTP status in
   their summary.
5. Keep automated remediation non-destructive. Existing stale-link and
   duplicate policies remain bounded, while source-level health alerts prompt
   review rather than indiscriminate removal.

## Non-goals

- No source expansion, login-gated scraping, or changes to public-source
  compliance policy.
- No bulk archival/backfill based only on the current health snapshot.
- No dependency upgrades or new paid services.
- No change to the legacy Next/Vercel/Turso paths, which are not production.

## Acceptance criteria

- Project-owned tests, strict typecheck, and production build pass locally.
- An in-memory SQLite contract proves FTS rebuild integrity and trigger scope.
- CI enforces validation before an ordered migration/integrity/deploy release.
- Prune and verifier workflow summaries cannot describe a failed/malformed API
  response as a completed maintenance action.
- The ranked audit, verification evidence, and recovery documents are updated
  and committed on an isolated `codex/` branch.
