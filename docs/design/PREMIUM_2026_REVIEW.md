# Premium 2026 direction review

Date: 7 October 2026. Scope: frontend product design only.
Return point: `savepoint/pre-premium-design-2026-10-07`, source
`50d8daa280d74b2a34f8d9ec1ed4a8dd1a5d0c73`.

## Current product defects

The accepted production homepage was inspected at 1440 × 1000. Its first
actual job link began at **972.4 CSS pixels**; there was no search input on the
homepage. A large centered headline, maker pill and generous empty space delayed
the primary discovery task. These measurements describe the inspected page,
not field performance or every viewport.

The existing job board compressed its query beside four selectors. Filter labels
were visually hidden, metadata used several platform colors, and title truncation
reduced the information available when comparing roles. Mobile filter expansion
used a hidden checkbox and label rather than native disclosure semantics.

The original public fallback warning is operationally meaningful. A fresh board
must not show it; an actual stale/saved board must retain its real generation
timestamp. This redesign will improve its presentation without hiding the state.

Five priorities, in order:

1. Put a real search and actual jobs earlier in the discovery path.
2. Give filters visible labels, URL persistence and keyboard/native behavior.
3. Make title, company, source date and geographic scope readable without a
   collection of colored pills.
4. Use one restrained type, spacing, border and radius system across surfaces.
5. Keep application access and source evidence close to a readable detail page.

## Rendered alternatives

`premium-concepts.html` uses five exact public fixture records and explicitly
labels its fixed preview, source date and counts. Its forms open the real board;
they do not pretend to filter the fixed preview. It changes no production route.
All three directions were rendered and visually inspected at **1440 × 1000** and
**390 × 844**. No horizontal overflow was observed at 390 (document width 375,
viewport width 390, accounting for the browser scrollbar).

| Direction | Structure and useful strengths | Limitation | Decision |
| --- | --- | --- | --- |
| A: Warm Precision | Compact left introduction, broad search, quiet real job list; approachable cream and coral | Mobile introductory content needs further compression in the production page | Use its warmth and homepage hierarchy |
| B: Employment Intelligence | Filter rail, aligned facts, continuous result stream; strongest comparison workflow | Fully expanded mobile filters delay results; production disclosure will collapse progressively when no filters are active | Use its board structure and utility |
| C: Contemporary Filipino Professional | Role families and actual agency opportunities lead discovery; more human emphasis | More introductory copy and navigation before results | Retain useful category/agency discovery within A, without using C as the main scaffold |

The owner already specified a preferred **A×B** and requested implementation
with the same color family. The rendered comparison supports that choice. This
is an execution decision within that supplied direction, not a new approval gate.
The final layout will be derived from the committed PRODUCT.md and DESIGN.md;
these static concepts are comparison material, not finished production pages.

Concept screenshots are retained under `evidence/` as review evidence. Production
screenshots, behavior checks, independent reviews and acceptance receipts will be
added as the corresponding surfaces are implemented. No release is claimed yet.

## Task 2 — Shared foundations and opportunities

Implementation: `105858083f672b5dc76cd1766ee271eb1f0045f0`; continuous mobile
navigation boundary fix: `90bc788d575f7a7b8b8abcec082142c44b700787`.
The original board loader, slicer, headers, validation, pagination and card
eligibility/Apply URL logic remain unchanged. The surface now has a broad search,
232px desktop rail, native mobile disclosure, readable rows and shared chrome.

Root browser verification on the local saved fixture:

