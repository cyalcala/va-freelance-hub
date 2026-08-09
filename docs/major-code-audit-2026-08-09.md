# Major Code Audit — 2026-08-09

## Scope and method

This audit covers the active Bun/Astro/Cloudflare Pages/D1 implementation. It
uses static review, deterministic Bun tests, strict TypeScript, an in-memory
SQLite FTS5 contract, build verification, and GitHub workflow inspection. The
legacy Next/Vercel/Turso material was not treated as production code.

## Ranked findings and disposition

| Rank | Finding | Evidence | Disposition |
| --- | --- | --- | --- |
| P0 fixed | Strict TypeScript was not a CI gate and reported four source errors. | `bun run typecheck` initially failed in `cron/prune.ts` (missing rate-limit/secret bindings) and `packages/scraper/json.ts` (nullable map/filter mismatch). | Added explicit root `typecheck` and CI gate; typed bindings and the nullable mapper. |
| P0 fixed | Schema migration and Pages deploy could race. | `deploy-migrations.yml` and `ci-guardrail.yml` were independent push workflows with separate concurrency groups. | Normal release is now validate → migrate → FTS integrity check → deploy, with a shared D1 lock; the former migration workflow is manual recovery. |
| P0 fixed | The external-content FTS index was inconsistent for historic inactive rows and rewrote on unrelated updates. | Migration 0026 backfilled only `is_active = 1`; SQLite FTS5 `integrity-check` throws in the regression test before repair. Its update trigger matched every column update. | Migration 0027 rebuilds all external-content rows and scopes updates to `title`, `company`, and `tags`; a Bun SQLite test prevents regression. |
| P1 fixed | Scheduled prune/verifier summaries could describe a failed or malformed request as successful. | Both summary steps ran `always()` and printed unconditional success language; prune parsed JSON through an unquoted pipeline. | Jobs now fail on transport, non-2xx, invalid JSON, or invalid metric shapes and summaries expose the actual workflow result and HTTP status. |
| P1 fixed | The default test command was non-deterministic in shared/junction worktrees. | A broad `bun test` traversed linked dependency tests; project-owned paths passed independently. | Root `test` restricts execution to `packages/scraper`, `packages/db`, and `apps/web/tests`. |
| P2 open | Dependency vulnerability scanning is not configured. | `bun pm scan` reports that `bunfig.toml` has no security scanner. | Add a reviewed scanner or GitHub-native dependency-review/Dependabot configuration in a separate dependency-policy slice. |
| P2 open | Data freshness and quality backlog persists. | Latest committed health digest: 853 active rows older than 30 days, 659 feed-unseen for 14 days, 107 same title/company duplicate groups, and 47 active opportunities missing company data. | Keep existing bounded archive policies; investigate by source and threshold before any new automated archival/backfill. |
| P2 open | Homepage payload, date normalization, and source-level health rollups remain historical audit risks. | Existing major-audit baselines identify them; this audit did not collect a new production measurement. | Re-measure in production and execute independently rather than relying on stale historical values. |

## Automation delivered

```text
pull request / main push
  -> deterministic project tests
  -> Astro production build
  -> strict TypeScript
  -> [main only] D1 migration lock
  -> D1 migrations
  -> FTS integrity check
  -> Cloudflare Pages deploy

scheduled prune / verifier
  -> bounded curl transport
  -> non-2xx rejection
  -> JSON + metric-shape validation
  -> workflow summary with actual result and HTTP status
```

The automation deliberately does not mass-delete jobs or automatically approve
sources. Existing archive-only duplicate/stale controls remain bounded and
reversible.

## Verification evidence

| Check | Result |
| --- | --- |
| `bun test packages/db/fts5-search.test.ts` before migration 0027 | Failed as intended because the repair migration did not exist. |
| SQLite FTS5 regression contract after migration 0027 | Passed; 4 assertions prove original drift is detected, rebuild is consistent, inactive historical content is indexed, and trigger scope is narrowed. |
| `bun run typecheck` before fixes | Failed with 4 strict TypeScript errors. |
| `bun run typecheck` after fixes | Passed. |
| `bun run test` after fixes | Passed: 190 tests, 0 failures, 354 assertions across 13 files. |
| `bun run verify` | Passed: deterministic tests, strict typecheck, and Astro production build completed in 93.5 seconds. |
| Workflow YAML parse | Passed with PyYAML for all four changed workflows. |
| `git diff --check` | Passed (line-ending notices only). |
| Production migration/deploy | Pending the GitHub Actions run for this branch; no direct production mutation was performed locally. |

## Residual risks and next sequence

1. Confirm the pushed release run applies migration 0027 and passes the remote
   FTS integrity command before approving a Pages deployment.
2. Add a dependency-scanning policy after choosing a compatible scanner; do not
   claim a vulnerability audit until it is actually configured and passing.
3. Refresh production health measurements and review duplicate groups, stale
   rows, and missing-company records source by source.
4. Measure current homepage HTML/payload and normalize legacy date fields only
   after current production evidence identifies the highest-cost query paths.
