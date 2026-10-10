# Source-control fallback and recovery contract — 2026-10-09

## 2026-10-10 supersession

Secure Source Manager is now the canonical Git remote. Local name `origin`,
instance `va-freelance-hub`, region `asia-northeast1`. GitLab remains the
secondary mirror described below. The GitHub remote was renamed from `origin`
to `github`. The body of this contract is the 2026-10-09 decision and is not
rewritten.
[Receipt](SECURE_SOURCE_MANAGER_CANONICAL_2026-10-10.md).

## Decision and current status

The owner authorized GitLab as an independent source-control fallback. At the
time of this contract, retain GitHub `origin`; the credential-free `gitlab`
remote is configured as
`https://gitlab.com/cyrus-group4793641/va-freelance-hub.git`. Git Credential Manager
2.6.1 handles local authentication through its Windows credential store. Following
the owner's Chrome authentication, a noninteractive fetch and push dry run passed.
A real review-branch push and exact SHA readback passed at 19:05:52 UTC for
`209e45ace7669e395a53048e5a27c2bd27305c57`. The subsequent source receipt below
covers the new implementation. The earlier missing-credential preflight is dated
history. No credentials were printed or stored in the repository or remote URL.

GitLab `main` contains one independent README commit,
`fbeff64a2b47f32550ba426af92a2795a1507181`. It is preserved. The complete project
history is on `codex/verified-flow-directory-checkpoint`; a default clone of `main`
does not recover this project. No force push, mirror automation or merge occurred.

This contract was prepared on `codex/verified-flow-directory-checkpoint` at local
HEAD `209e45ace7669e395a53048e5a27c2bd27305c57`. Capture the actual final committed
SHA again before any push; this document's preparation SHA is not a backup receipt.

| Capability | Status and acceptance evidence |
| --- | --- |
| GitHub backup of the current local checkpoint | PENDING until a successful push and exact remote SHA readback; the previously verified remote base does not cover later local commits |
| GitLab authentication | PASS: noninteractive Git fetch, push dry run, real branch push and exact SHA readback; no further credential input is required |
| GitLab source backup | PASS for the exact committed SHA in [source receipt](gitlab-source-backup-2026-10-09.json); final acceptance docs HEAD needs its separate final readback receipt |
| GitLab merge request review | NOT CREATED; source backup alone does not establish review acceptance |
| GitLab CI and release equivalence | PENDING separate configuration, review and executed receipts; source upload does not establish equivalent checks or deployment |
| Local incremental Git recovery | Existing savepoint receipts apply only with their required base and stated source/test/document scope |
| Cloudflare R2 archive | OPTIONAL, NOT PROVISIONED; requires owner-approved availability, quota and configuration before activation |

