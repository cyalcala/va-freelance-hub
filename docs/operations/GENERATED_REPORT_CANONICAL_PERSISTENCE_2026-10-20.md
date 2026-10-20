# Generated report canonical persistence — 2026-10-20

Source base: `8078a260aab0650e815e780209f4598b94af9e29` on
`codex/verified-flow-directory-checkpoint`. This is a source/test receipt;
**activation and actual persisted-write acceptance remain pending**. The earlier
[SSM capability diagnostic](SSM_RUNTIME_CAPABILITY_PROBE_2026-10-18.md) passed
GitHub run `39142613038`, but read/dry-run negotiation is not a main-write proof.

## Observed defect and bounded repair

Eight existing generated-report writers committed to GitHub `origin/main` only.
Their separate push/rebase loops repeatedly advanced the mirror while canonical
SSM stayed behind. The owner hierarchy remains SSM canonical, GitHub and GitLab
mirrors. Existing bot commits must be preserved through ordinary reconciliation
before this mechanism is activated; the helper refuses GitHub-ahead/diverged
history rather than discarding or silently importing it.

The eight writers now share `.github/actions/persist-generated-report` and
`scripts/gha/persist-generated-report.sh`. Report generation, queries, source
operations, schedules, permissions and dormant Workable scheduling are retained.
Only main can persist reports; other branch runs can still generate evidence.

| Fixed report key | Authorized generated paths |
| --- | --- |
| directory | `docs/directory-health-latest.md` |
| enrichment | `docs/enrichment-latest.md` |
| hunter, sentinel | `docs/source-health-latest.md` |
| medic | `docs/health-digest-latest.md` |
| prospector | `docs/prospector-latest.md` |
| workable | `docs/workable-candidates-latest.md` |
| economics | `docs/source-economics-latest.md`, `docs/economics-snapshots/` |

The helper captures only those paths through a separate index, including new
economics snapshots and existing retention deletions. It creates the generated
commit in an isolated temporary repository. The generator's branch, normal
index, dirty files and logs are not committed or reset. Missing generated paths,
symlinks, unexpected repository/ref/key, and a checkout outside canonical main
ancestry fail before any remote push.

It fetches the two fixed main refs, replays only the generated commit onto
canonical main, and makes an ordinary non-force SSM push. A confirmed canonical
SHA is then eligible for an ordinary non-force GitHub push. Both refs are read
back, including a final SSM read after the GitHub verification. Five bounded
attempts handle fast-forward races; conflicts and unreconciled mirror history
fail visibly. No force, mirror, deletion, new ref or arbitrary remote input exists.

A successful canonical write followed by GitHub failure is retained in SSM.
The job fails with the retained SHA and does not roll canonical history back.
A later invocation still catches GitHub up when its newly generated report has
no file changes. This prevents a no-change early exit from hiding a failed
mirror operation. Sequential readbacks are bounded observations, not a promise
that concurrent refs cannot subsequently advance.

## Credential and deployment boundaries

The composite uses the existing `GCP_SA_KEY` through the already-tested auth/v2
and setup-gcloud/v2 identity path. Its temporary credential file is removed by an
always-run constrained cleanup and the auth action's own cleanup. The existing
GitHub per-job workflow token is applied only to the fixed GitHub host. Credential
headers are not logged or persisted as Git configuration. Checkout credential
persistence is disabled only in the eight report-writing checkouts; Sentinel's
separate pre-existing proposal branch job is outside this slice.

There are no new secrets, grants, IAM changes, source admissions, runtime routes,
database migrations, deployment commands, jobs or clocks. The release classifier
narrowly treats this exact composite-action directory and this exact shell helper
as non-Pages infrastructure. It continues to classify runtime/migration changes,
other action directories and other scraper scripts as deployable. The composite
and helper must be present together in the selected activation commit; do not
activate them by merging unrelated dormant runtime changes from the checkpoint.

**GitLab remains pending.** No GitLab runtime credential is configured for these
jobs. This mechanism cannot claim GitLab unattended parity, full-ref/tag backup,
or successful three-repository mirroring. Manual canonical/mirror checkpoint
verification remains a separate obligation.

## Verification and remaining acceptance

Executable tests run the checked-in Bash against isolated local bare Git
repositories, with exact production URLs mapped to local fixture remotes and
unknown network destinations refused. They verify owned paths and caller-state
preservation, canonical-before-GitHub ordering, push/readback failures, retained
canonical recovery after mirror failure, no-change catch-up, concurrent canonical
advancement, conflict refusal, divergent-history refusal, and economics retention.
Actual YAML for every writer and the composite is parsed. Actual classifier and
credential-cleanup shell steps are also executed with synthetic fixtures.

The initial Windows fixture child timeout was 25 seconds; a complete passing
case took about 29 seconds. That harness bound was corrected to 90 seconds per
child/120 seconds per test. The superseded run was stopped and its failures are
not acceptance evidence. This does not change any production workflow timeout.

Verification used the pinned Bun `1.3.14` executable:

- Helper/YAML/local Git behavior: **14 pass, 0 fail, 117 assertions**, 279.73s
  (`.tmp-canonical-persistence-tests.log`). The additional actual classifier and
  constrained credential cleanup cases passed **2/0/9** in 6.72s
  (`.tmp-canonical-persistence-scope-cleanup.log`). These are two phases over the
  same unchanged shell/action/workflow implementation, not two full-suite runs.
- All twelve neighboring GHA test files: **158/0/304615**, 121.73s
  (`.tmp-canonical-persistence-neighbors.log`). Exact root production-guardrail
  tests: **16/0/34**, 112ms (`.tmp-canonical-persistence-ci-exact.log`). A first
  unqualified Bun path filter also inspected three temporary copies; its wider
  82-test result is not used as the exact root receipt.
- Production guardrails, accepted-parameter parity, orchestrator and constitution
  audits passed. Bash syntax and scoped diff whitespace checks passed.
- Independent read-only review reproduced two additional local real-Git races:
  canonical receive succeeds but the client sees transport failure, and canonical
  advances as a descendant after the GitHub push. Both converge without losing or
  duplicating the generated report: **2/0/15**, 40.12s, retained in
  `tmp/independent-canonical-counterexamples.log`. No external remote was written.

Until an actual selected main job stores and reads back a new report commit in
SSM, then GitHub, persisted-write/main authorization and recurrent continuity
remain unverified. A suitable acceptance run uses an existing read-only aggregate
report job after the exact infrastructure slice is backed up and activated.

References checked against primary documentation:
[composite actions](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action),
[GitHub contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts),
[Git rebase](https://git-scm.com/docs/git-rebase).
