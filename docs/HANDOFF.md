# Handoff

## Current State

Date: 2026-06-06
Status: paused by user request
Overall accepted completion: 5%
Active branch: `main`

The user asked to stop implementation work and back up all progress, plans, and
doc trails so any future AI can recover and continue safely.

## What Was Completed

- Major audit was documented in `docs/major-audit-2026-06-06.md`.
- Recovery-driven methodology was adopted.
- Active architecture was corrected in `AGENTS.md`.
- Roadmap, status, recovery trail, savepoint, and ADR were added.
- P0 is accepted at 5%.

Accepted P0 evidence:

- Commit: `9657c4a`
- CI run: `27040684807`
- Acceptance docs commit: `a6fcf70`
- CI run: `27040764996`

## What Was Started But Not Changed

P1 was started only as exploration. No implementation files were edited.

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

Resume with P1 Slice 1 only:

1. Add `apps/web/src/pages/opportunities.astro`.
2. Reuse existing opportunity search/list components where practical.
3. Change homepage query limit from 500 to a compact preview count.
4. Point homepage CTA/search affordance to `/opportunities` if the full board
   moves there.
5. Run `bun run build`.
6. Run local route smoke checks if a local server is started.
7. Commit and push the slice.
8. Watch GitHub Actions.
9. Update `docs/IMPLEMENTATION_STATUS.md` and `docs/SYSTEM_SAVEPOINT.md` with
   commit hash, run ID, and progress percentage.

Do not begin P2 indexing, P3 ingestion observability, or source compliance
changes until P1 Slice 1 is accepted or the user explicitly reprioritizes.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
