# Snapshot ids are required for a family status — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_FAMILY_STATUS_REQUIRES_SNAPSHOT_IDS.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`snapshotSourcedManilaFamilyStatus` returns null when the supplied book is
not the source counts of the snapshot's still-public opportunity ids. A
self-matching Remotive book stays a family breach on the older reader and
stays absent for the published We Work Remotely id. The book built from that
id's stored source uses the existing family reader. A different id stays
absent. An empty id list with no positive matched count stays `UNKNOWN`. The
unlimited publish already succeeded before that status is read. The
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
- A caller-supplied book that is not the published source counts stays absent.
- A family breach on an OPEN snapshot is still not a completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The stored
opportunity source is `we-work-remotely`. The open snapshot state is `OPEN`,
its still-public count is 1, and its still-public ids are that one id. The
table contains no CLOSED row. `publishedManilaFamilyStatus` of a self-matching
Remotive book is `BREACH`, not `OK`. `snapshotSourcedManilaFamilyStatus` of
the published id and that Remotive book is null, not `BREACH` and not `OK`.
The same id with the stored We Work Remotely source is `BREACH`. A different
id is null. A null matched count with empty ids is `UNKNOWN`. No live D1,
provider, or browser proof.

Before the reader existed, the publish was already unlimited, the stored
source was already `we-work-remotely`, the day state was already `OPEN`, the
still-public count was already 1, the CLOSED count was already 0, the
snapshot ids were already that one id, the self-matching Remotive book was
already `BREACH`, and `snapshotSourcedManilaFamilyStatus` was undefined: 0
pass / 1 fail / 12 expect(). The failing assertion was
`expect(typeof snapshotSourcedManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3946`.

| Check | Result |
| --- | --- |
| Targeted snapshot-id family fence | 1 pass / 0 fail / 18 expect() / 265 filtered / 352.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4076 pass / 0 fail / 327866 expect() / 255 files / 157.08s, exit 0 |

The suite gained one test and 18 expects from the prior 4075 / 327848 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `95a1323b71ddb587574ded810862cdd9a72ec036`. Parent
`66695d5137878959004e022a9b65c46f9b9f5c93`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
still-public id whose current source is no longer the publishing source is
not yet fenced out of a family status. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_CHANGED_SOURCE_IS_NOT_A_FAMILY_STATUS. A replacement
source stays absent. Do not treat that self-matching book as the published
family status, and do not certify a production daily flow.
