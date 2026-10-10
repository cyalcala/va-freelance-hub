# Foreign id in a same-source breach is not a flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_FOREIGN_ID_IS_NOT_A_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaDayFlowCount` already returned null for every sane status.
The new integration test locks that result on the real unlimited publish path.
An OPEN snapshot whose same-source family status is null because the
still-public id list for a source-share breach contains a foreign id stays
absent from the completed Manila-day flow count. The flow count is null, not
the matched count and not 0. A caller-supplied `CLOSED` state does not create
a flow. Caller-supplied 100, 150, and null matched counts stay absent. The
five unlimited We Work Remotely publishes already succeeded before the reader
is called. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not
claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Three of five recorded still-public ids with the same source stay a family
  `BREACH`. A foreign id in that still-public list stays absent from
  `sameSourcePairManilaFamilyStatus`.
- A genuinely empty supplied book with a null matched count stays `UNKNOWN`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The breach
book is three `jobicy:admin` rows plus `remotive` and `remote-ok`. Replacing
the fifth still-public id with a foreign id makes
`sameSourcePairManilaFamilyStatus` null. `sameSourcePairManilaDayFlowCount` of
that OPEN state, that null status, and matched count 5 is null, not 5 and not
0. The same call with `CLOSED`, and the OPEN calls with 100, 150, and null,
are null. The writer is not called with the reader. No live D1, provider, or
browser proof.

The first full-suite run on the behavior commit was 4093 pass / 3 fail. Three
canary promotion fixtures stamped the newest shadow observation at
`Date.now()`. `julianday('now')` can still treat that stamp as future, so the
promotion guard counted one more id than the sample and aborted. `db.exec`
did not surface that abort, and the assertion saw `operational_state`
`shadow`. Commit `75ddeee4b01c95798da5e41c0130a0740e769b29` backdates that
stamp five seconds. The seven-day span and two-day freshness checks stay in
place. No production promotion policy changed.

| Check | Result |
| --- | --- |
| Targeted breach-foreign flow fence | 1 pass / 0 fail / 16 expect() / 285 filtered / 193.36ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full regression suite after the canary stamp fix | 4096 pass / 0 fail / 328248 expect() / 255 files / 188.78s |

## Backup

Behavior commit `0525bb1fcb54f5c68b17d972868af324a8d7d6ef`. Parent
`532e353f8d177b4ff048cd369192aedb70cc0ea9`. The green suite also includes canary fixture commit
`75ddeee4b01c95798da5e41c0130a0740e769b29`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A stored
snapshot id row whose still-public id sits outside the first-publish set is
not yet proven absent from an empty-book `UNKNOWN`. Directory packets 234 and
237 stay proposals. 236 stays parked. No directory SQL. Migrations 0056
through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_REJECTED_SNAPSHOT_IDS_ARE_NOT_AN_EMPTY_BOOK. A loaded
pair with `idsKnown` false must not be scored as an empty same-source book.
That status is null, not `UNKNOWN`. Direct
`sameSourcePairManilaFamilyStatus(null, [], [], [])` stays `UNKNOWN`. An
intact five-id breach book stays `BREACH`. Do not certify a production daily
flow.
