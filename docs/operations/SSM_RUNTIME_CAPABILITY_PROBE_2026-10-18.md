# Existing GitHub identity: bounded SSM capability probe

Status: prepared manual diagnostic; runtime result pending. This is a
prerequisite investigation for correcting GitHub-only report persistence,
not an automated mirror or a production scheduler.

The existing `sync-secrets-to-gcp.yml` manual workflow now has two exclusive
operations. Its existing default remains `sync-secrets`. `verify-ssm` selects
a separate job that cannot enter the secret/IAM synchronization steps.

The diagnostic reuses the configured `GCP_SA_KEY` through the existing Google
authentication actions. It reads refs from the fixed canonical SSM repository,
then performs one `git push --dry-run --porcelain --no-follow-tags` against a
diagnostic branch name derived only from the numeric run identity. It creates
no ref, exports no credential to another service, adds no grant or secret, and
changes no production schedule, source admission, database or deployment.
The generated authentication file is removed after success or failure, and
the authentication action also performs its normal post-job cleanup.

The supported patterns are documented by the pinned major versions of
[Google authentication](https://raw.githubusercontent.com/google-github-actions/auth/v2/README.md),
[Cloud SDK setup](https://raw.githubusercontent.com/google-github-actions/setup-gcloud/v2/README.md),
the [SSM Git guide](https://docs.cloud.google.com/secure-source-manager/docs/use-git),
and [Git push's dry-run contract](https://git-scm.com/docs/git-push).

## Verification boundary

Offline tests parse the actual workflow YAML and run its actual Bash step with
stubbed CLIs. They verify exclusive job selection, the unchanged legacy default,
fixed destination, exact dry-run-only arguments, fail-stop behavior, numeric
identity validation and cleanup after a failed read. They do not simulate a
successful real SSM authorization decision.

The new test file passes 10 tests/74 assertions. The GHA and production-guardrail
regression passes 174 tests/304649 assertions across 13 files. The explicit
1.3.14 rerun also passed all 174 tests in 38.49 seconds. Local `bun` resolves to
1.3.14 through the npm PowerShell launcher, while `bun.exe` resolves to 1.4.2
through a different PATH entry. Acceptance uses the explicit 1.3.14 executable;
the supplemental 1.4.2 run is not substituted for that check. Actionlint is not
installed; actual-YAML parsing and Bash execution provide the available checks.

After the exact workflow commit is backed up and read back on SSM/GitHub, run:

```powershell
gh workflow run sync-secrets-to-gcp.yml --repo cyalcala/va-freelance-hub --ref codex/verified-flow-directory-checkpoint --field operation=verify-ssm
```

Inspect the resulting workflow's selected job and command outcomes. A pass
proves ref reads and dry-run receive-pack negotiation in that runtime identity.
It does not prove persisted writes, protected-main access or unattended mirror
continuity. A failure remains evidence; do not add grants or reinterpret the
result as permission. GitLab runtime authentication is a separate unresolved
boundary and is not supplied by this diagnostic.
