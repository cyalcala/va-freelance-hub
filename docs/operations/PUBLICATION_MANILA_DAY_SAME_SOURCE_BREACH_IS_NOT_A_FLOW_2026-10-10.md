# Same-source breach is not a flow — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_IS_NOT_A_FLOW.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaDayFlowCount` returns null for an OPEN snapshot whose
same-source pair is a family breach. A caller-supplied `CLOSED` state does not
create a flow. Caller-supplied 100 and 150 stay absent. The result is not the
matched count and not 0. The five unlimited We Work Remotely publishes already
succeeded, and the same-source pair family status was already `BREACH`, before
that reader is called. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
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
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Three opportunity
sources are `jobicy:admin`, and the other two are `remotive` and `remote-ok`.
`sameSourcePairManilaFamilyStatus` of that recorded book is `BREACH`, not `OK`.
`sameSourcePairManilaDayFlowCount` of that OPEN state, that `BREACH` status,
and matched count 5 is null, not 5 and not 0. The same call with `CLOSED`,
and the OPEN calls with 100 and 150, are null. No live D1, provider, or browser
proof.

| Check | Result |
| --- | --- |
| Targeted same-source breach flow fence | 1 pass / 0 fail / 16 expect() / 274 filtered / 106.77ms |
| Full publication gateway integration suite | 275 pass / 0 fail / 2483 expect() / 25.35s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `e37fb26c624d06a090b3a3224b12c8fffaeefb40`. Parent
`4dcfc13ffea85f34177b96e492068997c6ce2bfb`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A same-source
pair whose recorded id leaves `is_active = 1` is not yet proven absent from
the still-public family status. Directory packets 234 and 237 stay proposals.
236 stays parked. No directory SQL. Migrations 0056 through 0068 were not
applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_PAIR_STILL_PUBLIC_IDS_MUST_STAY_ACTIVE. A
same-source pair whose recorded id leaves `is_active = 1` stays absent from
`sameSourcePairManilaFamilyStatus`. Do not certify a production daily flow.
