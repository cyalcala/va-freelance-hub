# Return point before premium design — 2026-10-07

Owner requested a durable savepoint before following the premium product-design
brief, preserving the existing warm neutral and coral identity.

## Exact baseline

- Git tag: `savepoint/pre-premium-design-2026-10-07`.
- Full source SHA: `50d8daa280d74b2a34f8d9ec1ed4a8dd1a5d0c73` (verified origin/main).
- Baseline main CI: `37618929662`, success.
- Accepted production runtime: `91641445985d8f3230e8e54ccf857c637bc3b551`.
- Pages artifact: `aa8ce5b8-d084-466b-bd8c-24d3e9ebe7c4`.
- Production acceptance: [refresh recovery](../incident-2026-10-07-snapshot-refresh-recovery.md).
- Owner brief archived verbatim: [Premium 2026 direction](PREMIUM_2026_OWNER_BRIEF.md).

This tag preserves the complete tracked source, tests, infrastructure and recovery
docs before design edits. The existing public recovery/fallback/Apply safeguards
are part of this baseline. Foreign untracked `.agents/skills/` and `lucky777.md`
are preserved in the existing checkout and are not included in the tagged tree.
Credentials, databases and changing production data are not included in Git.

## Return safely

Fetch the tag and start a separate review branch without discarding any work:

```powershell
git fetch origin tag savepoint/pre-premium-design-2026-10-07
git switch -c codex/restore-pre-premium-design savepoint/pre-premium-design-2026-10-07
```

The restored branch exactly reproduces this source baseline. To return only the
frontend while retaining later operational fixes, compare/cherry-pick or restore
the reviewed UI files from the tag on a new branch, then use the normal PR and
release path. Do not reset shared main or roll back database state to restore a
design. The existing Pages artifact is a separate deployment rollback receipt;
availability and retention must be checked when using it later.

## Authorized next work

Isolated branch `codex/premium-2026-overhaul`. Follow the owner's Warm Precision
and Employment Intelligence direction with the present cream/charcoal/coral
family. Discover and critique first, compare three rendered concepts, establish
tokens, then implement and verify individual surfaces. Do not change ingestion,
source qualification, publication gates, database semantics or GCP clocks.
The savepoint tag and this checkpoint are pushed before UI implementation.
