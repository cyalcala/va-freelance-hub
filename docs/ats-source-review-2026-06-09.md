# ATS Source Review - 2026-06-09

This review records the P4 Slice 3 ATS source-policy decisions. It is an
operational compliance and reliability review, not legal advice.

## Production ATS Baseline

Production D1 had 15 directory rows with `ats_platform` and `ats_token`.

Duplicate token evidence:

| ATS platform | ATS token | Rows | Companies |
| --- | --- | ---: | --- |
| `breezy` | `20four7va` | 2 | `20Four7VA`, `24/7 Virtual Assistant` |

Active opportunity rows after the final accepted Hunter run: 687.

## Decisions

| Platform / source | Decision | Evidence | Operational note |
| --- | --- | --- | --- |
| Breezy ATS JSON | `needs_review`, enabled | Public JSON endpoints returned useful job data for 20Four7VA and Sourcefit. | Keep enabled while routing users to original ATS-hosted URLs; terms still need source-by-source review. |
| Workable ATS JSON | `paused` | Workable returned HTTP 429 during manual Hunter runs `27201519854` and `27201825377`, even after sequential polling. | Do not fetch Workable endpoints until a supported access path or explicit permission exists. |
| Duplicate Breezy token `20four7va` | skipped | `20Four7VA` and `24/7 Virtual Assistant` point to the same Breezy token. | Fetch once under `20Four7VA`; report `24/7 Virtual Assistant` as skipped to avoid duplicate requests and source URLs. |
| Lever/Greenhouse ATS JSON | `needs_review`, enabled in policy | No current production directory rows use these platforms. | Keep policy scaffolding ready, but every future source still needs source-specific review. |

## Implementation Evidence

- Product commits:
  - `e3714d8` - `fix: dedupe duplicate ats source fetches`
  - `3256127` - `fix: throttle ats source polling`
  - `95e6665` - `fix: pause rate limited workable ats sources`
- CI:
  - `27201438015` passed for the duplicate-fetch fix.
  - `27201742135` passed for the throttle fix.
  - `27202145473` passed for the Workable pause fix.
- Deployment:
  - final Cloudflare Pages deployment: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Final manual Hunter run:
  - run `27202221523` passed.
  - response reported `failedSources: []`.
  - Breezy results:
    - `20Four7VA`: 61 items.
    - `Sourcefit`: 67 items.
    - `VAA Philippines`: 0 items.
  - Workable directory rows were reported as `skipped: true` with
    `complianceStatus: "paused"`.
  - `24/7 Virtual Assistant` was reported as `skipped: true` because the
    `20four7va` Breezy token was already fetched for `20Four7VA`.
  - `insertFailedBatches: 0`
  - `insertErrors: []`
- D1 read-only evidence:
  - active opportunity count remained 687.
  - read-only count query changed 0 rows.

## Follow-Up

P5 should decide how to treat historical jobs from now-paused sources. P4 stops
new risky/noisy collection; it does not automatically archive existing rows.
