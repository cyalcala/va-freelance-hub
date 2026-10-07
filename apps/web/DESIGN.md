# Premium 2026 design contract

Authority: October 7 owner request and
`../../docs/design/PREMIUM_2026_OWNER_BRIEF.md`. Product facts live in PRODUCT.md.
The July design record remains historical; this replaces its visual rules.

## Direction and design read

Warm Precision + Employment Intelligence: a warm, useful employment desk with
the discipline of an application. Cream, charcoal and a deeper coral preserve
the brand. Compact typography, aligned metadata and prominent search carry the
premium quality. Homepage is approachable; opportunities is precise and dense.
Design variance 6/10; motion intensity 2/10; visual density 7/10.

The owner supplied the direction and explicitly requested implementation with
the existing color family. Compare A/B/C within those commitments; no random
palette selection, template hero, decorative illustration or new service.

## Surfaces and first viewport

- Home: left-aligned compact headline, a real GET search, useful category links,
  dated board counts/status, then real job previews within the first desktop
  viewport. Agency jobs and category discovery retain their real existing data.
- Opportunities: small page introduction, generous query input, then a 224–240px
  filter rail and wide result stream. Labels remain visible. Native filter
  disclosure on mobile; no-JS fallback exposes working form controls. Native GET
  submission, result range, active-filter removal, clear-all and pagination.
- Directory: search before category navigation; quiet category links and grouped
  employer rows, not an expanse of identical floating company cards. Preserve
  category/query URLs and direct safe website links; no invented role counts.
- Details: readable title/company, concise evidence, labelled facts and a nearby
  apply panel. Preserve permitted excerpt rules, actual salary/timezone fields,
  original-source links, JSON-LD and safe Apply route behavior.
- Categories: shared job-row grammar, readable introduction, search-category
  link and existing pagination. Legal pages inherit type and chrome.

## Tokens

Keep existing Tailwind color names compatible and add semantic roles.

| Role | Value / rule |
| --- | --- |
| Page | `#FAF9F6`, clean warm neutral |
| Surface | `#FFFFFF` |
| Recessed | `#F1EFEB` |
| Ink | `#24211E` |
| Muted text | `#68615B`, including placeholders |
| Primary coral | `#BC482D`, white button text; measure AA contrast |
| Coral hover | `#9F3B24` |
| Coral tint | `#F8EBE5` |
| Healthy/evidence | `#24634C` on `#EDF5F0`, only actual semantic states |
| Attention | `#815C18` on `#FBF3DF`, genuine saved-board state |
| Divider border | Ink alpha 12–16%; decorative separators |
| Control border | `#938B83`, at least 3:1 against white/cream |
| Font | Manrope variable sans; system-ui fallback, one family |
| Type | 13 metadata, 14 controls, 15/16 body, 17 job title, 28–36 page title, 40–52 home title |
| Weight | 400 body, 500 metadata, 600 controls/titles, 700 headline |
| Numbers | tabular numerals for counts, dates and result ranges |
| Spacing | 4px scale, 8/12 grouped, 16/24 row, 32/48 section |
| Radius | 4px badges, 6px inputs/buttons, 8px surfaces; circles only marks/dots |
| Shadow | One subtle elevated-control shadow; no shadows on ordinary rows |
| Motion | 160ms color/border/surface feedback, no hover translation/scale |
| Container | 1200px content maximum, 20px mobile gutters, 32px desktop |

## Component grammar

Coral identifies primary actions, selected controls and a small brand emphasis.
Selected navigation text uses the darker coral `#9F3B24` on the coral tint for
5.76:1 contrast; primary white-on-coral buttons retain `#BC482D`.
No rainbow platform badges. Job title, company, source posted date, employment
type and source attribution are legible text. At most one meaningful geographic
status treatment; evidence tooltip remains supplemental. Do not label likely PH
eligibility verified or source posting age as verification age. Unknown metadata
stays absent or explicitly unspecified in a relevant detail context.

Use semantic links, forms, labels, buttons, details/summary and definition lists.
Job rows use stable initials rather than implying a platform favicon is a company
logo. Directory retains its existing real/fallback logo mechanism. No nested
interactive link, hover-only essential content or custom controls without need.

## Responsive, state and accessibility contract

Inspect 390/768/1280/1440; check 320 and 1920 overflow as supplemental boundaries.
Below 1024, filter rail becomes native disclosure; search remains available and
the result stream occupies the width. At 390 the header keeps identity, bottom
navigation remains thumb-reachable and controls are at least 44px. No mobile
horizontal scrolling for main content. Titles wrap without losing their meaning.

Keyboard: skip link, sensible tab order, focus ring with at least 3:1 contrast,
native summary Enter/Space, optional `/` to focus search outside editable fields,
visible shortcut hint on desktop. Search and filtering still work without JS.
Reduced motion eliminates optional transitions and smooth scrolling.

States: clear empty-result recovery, real disabled pagination, query-preserving
filter removal, native navigation feedback, saved-data warning retaining its
real generation timestamp. No fake loading skeleton for immediate SSR content.
No new client request or D1 query to decorate a card.

## Technology, assets and budgets

Astro/React/Tailwind already installed. CSS and a small progressive search/filter
script; no animation, state, command-menu or component-library dependency.
No stock or generated imagery is needed for an employment utility. Icons only
communicate actual actions. Google Fonts remains the existing font transport;
one variable Manrope family with `display=swap` and system fallback. Record font
provenance and measure loaded resources; do not claim field Core Web Vitals from
an isolated local run. Avoid increasing client hydration; homepage discovery can
be server rendered. Core discovery works if JS/fonts/logos fail.

## Rejected directions and acceptance

Compare Warm Precision (A), dense Employment Intelligence (B) and Contemporary
Filipino Professional (C) using real dated data. Final A×B retains A's warmth
and B's utility. Reject terminal-only density, personality-first marketing,
giant centered slogans, glass, gradients, badge inflation, gratuitous motion,
fake PH evidence and unsupported salary/shift filters.

Accept only after actual browser rendering, responsive screenshots, keyboard and
GET interaction tests, empty/pagination/detail/directory checks, contrast checks,
build/typecheck and relevant existing runtime/offline regression checks. A
separate reviewer checks spec compliance then code quality. Fix material issues,
run the Impeccable detector once and record any bounded performance limitations.
