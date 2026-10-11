# Uncertain effects and withdrawal contract is not a completed flow — 2026-10-10

Local slice of PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT.
This is not production acceptance, a MATH card, a certified daily flow, or
directory enrichment.

## What changed

Readers `uncertainMatchedManilaStillPublicCount` and `uncertainMatchedManilaDayFlowCount`
(with identical aliases `withdrawalSafeManilaStillPublicCount` and `withdrawalSafeManilaDayFlowCount`)
enforce that an intact snapshot pair whose still-public IDs contain unconfirmed
uncertainty markers or are inactive/withdrawn is not a completed Manila-day flow.

- `uncertainMatchedManilaStillPublicCount` delegates upstream invariant evaluation to
  `activeMatchedManilaStillPublicCount` (ensuring source ownership, canonical URL uniqueness,
  PH eligibility, fresh posting within 30 days, and active status) and checks that no ID in
  `pair.stillPublicIds` is present in `uncertainIds`.
- When all 5 IDs remain active and free of unconfirmed uncertainty markers (`uncertainIds: []`),
  `uncertainMatchedManilaStillPublicCount` returns 5.
- If any ID carries an uncertainty marker (e.g. `uncertainIds: [3]`), it fails closed and returns `null`.
- If any ID is inactive or withdrawn (e.g. `activeIds: [1, 2, 4, 5]`), it fails closed and returns `null`.
- `uncertainMatchedManilaDayFlowCount` returns `null` for both `"OPEN"` and caller-supplied `"CLOSED"`
  states, and caller-supplied 100 floor and 150 stretch counts stay absent:
  - `uncertainMatchedManilaDayFlowCount("OPEN", matched)` is `null`, not `matched` and not 0.
  - `uncertainMatchedManilaDayFlowCount("CLOSED", matched)` is `null`.
  - `uncertainMatchedManilaDayFlowCount("OPEN", 100)` is `null`.
  - `uncertainMatchedManilaDayFlowCount("OPEN", 150)` is `null`.
  - `uncertainMatchedManilaDayFlowCount("OPEN", null)` is `null`.
- Exported aliases `withdrawalSafeManilaStillPublicCount` and `withdrawalSafeManilaDayFlowCount`
  reference the identical function implementations and enforce equivalent fail-closed semantics.
- An adversarial test suite in `packages/scraper/adversarial-uncertain-withdrawal.test.ts`
  exercises 8 comprehensive challenge scenarios covering state preservation, inactive withdrawal
  reasons (`publication-unreceipted`, `publication-drift`), subset deactivations, unconfirmed
  uncertainty markers without ledger receipts, flow count invariance across all permutations, and
  alias reference equality.
- The publication ledger stays empty (`COUNT(*) = 0`), the writer was not called (`writerCalled = 0`),
  and no `CLOSED` row was written to `source_publication_manila_open_snapshot`.
  No migration was added. No new clock, source, parameter, provider, or cadence.
  This does not claim MATH-08 and does not record `CLOSED`.

## What stays unchanged

- Unknown dates and null workplace stay on their existing holds.
- A lost ledger acknowledgement still returns `POST_PERSISTENCE_FAILURE` with
  exposure `UNKNOWN` and is not rolled back.
- Unlimited exact-six publication does not use the canary reservation.
- A missing reservation table still fails closed for capped writers. Do not
  deploy the reservation gateway before migration 0057.
- A rejected pair scored with a null matched count stays null, not `UNKNOWN`.
- A missing snapshot pair stays null for a null or zero matched count.
- A known empty id row still reports `UNKNOWN` for an empty supplied book.
- A mismatched count total + 1 or total - 1 stays null.
- The stored snapshot state remains OPEN. No CLOSED row is written.
- Behavior commits `ee782589` (reader implementation and integration test) and
  `96003df0` (adversarial test suite) are on branch `codex/verified-flow-directory-checkpoint`.

## Evidence

Native bun:sqlite. Evaluated in-memory against SQLite fixture databases.

| Check | Result |
| --- | --- |
| Targeted integration test lock (`packages/scraper/publication-gateway.integration.test.ts`) | 303 pass / 0 fail / 2962 expect() / 1 file |
| Adversarial test suite (`packages/scraper/adversarial-uncertain-withdrawal.test.ts`) | 8 pass / 0 fail / 313 expect() / 1 file |
| `bun run typecheck` (`tsc`) | exit 0, zero errors (`apps/web/tsconfig.json`) |
| CI Production guardrails (`check-production-guardrails.ts`) | exit 0, passed |
| CI Parameter parity audit (`audit-parameters.ts`) | exit 0, 100% parity passed |
| CI Orchestrator modifications check (`check-orchestrator-modifications.ts`) | exit 0, passed |
| CI Constitution audit (`audit-constitution.ts`) | exit 0, passed |

## Backup

Behavior commits `ee782589` and `96003df0`.
Primary canonical remote: Google Cloud Secure Source Manager (`origin`), repository
`antigravity-494415/va-freelance-hub`, branch `codex/verified-flow-directory-checkpoint`.
Secondary backup mirror: GitLab (`gitlab`), repository
`cyrus-group4793641/va-freelance-hub`, branch `codex/verified-flow-directory-checkpoint`.
Network git push commands attempted in non-interactive environment:
- `git push origin codex/verified-flow-directory-checkpoint`
- `git push gitlab codex/verified-flow-directory-checkpoint`
Both remotes require interactive credential helper/token input in headless mode.
`BACKUP_PENDING` recorded for external authentication.
Cloud Run, Scheduler, Artifact Registry, Turso, D1, and Cloudflare were unchanged.
