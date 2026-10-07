# Premium product overhaul implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the supplied premium A×B frontend direction while retaining
the current cream/coral identity and every existing public-data safeguard.

**Architecture:** Server-rendered Astro pages consume the existing public board.
Shared token/chrome/job-row primitives unify the surfaces. Native GET controls
and small progressive enhancements preserve no-JS discovery and URL state.

**Tech Stack:** Existing Astro 5, React 19, Tailwind 3; CSS/native browser controls.
No new dependency or backend change.

## Approved requirements and return point

Owner supplied detailed requirements and preferred A×B, then explicitly requested
following them with the same palette. PRODUCT.md and DESIGN.md record that scope.
Savepoint tag `savepoint/pre-premium-design-2026-10-07` is pushed before any UI
change; [restore procedure](../../design/PREMIUM_2026_SAVEPOINT.md).

## Task 1 — Context, critique and three concepts

- [x] Archive the complete owner brief and preserve/verify the baseline tag.
- [x] Inspect the current layout, palette, home, job board and data boundaries.
- [x] Record PRODUCT.md and DESIGN.md from the supplied brief and existing facts.
- [x] Create `docs/design/premium-concepts.html` with three distinct structures,
  real minimal dated public records and explicit preview labelling.
- [x] Render/inspect A, B and C at desktop and mobile; record the A×B selection
  and current defects in `docs/design/PREMIUM_2026_REVIEW.md`.
- [x] Commit and push the design contract/concepts before production UI edits.

## Task 2 — Foundations and flagship opportunities

Owned files: `apps/web/tailwind.config.mjs`, `src/styles/globals.css`,
`src/layouts/Layout.astro`, `src/components/footer.tsx`,
`src/components/opportunity-card.tsx`, `src/pages/opportunities.astro`.

- [ ] Introduce documented tokens and one sans family, restrained radii,
  visible focus and reduced motion. Remove ambient decorative blur.
- [ ] Modernize shared header/footer, add skip link, preserve mobile navigation.
- [ ] Rebuild the shared opportunity row: readable title/company/date, quiet
  source/type text, one honest geo status; preserve target/rel/Apply URLs.
- [ ] Rebuild `/opportunities` with query-first controls, labelled desktop
  filter rail, native mobile disclosure, active-filter removal and GET state.
  Keep frontmatter board loading, filtering and pagination semantics unchanged.
- [ ] Add only meaningful behavioral regressions for query/filter removal and
  shortcuts if extracted; no tests that merely mirror CSS.
- [ ] Build/typecheck, exercise real searches/filter combinations/pagination/
  empty reset and no-JS paths; inspect 390/768/1280/1440, fix and commit.
- [ ] Separate spec-compliance review, then code-quality review; fix findings.

## Task 3 — Homepage discovery and categories

Owned files: `src/pages/index.astro`, `src/components/OpportunitySearch.tsx`
(if retained), `src/pages/categories/[category].astro`.

- [ ] Expose a real GET search and useful category shortcuts immediately.
- [ ] Compact left-aligned headline and board counts/status; preview real jobs
  within first desktop viewport, retaining agency and category data unchanged.
- [ ] Use server-rendered category previews where no client interaction is
  needed; preserve category totals and original job ordering.
- [ ] Apply shared row/results/pagination grammar to category pages.
- [ ] Inspect responsive hierarchy and navigate home search → results → detail.
  Review spec then code; fix and commit this surface slice.

## Task 4 — Directory and details

Owned files: `src/pages/directory.astro`, `src/components/DirectoryCategoryNav.astro`,
`src/components/DirectoryAgencyCard.astro`, `src/pages/jobs/[id].astro`.

- [ ] Move directory search before category navigation and use calm grouped
  employer rows with existing truthful attributes and logo fallbacks.
- [ ] Retain directory categories/query/pagination, safe website handling and
  missing URL state. Add no invented active-role counts or verification times.
- [ ] Give job detail a nearby/sticky application panel and labelled facts;
  maintain JSON-LD, excerpt permissions, safe source link and Apply authority.
- [ ] Inspect unknown salary/shift, long titles, source-only description,
  directory empty/category/query and mobile safe-area behavior.
- [ ] Review spec then code, fix and commit.

## Task 5 — QA, backup and release

- [ ] Run applicable tests, typecheck, build and existing no-D1 workerd smoke.
- [ ] Check contrast, keyboard, reduced motion, overflow, touch targets and
  representative real URLs at required breakpoints. Save screenshots/receipts.
- [ ] Run separate adversarial design/code review and bounded Jev acceptance
  consultation. Jev 401/timeout is advisory and non-blocking.
- [ ] Fix the top material defects; run Impeccable detector once and document
  findings honestly, plus measured resource/bundle limits.
- [ ] Update recovery docs, commit/push logical slices, verify remote SHAs.
- [ ] Complete normal PR checks and release, verify deployed public pages,
  original Apply behavior and honest saved-board state; retain rollback tag.

No ingestion, scheduling, source admission, ranking, database or publication
contract changes are part of any task. Existing foreign work is preserved.
