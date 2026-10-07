# Pigment & Paper production acceptance — October 8, 2026

Status: frontend implementation, verification, GitHub backup and live release
complete (five of five checkpoints, 100% by checkpoint count). This does not
reclassify source-perpetuity units, GCP cutover or database recovery readiness.

## Release and recovery

Owner-directed watercolor/shade/company-mark revision was independently approved
at `20e656fa1dff951ced31101f97fc749aa56526b9`. Implementation
[PR #224](https://github.com/cyalcala/va-freelance-hub/pull/224) merged normally to
runtime SHA `e29d9905f1b7b85bb8cb7d8747377812ecd71e56`.
[Required PR CI](https://github.com/cyalcala/va-freelance-hub/actions/runs/37685463212)
passed 3,023 tests / zero failures, 15 Python tests, audits, build, typecheck and
Linux offline checks. Its checkout artifact uses the synthetic PR merge SHA
`4fcf1fa74a0c5efa5301e7b50b50149d167e74a6`; [receipt](evidence/pigment-pr-ci-offline.json).

[Exact-SHA main release](https://github.com/cyalcala/va-freelance-hub/actions/runs/37685745355)
passed validation and deployed [Pages 28dadacb](https://28dadacb.remotejobs-ph.pages.dev)
at 20:57:46 UTC on October 7 (04:57:46 Philippine time on October 8).
[Production](https://remotejobs-ph.pages.dev/) was subsequently rendered and tested.
Main was remotely verified at the runtime SHA before acceptance documentation.
The Vercel account-level external status was failed; it is not the production
Pages deployment. No protection/check was bypassed or account setting changed.

Pre-edit source savepoint remains remotely verified:
`savepoint/pre-pigment-paper-2026-10-08` →
`2661cbb6a8bdb815bef58241a1ec7c45a20c1cab` (annotated tag object
`642a7996fd8ae0b1945711b604956582ebc8b2f4`). Restore into a new branch, preserving
shared main and unrelated work. The earlier pre-premium tag is retained. Git is
source/recovery history, not a D1/Turso/GCP state-restoration receipt.

## Runtime and browser acceptance

The release [capture receipt](evidence/pigment-release-capture.json) refreshed
the deployable fallback from the serving snapshot: 1,516 jobs, 735 companies,
generated `2026-10-07T20:09:39.969Z`, SHA-256
`99ae7b087128befb3189042a6df00ec014865337810de2fe20a4cf8f26374661`.
[Release offline receipt](evidence/pigment-release-offline.json) verifies readable
no-D1 routes and guarded Apply. These artifacts were downloaded from the exact-SHA
release; no governance thresholds or source permissions were relaxed.

[Initial live HTTP](evidence/pigment-live-http.json) returned eleven routes and
both stylesheets 200, with mixed genuine stale/fresh serving states during refresh.
[Recovered live HTTP](evidence/pigment-live-http-recovered.json) at 21:00:12 UTC
returned every inspected data page fresh, eleven routes and both stylesheets 200.
Generated snapshot time is recorded in each route receipt. Legal pages have no
board-state header. There are zero hydrated islands and no external client script
references; the logo failure handler is small inline JavaScript. No live Apply
counter was incremented as a diagnostic.

Live browser at 1440 and 390 shows the new local watercolor asset, paper depth,
display typography and actual MultiplyMii/Sourcefit/GitLab marks. Unknown employers
retain initials. No horizontal overflow was measured. Home search on mobile
submits `/opportunities?q=assistant` and returns 139 current results with range
1–30. Live screenshots: [desktop](evidence/pigment-live-home-1440.png),
[mobile](evidence/pigment-live-home-390.png), [search](evidence/pigment-live-search-390.png).
Temporary browser viewport overrides were reset; production is left open.

[Local review](PIGMENT_PAPER_2026_REVIEW.md) owns the broader responsive, keyboard,
contrast, offline and performance evidence/limits. [Provenance](PIGMENT_PAPER_2026_PROVENANCE.md)
records artwork, font sources and SlopMonster. Draft and final copy checks both
scored 5/5; the second-family Claude edit was not completed because authentication
expired. Jev also returned 401. Neither unavailable advisory was treated as
approval. Root direct judgment, tests and independent code review supplied the
acceptance. Field Core Web Vitals and a full assistive-technology audit remain
unmeasured; no claim of universal logo coverage or confirmed hiring is added.

No next implementation action is required for this revision. Future visual
feedback starts from this saved version; source/GCP operational work retains its
separate existing queue and acceptance predicates.
