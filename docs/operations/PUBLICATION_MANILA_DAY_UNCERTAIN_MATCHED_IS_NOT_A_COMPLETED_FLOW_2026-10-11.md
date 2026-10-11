# Publication Manila-Day Uncertain-Matched Count Is Not a Completed Flow — 2026-10-11

Verified local proof that an intact snapshot pair whose still-public IDs carry
unconfirmed outcome uncertainty markers or unreceipted acknowledgements is not a
completed Manila-day flow.

## 1. Verified Evidence

| Metric / Check | Value |
|---|---|
| Invariant | `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT` |
| Behavior SHA | `ee782589` |
| Clean uncertain IDs (`cleanUncertainIds: []`) | `uncertainMatchedManilaStillPublicCount` returns `5` |
| Open day flow count on matched | `uncertainMatchedManilaDayFlowCount("OPEN", 5)` returns `null` |
| Closed day flow count on matched | `uncertainMatchedManilaDayFlowCount("CLOSED", 5)` returns `null` |
| Caller-supplied 100 floor | `uncertainMatchedManilaDayFlowCount("OPEN", 100)` returns `null` |
| Caller-supplied 150 stretch | `uncertainMatchedManilaDayFlowCount("OPEN", 150)` returns `null` |
| Caller-supplied null count | `uncertainMatchedManilaDayFlowCount("OPEN", null)` returns `null` |
| Tainted uncertain IDs (`taintedUncertainIds: [3]`) | `uncertainMatchedManilaStillPublicCount` returns `null` |
| Open day flow count on tainted | `uncertainMatchedManilaDayFlowCount("OPEN", null)` returns `null` |
| Ledger side-effects | `source_publication_ledger` remains empty (`n = 0`) |
| Closed snapshot side-effects | `day_state = 'CLOSED'` rows remain absent (`n = 0`) |
| Integration tests passing | 303 / 303 (`packages/scraper/publication-gateway.integration.test.ts`) |
| Adversarial tests passing | 8 / 8 (`packages/scraper/adversarial-uncertain-withdrawal.test.ts`, SHA `96003df0`) |
| Verification Gate Verdict | **PASS** (Reviewer 1 & 2: APPROVE, Challenger 1 & 2: APPROVE, Auditor: CLEAN) |
| TypeScript typechecking | Clean (exit code 0 via `bun run typecheck`) |
| CI Guardrail Audits | 4 / 4 clean (`guardrails`, `parameters`, `orchestrator`, `constitution`) |

## 2. Invariant Semantics

Under ADR-010 and the constitutional publication gateway:
1. Physical rows written to `opportunities` before ledger append confirmation are
   durable in SQLite, but their publication status remains unconfirmed (`POST_PERSISTENCE_FAILURE`).
2. If any still-public snapshot ID carries an unconfirmed uncertainty marker or
   unreceipted acknowledgement, `uncertainMatchedManilaStillPublicCount` refuses to
   score the batch and strictly returns `null`.
3. Even when all 5 IDs are clean, active, source-matched, canonical-URL-matched,
   PH-eligible, apply-valid, and fresh, `uncertainMatchedManilaDayFlowCount` returns `null`
   for both `"OPEN"` and caller-supplied `"CLOSED"` day states.
4. An open Manila day is not a completed flow.
5. The writer does not call this reader, no database migration was added, and no
   premature MATH-08 completion is claimed.
