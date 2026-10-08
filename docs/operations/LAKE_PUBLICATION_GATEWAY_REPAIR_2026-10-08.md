# Governed lake publication repair

Owner scope: the continuing verified PH job-flow/directory/MATH/SSAE-CED task.
Start: `6f8bf489644b0ed31400703d9ba1e91ac106d491`, local
`codex/verified-flow-directory-checkpoint`. This is the current savepoint's NEXT,
not a new source admission or an overall goal redefinition. GitHub suspension
and scheduler 403/BILLING_DISABLED remain external prerequisites; unchanged
failed probes are skipped. Missing manifest/router and prior unavailable Jev
remain recorded; deterministic tests and independent code review govern this unit.

## Stage 1: authenticated private publication intent

The old deployed raw upsert can reactivate any matching opportunity URL. Therefore
pre-publication staging must not create/update opportunities, FTS rows, publication
ledger claims or source lifecycle records. Retain candidate bodies in Turso; one
additive D1 control table holds only bounded immutable candidate descriptors/hashes.
It is an idempotency/control record, not a second acquisition lake or clearance.

Use an explicit `operation: lake-stage`, `version: 1` mode behind the existing
authenticated `/api/ingest` boundary. Requests without an operation keep their
existing behavior; any unknown operation is rejected before ordinary ingestion.
The mode requires native D1 prepare/batch, with no raw SQL/proxy fallback.
The existing 2 MiB/200-item request bounds apply, plus a 256 KiB UTF-8 descriptor
storage ceiling (413 before database access). Unknown descriptive facts remain
explicitly nullable; no inferred title, remote status, PH eligibility or timestamp.
Reject client publication fields, unsafe/unattributable URLs and duplicate identities.
An onsite/unknown/future posting may be represented in private intent; staging
does not qualify it or make it eligible for later publication.

The server computes each material SHA256 and a canonical, order-independent
manifest hash binding protocol/source/candidate IDs/fingerprints/material. Storage
contains only candidate ID, lake fingerprint, safe source URL and material hash;
no description/evidence text, user records or client clearance. Request operation
identity is stable across retries. Same key with changed source/material is 409.
Exact retry preserves server stage time and revision; concurrent registration
uses a unique key and native atomic batch guard. Ambiguous/malformed acknowledgement
requires structurally valid exact durable readback or reports UNKNOWN with the
same retry key. A malformed selected row cannot certify a material/state conflict.
Database insert/delete guards prevent key reuse through DELETE or REPLACE, even
with recursive triggers off. Exact-material replacement retains the original
clock, revision and any assigned future controls. INSERT/UPDATE OR REPLACE
cannot erase a different operation through the unique future receipt key.

Publication identity/tick/receipt/outcomes remain NULL and revision zero in this
stage. Source identity in the manifest is a submitted exact ID, not a validated
provider/evidence assertion. Future verified publication identity is assigned by
the server only at the governed commit boundary and becomes immutable. All stage
responses explicitly report zero published/synced jobs and no opportunity mappings.
Unregistered Janes can retain private intent; it still has no publication authority.