| Check | Observed outcome |
| --- | --- |
| 390 / 768 / 1280 / 1440 | Rendered and inspected; no horizontal overflow |
| 320 / 1920 | Supplemental boundary inspection; no horizontal overflow |
| Navigation boundary | 767: mobile only; 768: desktop only; fractional gap found, fixed and rendered again |
| Mobile disclosure | Initially collapsed without selected filters; Enter expands; active filter selections remain exposed |
| Combined GET filters | Query + category + type + source + scope retained in URL and native selected controls; correct empty state |
| Individual removal | Removing category retained other selections and returned 15 jobs; removing source retained query/type/scope and returned 29 |
| Pagination and removal | Query + PH scope page 2 showed 31–40 of 40; removing scope retained query and reset to page 1 |
| Empty recovery | Explicit unmatched query showed 0–0, disabled pagination and working Reset filters |
| Keyboard | Skip link focused MAIN; `/` outside an input focused search; `/` inside the search input remained literal text |
| Job focus/type | Inset coral focus remained visible within the result surface; title 17px and metadata 13px; metadata RGB 104,97,91 |
| Browser console | No captured warnings or errors in this inspection |
| Saved state | Genuine local LKG warning retained its exact generation timestamp and retry meaning |

Focused implementation checks: 30 tests passed (29 relevant data/card tests plus
retained company-logo transport regression), typecheck and build passed. Separate
spec review passed at `90bc788d`, with 45 independent focused tests. The obsolete
test that merely required old literal Tailwind class strings was removed; actual
767/768 browser observations now document its intended behavior. This is not a
replacement assertion on the new CSS implementation.

The initial viewport receipt records the discovered boundary issue before its
fix; `premium-nav-boundaries.json` is the corrected observation. No production
release is claimed by these local checks. Final full-suite, no-D1 runtime,
resource and integrated workflow acceptance remain pending.

Separate code-quality review approved Task 2 at `90bc788d`: no critical,
important or actionable minor findings. Root's remaining empty, focus, skip and
boundary checks then passed. Task 2 is locally accepted; integrated release QA
and the remaining product surfaces still need completion.

## Task 3 — Homepage and categories

Implementation: `9a595cf076051d4206c7e50fe246d5f025e0c5d2`, pushed and remote
SHA verified. Native homepage search, six recent rows, original agency records,
ordered category previews and real category totals use the existing loaders.
No homepage hydration or dependency was added. Category guards, ordering,
pagination and shared Apply authority are preserved.

Root rendered 390/768/1280/1440 without horizontal overflow. With the genuine
local saved-board warning, the first row began at 839.6/683.2/618.4/618.4 CSS pixels
respectively. The original production desktop baseline began at 972.4px without
that warning, so these are layout observations across different serving states,
not a controlled performance comparison. Mobile keeps the warning and usable
search ahead of listings; the explicit first-desktop-viewport requirement passes.

Native GET search for MultiplyMii returned 68 rows and opened eligible job 8992.
The AI category showed 40 jobs, page 2 showed 31–40, and Search this category
preselected its native board filter. Screenshots are retained in `evidence/`.
Implementation verification passed 85 focused tests, typecheck, build and diff
check. Separate spec review approved this SHA with no material findings.
Separate code-quality review also approved this SHA with no material actionable
findings. Task 3 is locally accepted; integrated release QA remains pending.

## Advisory and boundaries

The separate concept spec review passed at `068e7c94`. Code-quality review then
found three accessibility defects: desktop pointer-disabled disclosure remained
keyboard-toggleable, desktop result labels were hidden from assistive technology,
and the dark review header had insufficient focus contrast. Bounded fixes at
`7fe5489d` and `08c401a3` restore native interaction, field labels and a cream
header focus outline. Desktop Enter collapse/expand and mobile rendering were
rechecked in the browser. Control borders also use `#938B83` rather than a faint
decorative divider. White-on-coral contrast is 5.12:1, muted-on-cream 5.78:1,
control-on-white 3.35:1 and control-on-cream 3.19:1 by sRGB calculation.

A bounded Jev direction consultation returned HTTP 401. Jev is advisory and
non-blocking; the owner brief, direct browser evidence and engineering contracts
remain the decision basis. No token from the failed call is stored here.

The deeper coral `#BC482D`, clean cream `#FAF9F6`, charcoal `#24211E` and Manrope
are defined in DESIGN.md. Actual contrast, responsive controls, keyboard flow,
reduced motion, resources and runtime regressions must be checked on the built
pages before acceptance. Static concept checks do not certify the production
implementation. Source admission, job qualification, ranking, scheduling,
database/publication semantics and Apply authority remain outside this change.
