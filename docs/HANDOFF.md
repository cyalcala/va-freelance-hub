# Handoff

## Current State

Date: 2026-06-08
Status: P1 accepted, P2 next
Overall accepted completion: 20%
Active branch: `main`

The user resumed the original roadmap and approved continuing slice by slice.
P1 was implemented, pushed, passed CI, manually deployed, and smoked in
production.

## What Was Completed

- Major audit was documented in `docs/major-audit-2026-06-06.md`.
- Recovery-driven methodology was adopted.
- Active architecture was corrected in `AGENTS.md`.
- Roadmap, status, recovery trail, savepoint, and ADR were added.
- P0 is accepted at 5%.
- P1 is accepted at 20% overall.

Accepted P0 evidence:

- Commit: `9657c4a`
- CI run: `27040684807`
- Acceptance docs commit: `a6fcf70`
- CI run: `27040764996`

Accepted pause handoff evidence:

- Commit: `431ab60`
- CI run: `27041163556`
- Scope: docs-only recovery trail; no implementation files changed.

## What Was Completed In P1

- Added `apps/web/src/pages/opportunities.astro`.
- Reused existing opportunity cards and visual styling.
- Added server-side search/filtering and pagination to `/opportunities`.
- Changed homepage query limit from 500 to 60.
- Made the homepage a preview rather than the full search surface.
- Moved the global "Find a Job Now" CTA to `/opportunities`.
- Build passed with `npm.cmd run build --workspace apps/web`.
- Local route smoke passed for `/`, `/opportunities`, paginated/filter URLs,
  and `/directory`.
- Pushed commit `2475103`.
- GitHub Actions run `27141658140` passed.
- Deployed with Wrangler to `https://68b1259d.remotejobs-ph.pages.dev`.
- Public alias `https://remotejobs-ph.pages.dev/opportunities` returned 200.

## P1 Exploration Notes

Files read during P1 exploration:

- `apps/web/src/pages/index.astro`
- `apps/web/src/components/OpportunitySearch.tsx`
- `apps/web/src/pages/categories/[category].astro`
- `apps/web/src/components/CategoryOpportunitySearch.tsx`
- `apps/web/src/components/opportunity-card.tsx`
- `apps/web/src/lib/categories.ts`
- `apps/web/src/layouts/Layout.astro`
- `apps/web/src/components/nav.tsx`
- `apps/web/src/components/footer.tsx`
- `apps/web/astro.config.mjs`
- `packages/db/schema.ts`

Observed P1 facts:

- Homepage currently selects up to 500 active opportunities and hydrates them
  into `OpportunitySearch`.
- `/opportunities` is linked in navigation but has no active Astro page.
- Category pages already have a search/list pattern that can be reused.
- The simplest next slice is to add an Astro `/opportunities` page and reduce
  homepage data volume to a smaller latest-jobs preview.

## Next Safe Resume Task

P2 Slice 1: add query-aligned D1 indexes and capture before/after query-plan
evidence.

Known follow-up: CI currently builds but does not deploy automatically. P1 needed
a manual Wrangler deployment even after CI passed.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
