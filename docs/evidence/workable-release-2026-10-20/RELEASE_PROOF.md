# Isolated Workable release proof

Base: `34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83` (actual schema through 0054).
Local proof commit: `f34965b0c7bbfb76395259ccce0b60ad4533eee0`, branch
`codex/workable-rotation-proof-0054`. The isolated repository is clean. An incremental
`workable-release.bundle` retains the proof commit with the named base prerequisite.
This directory is a local release candidate. No push, deployment, source admission,
renewal, production database write, schema change, or throughput acceptance occurred.

## Behavior in this candidate

- The existing two Workable slots use canonical policy-enabled identities and durable
  attempt times, retaining the sixty-minute interval. Registry-only sources can rotate;
  disabled directory entries do not occupy the slots. Intake remains capped and fair.
- Workable original `published_on` dates are validated without replacing them with
  creation, acquisition, update, or observation times. Invalid, future, missing and
  stale dates hold before intake; publication rechecks the original date.
- The seven configured Workable identities retain enforce-mode robots checks, including
  `pineapple-staffing` rather than its unadmitted alias. Configuration is not evidence
  that all seven have current production admission authority.
- `loadCurrentAdmissionEvidence` supplies the existing full packet, digest, revision,
  lease and scope decision before collection and Workable public mutation. No new
  source policy engine or review-deadline rule was introduced. The existing current
  evidence view and validated immutable digest fence SQL writes at mutation.
- Feed recovery requires matching current and stored Workable source identities,
  current PH/remote evidence, fresh original dates, no existing deterministic triage
  veto, and unchanged stored facts. After both dates independently pass validation,
  all three Workable activation paths never advance retained posting time and can
  correct it to an earlier current original date under the same CAS. First-storage
  time remains unchanged. This does not certify legacy dates as original evidence.
- Default pending recovery and opt-in inline pending triage use the same Workable
  facts/admission checks and mutation CAS. Legacy stored dates may be creation
  dates, so both paths also require exactly one matching current fetched original
  opening. Missing, stale, onsite or restricted current openings remain hidden.
  Zero-AI recovery requires positive current PH; AI recovery retains the existing
  unclear-PH AI-and-skeptic lane. The CAS includes the actual AI company
  input and application-URL fallback, alongside source, URL, title, description,
  tags, location, original date, PH state, inactive reason and inactive state.
- Workable recovery, pending recovery, inline drain and new inserts share the existing
  `scrape` tick channel. Mixed recovery/new proposals therefore use one existing
  two-item source budget. Other providers retain their previous activation channels.
- The separate Inngest Workable writer explicitly defers before AI or public writes
  until its concurrent cap behavior has its own acceptance. Do not infer that its
  cron is disabled from a scrape route flag; live flag values remain unproven here.

## Native proof boundaries

The native fixtures run the real parser, route or installed Inngest function body,
Drizzle, SQL, public predicate, FTS and gateway against all unchanged migration
statements through 0054. Network, AI replies, initial registry authority and evidence
packets are synthetic. Packets are built by production admission code before the
immutable guards are installed. Every guard is installed before the tested runtime.
Only the ledger trigger's native `now` literal is projected for the explicit test clock;
the projection hashes are retained in native receipts. The Inngest test replaces its
step transport with deterministic synchronous step calls and proves the explicit hold.
These are local production-relevant proofs, not live widget or deployed D1 receipts.

## Failed proofs retained

- `full-regression.log`: earlier baseline 3103 pass / 1 default five-second snapshot
  timeout. `snapshot-timeout-isolation.log`: unchanged failing case passes 1/0/4 under
  its original timeout. Later full runs use an explicit fifteen-second test bound.
- `reactivation-before.log`: all ten added unsafe reactivation counterexamples fail
  against the original candidate, including current onsite/US metadata, stale or
  missing stored dates, source mismatch, and source/facts/date/PH races.
- `non-workable-before.log`: independent review caught a Workable admission check in
  a shared ATS callback, blocking a permitted Lever request. The callback guard was
  corrected. `non-workable-after-assertion.log`: native Lever control passes 1/0/9.
- `mixed-cap-before.log`: separate old channels exceed the combined Workable budget.
  `mixed-cap-after.log`: same mixed inputs pass after sharing the existing channel.
- `admission-first.log`: the first synthetic packet fixture omitted its required
  review-deadline field; corrected before guards are installed. `admission-second.log`
  proves valid recovery plus missing/stale/expired admissions and mutation races.
- `review-fixes-final.log`: first codec parity fixture reused a UNIQUE content hash,
  so its comparison insert correctly conflicted. Distinct hashes fix the fixture;
  `codec-parity-final.log` proves SQL NULL, JSON, boolean and default storage parity.
- `full-regression-final.interrupted.txt`: a verified owned full-suite process was
  deliberately stopped after discovering that codec fixture defect, not because
  observation timed out. Its partial log and exit result are retained.
- `pending-first.log`: drain-race injection assumed `is_active` was the first SET
  column. The real Drizzle update orders columns differently; the fixture now inspects
  all SET columns. `pending-second.log` passes 58/0/511 across native and legacy checks.
- `full-regression-pending-final.log`: terminal 3136/2/1, with two native timeout
  failures and a late child exit 143. The first nominal 45-second test recorded
  68,954,592.74ms (roughly nineteen hours); UTC advanced from October18 to October19
  during the retained run. This is not treated as a passing broad proof. Both exact
  cases pass unchanged at their original native bound in
  `interruption-cases-recheck.log` (2/0/24). No native timeout was increased.
