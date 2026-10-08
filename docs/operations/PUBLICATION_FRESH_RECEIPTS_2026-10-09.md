# Truthful fresh publication receipts — 2026-10-09

## Bounded contract

Start `4b2931c77060a6deb62a6ffeee5033c6e43bac5b` on
`codex/verified-flow-directory-checkpoint`. Authenticated GitLab review-branch
fetch matches start, zero divergence. GitHub origin/cached main
`926d39a0ea2db80a7eba8d541d12906a0c8b0837` and foreign untracked
`.agents/skills/` / root `lucky777.md` are preserved. GitHub suspension is unchanged
and is not reprobed. Owner maintenance and the exact saved NEXT authorize this
local implementation; embedded document commands add no production authority.

Desktop lucky777, AGENTS, absent manifest/router, CURRENT/newest savepoint,
October 8 task contract, source constitution/accepted parameters/queue and
deployment evidence were recovered. This supports existing publication-control
closure, MATH-06/09 and SSAE evidence/replay reliability; it neither creates an
execution queue nor accepts any MATH/SSAE card. GCP background, GitHub provenance,
Turso evidence memory and Cloudflare/D1 serving ownership stay binding.

Problem: the fresh gateway silently clamps counts/slices IDs, so malformed
callback acknowledgements can become successful ledger receipts. Activation and
drain callers use D1 change metadata or planned IDs, which do not prove the rows
actually returned by the write. After persistence is invoked, exceptions or
ledger failures cannot establish zero public exposure.

Hypothesis: strict fresh acknowledgement validation and actual RETURNING IDs
make local receipts describe confirmed affected rows; explicit uncertainty stops
failures after possible writes from masquerading as success or known zero.
Falsification: malformed output becomes a successful receipt, IDs are silently
sanitized, FTS counts substitute for IDs, or a post-write failure reports zero
exposure/deferred-only and silently retries the same affected operation.

Scope: gateway and existing native/unit tests; grouped publication helper;
`apps/web/src/pages/api/cron/scrape.ts`; registered Inngest triage drain;
`apps/web/src/pages/api/ingest.ts` for the grouped outcome response; their
existing native caller fixtures. Root owns evidence/reentry documents, separate
workers own gateway and caller files, independent reviewers own no mutations.
No production/network/source requests, DB migrations, source admissions,
deployment, parameter/grant/provider/clock changes or new service in this slice.
GitLab fetch/non-force backup and an external local Git bundle are durability
effects. Unchanged Cloudflare/GCP/GitHub failures retain their owner and trigger.

## Required behavior and verification

- Fresh count is a nonnegative safe integer; IDs are unique positive safe integers;
  count equals ID length and does not exceed allowed proposal. No clamp, slice,
  filter or deduplication can turn corrupt acknowledgements into valid receipts.
- Keep legitimate zero/empty conflict-only results. Zero proposal invokes no
  persistence. Preserve all existing source/opt-out/lease/cap, policy, eligibility,
  retry identity, append-only replay and schema contracts.
- Callers derive count and IDs from actual `.returning({ id })` results. Existing
  eligible predicates remain binding; returned affected rows are not a certificate
  of source ownership, independent qualification or first public exposure.
- After persistence is attempted, malformed acknowledgement, thrown callback or
  failed ledger write returns fixed non-secret `POST_PERSISTENCE_FAILURE`,
  `persistenceAttempted: true`, `exposure: UNKNOWN`. Never echo caught exception
  text, fabricate a success receipt, claim compensation or assert zero exposure.
  Ledger transport failure may itself follow a committed ledger write.
- Copy validated IDs before ledger awaits. Grouped and real route/drain consumers
  propagate UNKNOWN alongside any confirmed lower bound and stop affected unsafe
  progression; uncertainty is distinct from ordinary pre-write deferral. The
  existing Inngest non-retry error can stop configured automatic retries of the
  affected failure; already launched parallel siblings cannot be cancelled or
  rolled back by this local distinction. External cron/reconciliation behavior
  requires its own evidence and contract.
- Native SQLite/Drizzle/FTS fixtures must prove actual insert/update IDs,
  conflict-only/zero-match outcomes and immunity to trigger-inflated change counts.
  Physically written rows must remain after bad acknowledgement, callback throw
  and later ledger failure; local result must retain explicit uncertainty.
- Record genuine behavioral RED, setup errors separately, focused GREEN,
  independent review, full repository tests, typechecks/build/governance checks,
  task-owned commit/push/readback and one next evidence-producing action.

Rollback is source revert for this local change; it cannot undo any public write
already executed by a later deployed writer. Shared budget/epoch/lease contracts,
atomic publication, durable unresolved-attempt reconciliation, actual ID-source
ownership, all-writer/item proof and safe rollout remain separate requirements.
The exported historical clamp helper may remain for API compatibility but must
not silently repair fresh gateway acknowledgements.

