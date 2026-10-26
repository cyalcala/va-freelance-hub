> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Generated report canonical persistence — 2026-10-20

Initial source base: `8078a260aab0650e815e780209f4598b94af9e29` on
`codex/verified-flow-directory-checkpoint`. This receipt covers local source
verification, CI-only activation, and a subsequent clean-runner CI repair.
Selected actual SSM-first report writes are now verified; see the final section
and [economics runtime receipt](SOURCE_ECONOMICS_RUNTIME_ACCEPTANCE_2026-10-20.md).
The earlier
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

At the initial local verification checkpoint, until a selected main job stored
and read back a new report commit in
SSM, then GitHub, persisted-write/main authorization and recurrent continuity
remain unverified. A suitable acceptance run uses an existing read-only aggregate
report job after the exact infrastructure slice is backed up and activated.

## CI activation and archived-entrypoint repair

Root backed up source commit `8b1895f51dc04a14f8ece9c2e5383cb70145e1d1`, then
activated the separately prepared CI-only commit
`e7daa6ea78647382ee29b5d15ab1c2a2555f4147` on SSM/GitHub/GitLab main with
readbacks. The activation has one parent,
`5c46edf47ca7aada79d3b931284ffd7aa4773a66`; it contains exactly the thirteen
reviewed blobs and preserves all other base tree entries. Its actual release
classifier returned `deployable=false`. Preparation evidence is retained in
`tmp/canonical-report-activation-preparation-2026-10-20.json`.

[CI run 39408643056](https://github.com/cyalcala/va-freelance-hub/actions/runs/39408643056)
passed the secret scan, four audits, scope classification and all sixteen new
persistence tests. Full unit tests were **4484 pass / 1 fail / 331673 assertions**
in 95.20s. Deployment was skipped. The sole failure was the existing native
legacy-Hunter quarantine test: it expected `LEGACY_QUARANTINE`, but Bun stopped
first because `scripts/gha/harvest.ts` imported `fast-xml-parser` before its
unconditional quarantine throw. The root uses an isolated install; that parser
is declared only in `packages/scraper`. Neither the legacy script nor its test
nor dependency manifests changed in the activation commit. Failed job
`118580665460` is retained in `tmp/canonical-report-activation-ci-failed.log`.

The bounded follow-up removes two unused imports and all unreachable prototype
code, reducing the archived entrypoint from 190 lines to three. Its literal
quarantine error and nonzero exit remain unchanged. Repository consumer checks
found no workflow/package entrypoint using the prototype; the native quarantine
test and production guardrail are its real inspected consumers. No source
selection, network request, environment read, publication path or dependency is
enabled by this removal. The old prototype remains recoverable from Git.

The existing native test now copies the actual entrypoint into a temporary
package with no declared dependencies and invokes Bun with `--no-install` and
`--no-env-file`. This prevents ambient developer dependency resolution from
hiding the clean-runner defect. A copy alone initially passed on this developer
host and was therefore insufficient evidence; the explicit dependency-free
fixture then reproduced CI's missing-package failure before the source repair.

- Before: **0 pass / 1 fail**, exact missing `fast-xml-parser` error before the
  quarantine assertion (`.tmp-canonical-legacy-quarantine-red.log`).
- After: **1/0/7 assertions**, 2.88s, same quarantine message/exit, zero HTTP,
  no `.env` load, no synthetic credential/private text exposed
  (`.tmp-canonical-legacy-quarantine-green.log`).
- All twelve neighboring GHA files after the repair: **158/0/304616**,
  67.60s (`.tmp-canonical-legacy-neighbors.log`).
- The classifier additionally excludes only exact `scripts/gha/harvest.ts`,
  because it is an unconditional quarantined tombstone. Actual shell tests
  classify this repair as non-Pages and mixed active-runtime changes as
  deployable; static and shell classifier checks passed **2/0/18** in 0.90s
  (`.tmp-canonical-legacy-classifier.log`). Other GHA scripts, app runtime,
  migrations and suffix lookalikes remain deployable. The extra true-result
  fixture initially reused its output filename; assigning a distinct output per
  case corrected that test harness issue without changing classifier behavior.
- Exact root production-guardrail tests passed **16/0/34**, 525ms
  (`.tmp-canonical-legacy-guardrail-exact.log`). All four production/governance
  audits passed with explicit exit zero; scoped whitespace checks passed.

At that repair checkpoint, the follow-up awaited its own review/activation and a new full CI result.
It does not convert the failed full CI run into a pass, prove report persistence,
or establish GitLab unattended credentials. No timeout or dependency was added;
no test was disabled.

References checked against primary documentation:
[composite actions](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action),
[GitHub contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts),
[Git rebase](https://git-scm.com/docs/git-rebase).

## Actual activation and retained report writes

The dependency-free repair was activated as main `23b9202a35aa43883dea4af8e21ad59577eb656d`.
[CI 39410570310](https://github.com/cyalcala/va-freelance-hub/actions/runs/39410570310)
passed, with production migration and deployment skipped. The later bounded
memory/read-only-report graft `cdc121947516c8a91ea9ac2c8c8e98f4d340fbf9`
passed [CI 39419521183](https://github.com/cyalcala/va-freelance-hub/actions/runs/39419521183),
also without production migration/deployment.

Actual report runner `39409286844` wrote `d88365ed` to SSM and then GitHub.
Subsequent directory main `216b7124c4c7fdfbb9b563f478f13002421c35b0` and
economics main `fe3599d4617e7d573a391e8596cc0988ff5b25f5` were also retained
in canonical history. The economics run's six read-only query artifacts
reproduce its committed Markdown byte for byte. This establishes selected
real persisted writes beyond the earlier dry-run capability probe.

At `2026-10-20T12:49:42.633Z`, a normal manual GitLab fast-forward and independent
main readbacks matched `fe3599d4` on all three hosts. This is a bounded main
observation. GitLab still has no configured runtime credential for these report
jobs; unattended three-host continuity and global runtime health remain unproved.
