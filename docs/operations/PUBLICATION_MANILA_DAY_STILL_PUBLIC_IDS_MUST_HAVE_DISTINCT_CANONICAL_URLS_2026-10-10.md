# Still-public ids must have distinct canonical URLs — 2026-10-10

Local slice of
PUBLICATION_MANILA_DAY_STILL_PUBLIC_IDS_MUST_HAVE_DISTINCT_CANONICAL_URLS.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

`canonicalUrlMatchedManilaStillPublicCount` returns the PH-matched number
only when each still-public id has its own canonical source URL.
`canonicalizeSourceUrl` is the shipped identity function. A host-case pair
that folds to one URL returns null. A one-id slice of that pair returns null,
so the reader does not collapse the pair to one survivor and does not prefer
the raw length. The publication writer does not call this reader. No
migration was added. No new clock, source, parameter, provider, or cadence.
This does not claim MATH-09.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- An unknown id pair still reports null, not zero.
- A disagreement between the first-publish count and the id length still
  stays absent.
- A repeated first-publish id still stays absent.
- A distinct foreign first-publish list still stays absent.
- A still-public count that disagrees with its known id length still stays
  absent.
- Still-public ids that differ from the serving rows stay absent.
- An onsite serving match stays absent.
- A stale or unknown original posting stays absent.
- An unresolvable outbound apply URL stays absent.
- An ineligible row stays absent from the PH-matched count.
- A positive PH-matched count on an OPEN snapshot is still not a completed
  flow.
- A positive ledger-matched count on an OPEN snapshot is still not a
  completed flow.
- A positive serving-matched count on an OPEN snapshot is still not a
  completed flow.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- `canonicalizeSourceUrl` still returns an unparseable value unchanged.

## Evidence

Native bun:sqlite. One We Work Remotely publish stays unlimited and inserts
two active PH-eligible rows. The PH-matched still-public count is 2. The
second `source_url` is then set to `https://Example.invalid/canonical-url-a`
while the first stays `https://example.invalid/canonical-url-a`. The unique
index accepts that host-case pair. `canonicalizeSourceUrl` folds both to
`https://example.invalid/canonical-url-a`. The PH-matched count remains 2.
The canonical-URL count of those two rows is null, not 2, not 1, and not 0.
The same snapshot with only the first row is null. Restoring the second URL
to `https://example.invalid/canonical-url-b` makes the canonical-URL count 2.
The table contains no CLOSED row. No live D1, provider, or browser proof.

Before the reader existed, the two URLs already folded to one canonical
value, the PH-matched count was already 2, the CLOSED count was already 0,
and `canonicalUrlMatchedManilaStillPublicCount` was undefined: 0 pass / 1
fail / 13 expect(). The failing assertion was
`expect(typeof canonicalUrlMatchedManilaStillPublicCount).toBe("function")`
at `packages/scraper/publication-gateway.integration.test.ts:3374`.

| Check | Result |
| --- | --- |
| Targeted canonical-URL still-public test | 1 pass / 0 fail / 20 expect() / 252 filtered / 340.00ms |
| `bun x tsc --noEmit -p apps/web/tsconfig.json` | empty stdout and stderr, exit 0 |
| Full suite | 4063 pass / 0 fail / 327640 expect() / 255 files / 145.81s, exit 0 |

The suite gained one test and 20 expects from the prior 4062 / 327620 run.
The typecheck output contains no TypeScript error.

## Backup

Behavior commit `4e6c59c7519c0ecc676e78e6b292e30581c96617`. Parent
`89900151c872c2a7eb95f8fc4d9a56977ce7e9c1`. The push target is Secure Source
Manager `origin`, branch `codex/verified-flow-directory-checkpoint`. `ls-remote`
returned that same SHA. GitLab was not pushed. `main` was not pushed. GitHub
was not probed. Cloud Run, Scheduler, Artifact Registry, Turso, D1, and
Cloudflare were unchanged.

## Still open

Accepted MATH remains 0/13. Certified fresh flow remains UNKNOWN. A positive
canonical-URL match on an OPEN snapshot is not a completed flow. Directory
packets 234 and 237 stay proposals. 236 stays parked. No directory SQL.
Migrations 0056 through 0068 were not applied. The next gap is
PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCH_IS_NOT_A_FLOW. A caller-supplied
CLOSED state does not create a flow, and caller-supplied 100 and 150 stay
absent. Do not record CLOSED, and do not certify a production daily flow.
