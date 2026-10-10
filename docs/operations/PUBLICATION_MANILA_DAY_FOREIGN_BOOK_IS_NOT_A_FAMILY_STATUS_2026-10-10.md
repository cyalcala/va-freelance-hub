# Foreign book is not a family status — 2026-10-10

Local slice of PUBLICATION_MANILA_DAY_FOREIGN_BOOK_IS_NOT_A_FAMILY_STATUS.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`publishedManilaFamilyStatus` returns null when the supplied source book is
not the published still-public source counts. The folded four-row book stays
a family breach on its own and stays absent as the one published job's family
status. The same published book on both sides uses the existing family
reader. A matched count that disagrees with that book stays absent. An empty
book with no positive matched count stays `UNKNOWN`. The unlimited We Work
Remotely publish already succeeded before that status is read. The
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
- A family breach on an OPEN snapshot is still not a completed flow.
- A source-share OK book can still be a family breach. Unprefixed Jobicy
  feeds still do not fold.
- The stored snapshot state remains OPEN. No CLOSED row is written.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited. The stored
opportunity source is `we-work-remotely`. The open snapshot state is `OPEN`
and its still-public count is 1. The table contains no CLOSED row. The folded
book of `jobicy:admin`, `jobicy:support`, `we-work-remotely`, and `remotive`
has family status `BREACH`, not `OK`. The one published source also has
family status `BREACH`. `publishedManilaFamilyStatus` of the published book
against the folded book is null, not `BREACH` and not `OK`. The same
published book on both sides, with the still-public count, is `BREACH`. That
published book with matched count 4 is null. A null matched count with two
empty books is `UNKNOWN`. No live D1, provider, or browser proof.

Before the reader existed, the publish was already unlimited, the stored
source was already `we-work-remotely`, the day state was already `OPEN`, the
still-public count was already 1, the CLOSED count was already 0, both family
reports were already `BREACH`, and `publishedManilaFamilyStatus` was
undefined: 0 pass / 1 fail / 11 expect(). The failing assertion was
`expect(typeof publishedManilaFamilyStatus).toBe("function")` at
`packages/scraper/publication-gateway.integration.test.ts:3905`.

| Check | Result |
| --- | --- |
| Targeted foreign-book fence | 1 pass / 0 fail / 17 expect() / 264 filtered / 312.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4075 pass / 0 fail / 327848 expect() / 255 files / 140.93s, exit 0 |

The suite gained one test and 17 expects from the prior 4074 / 327831 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `4ff2da3f2d1bce97e8d22a6d48faca7775fba679`. Parent
`c12972f32de29c2e660da3ef2bdd53b2acd07ab0`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A
self-matching caller-supplied book is not yet required to be the snapshot's
still-public opportunity sources. Directory packets 234 and 237 stay
proposals. 236 stays parked. No directory SQL. Migrations 0056 through 0068
were not applied. The next gap is
PUBLICATION_MANILA_DAY_FAMILY_STATUS_REQUIRES_SNAPSHOT_IDS. A book that does
not match those ids stays absent. Do not treat a self-matching foreign source
as the published job's family status, and do not certify a production daily
flow.
