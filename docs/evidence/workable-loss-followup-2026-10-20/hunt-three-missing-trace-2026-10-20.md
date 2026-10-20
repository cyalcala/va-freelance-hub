# Three absent Hunt openings — bounded loss trace

No deterministic rejection is reproduced for these three retained openings.
Their actual live loss stage remains **UNKNOWN**. This review performs no source
fetch, AI call, production mutation or source edit. Root executed the one bounded
read-only D1 query described below.

## Retained facts and executed f349 replay

Input is the permitted October20 10:14 capture in
`docs/evidence/continuation-2026-10-20/workable-observation.json`, corroborated by
the reconciliation and grouped-cohort files. Each target has exactly **one**
location row; this is not the Crew sibling-location defect.

| Shortcode | Actual retained title | published_on (created_at is the same) | Hash from actual f349 normalizer |
| --- | --- | --- | --- |
| `8902E9B839` | Admin Assistant (013-1371) | 2026-10-07 | `4a139740470ccf2f` |
| `13FFDFE94E` | AI Automation & Admin Specialist (027 - 1423) | 2026-10-20 | `9842df5277a49f53` |
| `BB4A8BD9FA` | AU Assistant Accountant (012-1440) | 2026-10-20 | `c3bd749ac0336b0b` |

Each URL is exactly `https://apply.workable.com/j/{SHORTCODE}`; country is
`Philippines`, city/state empty, and `telecommuting` Boolean true. The actual
f349 Workable parser returns one row per target. `normalizeScrapedItems` preserves
the URL, sets the same source URL as application URL, and derives the hashes above.
No target is dropped or has an application-host anomaly. All143 retained Hunt
rows parse and normalize; each target hash occurs once within that retained set.

For every target, `geoGate` returns `ph_only`/`eligible_verified` with direct
Philippines location evidence, and `workableOpeningHold(..., current=true)`
returns null. Both the capture-time and retained12:00-read-time freshness checks
return `WITHIN_WINDOW` using the original publication date. Source descriptions
are null in this widget projection; no description or role approval is invented.

The initial reconciliation has no exact stored match for any target. The retained
12:00 exact-URL read also has none. Root's subsequent **current** URL/hash query
at approximately12:27 returned zero records, seven rows read, zero written,
limit not reached: `tmp/hunt-three-url-hash-readonly-2026-10-20.json`. This rules
out a currently matching source-URL or content-hash record. It cannot reconstruct
the store's contents during the11:41 invocation or rule out a historical conflict
followed by another write. No canonical duplicate search beyond those exact keys
was performed.

## Actual consumers and where evidence stops

References below are to the immutable deployed-compatible f349 source under
`tmp/workable-rotation-release-proof/source`.

| Stage | Exact behavior / evidence boundary |
| --- | --- |
| Fetch/parse | `packages/scraper/ats.ts:203` returns widget rows. Scrape `:2369–2452` checks source admission/robots, parses, then removes invalid/old/future originals. Retained target inputs pass. Source-level fetch success/count does **not** retain each target's live membership. |
| Source attachment/normalization | Scrape `:2497` attaches exact source ID; `:2531` calls `normalizeScrapedItems` (`:109`). All three replay to `workable:hunt-st`, unchanged official URL, safe linkback and a distinct hash. |
| URL dedup | Scrape `:2587–2646` looks up returned URLs in batches, includes existing inactive rows, then removes existing URLs from `newItems`. There is no retained per-target11:41 lookup result. Present-day absence does not prove that earlier lookup. |
| Shared intake | Scrape `:2699–2705` allowlists requested limit1–100, otherwise50, then calls `conditional-state.ts:66`. It round-robins source buckets while preserving within-source input order. The actual all-source `newItems`, request limit and target selected/deferred decisions are not retained. |
| Geo/triage | Scrape `:2773` runs geoGate, then the existing budgeted `decideTriage` at `:2850`. Metadata replay passes, but no actual target-specific model/role decision, exception, budget disposition or pending-write outcome is retained. AI/budget failure normally queues a hidden row; no such row is currently found. That alone cannot identify the cause. |
| Public persistence | `publish-opportunities.ts:60–69` applies source/canary allowance and passes only `group.slice(0,allowed)` to insertion. Scrape `:3007–3020` rechecks current Workable freshness/admission and runs guarded inserts. Both source URL and content hash have UNIQUE constraints (`packages/db/schema.ts:20,86`), and conflicts can no-op. A cap, admission race or write conflict is a possible branch, **not an observed cause for these jobs**. F349 insert receipts retain empty IDs. |
| D1/public | Current exact URL/hash lookup is empty, so there are no matching IDs to trace to the public predicate. No publication, first exposure, current independent qualification or throughput is credited. |

**First missing causal link:** the actual11:41 widget/parsed per-opening membership
is not retained. The10:14 capture proves earlier source existence, not an identical
later response. F349 ATS fetch state explicitly initializes body hash to null and
records aggregate count. Even if later body stability is granted as a hypothesis,
the next unretained decisions are the per-target URL-dedup result and shared-intake
selection. Do not jump from current absence to “batch limit”, “AI rejection”,
“source cap” or “hash collision”.

A restricted replay using **only the retained Hunt input** and the bounded259-row
prior D1 comparison yields89 fresh rows,18 absent from that retained URL set, and
all18 selected at the code's default50. Target zero-based positions are2/3/7 in
that restricted list. This is a controlled partial-state replay, **not** the live
multi-source batch or complete production state; it cannot prove actual selection
or rule out live intake deferral. No synthetic initial state is presented as live.

## Smallest useful observability seam

Use a bounded ordinary-clock trace for these exact three source/URL identities,
not another provider fetch, model call, table, clock or publication allowlist.
Extend the existing run-local structured diagnostics with one outcome per target:
run/tick, canonical source/URL or identity hash, observed input membership,
original date, then the last reached stage and named disposition. Cover parsed /
posting hold / normalized / URL exists with ID / intake selected or deferred /
geo hold / triage kind / pending write / cap not admitted / current-admission hold /
insert actual ID or zero-effects-UNKNOWN. Keep absent/unobserved explicit.

Capture the parsed URL membership before filters and retain final outcomes after
the guarded writer. A source aggregate or attempted-insert count cannot replace
that linkage. The insert-ID worker supplies the physical-row part; do not assign
IDs to historical empty receipts or equate physical insertion with canonical
first-ever publication. If a zero-write outcome cannot distinguish admission and
conflict atomically, report UNKNOWN and correlate one bounded indexed read.

Machine-readable facts, hashes and replay limits:
`tmp/hunt-three-missing-trace-2026-10-20.json`; reproducer:
`tmp/dayshift-release-proof/trace-hunt-three.ts`. The exact URL/hash SQL is
`tmp/hunt-three-url-hash-readonly-2026-10-20.sql` and was executed only by root.
