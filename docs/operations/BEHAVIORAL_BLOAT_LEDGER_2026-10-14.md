# Behavioral bloat ledger — 2026-10-14

Traced on the scrape path that fetches sources and inserts openings.
Question for each layer: what decision does it add, and what fails if it goes?

## Removed

1. RSS-first `newItems.slice(0, limit)`.
   The array is RSS, then HTML, then JSON, then ATS. Fifty new RSS URLs
   filled the default cap. Fresh Hunt St and Coconut VA openings behind
   that head never reached geoGate, and the next run repeated the drop.
   Invariant kept: the cap is still 1–100, default 50.
   Replacement: `selectIntakeBatch` takes one item from each source in turn.
   Before: 50 RSS items plus a Hunt URL and a Coconut URL produced no ATS
   item. After: both ATS URLs are in the 50. A full RSS head still defers
   some of a large ATS backlog to the next run. Those URLs stay new.
   The following pass, given a new RSS head plus only the deferred ATS
   URLs, selects every deferred URL. Nothing in the selector drops them
   on the second visit.
   Test: `apps/web/tests/intake-fairness.test.ts`.

2. Second Workable 60-minute clock in the ATS loop.
   `selectWorkableRotation` already skips a tenant whose durable attempt is
   under 60 minutes, and it rejects invalid timestamps before the loop.
   The loop's `Date.parse` check could not change a Workable decision that
   reached it. Non-Workable boards still use `atsFetchCadenceSkip`.
   Test: a Hunt tenant 30 minutes old is `COOLDOWN` in the rotation, and
   `atsFetchCadenceSkip("breezy", ...)` still returns the cadence sentence.
   The same clock returns null for `workable`, so it cannot explain a Hunt
   or Coconut miss. A tenant absent from `selectedSourceIds` contributes
   no intake row. A URL the cap defers was fetched, and the next
   `selectIntakeBatch` call selects it. Those are different stages.
   `apps/web/tests/rotation-vs-intake.test.ts` drives both functions.
   The two-slot limit was not raised.

3. ATS URLs missing from `sourceIdsByUrl`.
   The map was built from RSS, HTML, and JSON only, so an ATS URL past the
   cap named no source. `mergeSourceIdsByUrl` adds the ATS results.
   Conditional validators are still written only for RSS, HTML, and JSON.
   ATS does not send If-None-Match. The merge makes the overflow visible.
   It does not publish by itself.

4. Model eligibility veto on a structured geo pass.
   `geoGate` already returns `ph_only`, `apac_incl_ph`, or `worldwide`.
   `decideTriage` asked the model the same question and could store the
   opening inactive, or withhold it when AI was down. That is one decision
   made twice. The model vote no longer changes the kind for those scopes.
   A deterministic phrase still does: `US citizens only` on a Philippines
   scope stays `ineligible`. Unknown scope still fails closed, and a
   country-locked or stale row never reaches this function. Category from
   the model, or the no-AI title heuristic, is still kept.
   Test: `packages/scraper/triage-decision.test.ts`.

## Kept, with the evidence

- `geoGate`. Removing it would publish United States and onsite rows from
  employers that also hire in the Philippines. Pineapple's three open roles
  are United States. Hunt's Accounting Manager is Philippines and
  telecommuting false, so the parser writes `(onsite)` and the gate rejects it.
- `assessPostingFreshness`, 30 days, original instant only. Pineapple's
  dates are 2020–2022. A missing date stays withheld.
- `selectWorkableRotation` limit of 2 per hour. This is the request budget,
  not a second copy of the eligibility gate. Seven admitted Workable tenants
  means a due tenant waits on the order of a few hours, not forever.
  Directory `verifiedAt` is still written after a successful fetch and is
  still not read by the selector. Deleting that write does not publish a job.
- Canary publication clamp. Hunt and Coconut already have public rows, so
  this clamp is not why their new titles are missing.
- `safeNormalizeDate` on Workable date-only values. It turns `2026-10-14`
  into an ISO instant the freshness check can read. Removing it would mark
  those openings INVALID and increase false negatives.
- Workable `jobs` array fallback to `[]` on a 200. It can hide a bad payload
  as an empty board. It is not why these inventories, which returned jobs,
  are missing. Left in place.
- Workable `locations[]`. On 2026-10-14 the widget rows carried that array
  with `hidden: true`, and the scalar country already matched. The only
  Philippines name outside the scalar country was a hidden row on Coconut's
  United States talent pool. Reading hidden locations would publish that
  US row. Left unused. The list payload has no description field, so a null
  description is not a dropped body.
- Date-only Workable `published_on` stays on `new Date(raw).toISOString()`
  in the lake extractor. `normalizeSourcePostingDate` returns null for a
  date-only string. Using it there would mark fresh widget dates unknown
  and increase false negatives. That edit was not kept.

## Not a recall bypass

Employer confidence is not passed into `geoGate` or freshness. A day-shift
title located in the United States stays ineligible. `classifyShift` does
not publish.