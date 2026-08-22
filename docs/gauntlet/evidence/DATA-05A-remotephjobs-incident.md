# DATA-05A — remotephjobs.com attribution incident

Date: 2026-08-22

Execution start: `451b76e` (`main` = `origin/main`)

Status: `IN_PROGRESS`

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

## Acceptance still required

- full local G3 verification;
- review/commit/push through the normal repository path;
- CI and deployment run IDs;
- read-only pre/post D1 counts proving the exact cohort changed;
- a scrape response exposing quarantine/anomaly counters;
- an enrichment response with `websiteSet=0` and preserved ATS behavior.
