# Changes — PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT

## Files Modified

### 1. `packages/scraper/manila-day.ts`
- Implemented and exported `uncertainMatchedManilaStillPublicCount`:
  - Chains to `activeMatchedManilaStillPublicCount` for the underlying 8-stage active matching pipeline.
  - Returns `null` if matched count is `null` or if `pair` is absent.
  - Checks if any still-public ID (`pair.stillPublicIds`) is present in `uncertainIds`; if so, returns `null`.
  - Otherwise returns `matched`.
  - Exported alias `withdrawalSafeManilaStillPublicCount = uncertainMatchedManilaStillPublicCount`.
- Implemented and exported `uncertainMatchedManilaDayFlowCount`:
  - Returns `null` if `dayState.length === 0`.
  - Returns `null` if `matchedCount !== null && !Number.isSafeInteger(matchedCount)`.
  - Unconditionally returns `null` for `"OPEN"`, `"CLOSED"`, or any integer counts (100, 150), preserving the invariant that open-day readers lack closed-day ledger evidence and callers cannot fabricate completed publication flows.
  - Exported alias `withdrawalSafeManilaDayFlowCount = uncertainMatchedManilaDayFlowCount`.

### 2. `packages/scraper/publication-gateway.integration.test.ts`
- Added and refined integration test:
  `"an intact snapshot pair with active matched ids that are uncertain or withdrawn is not a completed Manila-day flow"`
  - Configures an intact snapshot pair with 5 known IDs (`[1, 2, 3, 4, 5]`) in SQLite.
  - Verifies that when all 5 IDs remain active and `uncertainIds` is empty (`[]`), `uncertainMatchedManilaStillPublicCount` returns 5 (and alias `withdrawalSafeManilaStillPublicCount` returns 5).
  - Verifies that when any ID is in `uncertainIds` (e.g. `[3]`), `uncertainMatchedManilaStillPublicCount` returns `null` (and alias returns `null`).
  - Verifies that when an ID leaves `activeIds` (e.g. deactivated `[1, 2, 4, 5]`), `uncertainMatchedManilaStillPublicCount` returns `null` (and alias returns `null`).
  - Verifies `uncertainMatchedManilaDayFlowCount("OPEN", matched)` is `null`, and is neither `matched` nor `0`.
  - Verifies `uncertainMatchedManilaDayFlowCount("CLOSED", matched)` is `null`.
  - Verifies `uncertainMatchedManilaDayFlowCount("OPEN", 100)` is `null`.
  - Verifies `uncertainMatchedManilaDayFlowCount("OPEN", 150)` is `null`.
  - Verifies `uncertainMatchedManilaDayFlowCount("OPEN", null)` is `null`.
  - Verifies identical behavior on `withdrawalSafeManilaDayFlowCount`.
  - Verifies publication ledger stays empty (`COUNT(*) = 0`), writer mock is not called (`writerCalled = 0`), and 0 `CLOSED` snapshot rows exist (`COUNT(*) = 0`).