Native D1 batches roll back on statement failure under the
[official binding contract](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
Use the repository's tested JSON-error compare-and-swap guard pattern, rather
than treating a zero-row update as a transaction failure. Offline SQLite tests
exercise actual migration constraints and the complete route; they do not prove
production D1 behavior. No production migration, request, deployment or clock
change is dispatched in this stage while release/containment is blocked.

Acceptance: strict parsing/forged fields; stable reordered manifest; changed
facts/source/key conflict; concurrent/exact retry; original server clock;
missing native batch; failed/malformed/lost acknowledgement; zero opportunity,
ledger, source-policy or outbound-network effects. Seven local check categories
and independent review apply before commit. GitHub BACKUP_PENDING remains explicit,
with a verified local incremental bundle; no database restoration claim.

## Stage 2: governed atomic publication — still required

Complete item vacancy/remote/PH/freshness/safety checks independently of client
QUALIFIED_READY/eligibility/Jev labels. Check current registry, durable opt-out,
current immutable admission identity/actions, leases, accepted source/aggregate
budgets and canonical deduplication. Preserve only the six real legacy exceptions;
no unattributed or extra hard-coded lake identities. Unknown/future dates never
certify fresh discovery. Reconcile the incomplete qualification helpers before
activation; a geography verdict alone is insufficient.

The verified commit creates brand-new opportunity rows hidden, retains actual IDs,
then atomically commits current-state guard, actual-ID ledger, activation and
operation outcomes. Conflicts never reactivate withdrawn/policy-held rows. Durable
server tick/manifest ownership must survive chunks and retries; independent
operations/controllers must not reset caps. Crash, lease/opt-out/cap races,
ledger failure, timeout-after-commit replay and Turso acknowledgement recovery
are required regressions. Existing staged intent never grants clearance.

The GCP publisher becomes a Bun fetch client and updates Turso mappings/status
only from verified committed per-candidate outcomes, separating sync acknowledgements
from new public exposure. Preserve the local raw-writer fence until the complete
replacement, normal Cloudflare release, SHA-proven GCP artifact, primary/fallback
coordination and bounded runtime/serving observations pass. No subprocess fallback.

Local stage-1 acceptance is not MATH-06 closure, source cutover, live containment,
directory enrichment acceptance or the 28 complete days at 100/day. All original
goals remain active. Rollback of this local stage: normal source revert; the
unapplied additive migration has no production compensation. Preserve any future
control data by supported backup before considering schema removal.

## Stage-1 evidence and remaining scope

Implemented the strict protocol/hash module, explicit authenticated route mode,
native batch/readback helper, additive migration 0055 and matching Drizzle schema.
Fixtures exercise the actual route and SQLite schema without source/provider
requests. Candidates with unknown/onsite/future facts can be private intent only;
every successful response is STAGED with zero published/synced and false authority.
Ordinary ingestion behavior remains available without an operation and still
needs the separate all-writer publication closure described above.

Final local checks: 3,098 tests / zero fail / 319,687 assertions / 228 files
(83.35 seconds), web typecheck, Astro build (47.61 seconds) and the guardrail,
parameter, orchestrator and constitution audits all pass. Seven check categories
passed out of seven (100% for this bounded unit, not overall goal progress).
Thirty-eight new tests cover contract, route/intake and actual migration guards.
Independent final review found no remaining blocking finding. This is local
stage-1 acceptance; remote CI/release/runtime acceptance remains UNKNOWN.

Red-first evidence: the old route returned 400 instead of a private stage;
NUL fingerprint and percent-expanded URL facts crossed parser/storage bounds;
malformed batch/durable readbacks were falsely classified as conflicts;
DELETE and both primary-key/receipt-key REPLACE forms erased immutable records;
SQLite NUL handling bypassed hash/URL length defenses. Each now has a passing
regression. A one-millisecond JS/SQLite clock-skew fixture failure was repaired
by comparing the server default with the same SQLite clock before/after insertion.
The LF/CRLF installed-Wrangler transport check was first green after the
parenthesized CASE change; no red transport run or live D1 parser proof is claimed.
Independent reviews drove those fixes; Jev's unchanged unavailable provider is
not retried for decisions now settled by tests and review.

No production migration/API request, GCP mutation, D1 write, source enrollment,
Cloudflare deploy, GitHub push or new clock was dispatched in this unit. No
current runtime/source measurement replaces the earlier dated receipts. The
normal release/access prerequisites and incident containment remain unresolved.

| PH reporting field | This local unit |
| --- | --- |
| Sources evaluated | 0 probes; existing publication paths reviewed |
| Sources resolved | 0 authority resolutions |
| ATS/provider identities discovered | 0 |
| Sources admitted | 0 |
| Sources shadowed | 0 |
| Sources blocked, reasons/triggers | 0 production changes; local raw-writer fence retained |
| Raw jobs observed | 0 source acquisitions |
| PH-qualified jobs generated | 0 |
| Net-new unique jobs | 0 attributable |
| QUALIFIED_READY added | 0 |
| Jobs synced to D1 | 0 attributable; migration/API tests are private SQLite fixtures |
| Jobs visibly active on site | 0 attributable; no fresh public-flow certification |
| Source economics changes | UNKNOWN; no measured benefit |
| Primary remaining bottleneck | Live writer authority/containment and release access; full atomic qualification/publication and exposure history still absent |
| Next autonomous action | Recover the sole NEXT from SYSTEM_SAVEPOINT; finish the governed commit/controller replacement before activation |

Durability remains GitHub BACKUP_PENDING until normal account access returns.
Local commits plus an independently verified incremental Git bundle preserve this
unit; neither is a database or GCP-state restoration receipt. The existing
directory-enrichment selection merged in PR #228 still needs normal release and
per-row runtime evidence. All MATH-01..13 accepted resolutions remain 0/13; the
100/day floor across every complete day and 150 stretch remain unestablished.

## Stage-2 prerequisite slice — current authority and posting evidence

Start SHA: `5bb4a5957091ad6953eaa7001523da6561d1fedc`. Independent
code review exposed three prerequisites to the saved governed-commit NEXT:
geography-only lake readiness is not item qualification, controller timestamp
ticks do not establish a shared publication budget, and the old gateway includes
`unattributed` among the six accepted missing-registry source exceptions.
Registry leases also permit missing, malformed or exactly expired values.
This bounded dependency slice repairs the concrete gateway/date defects and adds
a private current-authority capture/CAS guard. It does not dispatch publication.

Preserve only the six real legacy source IDs when no registry row exists;
registered policies retain their restrictions and require a canonical lease
strictly later than the evaluation clock. Durable and registry opt-outs continue
to hold publication. A server-derived authority origin prevents nullable lease
fields from masquerading as legacy provenance. Current registry capture requires
an immutable admission packet with explicit public-minimal-metadata action,
source/provider/tenant identity, current policy/provider/admission leases and
revisions. Its issued frozen snapshot is a dependency, always returning false
publication authority; cloned or caller-forged snapshots cannot produce a guard.
The native-batch guard must recheck current identity, packet, operational state,
transition hash, caps and opt-outs, including fields not covered by revision
triggers. No new source exception, enrollment or accepted parameter is introduced.

Greenhouse's [official Job Board API](https://docs.greenhouse.io/job-board.html)
documents prospect posts with null `internal_job_id` and distinguishes
`first_published` from `updated_at`. Both intake planes will omit explicit
prospect posts and use only a supplied valid `first_published` as posting evidence.
The list endpoint is not assumed to supply that field: absence remains NULL,
without a detail request or edit/creation/fetch-time substitution. Experimental
freshness will reject future dates and preserve their stated timestamps as
inactive evidence. These fixes do not certify a genuine vacancy, full remoteness,
PH exclusions, application availability, safety or canonical identity.

Acceptance is red-first local regressions, real SQLite admission/CAS rollback
fixtures, scoped checks, full existing tests/typecheck/build/audits and independent
review. No opportunity ownership migration, fake qualification callback, invented
aggregate caps, production request or deployment is part of this slice. The
existing raw-lake fence remains. Complete item-proof production and an accepted
cross-controller budget/lease contract still precede atomic ledger/activation,
controller replacement and runtime acceptance. GitHub and GCP access failures
are unchanged; repeat neither failed probe without changed evidence. Jev's prior
provider failure remains non-blocking and is not retried for this bounded decision.

### Prerequisite implementation and local acceptance

`a6ab5f6e1535f1ee1cf19250928036f15e3a9ada` repairs the missing-registry
unattributed fallback and active registry lease checks. Mixed-source activation
fixtures retain null source IDs and prove those rows receive zero-ID blocked
receipts without activation, while attributed successes retain their actual IDs.
`ad007b8074c3869ccba7281289ec035b79b6cad7` corrects both Greenhouse intake
planes and experimental future-date treatment. A shared original-date parser
rejects wrong types, incomplete dates, calendar rollover and 24:00 while preserving
valid timezone offsets. Absence of internal job identity is retained without
claiming vacancy clearance; explicit null prospect identity is excluded. Existing
`fetchATSFeed` active flags and main-lake geography-only readiness are not thereby
complete qualification. Other providers' original-date semantics remain unproven.

The registry prerequisite is implemented in `lake-publication-authority.ts`.
It reuses actual current immutable-admission validation, derives a stable source/
provider/tenant identity hash, issues frozen opaque snapshots and prepares a scalar
JSON-abort guard for the caller's native batch. The guard binds latest packet,
current source/provider revisions, unbumped provider reassignment, state/transition
pointer, leases/caps, endpoint/tenant and both opt-outs. Its database clock checks
source, provider and admission expiry. A missing/deleted source throws rather than
silently returning no row. It is not wired into any route/controller and does not
authorize publication; item and aggregate proof requirements remain true.

Genuine red-first authority result: one pass/ten fail after correcting an existing
immutable-cap fixture setup failure; final and independent scoped result:
13 pass/zero fail/85 assertions. Gateway regressions first reproduced five defects.
Original-date/future tests reproduced edit-date substitution, prospect inclusion,
future freshness, boolean-to-epoch coercion and February-30 rollover before fixes.
The first malformed adapter test import was a harness error, not implementation
failure. The expiry fixture uses real SQLite time with a bounded 650ms wait; a
slightly earlier fixture capture clock avoids Windows/SQLite clock resolution
skew without weakening production checks.

Final combined acceptance: **3,126 tests / zero fail / 319,941 assertions /
230 files (67.64 seconds)**, typecheck, Astro build (41.81 seconds), and all four
governance audits pass. Seven categories out of seven apply only to this bounded
local unit. Three independent reviews found no blocking issue. New tests total
28 compared with the previous 3,098-test checkpoint. No additional broad rerun
is required after documentation-only checkpointing.

No production D1 read/write, migration, API request, source acquisition/admission,
GCP mutation, deployment, GitHub push or new clock occurred. Official primary
documentation lookups are separate from job-source probes. The earlier runtime,
directory and incident receipts remain dated evidence. All fifteen PH report
fields above retain zero attributable acquisition/publication progress or UNKNOWN
runtime benefit for this slice; directory release/readback remains pending.
Accepted MATH resolutions stay **0/13**, certified fresh flow stays NULL/UNKNOWN,
and live containment is not established. Normal GitHub access remains suspended;
no unchanged failed probe is retried and backup remains pending despite verified
local Git-bundle durability. No database/GCP-state restoration claim is made.

One next evidence-producing action is the saved item-proof prerequisite:
implement independently produced, versioned, material-bound vacancy/remote/PH/
original-freshness/safety/application/canonical-identity evidence. Unknown or
contradictory facts must withhold; tests cannot manufacture source clearance.
An accepted shared budget/epoch/lease contract across controllers remains missing
and cannot be inferred from the target, body bounds or per-controller ticks.
Full atomic publication/controller replacement, normal release/provenance,
coordinated containment and bounded runtime/serving acceptance remain subsequent
requirements. Preserve the raw-writer fence throughout.
