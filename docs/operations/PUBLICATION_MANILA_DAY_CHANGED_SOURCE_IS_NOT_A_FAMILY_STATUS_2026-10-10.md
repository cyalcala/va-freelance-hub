# Changed source is not a family status — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_CHANGED_SOURCE_IS_NOT_A_FAMILY_STATUS.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`publishingSourceManilaFamilyStatus` returns null when a still-public id's
current source is no longer the publishing source. A self-matching book of
that replacement source stays a family breach on the older reader and stays
absent here. The original publishing source on both the id and the book uses
the existing family reader. A blank publishing source stays absent. An empty
id list with a real publishing source and no positive matched count stays
`UNKNOWN`. The unlimited We Work Remotely publish already succeeded before
that status is read. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A self-matching book that is not the snapshot's still-public sources stays
  absent.
- A family breach on an OPEN snapshot is still not a completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The snapshot
publishing source stays `we-work-remotely` after the opportunity source is
updated to `remotive`. The open snapshot state is `OPEN`, its still-public
count is 1, and its still-public ids remain that one id. The table contains
no CLOSED row. `snapshotSourcedManilaFamilyStatus` of the replacement source
is `BREACH`, not `OK`. `publishingSourceManilaFamilyStatus` of the stored
publishing source and that replacement is null, not `BREACH` and not `OK`.
The original publishing source on the id and the book is `BREACH`. A blank
publishing source is null. A null matched count with empty ids and the real
publishing source is `UNKNOWN`. No live D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the snapshot
source was already `we-work-remotely`, the opportunity source was already
`remotive`, the day state was already `OPEN`, the still-public count was
already 1, the CLOSED count was already 0, the snapshot ids were already that
one id, the replacement book was already `BREACH`, and
`publishingSourceManilaFamilyStatus` was undefined: 0 pass / 1 fail / 14
expect(). The failing assertion was
`expect(typeof publishingSourceManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3993`.

| Check | Result |
| --- | --- |
| Targeted changed-source fence | 1 pass / 0 fail / 20 expect() / 266 filtered / 400.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4077 pass / 0 fail / 327886 expect() / 255 files / 148.22s, exit 0 |

The suite gained one test and 20 expects from the prior 4076 / 327866 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `4ee429b5e462d432d6ef4403c49ad561619db513`. Parent
`facf6176fbb3bb9f05737844a28e0580c8e86165`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
caller-supplied publishing source is not yet required to be the snapshot
row's stored source. Directory packets 234 and 237 stay proposals. 236 stays
parked. No directory SQL. Migrations 0056 through 0068 were not applied. The
next gap is PUBLICATION_MANILA_DAY_CLAIMED_SOURCE_IS_NOT_THE_SNAPSHOT_SOURCE.
Passing the replacement as the publishing source stays absent. Do not treat
that claim as the stored snapshot source, and do not certify a production
daily flow.
