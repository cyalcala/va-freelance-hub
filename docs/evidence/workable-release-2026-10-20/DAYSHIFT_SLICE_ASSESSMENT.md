# Separate dayshift discovery slice — read-only assessment

Compared root `51159e23f15852fea4b2cabcd35b45dec07a35cb` with the frozen Workable
release `f34965b0c7bbfb76395259ccce0b60ad4533eee0`. No product source, schema,
configuration, build, test suite, production state or ref was changed. Pure
function diagnostics and retained actual metadata were read; no source requests
or new provider calls were made. Jev's earlier HTTP 401 remains non-blocking and
was not retried.

## Recommended first delta

Use two production files, plus focused tests:

- `apps/web/src/lib/public-board.ts`: derive the requested schedule from existing
  source-backed `title`, `description` and `clientTimezone` through the **f349**
  classifier, then filter before totals, ordering and pagination. An omitted filter
  must preserve the current result exactly.
- `apps/web/src/pages/opportunities.astro`: allowlist the query parameter, display
  a labeled control and removal chip, preserve the value through pagination, and
  reset pagination when removing/changing the filter. Prefer plain schedule labels
  over regional parentheticals. A day-shift-only first control is sufficient for
  the immediate priority; additional existing categories require clear tests.

Do not transplant the root classifier expansion, new `ShiftInfo.isDayshift`, or
optional public-job `shiftCategory`/`isDayshift` properties into this first slice.
No public mapper, ingestion, triage, publication, employer catalog, source
admission, API or migration changes are required. The existing f349 export already
exposes `classifyShift` and its category type.

## Source evidence versus priors

An explicit posting title or permitted description can state a schedule. A client
timezone alone establishes no working hours. The f349 classifier already keeps
timezone-only, conflicting and negated schedules unknown and does not fabricate a
Philippine time window.

`TrustedEmployerProfile.typicalWorkingHours` is explicitly documented as a
research prior, without dated per-opening schedule provenance. A scoped search
found declarations/catalog entries only, no runtime schedule consumer. The
company-directory `is_dayshift` flag is a separate company-level concept. Neither
should become an opening's schedule verdict or override its text.

Actual controls from the retained October20 widget observation:

| Hunt opening | Retained title evidence | Frozen/current category | Posting state |
| --- | --- | --- | --- |
| `AB25BEC702` | AU Accountant/Bookkeeper — Day Shift | day_shift / day_shift | STALE (September7) |
| `B4800F6960` | Australian Mortgage Loan Processor and Broker Support | unknown / unknown | WITHIN_WINDOW (October7) |
| `8720630E86` | Senior Accountant (Australian Tax) | unknown / unknown | WITHIN_WINDOW (October19) |
| `08876D5E9B` | Senior Accountant — Australian Accounting | unknown / unknown | WITHIN_WINDOW (October8) |

These are actual title-only controls, not a complete hours adjudication. At the
retained observation time, `AB25BEC702` is outside the accepted 30-day original
posting-date window and must not enter public serving through a NEW insertion or
reactivation. This does not establish its live public state or authorize a new
lifetime serving-age suppression for already active jobs. Australian client/company
context must not manufacture a schedule for the three within-window openings with
no schedule claim in their retained titles.

## Count canonical openings, not location rows

The separate `dayshift-canonical-opening-diagnostic.json` groups the retained
metadata by canonical source ID plus official opening URL. Every captured URL
already follows `https://apply.workable.com/j/SHORTCODE`; each opening contributes
one schedule result across its location variants. The frozen classifier is applied
only to actual retained titles, with missing description, hours and timezone
evidence left unknown.

| Source | Location rows | Canonical openings | Title-only day shift | Title-only unknown |
| --- | ---: | ---: | ---: | ---: |
| `workable:hunt-st` | 143 | 140 | 1 | 139 |
| `workable:crewbloom` | 152 | 64 | 0 | 64 |
| Total | 295 | 204 | 1 | 203 |

The sole title-only day-shift result is stale `AB25BEC702`. The 91 extra location
rows are not additional openings or schedule claims. No canonical group has a
title-category or original-posting-date conflict in this capture. These counts
are not a complete working-hours adjudication, a cleared publication cohort, a
live serving count or a daily verified-job throughput measurement.

The original `dayshift-readonly-assessment.json` remains unchanged; the new receipt
adds canonical counting and the narrowed freshness interpretation.

## Proven counterexamples in the current prototype

`dayshift-readonly-assessment.json` retains executed pure-function results:

- A source-text night-shift job carrying `shiftCategory: "night_shift"` and
  `isDayshift: true` matches **both** current day and night filters (one result in
  each). This diagnostic row was never stored or published.
- `Must work US morning shift` changes from frozen `unknown` to current
  `day_shift`, despite no Philippine daytime evidence.
- `9 - 4 PHT` changes from `unknown` to `day_shift` and produces an hours string,
  despite the ambiguous meridiems.
- `9am ooo 5pm PHT` changes from `unknown` to `day_shift` and produces an hours
  string because the new separator character class admits repeated `o` letters.

These findings do not justify changing the accepted Workable release. They justify
excluding the new hours parser and duplicated flags from the follow-up slice.

## Data and fallback contract

Schema 0054 already supplies opportunity title, description and client timezone;
there are no opportunity shift columns. The root schema's newer publication
operations additions are unrelated and must not accompany this slice.

Fresh D1 mapping explicitly projects known public fields and drops the proposed
two flags. Stored snapshot unpacking preserves extra properties, while validation
does not validate those flags. Trusting them therefore differs by serving path.
Always deriving from the existing text avoids that inconsistency.

Live snapshot descriptions are limited to 2,000 characters. Oversized snapshots can
drop descriptions, and the bundled last-known-good board omits them. A schedule
that appears only in a removed description will become unknown during fallback.
That is a retained evidence-availability limit, not permission to infer hours from
an employer prior or add guessed persisted flags. Existing snapshot diagnostics
must remain available.

## Bounded verification required before a separate deployment

1. No-filter result/ordering/pagination parity, and each supported category using
   the existing classifier. Timezone-only and unspecified schedules stay unknown.
2. Contradictory extra flags cannot override source text; day/night contradiction
   is fixed by ignoring the unvalidated extra fields.
3. Combined category/search/freshness/schedule filters produce correct totals and
   pagination. Invalid URL values become no filter; changing/removing a filter
   resets the page and pagination links preserve the remaining parameters.
4. Description-null/compressed/bundled fallback behavior is explicit and does not
   infer from company/client country. Directory flags remain separate.
5. Snapshot/public-predicate integration preserves the existing active and public
   PH-eligibility contract; a schedule filter only narrows its input board. Retain
   separate Workable publication regressions for source, remote, PH and freshness
   gates. In particular, stale `AB25BEC702` must be held for NEW insertion or
   reactivation under the accepted 30-day original-date guard, despite its explicit
   day-shift title. Do not introduce lifetime serving-age suppression for already
   active jobs. Reuse all four actual minimal title controls without treating the
   three title-only unknown outcomes as a complete adjudication of their hours.
6. Existing job-detail schedule contract, narrow serving regressions, typecheck,
   Pages build compatibility, independent review and separate source/artifact
   provenance. This assessment is not test-suite or deployment acceptance.

Useful source references: root `public-board.ts:29,145–154`,
`opportunities.astro:29,49,69,95,108,206`, `shiftClassifier.ts:20–64`,
`trustedEmployers.ts:3–19,43–44`, `public-serving-snapshot.ts:61,237–244,403–450,539,547–549`,
and `scripts/ci/refresh-public-lkg.ts:26`.
