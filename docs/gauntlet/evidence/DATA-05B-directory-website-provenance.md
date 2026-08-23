# DATA-05B — directory website provenance and approval-gated repair

Date: 2026-08-23

Execution start: `5373eae` (`main` = `origin/main`, clean worktree)

Status: `VERIFYING — code deployed; fresh read-only report recorded; BLOCKED at
the human-approved evidence gate before any CAS mutation`

## What shipped (code slice, three commits)

| Commit | Content |
| --- | --- |
| `df35fdf` | Additive provenance schema: migration `0033_directory_website_provenance.sql` adds nullable `website_source`, `website_evidence`, `website_confidence`, `website_updated_at` columns plus a partial index on unclassified rows; `packages/db/schema.ts` extended; DB-01 rehearsal updated. No existing value is modified. |
| `848abbe` | `scripts/diagnostics/directory-website-repair.ts` + 361-line fixture test suite: emit-only transport (never connects to D1), read-only-by-default report SQL, classification/reconciliation collector, approval-gated CAS `apply-sql` with `MAX_APPLY_ROWS = 50`, CAS-guarded undo artifact emission. |
| `6e31cd7f` | Critic hardening: website normalization in the tool aligned with the SQL guard's exact predicate; additional drift/refusal tests. |

Tooling safety contract (as implemented and tested): every emitted report
statement is a SELECT; apply requires an evidence file listing exact row IDs
and the expected current website value; shared-host rows additionally require
`sharedDomainReviewed: true`; more than 50 approved rows aborts the run; each
apply emits per-row guarded UPDATE files (one statement per wrangler call) plus
an undo artifact whose restore statements are themselves CAS-guarded on the
repaired state.

## Verification

Local at head `6e31cd7f`:

- Focused: `directory-website-repair.test.ts` +
  `directory-website-provenance.test.ts` → 27 pass / 0 fail / 99 assertions.
- Full G3: **634 pass / 0 fail / 1,523 assertions** across 70 files.
- `bunx tsc --noEmit -p apps/web/tsconfig.json` → exit 0.

CI/deploy on the exact pushed SHA `6e31cd7f`: Sovereign CI Guardrail run
[`32605834663`](https://github.com/cyalcala/va-freelance-hub/actions/runs/32605834663)
success — guardrails, unit tests, build, typecheck, freshness-worker validation;
job "Migrate and deploy production" succeeded with steps "Apply D1 migrations
to production" (migration 0033 applied) and "Deploy to Cloudflare Pages".
Post-deploy Ingestion Heartbeat Watchdog `32605596383` success.

## Fresh read-only remote report (2026-08-23 ~00:04–00:13Z)

Emitted via `directory-website-repair.ts sql`; both SELECT statements executed
against production D1 read-only with
`wrangler d1 execute DB --remote --env production --json --command ...`
(`changed_db=false`, `rows_written=0`); reconciled via `collect`.

Redacted report artifact:
`docs/gauntlet/evidence/artifacts/DATA-05B-report-20260823T0013Z.json`
sha256 `86d3a0002c0e48bd9c51285f7e1f10dc434da9e66d80e1470c24477c8d1d1be3`

Totals: 456 directory rows; 344 with a website; 0 classified (provenance
columns fresh, pre-repair). Reconciliation ok (both deltas 0).

Classification summary:

| Signal | Rows |
| --- | ---: |
| unclassified website rows | 344 |
| `enrichment_note_evidence` | 35 |
| in shared-host groups (19 hosts) | 39 |
| `name_host_mismatch` | 17 |

### Shared-host groups (19)

Most groups are benign name variants of one company (e.g.
`20four7va.com` ← "20four7va"/"24/7 virtual assistant"; `ey.com` ← Ernst &
Young / EY Studio+ Nederland, one corporate family). The genuine cross-company
anomaly group is:

- `remote.ph` ← Sourcegraph (557) + DuckDuckGo (577), both with enrichment-note
  evidence — two unrelated companies sharing one host written by the retired
  heuristic.

Full group listing is in the redacted report artifact.

### Candidate cohort — PENDING OWNER REVIEW (nothing approved, nothing mutated)

Rows carrying enrichment-note evidence AND a company/host mismatch, i.e. the
strongest support-gap candidates for clearing:

| ID | Company | Heuristic-written website | Link state |
| --- | --- | --- | --- |
| 546 | Vidalytics | `https://we-work-remotely.com` | bot_wall (HTTP 530) |
| 548 | Airalo | `https://remotephjobs.ph` | bot_wall (HTTP 525) |
| 557 | Sourcegraph | `https://remote.ph` | unreachable |
| 575 | Impact Clients | `https://highperformancetrain.com` | ok |
| 577 | DuckDuckGo | `https://remote.ph` | ok |
| 623 | Kindred | `https://remote-ph-jobs.com` | bot_wall (HTTP 530) |

Ambiguous examples the owner should explicitly rule on either way:

- 618 Bright Vision Technologies → `bvteck.com` (plausible abbreviation).
- 619 TE Connectivity → `te.com` (legitimate corporate domain; mismatch signal
  is a short-token false positive).
- 576 EY Studio+ Nederland → `ey.com` (same corporate family as row 523).

The remaining note-evidence rows (e.g. Proxify AB → `career.proxify.io`,
Lemon.io → `lemon.io`) show company-consistent hosts and look legitimate; they
need provenance backfill or explicit confirmation, not clearing.

## Stop condition honored

The contract classifies mutation as APPROVAL-GATED. No `--apply`,
no `apply-sql` execution (dry-run included, which requires an evidence file),
and no D1 write occurred. The next executor action requires the human data
owner to approve an exact ID list with expected old website values.

## Exact continuation path

1. Owner reviews the candidate cohort above and the full redacted artifact,
   then produces/approves an evidence file listing exact row IDs, expected
   current `website` values, and `sharedDomainReviewed: true` where applicable.
2. `bun scripts/diagnostics/directory-website-repair.ts apply-sql --evidence <approved.json> --report <fresh-report.json> --dry-run`
   → review plan; re-collect a fresh report first if D1 changed since this one.
3. Real apply emits guarded per-row SQL files + `undo-artifact.json`; operator
   runs each statement once via wrangler, recording per-row `rows_written`.
4. Post-apply exact-ID SELECT, totals reconciliation, public route smoke for
   affected/unchanged rows; retain undo artifact; update baton; terminal KEEP/
   REVISE decision per acceptance criteria.
