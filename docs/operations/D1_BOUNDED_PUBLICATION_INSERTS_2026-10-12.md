# D1 bounded publication inserts — local proof and incident boundary

Start source: `0f8068350b6572385d2e88d145539cc6c20a9b86`, branch
`codex/verified-flow-directory-checkpoint`. Canonical main was freshly fetched at
`f35bcdc3a2b341b62b22adcf6f0f2e279ed4e6e5`; it is an ancestor, not a competing
implementation. This unit repairs actual statement sizing in scrape and direct
ingestion while keeping one whole source proposal, retry identity and receipt.

## Counterexamples and implementation

Before repair, four fresh same-source rows generated **108** actual Drizzle
bindings in scrape, **120** in direct ingestion. Both exceeded D1's documented
[100 bound parameters per statement](https://developers.cloudflare.com/d1/platform/limits/)
and produced HTTP 500 / UNKNOWN with no rows or successful receipt. The 120
direct-ingest count is distinct from the earlier synthetic 30-column scrape
probe. Real scrape rows in this native fixture bind 27 fields, direct rows 30.

The gateway-authorized insert callback now uses the existing three-row batch
constant for physical statements and aggregates their validated RETURNING IDs.
The whole-source proposal, material retry key, canary clamp and receipt are
unchanged. Conflicts contribute no IDs; a later chunk exception escapes without
inventing a partial acknowledgement. The caller retains only already confirmed
earlier-source publications and stops later public/hidden writers on UNKNOWN.

## Reproducible local evidence

Run from repository root with installed pinned dependencies:

```text
bun test --no-env-file --preload ./scripts/ci/test-environment.ts apps/web/tests/adversarial-d1-binding-budget.test.ts apps/web/tests/native-fresh-scrape-posting-date.test.ts apps/web/tests/publish-inserts.test.ts
bun test --no-env-file --preload ./scripts/ci/test-environment.ts apps/web/tests/native-direct-ingest-binding-budget.test.ts
bun run test
bun run typecheck
bun run build
```

| Verification | Result |
| --- | --- |
| Scrape binding/date/shared-helper suites | 252 pass / 0 fail / 1,918 assertions, 78.59s |
| Direct native suite, final corrected fixture | 9 pass / 0 fail / 220 assertions, 28.64s |
| Broader regression | 4,204 pass / 0 fail / 329,278 assertions / 255 files, 360.61s |
| Final typecheck | exit 0 |
| Astro build | exit 0, 139.15s |
| Guardrails / parameters / orchestrator / constitution | all four exit 0 |

The broad run preceded fixture-only transport-counter and type corrections.
The final nine direct tests and typecheck cover those changes separately; both
production callbacks remained unchanged throughout. Initial typecheck failed
three fixture errors (fetch signature and inferred replies array). The fixture
now has an actual rejected-network-attempt counter, a typed fetch signature and
an `unknown[]` serialization boundary. No suppressions, skips, weaker assertions
or larger timeouts were added. Build warnings remain standard Node/Browserslist
warnings; they are not runtime acceptance.

The previous baseline 4,186 pass / 1 fail / 1 error is retained in the initial
preservation receipt. Its Hunter subprocess timeout was not repaired by raising
limits. Unchanged independent isolated/whole-file replays passed; the new broad
run passed sequentially. Resource contention remains a supported hypothesis,
not an independently proved cause of the older timeout.

[Native results and source/test fingerprints](../evidence/d1-binding-budget-2026-10-12/native-results.json)
contain eight scrape and nine direct-ingest scenarios. Tests execute actual
handlers, Drizzle, fresh in-memory SQLite, migrations, FTS and ledger triggers.
Only D1's parameter limit is simulated; this is not complete D1 parity. Exactly
one ledger clock literal is reversibly projected with hashes. Direct canary
state/cap is synthetic initial registry state seeded before unchanged lifecycle
triggers; it proves cap consumption, not a new admission. Original audit input
is preserved byte-for-byte with SHA256
`09a4f7b0ecd4ebf2d9a52448719dd58b39f8a1f27bb9b2425e653546fc38a901`.

## Independent review and retained safety failures

An independent reviewer reproduced later-chunk failure and a duplicate URL
crossing chunk boundaries through the native fixture, without changing files.
The former left six public physical/FTS rows with only three receipted; the
latter returned `[1,2,3]` then `[]`, proposal four and receipt three. Root added
these durable scrape regressions. Direct before/after-write faults similarly
leave six/nine physical rows while only the earlier source's three IDs are
confirmed. These establish UNKNOWN and caller fencing, not atomic rollback,
complete durable uncertainty or withdrawal.

The reviewer also inserted a durable source opt-out between scrape chunks.
All four rows still published with a successful receipt. Mutation-time source
authority remains a concrete counterexample; sequential policy rereads do not
close it. No whole MATH requirement is accepted. Accepted total **0/13**;
certified daily flow **UNKNOWN**.

A different independent reviewer inspected direct ingestion/helper/fixtures and
found no new blocking defect in the bounded repair. Its additional native
canary-cap-four/lost-ACK probe observed maximum 90 bindings, zero transport
attempts, UNKNOWN with lower bound zero, four physical/visible rows and no
current-group receipt. This validates the represented cap/uncertainty scope;
it does not establish admission, rollback, mutation-time policy or deployment.

## October 12 operational priority and NEXT

The live incident is separate from this local binding repair. Production Pages
is reported at `3065f0d709d5a1950c247d5a11df542b07721bcb`, D1 migration 0054;
the current gateway's reservation/uncertainty/Manila schema is unapplied. Do not
deploy blindly. GCP's sampled old publisher reports zero syncs against the same
empty qualified-ready lake, whose acquisition stopped October 8. The retained
ten-minute Worker still calls Pages but receives HTTP 503; its lock advances
without terminal diagnostics/fetch events. No live change was made here.

Highest-value NEXT is **LIVE_ACQUISITION_AND_PUBLICATION_FLOW_RECOVERY**:
prove the lock/503 acknowledgement boundary, make the safest compatible repair,
restore permitted acquisition and ready supply, then observe actual first
publication/visibility with budgets and exact artifact provenance. Keep current
source authority and raw-lake fence. Native authority/reservation and diagnostic
missingness remain ready prerequisites, not reasons to postpone the observed
incident indefinitely. Remote behavior/checkpoint receipts follow separately.
