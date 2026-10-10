# Repeated snapshot ids do not agree — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_DUPLICATE_IDS_DO_NOT_AGREE. This is not
production acceptance, a MATH card, a certified daily flow, or directory
enrichment.

## What changed

`distinctAgreedManilaSnapshotIdCount` returns the shared number only when the
snapshot count and the known id length already agree and the id list has no
repeated id. A repeated id returns null. The raw-length reader still returns
the matching length, and this reader does not prefer that length or the
distinct length. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-08.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A disagreement between the snapshot count and the id length still stays
  absent.
- An open count is still not a completed Manila-day flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. That
snapshot's ids are distinct, and the distinct agreed count is that shared
number. A later OPEN snapshot records `first_publish_count` 2 with id list
`[9001, 9001]`. The raw-length reader returns 2. The distinct set size is 1.
The distinct agreed count is null, not 2, not 1, and not the older distinct
count. The table contains no CLOSED row. No live D1, provider, or browser
proof.

Before the reader existed, the raw agreed count was already 2 and the id list
already repeated 9001, and `distinctAgreedManilaSnapshotIdCount` was
undefined: 0 pass / 1 fail / 18 expect(). The failing assertion was
`expect(typeof distinctAgreedManilaSnapshotIdCount).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:2865`.

| Check | Result |
| --- | --- |
| Targeted duplicate-id test | 1 pass / 0 fail / 23 expect() / 241 filtered / 354.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | exit 0, empty stdout and stderr |
| Full suite | 4052 pass / 0 fail / 327423 expect() / 255 files / 153.50s |

The suite gained one test and 23 expects from the prior 4051 / 327400 run.
The typecheck output contains no TypeScript error. The suite process exit
code was not captured from the redirected process handle; the runner summary
is the recorded result.

## Backup

Behavior commit `c813f7119e751d943e338b11f04bc8a2b4ee65a1`. Parent
`3b11591ded7d3e0c3732bd8498ef24b9be9da9e4`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A distinct
id list of the matching length can still name jobs that are not the day's
ledger first publishes. Directory packets 234 and 237 stay proposals. 236
stays parked. No directory SQL. Migrations 0056 through 0068 were not
applied. The next gap is PUBLICATION_MANILA_DAY_AGREED_IDS_MUST_MATCH_LEDGER.
When the known ids are not the ledger's first-publish ids for that Manila
day, the agreed count stays absent. Do not prefer the snapshot length or the
ledger length, and do not certify a production daily flow.
