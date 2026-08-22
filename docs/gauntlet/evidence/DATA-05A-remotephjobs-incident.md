# DATA-05A — remotephjobs.com attribution incident

Date: 2026-08-22

Execution start: `451b76e` (`main` = `origin/main`)

Status: `TERMINAL — KEEP`

## Ownership and compliance boundary

- `remotejobs-ph.pages.dev` is VA Freelance Hub's production site.
- `remotephjobs.com` is an external site and is not owned by this project.
- The external hostname is neither globally trusted nor globally banned. It may
  be indexed only through a permissible public-source path under the existing
  compliance policy.
- Same-source links on that hostname remain eligible. A link on that hostname
  supplied by a different source is not attributable and falls back to the
  original source listing.

## Preserved read-only incident evidence

The owner-provided production inventory identified eight directory companies
whose website was set to `https://remotephjobs.com`: Alpaca, Xapo Bank,
Metabase, CoinMarketCap, Instrumentl, Bobtail, Maven Clinic, and APEX TRADE.
It also identified application URLs on that hostname attached to opportunities
whose source URLs belonged to RemoteOK, Real Work From Anywhere, Greenhouse,
and other sources. The inventory query changed zero rows.

Fresh SELECT-only D1 pre-migration counts at execution time:

- cross-source application rows eligible for fallback repair: 169;
- reviewed directory assignments eligible for clearing: 8;
- current same-source `remotephjobs.com` application rows: 0 (the code and
  migration nevertheless preserve this valid case);
- D1 metadata: `changed_db=false`, `rows_written=0`.

DNS checked during execution returned an SOA response but no A/AAAA address for
`remotephjobs.com`; `remotejobs-ph.pages.dev` returned Cloudflare A/AAAA
addresses. DNS state is time-sensitive and is not used as an ownership test or
as the repair predicate.

## Root cause and containment

1. URL sanitation proved protocol safety but not source attribution.
2. Active writers accepted cross-host application links.
3. The click route trusted any stored, syntactically safe application URL.
4. Directory enrichment promoted the first job hostname not present in a fixed
   aggregator list into canonical company data.

Containment uses source-host attribution at every writer, click-time fallback
for legacy rows, removal of all automatic job-to-company website inference,
and repeated cross-company host telemetry. The repair migration uses current-
value predicates: it changes cross-source application URLs to `source_url` and
clears only the eight named directory assignments while preserving same-source
`remotephjobs.com` rows.

## Acceptance evidence

- Base/head: `451b76e` -> behavioral commit `b824600`; branch `main`.
  Automation then advanced the clean synchronized tree to `d269755` with the
  generated enrichment digest.
- Fresh local G3 at `d269755`: `bun run test` passed 457 tests with 1,210
  assertions and zero failures; `bun run typecheck`, `bun run build`, and
  `bun run audit:guardrails` passed on 2026-08-22.
- CI/release: run `32555307405` passed validation, tests, guardrails, build,
  typecheck, migration `0031`, FTS integrity, and Cloudflare Pages deployment.
- Read-only post-migration D1 evidence: exact-host cross-source rows remaining
  `0`; reviewed directory assignments remaining `0`; all eight reviewed rows
  have a null website plus the incident note; migration `0031` is recorded;
  query metadata reported `changed_db=false` and `rows_written=0`.
- First post-deploy enrichment: run `32555452346` returned HTTP 200 with
  `websiteSet=0`, `hiringPageSet=0`, and zero errors. ATS set-once behavior is
  preserved by the focused fixture, which still proves `hiringPageSet=1`.
- Bounded scrape acceptance: manual Hunter run `32556180387` completed with
  `quarantinedApplicationUrls=0`, `anomalousApplicationHosts=[]`, 42/42 fetch
  events recorded, zero failed sources, and zero failed insert batches. Two
  earlier acceptance attempts (`32555450731`, `32556110039`) correctly returned
  `run-lock-held` and were not treated as scrape evidence.
- Same-source `remotephjobs.com` preservation is covered by both URL and
  migration fixtures; no such production row existed before or after repair.

## Terminal handoff

- Decision: `KEEP`.
- Files changed: the shared URL boundary and exports, scrape/direct/Inngest
  writers, click resolution, directory enrichment, migration `0031`, focused
  tests, and this unit's directly coupled recovery documents.
- Evidence status: production containment and exact incident repair verified;
  broader directory provenance remains intentionally deferred to DATA-05B.
- Assumption preserved: an external hostname is neither owned nor globally
  banned; attribution is evaluated per source relationship.
- Remaining DATA-05A acceptance items: none.
- Blocker/stop condition: none triggered.
- Rollback point: parent of `b824600`; never restore heuristic website writes
  without DATA-05B-grade provenance.
- Next exact action: execute REL-09 verifier budget safety from a freshly
  synchronized clean `main`.
- Recommended capability: bounded TypeScript/Cloudflare executor comfortable
  reproducing subrequest ceilings and distinguishing platform exhaustion from
  target failure.