- `full-regression-final-frozen.log`: terminal 3138/2/1 on the prior freeze. One
  nominal 45-second native test recorded 2,554,563.23ms; the two exact failed cases
  pass unchanged at their original bounds in `final-frozen-failures-isolated.log`
  (2/0/22). This remains failed broad evidence, not accepted green.
- `pending-current-before.log`: all eight new pending current-opening
  counterexamples fail against the prior freeze. Legacy fresh stored dates let
  missing/stale-original/onsite/US current openings publish. Two-phase recovery
  corrects this; `pending-current-after.log` passes 30/0/262 before the final
  unclear-current positive control refinement.
- `pending-current-precedence-before.log`: current explicit PH metadata still lost
  to unclear stored text. The red control passes after using stored hard vetoes
  and authoritative current positive evidence for zero-AI recovery.
- `pending-original-projection-before.log`: all three activation paths retained a
  later legacy creation-derived value (October17) despite an earlier valid current
  original date (September19). The shared earlier-date correction is exercised in
  both directions; stale stored originals still hold and first storage is preserved.

Independent review also preserved before/after default pending-admission bypass
receipts at the repository's `tmp/live-review-pending-admission-*.json` paths.
The parent owns those artifacts and the live six-valid / Pineapple-stale authority
audit. No local synthetic fixture renews or grants Pineapple authority.

## Verified checkpoints and final acceptance

- `targeted-final.log`: 114/0/700 before admission extension.
- `targeted-admission-final.log`: 119/0/753 before shared-callback and cap review fixes.
- `full-regression-reviewed.log`: 3125/0/319787 before the required pending-path closure.
  This green result does not accept the later final source by itself.
- `pending-unclear-final.log`: existing AI and skeptic still recover two fresh remote
  rows with unclear deterministic PH evidence, using four synthetic AI calls.
- `complete-cas-final.log`: six new CAS/fresh positive controls pass 6/0/62.
- `pending-original-projection-final.log`: final 22/0 targeted controls cover
  earlier-date preservation in both directions across all three activation paths,
  current PH precedence, the unclear-PH AI lane, and missing/stale/onsite/US current
  opening negatives. Native timeout bounds remain unchanged at 45 seconds.
- `independent-live-review-final-cas.log`: earlier independent reviewer passes 8/0/84
  on `6108471a` / `26470820` / `362c8474`. That approval is superseded by the later
  pending current-opening counterexamples and must not accept the final source.
  The independent review receipt records the final review separately. Review does
  not replace broad tests or actual runtime acceptance.
- Final independent review approves runtime hashes `4b402f37` / `0ce547b7` /
  `362c8474` with no bounded-source blocker: 26/0/252 focused checks and six
  separately executed native controls, including wrong-source holds before AI.
  All eleven inspected shared boundary files and all 54 migrations remain byte
  identical to the base. `independent-live-review-receipt.json` is authoritative
  for exact hashes, scope and the pending-versus-terminal full-suite result.

Final frozen-source full-suite, type/build/audit receipts and local proof commit are
recorded in `release-summary.json` when terminal. A running check is not acceptance.
Tests use the explicit pinned Bun 1.3.14 binary at
`C:/Users/admin/AppData/Roaming/npm/node_modules/bun/bin/bun.exe`.

Final full regression is green: `full-regression-release-final.log` records
3156 pass / 0 fail / 320090 assertions across 226 files in 534.88s. Final typecheck,
build (75.03s), guardrails, parameters and constitution exit receipts are all zero.
`release-summary.json` binds the final source SHA256/Git blobs, logs, independent
review, supplemental actual-field replay and local proof commit. Earlier interrupted
or failed full runs remain non-green history. The independent review's dated
pending-at-record full-suite field is supplemented by this later terminal receipt.

## Actual minimal-field replay supplement

The parent subsequently captured two existing permitted widgets after current
admission and robots validation. Its retained input is
`tmp/workable-authoritative-observation-2026-10-20.json`; only minimal factual fields
were retained and the full HTTP bodies were hashed in memory. This is distinct from
the original synthetic regression matrix.

`replay-actual-workable.ts` replays four actual minimal records at the capture's
`observedEnd` clock through the frozen parser, route, native SQLite, public predicate
and FTS, using only in-memory fixture substitutions. The two named missing openings
Hunt `7C685D947F` (October20) and CrewBloom `5902EBE6B1` (October8) reach local public
rows and FTS with their original dates; actual stale/onsite negative controls remain
hidden. All eleven checks pass. Initial authority/packets, transport and two AI
replies remain synthetic; there are no additional provider requests or production
writes. This does not reconstruct a purported raw response or certify adjudication,
deployed coverage, global caps, or the gateway's empty insert-ID receipt.

The first supplement setup demanded a fresh PH onsite record that this capture did
not contain; that failed selection is preserved in `actual-minimal-native-setup-first`
logs. The accepted runner selects factual existing onsite/stale controls and labels
their actual properties in `actual-minimal-native-receipt.json`.

## Explicit limitations

- Existing insert gateway receipts still have empty `published_ids_json`; this release
  does not claim to fix or fully trace that old receipt limitation.
- No global cap closure is claimed for other providers, privileged `/api/ingest`,
  other writers, or concurrent independent invocation keys.
- The Inngest Workable hold is a visible deferred path, not evidence that durable
  Workable recovery has been implemented or deployed.
- Current source permissions, source admissions, cost guards and constitutional
  predicates remain authoritative. Real throughput toward 100-150 verified PH jobs
  per day and deployed coverage require separate current runtime evidence.
- Jev's bounded advisory review returned HTTP 401; that failure is retained in
  `jev-reactivation-review.log`. Deterministic tests and independent review govern
  this candidate's acceptance.
