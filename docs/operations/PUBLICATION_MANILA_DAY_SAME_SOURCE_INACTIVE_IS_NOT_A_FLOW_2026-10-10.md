# Inactive same-source opportunity is not a flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_INACTIVE_IS_NOT_A_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaDayFlowCount` returns null for an OPEN snapshot whose
same-source family status is null because a recorded opportunity left
`is_active = 1`. A caller-supplied `CLOSED` state does not create a flow.
Caller-supplied 100 and 150 stay absent. A caller-supplied null matched count
stays absent. The result is not the matched count and not 0. The five unlimited
We Work Remotely publishes already succeeded before the reader is called.
The publication writer does not call this reader. No migration was added. No new
clock, source, parameter, provider, or cadence. This does not claim MATH-08
and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- Two of five still-public ids with the same source sit at share 0.4 and stay
  `OK`. Three of five sit at share 0.6 and stay `BREACH`.
- A same-source pair or breach whose recorded id leaves `is_active = 1` stays
  absent from `sameSourcePairManilaFamilyStatus`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Two opportunity
sources are `jobicy:admin`, and the other three are `remotive`, `remote-ok`,
and `real-work-from-anywhere`. Deactivating one opportunity makes the live
still-public list 4 ids. `sameSourcePairManilaFamilyStatus` with those live ids
returns null. `sameSourcePairManilaDayFlowCount` of that OPEN state, that null
status, and matched count 5 is null, not 5 and not 0. The same call with
`CLOSED`, and the OPEN calls with 100, 150, and null, are null. No live D1,
provider, or browser proof.

| Check | Result |
| --- | --- |
| Targeted inactive same-source flow fence | 1 pass / 0 fail / 17 expect() / 277 filtered / 127.89ms |
| Full publication gateway integration suite | 278 pass / 0 fail / 2540 expect() / 26.63s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `fa794c015bcaad48ecaa643f80c65c5c16d5668b`. Parent
`82352da5cf6706e572008b87df6e3b2e353e6b77`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A same-source
pair whose still-public id list contains a duplicate id is not yet proven absent
from the still-public family status. Directory packets 234 and 237 stay proposals.
236 stays parked. No directory SQL. Migrations 0056 through 0068 were not applied.
The next gap is PUBLICATION_MANILA_DAY_SAME_SOURCE_REPEATED_ID_STAYS_ABSENT. A
same-source pair whose still-public id list contains a duplicate id stays absent
from `sameSourcePairManilaFamilyStatus`. Do not certify a production daily flow.
