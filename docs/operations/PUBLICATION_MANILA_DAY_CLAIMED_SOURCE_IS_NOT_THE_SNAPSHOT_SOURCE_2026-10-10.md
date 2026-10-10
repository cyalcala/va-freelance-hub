# Claimed source is not the snapshot source — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_CLAIMED_SOURCE_IS_NOT_THE_SNAPSHOT_SOURCE.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`storedPublishingSourceManilaFamilyStatus` returns null when the claimed
publishing source is not the snapshot row's stored source. Passing the
replacement source as the publishing source stays a family breach on the
older reader and stays absent here. The stored source on both sides uses the
existing family reader. A blank stored source stays absent. An empty id list
with the stored source and no positive matched count stays `UNKNOWN`. The
unlimited We Work Remotely publish already succeeded before that status is
read. The publication writer does not call this reader. No migration was
added. No new clock, source, parameter, provider, or cadence. This does not
claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A still-public id whose current source is no longer the publishing source
  stays absent.
- A family breach on an OPEN snapshot is still not a completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The snapshot
source stays `we-work-remotely` after the opportunity source is updated to
`remotive`. The open snapshot state is `OPEN`, its still-public count is 1,
and its still-public ids remain that one id. The table contains no CLOSED
row. `publishingSourceManilaFamilyStatus` of the claimed replacement source
is `BREACH`, not `OK`. `storedPublishingSourceManilaFamilyStatus` of the
stored source and that claim is null, not `BREACH` and not `OK`. The stored
source on both sides, with the original id, is `BREACH`. A blank stored
source is null. A null matched count with empty ids and the stored source is
`UNKNOWN`. No live D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the snapshot
source was already `we-work-remotely`, the opportunity source was already
`remotive`, the day state was already `OPEN`, the still-public count was
already 1, the CLOSED count was already 0, the snapshot ids were already that
one id, the claimed replacement was already `BREACH`, and
`storedPublishingSourceManilaFamilyStatus` was undefined: 0 pass / 1 fail /
14 expect(). The failing assertion was
`expect(typeof storedPublishingSourceManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:4040`.

| Check | Result |
| --- | --- |
| Targeted claimed-source fence | 1 pass / 0 fail / 20 expect() / 267 filtered / 361.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4078 pass / 0 fail / 327906 expect() / 255 files / 140.10s, exit 0 |

The suite gained one test and 20 expects from the prior 4077 / 327886 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `7a9330b27177128eda3894964ae1d4f262ccd33e`. Parent
`ad133bf060eaaeafb6d841adcd736adeac36b1ea`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A family
breach from the stored publishing source on an OPEN snapshot is not yet
fenced by its own flow reader. Directory packets 234 and 237 stay proposals.
236 stays parked. No directory SQL. Migrations 0056 through 0068 were not
applied. The next gap is
PUBLICATION_MANILA_DAY_STORED_FAMILY_BREACH_IS_NOT_A_FLOW. That breach stays
absent from a completed flow. Do not return it as a daily count, and do not
certify a production daily flow.
