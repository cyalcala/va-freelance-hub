# Directory Organization Restoration — 2026-08-21

## Outcome

Commit `df76adf` restores the category-first Agencies experience without
reintroducing the former client-hydrated full-directory payload. The August
production-hardening pagination had flattened 48 alphabetically sorted entries
into one grid, removing the category columns users relied on to decide where to
apply.

The production directory now provides:

- six explained lanes: Australian/dayshift, global VA, BPO/professional, job
  boards/resources, e-commerce/marketing, and technology/specialized;
- focused Dayshift and Marketplace views;
- category-specific search, result totals, empty states, and pagination;
- grouped result sections with `h2` category headings and `h3` company names;
- a clear distinction between direct employers and multi-employer platforms.

The server still returns at most 48 company cards per page. Category selection
is validated against a fixed allowlist before reaching D1, and every category
query retains the standing directory visibility filters.

## Verification

- Local full suite: 449 passed, 0 failed, 1,194 assertions.
- Focused final component tests: 6 passed, 0 failed.
- Strict TypeScript, guardrails, and production build: passed.
- GitHub Actions run `32474522646`: passed validation, D1 migration/FTS check,
  and Cloudflare Pages deployment.
- Production `/directory`: six live grouped headings, 48 cards on page one,
  no horizontal overflow, and zero console errors/warnings.
- Production `?category=dayshift`: active category state present, 14 cards,
  and all 14 display the Dayshift badge.

## Ownership classification gap

All visible directory rows are filtered to companies known to hire Filipinos.
The schema does not currently store verified company ownership, so the UI does
not claim that a company is Filipino-owned based on its name or marketing copy.
Adding that filter requires a reviewed ownership field, source evidence, and a
small backfill; it should be treated as data-quality work, not inferred UI copy.
