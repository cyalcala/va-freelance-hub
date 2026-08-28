# COMP-01D — Residual Greenhouse/Breezy access review

Date: 2026-08-28

Contract baseline: `d4e8a7f`

Status: TERMINAL — KEEP

## Decision and exact scope

Pause the remaining nine enabled `needs_review` ATS identities:

- Greenhouse: `grafanalabs`, `nearform`, `gitlab`, `ghost`, `remotecom`
- Breezy: `20four7va`, `sourcefit`, `vaaphilippines-recruitment`, `time-etc`

This is a reversible policy change only. It does not delete or archive stored
opportunities, alter another source, flip robots enforcement, create/use
credentials, or substitute endpoints.

## Greenhouse official-source review

- Job Board API: https://docs.greenhouse.io/job-board.html
  - Greenhouse states Job Board GET data is publicly available without
    authentication.
  - The same documentation describes access to an organization's offices,
    departments, and published jobs for building that organization's careers
    pages.
- API overview:
  https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview
  - Greenhouse describes the Job Board API as exporting an organization's
    public posts so its developers can build custom career/application sites.
- Integration setup:
  https://support.greenhouse.io/hc/en-us/articles/13446638483355-Create-a-job-board-API-key-for-an-integration
  - This authenticated key workflow supports candidate/application submission;
    it is not a requirement for public GET reads.

The official sources expressly allow unauthenticated public GET reads, but do
not expressly address recurring third-party aggregation or republication. The
five identities therefore pause under this project's stricter fail-closed
policy pending explicit provider terms/clarification, customer permission, or
an approved integration. The record does not claim authentication is required
for GET.

## Breezy official-source review

- Authentication: https://developer.breezy.hr/reference/authorization
  - Breezy requires an Authorization header for every documented v3 request
    except sign-in and health; personal access tokens are recommended for
    automated integrations.

The production adapter reads `https://{token}.breezy.hr/json`, not the
documented authenticated v3 API, and that `/json` route is absent from the
current official API index. Its integration authority is therefore unknown;
the repository also contains no explicit permission. Robots/CORS reachability
of the career-site route does not establish aggregation authority. A previously
cited partner-guide URL was removed after the critic found it non-reproducible;
no conclusion relies on it.

## Implementation and verification

`ATS_TOKEN_POLICIES` now assigns the five Greenhouse identities and four
Breezy identities `enabled: false`, `complianceStatus: "paused"`, and one
reviewed evidence note per provider family. All Ashby and non-target policies
remain unchanged.

Test-first evidence:

- Red: the new focused guard failed on the old enabled/`needs_review` entries
  and missing authority notes.
- Green: both containment guards pass — 5 tests, 0 failures, 56 assertions.
- Full local gate: 649 passed, 0 failed, 1,613 assertions across 72 files;
  strict typecheck, production guardrails, and Astro build passed.

No D1 mutation or source HTTP request occurred during implementation.

## Acceptance evidence

- Fresh independent critic: SHIP, no blockers, after two revision rounds. The
  first review corrected the Greenhouse GET/auth distinction and removed a
  non-reproducible Breezy partner-guide claim; the second strengthened the
  provider-note assertions and refreshed all test evidence.
- Behavior/evidence commit: `a826661`.
- Exact-SHA Sovereign CI Guardrail run `33139365159`: success. Validation,
  tests, build, strict typecheck, Worker validation, D1 migration/integrity,
  and Cloudflare Pages deployment all passed. Deployment completed at
  `2026-08-28T03:37:14Z`.
- First eligible production cycle: `2026-08-28T03:40:09.251Z`. Every one of
  the nine target identities recorded `compliance_status=paused`, all target
  events were skipped, and target real fetches were zero. `breezy:20four7va`
  emitted two skip rows because more than one directory agency resolves to the
  same token; both were policy skips and caused no provider request.
- Unaffected controls in that cycle: `we-work-remotely` and `remotive` each
  completed a real fetch.
- The D1 query was read-only: `changed_db=false`, `changes=0`, and
  `rows_written=0`. No source endpoint was manually invoked.

All COMP-01D acceptance gates pass. Status is TERMINAL — KEEP.

## Re-enable authority

Re-enable only through a separate approved unit after explicit provider terms
or clarification, provider/customer permission, or an approved integration is
documented.
