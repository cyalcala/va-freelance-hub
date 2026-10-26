> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Repository parity audit — 2026-10-18

Prepared at 2026-10-18T08:22:37Z (16:22 Singapore/Manila). This is a bounded
read-only remote audit plus a separately identified local fast-forward
preservation. It is not a receipt for subsequent pushes, deployed artifacts,
database backups, or unattended mirroring. Re-read live refs before acting.

## Canonical hierarchy and inspected scope

Secure Source Manager (SSM) remains canonical. GitHub and GitLab are mirrors,
backups, and external continuity surfaces.

| Local remote | Sanitized URL | Role |
| --- | --- | --- |
| `origin` | `https://va-freelance-hub-296059249147-git.asia-northeast1.sourcemanager.dev/antigravity-494415/va-freelance-hub.git` | Canonical SSM |
| `github` | `https://github.com/cyalcala/va-freelance-hub.git` | GitHub mirror |
| `gitlab` | `https://gitlab.com/cyrus-group4793641/va-freelance-hub.git` | GitLab mirror |

Compared every advertised `refs/heads/*` and `refs/tags/*`, including annotated
tag object SHAs and peeled targets. Tag counts below exclude duplicate peeled
`^{}` advertisements. Provider-owned pull-request refs are outside parity scope.
GitHub and GitLab advertised default HEAD as `refs/heads/main`; SSM default HEAD
was not independently re-read in the successful bounded probe.

## Initial remote observations

| Remote | Heads | Tags | `main` | `codex/verified-flow-directory-checkpoint` |
| --- | ---: | ---: | --- | --- |
| SSM | 156 | 45 | `c23a2db0b60b544d3305312b696784eed98a1089` | `c23a2db0b60b544d3305312b696784eed98a1089` |
| GitHub | 141 | 44 | `be7c493a935cbf023c33db5c3c0398399a4d69c1` | `c23a2db0b60b544d3305312b696784eed98a1089` |
| GitLab | 3 | 0 | `c23a2db0b60b544d3305312b696784eed98a1089` | `c23a2db0b60b544d3305312b696784eed98a1089` |

The shared checkpoint branch matched on all three hosts. Whole-repository
parity did not hold.

GitHub was missing these 15 canonical heads:

```text
codex/apex-capacity-acceptance
codex/apex-state-write-diagnostics
codex/comp01b-canary
codex/comp01b-expand
codex/comp01b-rollback
codex/db-01
codex/pigment-paper-complete
codex/publication-lock-recovery
codex/sp-01-acceptance
codex/sp-01-source-identity
codex/sp-02-source-economics
codex/talent-diagnostics-acceptance
feature/ex-06-lever-leverdemo
mirror/gitlab/main
savepoint/pre-ux-elevation
```

GitHub was also missing `refs/tags/savepoint-ux-elevation`. Its other 44 tags
matched SSM exactly, including the advertised peeled targets. No GitHub-only
head or tag name was observed. Three shared head names differed:

| Head | Canonical SSM | GitHub | Ancestry |
| --- | --- | --- | --- |
| `codex/master-operating-prompt` | `8a87f1b263c13a801aee946170cff7c753ed576e` | `2c3c40bd958475d8d7500de0d81a9d511f85e6a9` | GitHub tip is a canonical ancestor |
| `codex/recent-progress-backup` | `3065f0d709d5a1950c247d5a11df542b07721bcb` | `a6da754c3670f56eeb768eb2f75bd0605fda61fa` | GitHub tip is a canonical ancestor |
| `main` | `c23a2db0b60b544d3305312b696784eed98a1089` | `be7c493a935cbf023c33db5c3c0398399a4d69c1` | Canonical tip is 27 commits behind GitHub |

GitLab was missing 153 canonical heads and all 45 tags. Its three existing
heads matched SSM: `main`, `codex/verified-flow-directory-checkpoint`, and
`codex/publication-lock-recovery` at
`34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83`. No GitLab-only head or tag was
observed. Existing current-branch source backup therefore does not establish
complete branch/tag backup.

## Preserve the GitHub documentation descendants

An ordinary, non-pruning, no-tag fetch of GitHub `main` updated its stale local
tracking ref. The ancestry check then returned:

```text
git rev-list --left-right --count origin/main...github/main
0 27
```

These 27 commits were bot-generated documentation and economics snapshots.
Their combined diff changed 10 files, with 533 insertions and 339 deletions:

```text
docs/directory-health-latest.md
docs/economics-snapshots/latest.json
docs/economics-snapshots/snapshots/2026-10-16T07-28-41-705Z.json
docs/economics-snapshots/snapshots/2026-10-17T07-09-25-933Z.json
docs/economics-snapshots/snapshots/2026-10-18T07-23-51-077Z.json
docs/enrichment-latest.md
docs/health-digest-latest.md
docs/prospector-latest.md
docs/source-economics-latest.md
docs/source-health-latest.md
```

The newest inspected commit was `be7c493a935cbf023c33db5c3c0398399a4d69c1`,
dated 2026-10-18T07:23:52Z, `docs: update measured source economics [skip ci]`.
The root maintainer subsequently fast-forwarded the current local checkpoint
branch to that exact SHA while retaining unrelated dirty work. Local HEAD was
independently read back at that SHA when this receipt was prepared. This
preserves the 27 commits locally; remote canonical/mirror acceptance still
requires the root maintainer's later explicit push/readback receipt.

