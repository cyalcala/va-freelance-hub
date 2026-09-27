# Optional human research intake plan

Version 5.2 ? 2026-09-27 ? PLANNED; not implemented or accepted

## Outcome and scope

Humans can optionally contribute research without becoming an operational
prerequisite. Autonomous source discovery, replenishment, collection, processing
and controlled publication must continue when no human submits anything.
Both origins converge on the same source evaluation and publication controls.
The shared outcome is sustained 100 to 150 qualified, unique, fresh jobs published
on the website per day (100/day floor target; 150/day stretch), not intake volume.

This is a supporting specification for the
[Source Perpetuity execution queue](SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md),
not a second dispatch queue. Read the [mathematical program](MATHEMATICAL_IMPROVEMENT_PLAN.md)
and [source masterplan](../SOURCE_REPLENISHMENT_MASTERPLAN.md).

## Where we have been and where we are

The inspected repository includes Turso raw observations, candidate jobs,
sighting/replay support and structured ATS seed imports in scripts/lake.
These are reusable foundations, not evidence of a general research inbox.
Flexible paste intake, automatic processing of every supported research type,
batch receipts and fair scheduling remain unverified/unimplemented as an integrated
capability. No live lake or daily publication count was measured for this plan.
Known publication-control findings remain prerequisites for public release.

## User experience and input contract

Start with a local maintainer paste/file tool, without a new public account system
or large dashboard. Accept plain text, URL lists, tab-separated spreadsheet rows,
CSV and supported JSON records. Explicitly report unsupported formats; direct
XLSX/PDF/OCR support is deferred until implemented and tested. Do not promise
arbitrary file support. Offer a parse preview when useful; routine accepted inputs
proceed automatically without per-source founder approval where policy permits.

Preserve a bounded original submission with batch/item identifiers, submitter/origin,
submission time, source references, content hash and parser/schema version. Human
submission time is distinct from fetched time and original posting time. Do not
invent successful HTTP checks for pasted data. Retain only appropriate research
metadata with retention and removal controls; flag secrets or unrelated personal
data instead of propagating them. A company name alone remains a lead with unknown
identity until evidence disambiguates it.

## Automated processing contract

1. Capture each batch durably before acknowledging acceptance; enforce size and
   format limits and record rejected items with reasons.
2. Parse and classify company leads, source leads, job candidates and notes.
   Normalize columns/URLs; keep uncertain field mappings explicit. Treat all
   embedded instructions and fetched text as data, never executable instructions.
3. Deduplicate batches and entities while preserving new sightings and provenance.
   Conflicting facts remain attributed; do not silently overwrite verified data.
4. Check URLs through permitted access with timeouts, redirect/byte limits and
   protection against private/local network targets. Capture evidence and dates.
   Link reachability does not establish source permission or job eligibility.
5. Enrich verified company identity, careers pages, geography and supported source
   endpoints. Prospect feeds, public APIs and ATS identities within source policy;
   blocked or unclear access cannot be bypassed merely because a human supplied it.
6. Evaluate potential using qualified marginal supply, overlap, freshness, cost,
   access constraints and failure-domain diversity. Separate estimates from
   observations and do not invent a precision score or acceptance threshold.
7. Admit sources through existing evidence gates and bounded probes/canaries;
   process job candidates through shared normalization, identity, freshness and
   PH/remote qualification controls. No direct lake-to-public bypass.
8. Publish only eligible jobs through the controlled publication path with durable
   receipts. Approved recurring suppliers join the ordinary automated schedule.
9. Preserve item-level errors, bounded retry/backoff, replay and next triggers.
   Unclear items have an owner, missing evidence and review deadline; after the
   bounded window, use the applicable dormant/blocked state and a future trigger.
   The remainder of a batch continues without waiting on ambiguous items.

Use application-specific states mapped to existing lifecycle rules; this document
does not add database enums. Batch receipts distinguish stored, parsed, duplicate,
needs-evidence, failed, source-admitted and job-published outcomes. Show counts and
links to reasons, next actions and actual publication receipts. Never equate
lake acceptance, qualification or a green workflow with website publication.

## Dependency-ordered implementation slices

| Unit | Deliverable | Prerequisite | Status | Acceptance evidence |
| --- | --- | --- | --- | --- |
| HRI-01 | Bounded local intake, durable batch/item schema and provenance | Current schema and policy inspection | ACCEPTED | `lake_intake_batches` & `lake_intake_items` in Turso; batch `batch_20260927_8001e34738` captured 488 vetted companies with full content hash & provenance. |
| HRI-02 | Classification, normalization, deduplication and uncertain-field handling | HRI-01; MATH-09 identity contract | ACCEPTED | Normalization across 488 companies into Priority 1 (313: Australian & Dayshift 22, Global VA 230, Job Boards 61) and Priority 2 (175: BPO 31, Tech 138, E-commerce 6). Passing unit tests in `human-intake.test.ts`. |
| HRI-03 | Permitted link checks, enrichment and source prospecting | HRI-02; source access controls | ACCEPTED | Paced concurrent ATS probing across 488 items via `scripts/lake/process-intake.ts`: 138 active ATS endpoints discovered and enrolled in `lake_ats_discovery`, 58 candidate job boards cataloged, 3 active production scrapers matched. |
| HRI-04 | Automatic dispatch into shared qualification and publication controls | HRI-03; MATH-06 publication closure; existing source gates | OPEN | End-to-end receipts; policy rejection cases; crash/replay idempotency; no writer bypass |
| HRI-05 | Receipts, fairness, operational observation and contribution reporting | HRI-04; MATH-00/02/12 measurement and capacity contracts | OPEN | Automatic path works without submissions; bulk human input cannot starve it; actual website verification |

HRI-01 through HRI-03 completed 2026-09-27. Owner: maintainer executing human research intake.
HRI-04 cannot publish before publication-control closure passes. No paid service or Trigger.dev is
introduced. Use existing scheduling infrastructure after reviewing its live paths.

## Acceptance, recovery and direction

Reproduce mixed-input parsing, duplicate re-submission, partial batch failure,
restart/replay, stale/dead links, unclear identities, restricted sources, job
dates and qualified publication cases. Verify a known fixture's path from batch
to website and source-admission receipt separately from its first published job.
Test automated sourcing with zero human input and while a bounded large human
batch is queued. Establish resource and practical effect criteria before trials.

Rollback can pause the human intake dispatcher independently while preserving
batch evidence and continuing autonomous sourcing. Retry safely from the last
durable stage; do not delete unrelated sources/jobs or undo legitimate shared
sightings. Reopen acceptance after duplication, admission bypass, starvation,
missing receipts or misleading dates are observed.

Report where we have been (dated baseline), where we are (verified batch funnel,
fresh publications, recurring sources, costs and unresolved constraints), and
where we are going (next ready slice and expected effect on supply). Attribute
multi-origin discoveries without double-counting total jobs. Once accepted,
maintain the optional input channel, evaluate its marginal contribution and use
its evidence to guide future human research while autonomous sourcing continues.
