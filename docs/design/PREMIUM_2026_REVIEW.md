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

## Advisory and boundaries

A bounded Jev direction consultation returned HTTP 401. Jev is advisory and
non-blocking; the owner brief, direct browser evidence and engineering contracts
remain the decision basis. No token from the failed call is stored here.

The deeper coral `#BC482D`, clean cream `#FAF9F6`, charcoal `#24211E` and Manrope
are defined in DESIGN.md. Actual contrast, responsive controls, keyboard flow,
reduced motion, resources and runtime regressions must be checked on the built
pages before acceptance. Static concept checks do not certify the production
implementation. Source admission, job qualification, ranking, scheduling,
database/publication semantics and Apply authority remain outside this change.
