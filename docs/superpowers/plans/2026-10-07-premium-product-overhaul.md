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

- [x] Introduce documented tokens and one sans family, restrained radii,
  visible focus and reduced motion. Remove ambient decorative blur.
- [x] Modernize shared header/footer, add skip link, preserve mobile navigation.
- [x] Rebuild the shared opportunity row: readable title/company/date, quiet
  source/type text, one honest geo status; preserve target/rel/Apply URLs.
- [x] Rebuild `/opportunities` with query-first controls, labelled desktop
  filter rail, native mobile disclosure, active-filter removal and GET state.
  Keep frontmatter board loading, filtering and pagination semantics unchanged.
- [x] Add only meaningful behavioral regressions for query/filter removal and
  shortcuts if extracted; no tests that merely mirror CSS.
- [x] Build/typecheck, exercise real searches/filter combinations/pagination/
  empty reset and no-JS paths; inspect 390/768/1280/1440, fix and commit.
- [x] Separate spec-compliance review, then code-quality review; fix findings.

Task 2 accepted at `90bc788d`; URL helper remains page-local. Existing data/card
tests and actual rendered interactions provide coverage; no CSS mirror test was
added. The obsolete literal Tailwind nav assertion was removed, with the intended
767/768 behavior verified in the browser. Full integrated QA remains Task 5.

## Task 3 — Homepage discovery and categories

Owned files: `src/pages/index.astro`, `src/components/OpportunitySearch.tsx`
(if retained), `src/pages/categories/[category].astro`.

- [x] Expose a real GET search and useful category shortcuts immediately.
- [x] Compact left-aligned headline and board counts/status; preview real jobs
  within first desktop viewport, retaining agency and category data unchanged.
- [x] Use server-rendered category previews where no client interaction is
  needed; preserve category totals and original job ordering.
- [x] Apply shared row/results/pagination grammar to category pages.
- [x] Inspect responsive hierarchy and navigate home search → results → detail.
  Review spec then code; fix and commit this surface slice.

Task 3 accepted at `9a595cf0`: 85 focused tests/typecheck/build, root responsive
and native navigation checks, separate spec and quality approvals. Main's two
generated digest updates were preserved by merge `a3ba42f5` before Task 4.

## Task 4 — Directory and details

Owned files: `src/pages/directory.astro`, `src/components/DirectoryCategoryNav.astro`,
`src/components/DirectoryAgencyCard.astro`, `src/pages/jobs/[id].astro`,
`src/pages/data-policy.astro`, `src/pages/privacy.astro`.

- [x] Move directory search before category navigation and use calm grouped
  employer rows with existing truthful attributes and logo fallbacks.
- [x] Retain directory categories/query/pagination, safe website handling and
  missing URL state. Add no invented active-role counts or verification times.
- [x] Give job detail a nearby/sticky application panel and labelled facts;
  maintain JSON-LD, excerpt permissions, safe source link and Apply authority.
- [x] Apply shared reading typography to legal pages, fix low-contrast update
  metadata and Astro heading class attributes; preserve all policy wording.
- [x] Inspect unknown salary/shift, long titles, source-only description,
  directory empty/category/query and mobile safe-area behavior.
- [x] Review spec then code, fix and commit.

Task 4 accepted at `c231f863`. Final review fixes `307803f4` and frontend release
cache fence `98a6d177` are independently accepted with ordinary built receipts.
The fence only invalidates HTML tied to old assets; cache/data/publication rules
remain unchanged. [Evidence and limits](../../design/PREMIUM_2026_REVIEW.md).

## Task 5 — QA, backup and release

- [ ] Run applicable tests, typecheck, build and existing no-D1 workerd smoke.
- [x] Check contrast, keyboard, reduced motion, overflow, touch targets and
  representative real URLs at required breakpoints. Save screenshots/receipts.
- [x] Run separate adversarial design/code review and bounded Jev acceptance
  consultation. Jev 401/timeout is advisory and non-blocking.
- [x] Fix the top material defects; run Impeccable detector once and document
  findings honestly, plus measured resource/bundle limits.
- [ ] Update recovery docs, commit/push logical slices, verify remote SHAs.
- [ ] Complete normal PR checks and release, verify deployed public pages,
  original Apply behavior and honest saved-board state; retain rollback tag.

No ingestion, scheduling, source admission, ranking, database or publication
contract changes are part of any task. Existing foreign work is preserved.
