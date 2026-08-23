# TAX-02 — Owner-directed category expansion: AI & Automation + Writing & Content

Date: 2026-08-23
Owner authority: run instruction "check the categories i have requested … ai and
writing and technical writing and knowledge management roles … also include all
content writing and content production related roles … strategize and implement"
(2026-08-23), backed by `docs/gauntlet/OPERATING_MANDATE.md` §22 PRODUCT SCOPE.

## Objective

Make AI and writing/content/knowledge-management roles first-class, browsable
categories end-to-end: triage vocabulary → validation → shared mapper → UI
surfaces → labelled eval corpus → counted reversible backfill of existing rows.

## Design decisions (evidence-backed)

1. **Two new UI slugs**: `ai` (AI & AUTOMATION) and `writing` (WRITING &
   CONTENT). Mandate §22 lists AI Builder / Applied AI / AI Operations / AI
   Product-Technical as one targeting cluster; a single `ai` slug keeps the
   board compact while covering all four.
2. **Knowledge management folded into `writing`, not a dedicated page**:
   read-only D1 measurement found 0 active rows with KM titles and 2 with KM
   description hits; a dedicated page would render permanently empty. KM is
   explicit in both the prompt guideline and alias normalization so future KM
   roles land on WRITING & CONTENT and remain findable. Splitting it out later
   is a bounded follow-up if volume justifies.
3. **Copywriting/content writing moved from design to writing**, matching the
   owner's "all content writing and content production related roles".
4. **No source changes**: expansion freeze stays active; paused writing/VA-heavy
   sources are recorded below as an owner decision, not acted on.

## Code slice — commit `011b673`

- `packages/scraper/triage.ts`: `TriageResult["category"]` union extended to 9;
  `validateTriageResult` whitelist extended; AI prompt category line + guidelines
  rewritten (`writing` and `ai` listed before legacy buckets; design loses
  copywriting/content writing; tech disambiguated from pure-AI roles); local
  no-AI mock categorizer gains ai/writing branches.
- `packages/scraper/triage-decision.ts`: `mapTriageCategoryToUiCategory` passes
  `ai`→`ai`, `writing`→`writing`.
- `apps/web/src/lib/categories.ts`: `JOB_CATEGORY_MAP` adds `ai`
  (`border-cyan-500/30`) and `writing` (`border-rose-500/30`). All surfaces
  (homepage per-category preview, totals badge, `/categories/[slug]`,
  `/opportunities` filter, `/jobs/[id]`) derive from this map; sitemap does not
  enumerate categories.
- `packages/scraper/fixtures/triage-eval.json`: corpus v2 — new eligible cases
  for ai/writing/KM; copywriting alias case updated to the new contract.
- Tests: `triage-decision.test.ts` mapping/whitelist/mock-categorizer coverage;
  corpus note/version bumped.

Local verification at `011b673`: full suite 642 tests / 0 failures / 1,548
assertions; typecheck exit 0; guardrails exit 0; build exit 0. CI/deploy run
`32615195950` success including "Migrate and deploy production" (Pages deploy).

## Backfill data slice (production D1, counted + reversible)

Cohort selection patterns — deterministic, title-only, active rows only
(`lower(title)` LIKE):

- **AI cohort** (28 rows): `%ai engineer%`, `%ai specialist%`, `%ai consultant%`,
  `%ai operations%`, `%ai product%`, `%prompt engineer%`, `%machine learning%`,
  `%artificial intelligence%`, `%generative ai%`, `%genai%`, `%ai automation%`,
  `%applied ai%`. Bare `%llm%` was tried during dry-run and REMOVED after sample
  review caught the false positive id 5976 "Enrollment Specialist"
  ("enro**llm**ent").
- **Writing cohort** (8 rows): `(%writer% AND NOT %underwrit%)`, `%writing%`,
  `%copywrit%`, `%content producer%`, `%content production%`, `%editorial%`,
  `%journalist%`, `%knowledge management%`.

Dry-run: exact-ID SELECT captured before mutation; every row sample-reviewed;
28 + 8 = 36 rows, within the ≤40-per-bucket blast-radius bound. Execution:
36 CAS-guarded per-row UPDATEs of the form
`UPDATE opportunities SET category='<new>' WHERE id=<id> AND category='<old>'
AND is_active=1`; result **APPLIED_OK=36, APPLIED_FAIL=0** (changes=1 each).
Undo artifact:
`docs/gauntlet/evidence/TAX-02-undo-artifact-20260823.json` (per-row old/new).