## Recurring cause: runtime `origin` still means GitHub

The local checkout correctly uses `origin` for SSM. GitHub Actions
`actions/checkout@v4` initializes its own `origin` as the GitHub repository.
Eight checked-in workflows commit evidence and push `origin HEAD:main` without
configuring a canonical SSM write or a second-host mirror step:

| Workflow | Push line in inspected source | Output path/purpose |
| --- | ---: | --- |
| `.github/workflows/gha-workable-pulse.yml` | 54 | Workable candidate digest; manual workflow |
| `.github/workflows/gha-source-economics.yml` | 65 | Economics report and retained snapshots |
| `.github/workflows/gha-sentinel-pulse.yml` | 824 | Daily source-health rollup |
| `.github/workflows/gha-prospector-pulse.yml` | 177 | Prospector digest |
| `.github/workflows/gha-medic-pulse.yml` | 125 | Weekly health digest |
| `.github/workflows/gha-hunter-pulse.yml` | 497 | Source-health rollup |
| `.github/workflows/gha-enrichment-pulse.yml` | 87 | Directory enrichment digest |
| `.github/workflows/gha-directory-pulse.yml` | 100 | Directory-health digest |

The push loops are bounded and exit nonzero after their final rejected push.
That protects against silent push failure within GitHub. It does not copy a
successful GitHub write into canonical SSM or GitLab. The 27 GitHub-only
descendants demonstrate that persistence gap. No mirroring script, active Git
hook, or SSM mirror/Cloud Build trigger configuration was found in the inspected
repository. Provider-side mirror configuration was not independently inspected;
its absence is not established by this source search.

The current checkpoint branch tracks canonical `origin`. Local `main` and many
historical branches still track `github`; unqualified operations on those
branches require care. No upstream configuration was changed by this audit.

## Credential boundaries

The name-only repository secret inventory was read using GitHub CLI. Relevant
configured repository secret names included `GCP_SA_KEY`,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PROXY_SECRET`,
`TURSO_AUTH_TOKEN`, and `TURSO_DATABASE_URL`. No value was read or exported.

No GitLab token/deploy-credential name was present in the repository-secret
inventory. Organization/environment secret inventories were not inspected.
No checked-in workflow currently references a GitLab authentication secret.
`SENTINEL_BOT_PAT` and `GCP_RUN_VIEWER_SA_KEY` are referenced by workflow code
but were absent from this repository-secret inventory; their availability from
another scope remains unknown. The built-in `GITHUB_TOKEN` is a separate
runtime credential, not an entry expected in that inventory.

`sync-secrets-to-gcp.yml` already uses `google-github-actions/auth@v2` with
`GCP_SA_KEY`. Its presence does not prove that runtime identity has SSM instance
access and repository writer permissions. Those capabilities were not verified
and no grant was added. Successful local SSM authentication/readback does not
prove GitHub runner authentication. The ordinary local SSM credential path hung
and was canceled; a bounded command-scoped existing credential helper completed
the canonical ref reads successfully. Local GitLab authentication also completed
the ref reads. Local credential stores were not copied into another runtime.

## Reproduction and next repair

The audit used sanitized remote URL reads, `git ls-remote --heads --tags` for
each host, `git ls-remote --symref` for GitHub/GitLab, and these local checks:

```text
git fetch --no-tags github refs/heads/main:refs/remotes/github/main
git rev-list --left-right --count origin/main...github/main
git diff --stat origin/main...github/main
git merge-base --is-ancestor <older-tip> <newer-tip>
git config --get-regexp ^remote\..*\.(fetch|push|mirror)$
git config --get-regexp ^branch\..*\.(remote|merge)$
gh api repos/cyalcala/va-freelance-hub/actions/secrets --paginate --jq '.secrets[] | [.name,.updated_at] | @tsv'
```

SSM reads used an existing command-scoped credential helper after the default
helper hung. Remote outputs were compared in memory by exact ref name and SHA.
No push, force update, pruning, deletion, credential export, grant, or persistent
configuration change was performed by the audit worker.

The next repair is to preserve/import the 27 descendants into SSM first, push
the reviewed checkpoint normally, and verify exact SHAs on all three hosts.
Reconcile missing historical heads and tags with explicit non-forced refspecs;
refuse conflicting tag objects or diverged history. A checked-in sync/check
command should reuse the existing host-specific credential boundaries and fail
visibly on any missing ref or readback mismatch.

For recurring evidence writers, reuse the existing workflow execution and
authentication mechanisms: verify the existing GCP runtime identity's SSM write
access, centralize canonical SSM-first persistence, then update the GitHub
mirror with its existing runtime token. Complete unattended GitLab mirroring
requires a verified supported runtime credential boundary; that has not been
demonstrated. Do not export the local credential store or claim complete
automated parity from current checkpoint equality.

The `astra777.txt` statement that checkpoint equality proves “full repository
parity” is too broad. This receipt distinguishes branch equality, whole-ref
backup, documentation parity, and unattended execution. Older dated source
control receipts remain historical evidence; current recovery pointers should
link to the accepted post-repair receipt when it exists.
