# DATA-05B — directory website provenance and approval-gated repair

Date: 2026-08-23

Execution start: `5373eae` (`main` = `origin/main`, clean worktree)

Status: `TERMINAL — KEEP (code deployed 2026-08-23; owner-approved CAS repair
of the six recorded candidate rows executed 2026-08-23 ~01:47Z with zero
skips, exact post-state proof, undo artifact retained, route smoke passed)`

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

## Owner approval and CAS mutation (2026-08-23 ~01:26–01:47Z)

The repository owner approved the candidate cohort via the autonomous
executor run instruction ("all approved that needed to be approved —
proceed"), referencing the exact IDs and expected values already recorded in
this document and the savepoint baton. The three ambiguous rows (618 Bright
Vision Technologies, 619 TE Connectivity, 576 EY Studio+ Nederland) were NOT
approved for clearing and remain untouched, per fail-closed policy.

Approved evidence file:
`docs/gauntlet/evidence/artifacts/DATA-05B-approved-evidence-20260823.json`
sha256 `2026ceb7bbeaceec806ac0e78c59d307f85888b7a0d74810688ba2bad55d0ea7`
(canonical plan hash `dd3c1a54b2d0ee685cbbe32692711c85aebf80b84318b28f478359dcd3e1f847`)

Fresh pre-repair report re-collected read-only at ~01:33Z
(`changed_db=false`): identical totals (456/344/0) and identical sha256
`86d3a0002c0e48bd9c51285f7e1f10dc434da9e66d80e1470c24477c8d1d1be3` to the
00:13Z report — zero D1 drift between runs. All six candidate rows matched
their expected current website values exactly (zero CAS drift).

Dry run: `apply-sql --dry-run` → 6 planned, 0 skipped, 6 undo records.

Real apply: six guarded per-row UPDATE statements executed one at a time via
`wrangler d1 execute DB --remote --env production --json --command` (one
initial transient `fetch failed` before any statement executed; retried
safely under CAS). Every statement matched exactly one row: `changes=1` for
all six IDs (546, 548, 557, 575, 577, 623); `rows_written=2` per statement is
D1 internal page-write accounting, not row mutations. Undo artifact emitted
before execution and retained.

Post-apply exact-ID SELECT: all six rows show `website IS NULL`,
`website_source='repair_cleared'`, `website_evidence` prefixed with the
canonical evidence hash, link fields cleared, `link_fail_count=0`.

Post-apply totals (read-only, reconciliation ok): total 456 / with_website
338 / classified 0 — with_website −6, unclassified 344→338, note-evidence
35→29, shared-host 39→37 (the `remote.ph` pair), mismatch 17→11. All six
repaired IDs absent from the unclassified cohort.

Route smoke (production Pages): `/directory` pages 1–9 probed; all six
repaired companies render (Airalo p1, DuckDuckGo p3, Kindred + Impact
Clients p4, Sourcegraph p7, Vidalytics p9); none of the five bogus hosts
(`we-work-remotely.com`, `remotephjobs.ph`, `remote.ph`,
`remote-ph-jobs.com`, `highperformancetrain.com`) appears on any probed
page; control row Lemon.io (p4) still renders `lemon.io` intact.

Local verification at head `d7e7e15` (data-only slice, no code changed):
focused `directory-website-repair.test.ts` 26 pass / 0 fail / 89 assertions;
`packages/db/directory-website-provenance.test.ts` 1 pass / 0 fail / 10
assertions; `bunx tsc --noEmit -p apps/web/tsconfig.json` exit 0.

Artifacts (all sha256 recorded at commit time):

| Artifact | sha256 |
| --- | --- |
| `DATA-05B-fresh-report-20260823T0146Z.json` | `86d3a0002c0e48bd9c51285f7e1f10dc434da9e66d80e1470c24477c8d1d1be3` |
| `DATA-05B-post-report-20260823T0146Z.json` | `7713e9c72577e6719c9d1a69357229d91a099ee02b2b8dffd0d8f2b5f0576c7b` |
| `DATA-05B-undo-artifact-20260823T0146Z.json` | `2bf44035c371734ac3561a11f3fa9845d0966d828e32a7f021cd328d3758e665` |
| `DATA-05B-apply-summary-20260823T0146Z.json` | `da18f8d04a8bde36ec7e8a619d551adcdd0106416bb1c5906f6527aea05f776d` |

## Stop condition honored (superseded)

The contract classifies mutation as APPROVAL-GATED. The gate was satisfied on
2026-08-23 by the owner's explicit approval of the recorded candidate cohort;
the mutation then proceeded exactly through the documented path below. The
remaining unresolved cohort (ambiguous rows 618, 619, 576 and the
company-consistent note rows) stays untouched pending explicit owner rulings
or a future provenance-backfill unit.

## Exact continuation path

All four steps below were executed as written on 2026-08-23 (~01:26–01:47Z);
retained verbatim as the executed record.

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

Undo path if ever needed: `bun scripts/diagnostics/directory-website-repair.ts
undo-sql --artifact docs/gauntlet/evidence/artifacts/DATA-05B-undo-artifact-20260823T0146Z.json --out <dir>`,
then execute each restore file once via wrangler (each is CAS-guarded on the
repaired state).