Post-state reconciliation (active rows):

| category | before | expected delta | after |
| --- | ---: | --- | ---: |
| tech | 483 | −28 ai, −1 writing | 455 |
| other | 238 | −1 | 237 |
| marketing | 145 | −4 | 141 |
| admin | 144 | — | 144 |
| customer-service | 121 | −1 | 120 |
| finance | 92 | −1 | 91 |
| design | 46 | −1 | 45 |
| **ai** | 0 | +28 | **28** |
| **writing** | 0 | +8 | **8** |
| total | 1269 | unchanged | **1269** |

Live evidence after deploy + backfill: `/categories/ai` HTTP 200 (populated),
`/categories/writing` HTTP 200 (populated), homepage renders both new cards
(`AI &amp; AUTOMATION` and `WRITING &amp; CONTENT` present in HTML).

## Freshness diagnosis (owner question: "fewer aug 22 jobs")

Read-only D1 evidence, no mutation:

- Ingestion clock healthy: all 41 source identities ticked through
  `2026-08-23T03:00:39Z`; no stalled source.
- New-active-postings by day (posted_at/scraped_at): Wed Aug 19 = 42,
  Thu Aug 20 = 29, Fri Aug 21 = 28, **Sat Aug 22 = 4**, Sun Aug 16 = 7 (prior
  weekend), Sun Aug 23 partial = low. Conclusion: **weekend seasonality**, not
  breakage — Saturdays/Sundays naturally deliver few new listings.
- Jobicy feed skips observed in `source_fetch_events` are the intentional SRC-4D
  same-origin cadence fix operating as designed (48h post window matures
  2026-08-24T19:00Z; its own gate is unchanged).
- Supply-side lever recorded for the owner (NOT executed; source-expansion
  freeze remains active): paused sources that historically carry writing/VA
  demand — `problogger`, `onlinejobs-ph`, `remote-co`, `authentic-jobs`,
  `jobspresso`, plus paused workable/breezy VA-agency tokens — would be the
  natural supply for the new categories. Re-enabling any of them requires an
  explicit owner compliance decision after COMP-01B's observe-window evidence
  matures (2026-08-24T12:38Z).

## Critic verdict and bounded revision — commit `0d77acf`

Fresh independent critic (no authorship role) returned **REVISE (fix-forward)**
and independently reproduced verification (361 scraper tests green; live D1
totals matched exactly; all 36 artifact IDs verified against live state). Five
findings, all fixed in `0d77acf`:

1. Corpus coverage guard extended from seven to nine board categories
   (`triage-eval.test.ts`).
2. This evidence doc + undo artifact + unit contract row committed (mutation
   auditability restored). Exact selection patterns documented above.
3. Writing-family near-miss slugs (`copywriting`, `technical-writing`,
   `knowledge-management`, `content-production`) now normalize to `writing`
   inside `validateTriageResult` (the choke point before whitelist coercion),
   locked by two corpus alias cases; the earlier test expecting
   `knowledge-management → other` updated to expect `writing`.
4. Stale "seven public slugs" comment in `scrape.ts` corrected to nine.
5. `ui-category-contract.test.ts` stored-slug sweep extended with `ai`/`writing`.

Post-revision local verification: scraper+web suites 543 tests / 0 failures /
1,311 assertions; typecheck exit 0. CI/deploy on `0d77acf`: run
`32616479700`.

Out-of-contract findings recorded for future units (not fixed here):
`/api/ingest.ts` accepts arbitrary authenticated category strings bypassing the
whitelist (hardening candidate); stale dead-code comment about a removed private
mapper copy in `triage-decision.ts` (docs hygiene candidate); legacy aliases
(`creative`, `social-media`, `customer-support`) remain validation-coerced to
`other` despite mapper cases (behavior unchanged since DATA-06; revisit only
with incident evidence).

## Terminal decision

**KEEP.** All contract acceptance evidence supports retaining the change:
code + revision deployed via CI/Pages runs `32615195950` and `32616479700`;
backfill reconciled exactly; live routes verified; critic findings resolved.
