# REL-09 — verifier external-subrequest budget

Date: 2026-08-22

Status: `TERMINAL — KEEP AFTER REVISE`

## Confirmed platform boundary

- Cloudflare Workers Free permits 50 external subrequests per invocation.
- Each redirect hop counts against that limit. Pages Functions use the Workers
  plan limits.
- Authoritative references:
  [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
  and [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/).

## Reproduction and revision trail

- Baseline production verifier run `32542676422` selected 120 rows but returned
  only 49 successes and 71 network failures. The workflow remained green,
  reproducing the structural watermelon risk.
- Initial commit `3d2fa5e` clamped selection to 40, surfaced requested/budget/
  deferred/backlog/platform-failure counters, and added a workflow failure
  gate. CI/migration/deploy run `32556525363` passed.
- First 40-row canary `32556586281` passed 40/40 with zero platform failures.
- Second 40-row canary `32556609049` disconfirmed the assumption: 35 succeeded
  and 5 were explicitly classified as platform-budget failures. The workflow
  correctly failed. This triggered the unit's redirect stop condition and the
  implementation was revised rather than accepted.
- Corrective commit `137a3ff` manually accounts redirects, follows at most one
  hop per row, and selects 20 rows. Worst case is therefore 40 external fetches,
  retaining ten requests of headroom. A second redirect is treated
  conservatively as transient and never adds a dead-link strike.
- CI/migration/deploy run `32556741237` passed for the corrective commit.

## Acceptance evidence

- Focused verification: 6 tests passed, including selection clamping,
  worst-case budget arithmetic, one-hop redirect accounting, rotation, and
  platform-limit error classification.
- Fresh local G3 after the revision: `bun run test` passed 461 tests with 1,026
  assertions and zero failures; `bun run typecheck`, `bun run build`, and
  `bun run audit:guardrails` passed.
- Live rotation 1, run `32556799462`: budget 20, attempted 20, succeeded 20,
  failed 0, platform-budget failures 0, backlog 1,268, deferred 1,248.
- Live rotation 2, run `32556821369`: budget 20, attempted 20, succeeded 20,
  failed 0, platform-budget failures 0, backlog 1,267, deferred 1,248. It also
  conservatively deactivated one geo-ineligible row, proving the deep-scan path
  remained active.
- Read-only D1 after both rotations: 1,267 active rows, zero never-verified
  rows, oldest verification `2026-08-17T01:13:25.398Z`, newest verification
  `2026-08-22T06:23:05.067Z`, and query metadata `changed_db=false`.
- Measured throughput: about 32 days for one complete active-row sweep at 20
  rows per run and two scheduled runs per day. Increasing the per-run item
  budget is not authorized; any SLA improvement requires a separate scheduler
  or architecture decision.

## Terminal handoff

- Decision: `KEEP AFTER REVISE`.
- Base/head: DATA-05A acceptance `76fa550`; initial behavior `3d2fa5e`;
  operating-mandate archive update `2150cd4`; accepted corrective behavior
  `137a3ff`; branch `main`.
- Files changed: verifier route, verifier attempt helpers, focused budget and
  rotation tests, and the verifier workflow summary/gates.
- Mixed-commit disclosure: concurrent staging caused the initial behavior
  commit `3d2fa5e` to include the then-untracked operating-mandate archive.
  The archive was preserved and later updated separately by `2150cd4`; the
  corrective behavior commit `137a3ff` used an explicit path-only boundary.
- Preserved behavior: oldest-first rotation, exact attempt accounting,
  three-strike semantics, auth, stale archive, geo page scan, and conservative
  treatment of infrastructure/network failures.
- Remaining REL-09 acceptance items: none.
- Rollback: revert `137a3ff` and `3d2fa5e` only if verifier correctness
  regresses; never restore the 120-row limit.
- Next exact action: execute SEC-03 exact-host-or-dot-subdomain trust matching
  from synchronized clean `main`.
- Recommended capability: TypeScript security executor comfortable enumerating
  trusted-host call sites and adversarial hostname fixtures.
