# COMP-01C — Ashby access-path review and containment evidence

Date: 2026-08-28

Contract baseline: `9b843af`

Status: VERIFYING — local behavior complete; CI/deploy and production D1 evidence pending

## Decision

Pause exactly these five configured identities until Ashby or the represented
customer provides explicit permission or a provisioned partner feed:

- `ashby:supabase`
- `ashby:camunda`
- `ashby:tremendous`
- `ashby:amplify`
- `ashby:ashby`

This is a reversible policy containment. It does not delete or archive existing
opportunities, alter other ATS policies, reinterpret robots HTTP 401 as allow,
or try another endpoint.

## Authoritative source review

- Ashby's Public Job Postings API documentation describes
  `posting-api/job-board/{JOB_BOARD_NAME}` as the endpoint used to retrieve
  postings for an organization and populate that organization's own careers
  page: https://developers.ashbyhq.com/docs/public-job-posting-api
- Ashby's Dedicated Partner Job Feeds documentation describes the supported
  path for partners that ingest jobs: Ashby provisions a partner feed and each
  customer decides whether to opt in:
  https://developers.ashbyhq.com/docs/dedicated-partner-job-feeds

The repository contains neither a provisioned partner feed nor explicit
permission for these five customers. Technical reachability of the public
posting endpoint is therefore insufficient evidence for this third-party
indexing use.

## Production baseline inherited from COMP-01B

The mature post-REL-12 D1 window contained 1,023 real fetches across 20 active
identities. Fifteen identities classified `pass`. Each of the five Ashby
identities produced 35/35 `unknown` robots verdicts because the shared
`https://api.ashbyhq.com/robots.txt` request returned HTTP 401. All baseline
queries were read-only and no source HTTP request was made for this review.

Detailed baseline: `COMP-01B-observation-window-20260824.md`.

## Implementation and regression guard

`ATS_TOKEN_POLICIES` now assigns all five identities `enabled: false`,
`complianceStatus: "paused"`, and one evidence-grounded shared note. The new
focused guard enumerates exactly the five expected Ashby tokens, verifies the
disabled/paused values, and pins the partner-access re-enable condition.

Test-first evidence:

- Red: the focused test failed against the prior enabled/`needs_review`
  policies and absent pause note.
- Green: `bun test apps/web/tests/ashby-source-policy.test.ts` — 2 passed,
  0 failed, 19 assertions.
- Full local gate — 646 passed, 0 failed, 1,576 assertions across 71 files;
  strict typecheck passed; production guardrails passed; Astro server/client
  build and prerender passed.

No D1 mutation or live source request was used during implementation.

## Remaining acceptance gates

- Fresh independent critic: SHIP, no blocking findings. It independently
  confirmed the official-source reading, exact five-token boundary,
  reversibility, and guard-test adequacy. Its non-blocking wording precision
  was applied so the record does not overstate the partner path as exclusive.
- Exact-SHA CI/deploy: pending.
- Bounded post-deploy D1 read: pending. Acceptance requires all five identities
  to emit explicit policy-skip events with zero real fetches after the deploy
  cutoff, while non-Ashby controls continue to fetch.

## Re-enable authority

Keep the identities paused unless a provisioned Dedicated Partner Job Feed or
explicit Ashby/customer permission is recorded. Any re-enable is a separate
approval-gated unit; HTTP 401 alone must never be treated as permission.
