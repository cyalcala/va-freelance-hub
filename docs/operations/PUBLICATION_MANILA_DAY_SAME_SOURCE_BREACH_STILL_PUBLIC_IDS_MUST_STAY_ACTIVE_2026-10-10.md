# Inactive same-source breach id stays absent — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_SAME_SOURCE_BREACH_STILL_PUBLIC_IDS_MUST_STAY_ACTIVE.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`sameSourcePairManilaFamilyStatus` returns null when a recorded id from a
same-source breach leaves `is_active = 1`. Passing the live active id list (4 IDs)
against the 5 recorded rows returns null. Passing the snapshot ids (5 IDs)
against recorded rows filtered to active ids returns null. Passing the live
active id list against active recorded rows with matched count 5 returns null.
Restoring `is_active = 1` returns `BREACH`, not `OK`. The five unlimited We
Work Remotely publishes already succeeded before the reader is called. The
publication writer does not call this reader. No migration was added. No new
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
- An OPEN snapshot whose same-source pair is OK or BREACH is not a completed
  flow.
- A same-source pair whose recorded id leaves `is_active = 1` stays absent
  from `sameSourcePairManilaFamilyStatus`.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. Five We Work Remotely publishes stay unlimited. The open
snapshot state is `OPEN`, its still-public count is 5, and its still-public
ids are those five ids. The table contains no CLOSED row. Three opportunity
sources are `jobicy:admin`, and the other two are `remotive` and `remote-ok`.
`sameSourcePairManilaFamilyStatus` of that initial recorded book is `BREACH`,
not `OK`. Setting `is_active = 0` on one published breach id makes the live
still-public list 4 ids. Passing those live ids with the original recorded
rows returns null. Passing the snapshot ids with active recorded rows returns
null. Passing the live ids with active recorded rows and matched count 5
returns null. Restoring `is_active = 1` returns `BREACH`. No live D1, provider,
or browser proof.

| Check | Result |
| --- | --- |
| Targeted same-source breach active fence | 1 pass / 0 fail / 20 expect() / 276 filtered / 87.98ms |
| Full publication gateway integration suite | 277 pass / 0 fail / 2523 expect() / 23.50s |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |

## Backup

Behavior commit `82352da5cf6706e572008b87df6e3b2e353e6b77`. Parent
`ed1c7c34d38c62c3e160a2ba18e7e1dd36a16124`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. GitLab
was not pushed. `main` was not pushed. GitHub was not probed. Cloud Run,
Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. An OPEN
snapshot whose same-source pair or breach has an inactive id is not yet proven
absent from the completed Manila-day flow count. Directory packets 234 and 237
stay proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_SAME_SOURCE_INACTIVE_IS_NOT_A_FLOW. An OPEN snapshot whose
same-source status is null because an id left active stays absent from
`sameSourcePairManilaDayFlowCount`. Do not certify a production daily flow.
