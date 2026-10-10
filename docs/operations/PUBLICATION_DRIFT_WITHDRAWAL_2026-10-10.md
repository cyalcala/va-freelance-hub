# Publication drift withdrawal — 2026-10-10

Local slice of PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL. This is not production
acceptance, a MATH card, a certified daily flow, or directory enrichment.

## What changed

`withdrawInvalidPublicDrift` deactivates an already-public row when its stored
workplace is `onsite` or `hybrid`, or when its stored original date is outside
the existing inclusive 30-day window (`INVALID`, `FUTURE`, or `STALE`). The
update matches that same id, public eligibility, and the evidence just read.
A date repaired before the write matches zero rows and is not counted. A second
call withdraws nothing. The inactive reason is `publication-drift`, which is
not feed-recoverable.

The existing verify-links cron calls this before its other archive work. No new
clock, source, parameter, provider, or schema was added. A bad observation
instant examines nothing.

## What stays public

- Null workplace with a fresh original date. Absence of a workplace is not a
  remote contradiction and is not remote proof.
- A missing original date. Withdrawing unknown dates would treat historical
  stock as failed freshness.
- Unclear and ineligible rows. This pass does not upgrade or reclassify them.
- An already inactive row keeps its existing reason.
- A public row with no publication ledger. Missing history is not a lost
  acknowledgement. The gateway still returns UNKNOWN when a ledger write fails
  and does not compensate that row.

## Serving bound

Apply uses the existing public predicate. After withdrawal the native Apply
path returns 404 for the onsite row and 302 for the fresh remote control.
The missing-date row still redirects. `validateSnapshotCandidate` still rejects
a 1-job candidate against a 20-job board and leaves that board intact. ADR-010
can keep serving the previous snapshot when a replacement collapses. This slice
does not change that guard.

## Evidence

Native fixture: in-memory bun:sqlite, production migrations, Drizzle, the real
withdrawal, the real Apply handler, and denied network. No live D1, provider,
or browser proof.

| Check | Result |
| --- | --- |
| Native drift test | 2 pass, 61 expect() |
| Verifier budget tests | 4 pass |
| `bun run typecheck` | exit 0 |
| `bun run build` | exit 0; Astro server built in 26.72s; command 38.44s |
| Full suite | 4000 pass / 0 fail / 326936 expect() / 255 files / 137.31s |

The typecheck also required a literal `as const` on the unclear-sweep patch and
`unknown` casts on two fixture `fetch` stubs. Those are type-only.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL. No
production publication or company enrichment. Lost-acknowledgement durability
is the next unit, not this one.
