# Geo-Eligibility Masterplan — Maximizing "Truly Hires Filipinos" Accuracy

**Date:** 2026-07-19 · **Status:** ✅ IMPLEMENTED (all 5 layers, 2026-07-19) · **Cost constraint:** $0 (free tiers only)

## Implementation record (live-verified 2026-07-20)

| Layer | Commit | Verified in production |
| --- | --- | --- |
| L0 capture + L1 gate + fail-closed | `8176314` | New RemoteOK job rejected via captured location ("Florida") |
| Phase 2 backfill | `3ab7309` | 72 geo-locked jobs deactivated of 2,278 swept |
| L2 AI consensus + 70B model | `1a3d593` | 17 consensus splits quarantined overnight; backlog 1,870→1,830 in 6.5h |
| L5 badges + trust copy | `b9b2e17` | 🌍 badges + evidence tooltips render on the live board |
| L3 metrics + L4 page scan | `d2e4f81` | geoRejectionsBySource in responses; verifier GET-scans 15 pages/run |

151/151 tests green (`geoGate.test.ts` golden set; Casino Lugano is fixture #1).
Deferred: PH-exclusive ATS stream — resumes with the paused directory audit.

## The trigger case (fully diagnosed)

Job #4667 — *"Addetto a Customer Service"*, Casinò Lugano SA, via RemoteOK
(`remote-addetto-a-customer-service-casino-lugano-sa-1135023`). An
Italian-language, Switzerland-targeted casino job that reached the
customer-service board as "remote". Diagnosed failure chain, each link
verified against production code and data:

1. **RemoteOK's `location` field is discarded.** The API sends `location`
   per job (live check: 90 of 100 current jobs carry values like
   "Florida, United States", "London, England, United Kingdom", "India").
   Our `RemoteOkJob` interface (`packages/scraper/json.ts`) doesn't even
   declare the field. The single most authoritative signal — thrown away.
2. **We Work Remotely's `<region>` RSS tag is discarded.** Live check: 29/37
   items say `Anywhere in the World`; the rest name a restriction ("Texas",
   "Dubai", "NORDRHEIN_WESTFALEN"). A structured, 100%-reliable eligibility
   signal — unread by `rss.ts`.
3. **The stored tags contained the answer.** Row #4667's tags include
   `"italian", "german"` — RemoteOK told us the role's languages and no code
   looks at tags during triage.
4. **Heuristics have no Italian/Spanish coverage.** `LOCAL_OR_NON_ENGLISH_REGEX`
   (`triage.ts:53`) covers German/French artifacts (m/w/d, werkstudent,
   alternance). "Addetto" sails through. No general language detection exists.
5. **AI triage sees too little and fails open at the field level.** The
   prompt gets only title + 1500-char description — no location, no tags, no
   company context. And `triage.ts:261`: a missing/invalid
   `eligibleForFilipinos` in the model's JSON **defaults to `true`**.
6. *(Bonus data-quality find)* mojibake: company stored as "CasinÃ² Lugano SA" —
   UTF-8/Latin-1 double-decode in the ingest path.

## Verdict model (the taxonomy everything maps to)

Two new job-level fields, persisted and user-visible:

- `geo_scope`: `worldwide` · `apac_incl_ph` · `ph_only` · `region_excl_ph` ·
  `country_locked` · `unknown`
- `ph_eligibility`: `eligible_verified` · `eligible_likely` · `unclear` ·
  `ineligible`

Board policy: show `eligible_*` only. `ph_only` earns a 🇵🇭-exclusive badge
(this is the "hiring exclusively in the Philippines" tier). `unclear` is
**quarantined** (kept, hidden) until a later pass upgrades or expires it.
`ineligible` is soft-rejected with evidence retained. Plus supporting
columns: `location_raw`, `geo_evidence` (one-line reason), `geo_checked_at`.

## Defense-in-depth: five layers

### Layer 0 — Capture the structured signals we already receive (highest ROI, $0, no AI)

| Source | Signal | Action |
| --- | --- | --- |
| RemoteOK | `location` field | persist to `location_raw`, feed the gate |
| RemoteOK | language tags (`italian`, …) | feed the gate |
| WWR RSS | `<region>` tag | `Anywhere in the World` → `worldwide`; named region → gate decides |
| Jobicy | `jobGeo` field / APAC-filtered feeds | confirm + persist |
| ATS feeds (Greenhouse/Lever/Ashby/Workable) | `location` / `offices` objects | persist where present |

This alone would have stopped the Casino Lugano job three separate ways.

### Layer 1 — Deterministic geo-gate (pure TS, testable, runs before any AI)

New `packages/scraper/geoGate.ts` — `geoGate(input) → {verdict, evidence}`:

1. **Location parser**: compact gazetteer (country names + demonyms, US
   states, major cities incl. the usual remote-job suspects) maps
   `location_raw` → country/region. "Florida, United States" →
   `country_locked(US)`; "Worldwide"/"Remote, Global"/"" → no restriction
   inferred; "Philippines"/"APAC"/"Asia"/"SEA" → eligible fast-path.
2. **Language detection**: stopword-frequency detector (~60 lines, no deps)
   over title+description for IT/DE/FR/ES/PT/NL/PL. Non-English dominant →
   `ineligible` ("non-English posting"). Catches "Addetto a Customer
   Service" instantly.
3. **Expanded restriction patterns** (grow `triage.ts`'s regex):
   "must be based in …", "located in …", "eligible to work in …",
   "work authorization required", onsite/hybrid/in-office markers,
   "[City] - " title patterns, EU-work-permit phrasing. Careful negative:
   timezone-*overlap* asks ("must overlap 4h with EST") stay eligible —
   that's normal VA reality — only hard residence/authorization locks reject.
4. **Tag rules**: language-name tags without `english` → reject; `worldwide`/
   `global` tags upgrade confidence, never override a named restriction.

Only `unknown` verdicts proceed to AI — inverting today's flow where nearly
everything burns an AI call.

### Layer 2 — Hardened AI triage (for the genuinely ambiguous middle)

- **Feed it everything**: title, description, `location_raw`, source tags,
  company, source name — not title+description alone.
- **Restructure the prompt around `geo_scope`** with few-shot examples
  (Italian casino → ineligible; "US only" → ineligible; "APAC welcome" →
  eligible; WWR worldwide → eligible; "PH applicants only" → ph_only).
- **Kill the fail-open**: invalid/missing eligibility from the model →
  `unclear` + quarantine, never `true` (fix `triage.ts:261`).
- **Consensus for publishing**: an `eligible` verdict from pass 1 needs a
  cheap second vote (re-ask, different phrasing) to publish; disagreement →
  quarantine. Bounded cost: Layers 0–1 already removed the obvious bulk.
- **JSON mode + model upgrade**: use Workers AI structured output; evaluate
  `llama-3.3-70b-instruct-fp8-fast` (free tier, far better nuance than
  3.1-8b) as primary with 8b fallback.

### Layer 3 — Source-side prevention & PH-exclusive supply

- Post-fetch region filter per source (WWR: only `Anywhere in the World`
  unless region is PH/APAC; RemoteOK: gate on `location`).
- Jobicy: add the `geo=philippines` feed if available — direct `ph_only`
  supply.
- **The directory audit feeds this** (paused, resumable): the ~30 PH
  BPO/agency ATS tokens in `va_directory` are companies hiring exclusively/
  primarily Filipinos — wiring their boards in creates the flagship
  "🇵🇭 exclusive" stream. The paused audit's Phase-2 output (which agencies
  are alive + genuinely PH-hiring) is exactly the vetting that stream needs.
- **Source quality score**: per-source geo-rejection rate recorded per run
  (`source_fetch_events`); chronically bad segments get stricter defaults
  (e.g. RemoteOK non-worldwide → auto-quarantine instead of AI benefit-of-
  the-doubt). Sentinel can flag worsening sources.

### Layer 4 — Retroactive sweep + continuous verification

- **Backfill**: run the gate over all active jobs (chunked ≤100 bound params,
  repo standard), quarantine violators, publish before/after counts in the
  run summary. Expect a visible purge of RemoteOK country-locked items.
- **Verifier pulse extension**: it already visits application URLs for
  liveness — add a geo-language scan of the landing page text (our stored
  description is truncated at 1500 chars; the application page carries the
  truth). Confirmed country-lock → deactivate with evidence.
- **Golden test set**: the Casino Lugano job + ~15 labeled real cases as
  vitest fixtures for `geoGate()`; prompt changes must keep the set green
  (regression harness for both the deterministic and AI layers).

### Layer 5 — Product surfacing (accuracy becomes visible trust)

- Badges: 🌍 Worldwide · 🇵🇭 PH-exclusive · ⏰ APAC-friendly; "Open to
  Philippines" is the default board view.
- Show `geo_evidence` on job cards/detail ("Region listed: Anywhere in the
  World") — users see *why* a job is trustworthy.
- Trust copy on the homepage: every listing geo-checked for PH eligibility —
  a real differentiator no generic aggregator offers.

## Rollout order (each step lands committed + live-verified)

1. **Layer 0 + Layer 1 + fail-open fix** — one migration (new columns) + the
   gate + tests. Kills the entire Casino-Lugano class on arrival day.
2. **Backfill sweep** of existing actives + before/after report.
3. **Layer 2** AI hardening (prompt, consensus, JSON mode, model eval).
4. **Layer 5** badges + default filter (user-visible payoff).
5. **Layer 3** PH-exclusive ATS stream — after resuming/finishing the
   directory audit (its output gates which boards to trust).
6. **Layer 4** Verifier landing-page scan (slowest loop, biggest depth).

Also fix in passing: the UTF-8 mojibake in ingest (`normalizeText`).

## Why this reaches "maximum strength"

Independent layers with different failure modes: structured metadata
(authoritative), deterministic linguistics (cheap, exact), LLM judgment
(nuanced middle), post-publish verification (catches drift), and product
transparency (users as the final reviewers). A job must slip **all five** to
mislead a jobseeker — today it only has to slip one 8B-model prompt that
never even sees the location field.
