> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Pages snapshot release and observed visibility recovery

Production Pages deployment `8c649da0-93ef-4458-89ad-715f1367a2ca`, created
2026-10-13 at 11:52:29 UTC, reports source
`34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83`. Both canonical SSM and GitLab
returned that exact source SHA. This release contains only the three snapshot
runtime files, their three tests and a release note on the old live source base.
The jobflow candidate remains separate and unreleased.

The immutable source archive was extracted and all 1,182 files verified before
installing frozen Bun 1.3.14 dependencies. Exact-source verification passed
54 targeted tests / 223 assertions and 49 broader public-route tests / 197
assertions, with zero failures. App typecheck and Astro build passed; four
repository audits exited zero with their existing warnings retained. Build
output contains 84 hashed files. Only generated Astro types changed during the
build. [Build receipt](../evidence/pages-snapshot-release-2026-10-13/build.json).

Pinned Wrangler 4.143.0 uploaded this artifact with the explicit source SHA,
production branch and commit-dirty=false; CLI exit was zero. Independent API
read-back confirmed the full deployment ID, source SHA and unchanged production
compatibility, DB/AI bindings and five secret names/types. These metadata and
local hashes do not independently attest remote function bytes.

At 11:55 UTC the public board still served an older edge snapshot, correctly
marked stale/no-store, while the existing shared refresh lease was claimed.
At 12:01 UTC the snapshot had advanced to 11:55:26.727Z, with 1,661 jobs and
735 companies. The today filter displayed 22 IDs; ID 9214 recovered from 404 to
200. Its source posting date remained October 12. Snapshot age 335â€“336 seconds
was correctly marked stale with no-store and matching HTML head metadata.
[First sample](../evidence/pages-snapshot-release-2026-10-13/POST_RELEASE_FIRST.md)
and [boundary sample](../evidence/pages-snapshot-release-2026-10-13/POST_RELEASE_BOUNDARY.md).

This accepts the bounded cache deployment, honest expiry and the named observed
visibility recovery. It does not establish a hard five-minute delivery limit,
all-opening completeness or sustainable daily throughput. Analytics returned no
rows, so CPU and complete runtime-error totals remain UNKNOWN. No source
admission, provider request, schema migration or new clock was introduced.
The prior Pages deployment `e1b0ff66-8a93-41b0-b9c7-6de8346c81c7` remains the
[supported rollback target](../evidence/pages-snapshot-release-2026-10-13/PREFLIGHT_AND_ROLLBACK.md).

Evidence checkpoint `0b39b4aaebb45dba0cb663849b07666ef77e3205` is exactly read
back on both remotes. It repairs Git newline normalization of initially staged
logs; raw log and preflight hashes match their Git blobs. Do not attribute that
evidence-only repair to a runtime change.

NEXT: complete the independently reviewed 0054 jobflow release, observe normal
Workable acquisition and exact publication identities, and retain every
permitted opening before publication limits. MATH remains 0/13; certified
verified daily throughput remains UNKNOWN.