GitLab supports push mirroring on the Free tier; pull mirroring requires Premium.
A manual second-remote push is sufficient for this bounded fallback and creates no
mirror automation. [GitLab repository mirroring](https://docs.gitlab.com/user/project/repository/mirror/)
The supplied project already exists; no project or namespace creation is needed.
The exact-source-SHA unauthenticated pipeline API read returned 404 at 19:11:17
UTC; [its receipt](gitlab-ci-observation-2026-10-09.json) leaves CI UNKNOWN. This
does not establish that pipelines are absent or that Git credentials failed.

## Activate the GitLab second remote

1. Use the verified owner-supplied repository and local credential manager. Keep
   tokens/passwords out of chat, repository files, remote URLs and receipts. Use
   locally configured SSH authentication or the credential manager.
2. Check `git status --short`, branch and existing remote URLs. Preserve foreign
   `.agents/skills/`, root `lucky777.md` and every unrelated dirty/untracked file;
   stage and commit only reviewed task-owned files. Git backs up committed material,
   not uncommitted work. Record separately what remains outside that commit.
3. Retain `origin`. Compare the existing `gitlab` URL and stop on a conflict rather
   than replacing it silently. Confirm the review branch remains the intended
   branch and capture its full final commit SHA.
4. Push only that commit to the explicit review-branch ref, without force. A
   non-fast-forward rejection requires inspection and reconciliation; it does not
   authorize overwriting remote history. Do not use `--mirror`, force, deletion
   refspecs or automatic merge to `main`.
5. Read the exact branch with `git ls-remote --heads`. Acceptance requires its
   full SHA to equal the captured local SHA. Record URL, branch, SHA, UTC time,
   push exit status and readback. Until then, GitLab backup remains PENDING.

For subsequent bounded checkpoints, inspect the existing remote and explicitly
push only the reviewed commit:

```powershell
git status --short
git remote -v
git branch --show-current
$fallbackCheckpointSha = git rev-parse HEAD
git remote get-url gitlab
git push gitlab "${fallbackCheckpointSha}:refs/heads/codex/verified-flow-directory-checkpoint"
git ls-remote --heads gitlab 'refs/heads/codex/verified-flow-directory-checkpoint'
```

Compare the returned SHA with `$fallbackCheckpointSha`; a successful command with
a different SHA is not acceptance. If GitHub later becomes available, push the
review branch to `origin` normally and independently verify its SHA. A verified
GitLab push does not close the pending GitHub backup or review/release requirement.

While the already observed GitHub suspension is unchanged, fetch the verified
GitLab review branch, inspect its ancestry and preserve local/foreign work before
continuing from SYSTEM_SAVEPOINT. Do not repeatedly probe the same GitHub failure,
change `origin`, automatically reset/checkout, or assume two hosts agree. A remote
advance or non-fast-forward rejection needs reconciliation before a push.

To restore in a new, empty location, select the project branch explicitly:

```powershell
git clone --branch codex/verified-flow-directory-checkpoint 'https://gitlab.com/cyrus-group4793641/va-freelance-hub.git' 'NEW_EMPTY_RESTORE_DIRECTORY'
```

Restore authentication locally through Git Credential Manager and read the newest
savepoint before execution. GitLab is the source fallback; GCP remains the primary
background owner. Automatic production failover and equivalent CI are unverified.
The existing Lucky777 heartbeat was updated through the Codex automation tool:
ACTIVE, hourly, same owner chat and notification policy. It now fetches this
verified fallback during the unchanged GitHub suspension and verifies each
completed checkpoint's explicit non-force branch push/readback. No extra
automation or production ingestion clock was created.

## Local and optional Cloudflare archive recovery

The existing incremental bundles require base
`926d39a0ea2db80a7eba8d541d12906a0c8b0837`, as recorded in
[SYSTEM_SAVEPOINT](../SYSTEM_SAVEPOINT.md). Recover that base first, then apply the
incrementals in their receipt order. An incremental verified in the current clone
is not a self-contained restore from an empty environment.

For optional R2 archives, create a full Git bundle with complete ancestry for the
explicitly selected branch/ref scope, with no excluded base prerequisite. Keep
the bundle outside the repository. Pair it with a SHA-256 manifest containing its
filename, byte length, digest, selected refs, full source commit SHA and UTC capture
time. Run `git bundle verify`, confirm no prerequisite commits, and clone it into
a fresh empty restore directory; the restored branch SHA must match the manifest.
These are local archive-preparation steps, not authorization to create a bucket:

```powershell
git bundle create 'FULL_BUNDLE_PATH' refs/heads/codex/verified-flow-directory-checkpoint
git bundle verify 'FULL_BUNDLE_PATH'
Get-FileHash -LiteralPath 'FULL_BUNDLE_PATH' -Algorithm SHA256
git clone --branch codex/verified-flow-directory-checkpoint 'FULL_BUNDLE_PATH' 'NEW_EMPTY_RESTORE_DIRECTORY'
git -C 'NEW_EMPTY_RESTORE_DIRECTORY' rev-parse HEAD
```

R2 activation requires owner-approved account availability, quota, cost limits,
bucket/access configuration and retention. No paid resource is authorized. R2 has
a free allowance with charges beyond the included allowance; verify the intended
storage class, storage and operation usage before activation.
[Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
After any later authorized upload, acceptance also requires retrieving the stored
bundle and manifest, verifying the digest, and repeating a fresh restore from that
retrieved object. Preserve the resulting receipt; upload acknowledgement alone is
insufficient. Bundle recovery covers committed Git source/history only and makes
no Turso/D1 database or GCP artifact/state restoration claim.

Use Cloudflare KV only for small archive pointers or manifest references. Its
25 MiB value limit and eventual consistency make it a poor working Git repository
or bundle store. [KV limits](https://developers.cloudflare.com/kv/platform/limits/),
[How KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/)

## Production boundary and remaining owner input

Changing source hosts does not change the canonical GCP background execution,
Turso acquisition, Cloudflare D1/public serving, source permissions, publication
gates, accepted parameters or runtime acceptance requirements. Create no second
production scheduler. Every later deployment still requires Git-backed SHA or
reproducible artifact provenance, supported artifact/state backups and actual
runtime receipts. Current GCP billing and container image-access failures remain
separate unresolved prerequisites; GitLab/R2 source backup does not repair them.

No further owner input is needed for this GitLab authentication/source-backup
slice. If R2 is wanted later, its availability/quota/configuration and cost
boundary require a separate owner decision. No additional credential disclosure
is needed in chat.
