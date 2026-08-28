# COMP-01D — Residual Greenhouse/Breezy access review

Date: 2026-08-28

Contract baseline: `d4e8a7f`

Status: VERIFYING — local behavior complete; critic, CI/deploy, and production evidence pending

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

## Remaining acceptance gates

- Fresh independent critic: SHIP, no blockers, after two revision rounds. The
  first review corrected the Greenhouse GET/auth distinction and removed a
  non-reproducible Breezy partner-guide claim; the second strengthened the
  provider-note assertions and refreshed all test evidence.
- Exact-SHA CI and Cloudflare Pages deployment.
- First eligible post-deploy D1 cycle: nine explicit paused skips, zero real
  fetches for the nine identities, and unaffected real-fetch controls. Query
  must remain read-only.

## Re-enable authority

Re-enable only through a separate approved unit after explicit provider terms
or clarification, provider/customer permission, or an approved integration is
documented.
