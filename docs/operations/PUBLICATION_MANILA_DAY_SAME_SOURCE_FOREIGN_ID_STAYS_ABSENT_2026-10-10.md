# Foreign still-public id in same-source pair stays absent — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_FOREIGN_ID_STAYS_ABSENT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` returns null when a caller-supplied
still-public id list contains a foreign id that was never in the recorded
rows (e.g., id + 999). Passing the snapshot ids against recorded rows containing
a foreign id returns null. Restoring the original matching distinct positive
ids returns `OK`. The five unlimited We Work Remotely publishes already succeeded
before the reader is called. The publication writer does not call this reader.
No migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Two of five still-public ids with the same source sit at share 0.4 and stay
  `OK`. Three of five sit at share 0.6 and stay `BREACH`.
- An OPEN snapshot whose same-source pair is OK, BREACH, or null is not a
  completed flow.
- A same-source pair or breach whose recorded id leaves `is_active = 1` stays
  absent from `sameSourcePairManilaFamilyStatus`.
- Duplicate or non-positive still-public ids stay absent from
  `sameSourcePairManilaFamilyStatus`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Two opportunity
sources are `jobicy:admin`, and the other three are `remotive`, `remote-ok`,
and `real-work-from-anywhere`. `sameSourcePairManilaFamilyStatus` with the
recorded ids is `OK`. Supplying a 5-element still-public list with a foreign id
makes `sameSourcePairManilaFamilyStatus` null. Supplying recorded rows with a
foreign id makes the reader null. Restoring the original matching id list
returns `OK`. No live D1, provider, or browser proof.

| Check | Result |
| --- | --- |
| Targeted foreign id fence | 1 pass / 0 fail / 17 expect() / 282 filtered / 137.43ms |
| Full publication gateway integration suite | 283 pass / 0 fail / 2627 expect() / 22.96s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `8a5ad157ecffb4a2bf10842e4313f0402b88aa0b`. Parent
`bde8be9eeec841b8c0a53b51b75df9c01192db63`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A same-source
breach whose still-public id list contains a foreign id is not yet proven absent
from the still-public family status. Directory packets 234 and 237 stay proposals.
236 stays parked. No directory SQL. Migrations 0056 through 0068 were not applied.
The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_FOREIGN_ID_STAYS_ABSENT. A same-source
breach whose still-public id list contains a foreign id stays absent from
`sameSourcePairManilaFamilyStatus`. Do not certify a production daily flow.
