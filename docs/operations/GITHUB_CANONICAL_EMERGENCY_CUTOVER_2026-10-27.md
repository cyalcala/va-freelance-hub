# GitHub canonical emergency cutover — 2026-10-27

The owner directed removal of Secure Source Manager (SSM) after reporting an
unexpected $520 charge. GitHub `cyalcala/va-freelance-hub` is now the canonical
Git repository and durable engineering memory. GitLab remains secondary.
This decision supersedes every earlier SSM canonical, push, parity, credential,
or recreation requirement. Do not re-enable or recreate SSM.

## Verified preservation and local cutover

- Starting working branch: `codex/verified-flow-directory-checkpoint` at
  `afce194b3c8575f16c0fe57b552cccc43dfbf724`.
- Before removal, all 208 SSM branch/tag refs exactly matched GitHub: zero
  missing refs and zero mismatched SHAs. Both `main` refs were
  `5ba108fd90bdd4855115832a94207de320dcec6d`.
- All remote SSM branch/tag refs were fetched into a local archive namespace.
  A complete Git bundle passed `git bundle verify` and is saved at
  `C:/Users/admin/Desktop/va-hub-git-emergency-backup-2026-10-27/repository-all-refs.bundle`.
  SHA-256: `EB956B20EDF7A0F6F9F7A10BF8058039EA2685E08A055F4F0DE5397B2458A503`.
- `origin` now fetches/pushes `https://github.com/cyalcala/va-freelance-hub.git`.
  The existing `github` alias also points there; `gitlab` remains secondary.
- Removed the local SSM credential helper and global host-specific credential
  provider setting. Linked worktrees share this Git configuration.
- The three untracked SSM fetch/push/test PowerShell helpers were copied into
  the external backup directory, hash-checked, then removed from active scripts.
  Other pre-existing untracked work was preserved.

## Cloud shutdown result — support action still required

The project-wide, all-region instance inventory returned one instance:
`projects/antigravity-494415/locations/asia-northeast1/instances/va-freelance-hub`.
Its last observed state before service disable was `ACTIVE`.

The authorized instance deletion failed with:

> PERMISSION_DENIED: Write access to project 'antigravity-494415' was denied: please check billing account associated and retry.

The Secure Source Manager API was then successfully disabled. Operation:
`operations/acat.p17-296059249147-5a477989-d4f8-4e87-801c-5c8cf41731a4`.
Independent Service Usage API readback confirmed
`projects/296059249147/services/securesourcemanager.googleapis.com` is `DISABLED`.

**API disable is verified; instance deletion and billing cessation are not.**
The existing Google Cloud support case needs final instance deletion and
confirmation of the charge cutoff/refund decision. Do not re-enable billing or
SSM merely to retry. No other GCP runtime, scheduler, database, or serving
resource was changed. The Cloud Build trigger inventory in `asia-southeast1`
was empty; this is a bounded observation, not an all-project integration audit.

Suggested text for the owner's existing support case:

> Please permanently delete Secure Source Manager instance
> `va-freelance-hub` in project `antigravity-494415`, region `asia-northeast1`,
> and confirm when further instance charges stop. The delete request failed
> with a billing-related PERMISSION_DENIED error. The SSM API is now disabled
> and all 208 Git refs were independently preserved on GitHub plus a verified
> local bundle. Please include this emergency shutdown attempt in the review
> of my unexpected $520 charge. Preserve the project's other services.

## Repository and automation changes

Eight generated-report workflows now persist directly to GitHub using their
existing workflow token. The shared action no longer needs GCP authentication
or gcloud. Report path isolation, ancestry checks, non-force retry, conflict
refusal, and remote SHA verification remain. The obsolete SSM diagnostic job
was removed; ordinary GCP Secret Manager synchronization remains.

Active instructions, bootloaders, architecture, source governance, and recovery
documents now direct canonical commits/pushes to GitHub. Historical receipts
retain their original evidence with explicit supersession notices. The paused
Lucky777 automation now uses GitHub canonical instructions and prohibits SSM
recreation; its pause, schedule, and target chat are preserved.

Focused verification: 16 tests passed (151 assertions), production guardrails
passed, orchestrator audit passed, and an independent focused review found no
consequential defect. These checks do not establish live runner acceptance.

Commit/push readbacks and current runner evidence are recorded below after
publication. Cloud deletion remains an external support dependency.