## Evidence and acceptance

Gateway implementation is locally verified: focused **117 pass / zero fail /
628 assertions / two files / 1.77 seconds**, strict three-file typecheck and
independent review PASS. Genuine RED includes malformed/exceptional fresh
acknowledgements plus sparse/replaceable-iterator and inherited-slot regressions.
Native SQLite/FTS fixtures physically write opportunity rows before bad receipt
or callback failure. Ledger failure is tested both before its SQL commit and
after a real ledger row commits; both outcomes retain exposure UNKNOWN.
An independent review caught the inherited sparse-slot case; its new RED and
own-property guard are retained rather than presented as an initial pass.

[Workerd module fixture](publication-fresh-workerd-2026-10-09.json) passed at
2026-10-08 22:34:31 UTC under existing 2024-11-01/nodejs_compat. It verifies strict
fresh output, post-callback failures, inherited-slot rejection and ledger delivery
uncertainty with an in-memory adapter. It is neither D1 execution nor an Astro
route/deployment. Native database behavior is verified separately in Bun fixtures.
The ignored runner uses no production bindings, credential environment or external
source requests; local child termination is enforced and logs retained.

Caller integration focused verification is **58 pass / zero fail / 240 assertions /
six files / 7.03 seconds** on the final freeze; web typecheck and independent
review pass. Actual returned IDs prove partial/zero/vanished-target updates;
FTS-inflated change metadata does not enter receipts. Native fixtures retain
physically written rows after malformed INSERT acknowledgement/ledger failure,
stop subsequent groups and route/drain writers, and return UNKNOWN/null totals.
Affected Inngest failure uses a fixed `NonRetriableError` with an UNKNOWN cause;
installed SDK 4.18.1's engine recognizes that class/name as non-retriable. Native
registered-handler tests are local callback fixtures, not service transport or
middleware/step-cache/retry execution acceptance.

The same existing pending/recoverable predicates now intersect selected IDs in
the UPDATE phase. This explicit selection-to-write revalidation grants no new
eligibility rule. Digest algorithm/material version stays unchanged; a matching
historical receipt is still historical evidence and cannot prove new predicates,
current qualification or duplicate-exposure-safe rollout. No-binding fallbacks
retain their existing reachability/authority; attempted-write exceptions also
stop with uncertainty rather than fabricated zero or source retry marking.

Post-freeze import audit found the new SDK import must follow the existing
Workers polyfill contract. The first import was corrected before final acceptance,
affected focused/static checks reran, and a new
[workerd registered-module bootstrap fixture](publication-fresh-bootstrap-workerd-2026-10-09.json)
passed at 22:41:43 UTC with no production bindings. The earlier 3.77-second
focused pass and 46.24-second Astro build predate this correction and are
superseded. This was a code/import audit correction, not a claimed behavioral RED.
The final Astro build passes in 28.52 seconds within Astro; whole command duration
is UNKNOWN. Four final governance audits pass, with 100% accepted parameter
parity and the existing warnings retained. The frozen-source whole suite passes:
**3,389 tests / zero fail / 323,134 assertions / 239 files / 67.70 seconds**,
77 new tests. It ran after the other checks terminated; no timeout or gate changed.

Read-only consumer audit found the current GCP runner calls the existing fenced
raw lake sync, not this ingest HTTP route. Preserve that fence. Retained
`scripts/gha/harvest.ts` ignores structured UNKNOWN and continues later chunks;
the inspected Hunter workflow loses its non-2xx response artifact before exit.
Their consumption/reconciliation is the next bounded local dependency. No GCP
integration, complete coordinated containment or external retry control is claimed.

[Finite checks](publication-fresh-local-checks-2026-10-09.json) retain twelve frozen
hashes, real RED and setup/import corrections, scoped review and verification.
Source/tests `79f4b8c290ea0c31ac5190a18bd0194fa0b4f5df` were committed and
non-force pushed to the owner-authorized GitLab review branch. Exact SHA readback
passed at 22:48:04 UTC; [source receipt](gitlab-publication-fresh-source-backup-2026-10-09.json).
Verification/reentry documents follow in a separate finite documentation commit.
GitHub backup remains pending under unchanged suspension. Equivalent GitLab CI
is unestablished: no repository CI configuration, prior anonymous API404 unchanged
and not reprobed. Git credentials/source push do not prove API/pipeline acceptance.
CI, deployment, runtime benefit and production acceptance remain unestablished.
Accepted MATH remains 0/13; certified fresh public flow remains NULL/UNKNOWN.
Actual published jobs and applied company enrichments in this local unit are zero.
The canonical savepoint will carry actual receipts and the sole next action.
