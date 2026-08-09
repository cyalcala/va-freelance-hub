# Legacy runtime quarantine

Updated: 2026-08-10

## Production boundary

The only supported production runtime is `apps/web`: Bun workspaces, Astro,
Cloudflare Pages, Cloudflare D1, GitHub Actions pulses, and the
`workers/freshness-cron` Worker. Its source-of-truth Pages configuration is
`apps/web/wrangler.jsonc`.

`apps/web-nextjs-backup` is an archival backup of the former Next.js,
Vercel/Turso, Trigger.dev, and OpenNext experiments. It is intentionally:

- excluded from the root Bun workspaces;
- excluded from all active GitHub Actions by `audit:guardrails`;
- unable to deploy through its `deploy` script;
- stripped of auto-discoverable Wrangler config filenames; and
- retained in Git history and the repository for code-reference recovery.

## Preserved inventory

| Location | Status | Reason retained |
| --- | --- | --- |
| `apps/web-nextjs-backup/` | Quarantined | Historical UI/API implementation and migration reference. |
| `apps/web-nextjs-backup/wrangler.legacy.*` | Quarantined | Historical binding record; not auto-discoverable. |
| `trigger.config.ts` | Historical | Trigger.dev configuration reference; no active root scripts or dependency. |
| `packages/db/migrate.ts`, `packages/db/push.ts`, `packages/db/drizzle.legacy.config.ts` | Quarantined | Turso migration/push tooling is fail-closed and no longer auto-discoverable. `bun run db:migrate` now targets the checked-in Cloudflare D1 configuration. |
| `scripts/gha/harvest.ts` | Quarantined | Unreferenced pre-Cloudflare Hunter prototype; it fails closed before any fetch or write. |
| `pnpm-lock.legacy.yaml`, `pnpm-workspace.legacy.yaml` | Quarantined | Previous pnpm topology/lock snapshot; renamed so pnpm cannot auto-discover or reactivate the historical workspace. Bun is authoritative. |
| `packages/zig-parser/` | Historical | Backup parser experiment; excluded from active workflows. |
| `list_models.ts`, `onlinejobs_test.html`, `work777.xlsx` | Historical evidence | Retained for provenance only; none is loaded by the active runtime or workflows. |

## Additional 2026-08-10 Quarantined Utilities

Historical one-off import, resolver, AI, and build helpers are retained for
provenance but stop before side effects: apps/web/batch4_resolve.js,
apps/web/generate_seed.mjs, apps/web/import_csv.mjs, apps/web/resolve_30.js,
apps/web/resolve_ats.js, apps/web/resolve_next_30.py,
apps/web/test_gemini_nogrounding.js, scripts/build-worker.js, list_models.ts,
and packages/db/seed.ts. None is in the active workspace, production build, or
GitHub Actions path.

## Controlled recovery procedure

Do not revive this runtime by renaming files or running its scripts directly.
Instead, create an isolated branch/worktree, document the requested strategy
change in an ADR, review secrets and third-party terms, and explicitly restore
only the needed component. Run the active Cloudflare test and release gates
before any deployment.

For active schema releases, use `bun run db:migrate`; it invokes pinned
Wrangler with `apps/web/wrangler.jsonc` and the production `DB` binding.

## Secret safety

The historical Worker adapter no longer places `CRON_SECRET` in URLs or logs.
The repository ignores `.env*`, `.dev.vars*`, and private-key/certificate
files while retaining template examples. A redacted Git-history scan remains
part of each release audit; never print or commit candidate secret values.
