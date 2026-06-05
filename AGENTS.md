# VA Freelance Hub - Agent Context

## What This Is

VA Freelance Hub is a public portfolio project and resource site for Filipino
freelancers. It indexes public remote and VA-friendly opportunities, maintains a
VA-friendly company directory, and demonstrates agentic engineering through a
self-maintaining ingestion and verification system.

Owner: Filipino freelance technical writer and agentic engineer
GitHub: `cyalcala`
Repository: `cyalcala/va-freelance-hub`

## Current Production Reality

The active system is the Cloudflare/Astro implementation. Older Next.js,
Vercel, Turso, Trigger.dev, and Zig-parser assets remain in the repo as backup
or historical work, but do not represent the current production path.

Current active stack:

- Runtime and package manager: Bun workspaces
- Frontend: Astro in `apps/web`
- UI: Tailwind CSS with React islands where needed
- Hosting: Cloudflare Pages
- Database: Cloudflare D1, SQLite-compatible
- Scheduled jobs: GitHub Actions pulse workflows
- Ingestion API: Astro API routes under `apps/web/src/pages/api`
- Scrapers: TypeScript packages under `packages/scraper`
- AI/category helpers: Workers AI / Gemini experiments where explicitly wired
- Versioning and backup: GitHub commits, pushes, workflow run evidence

## Active Architecture

```text
GitHub Actions pulse workflows
  -> scraper scripts fetch allowed RSS/API/public sources
  -> triage filters and normalizes jobs
  -> authenticated POST to Cloudflare Pages API
  -> Astro API route writes to Cloudflare D1
  -> Cloudflare Pages serves public job board and directory

Daily/periodic maintenance
  -> verify links
  -> prune stale jobs
  -> record source health and operational evidence
```

## Current Core Pages

```text
/                    Home and current job board surface
/directory           VA-friendly company directory
/categories/[slug]   Category-specific job pages
/data-policy         Data and public-source policy
/privacy             Privacy page
/opportunities       Planned; currently a known gap from the audit
```

## Current Audit Baseline

Read `docs/major-audit-2026-06-06.md` before doing substantial work. The latest
accepted audit baseline found:

- GitHub Actions are currently green, but green runs can hide source-level
  failures.
- Production has 635 active opportunities, 238 companies, and 0 content digests.
- `/opportunities` returns 404.
- Homepage HTML is too large at roughly 1.75 MB.
- Hot D1 queries need ordering-aligned indexes.
- Date fields are mixed-format text and need normalization.
- ATS and batch insert paths can fail silently or report misleading counts.
- Remote.co alerts are noisy and should become daily/source-health rollups.
- Source compliance must be treated as a first-class requirement, not an
  assumption based only on public visibility.

## Recovery-Driven Methodology

This repo adopts the techwriter-bot style operating loop, adapted to this
project's scope:

1. Make the smallest useful slice.
2. Run the narrowest meaningful verification.
3. Commit the behavior or documentation slice.
4. Push to GitHub.
5. Watch GitHub Actions for the pushed commit.
6. Record the checkpoint with percentage, commit hash, verification, workflow
   run ID, and next task.
7. Push acceptance documentation when the evidence is known.

Canonical recovery docs:

- `docs/MASTER_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/AI_RECOVERY_TRAIL.md`
- `docs/SYSTEM_SAVEPOINT.md`
- `docs/major-audit-2026-06-06.md`
- `docs/decisions/ADR-001-recovery-driven-public-job-index.md`

## Percent-Based Roadmap

Progress percentages are weighted checkpoints, not vibes.

| Phase | Weight | Focus |
| --- | ---: | --- |
| P0 | 5% | Recovery docs and methodology |
| P1 | 15% | Product surface and homepage payload |
| P2 | 15% | D1 indexes and datetime foundation |
| P3 | 20% | Ingestion observability and silent-error removal |
| P4 | 15% | Source compliance and source portfolio cleanup |
| P5 | 15% | Data quality backfill and triage improvements |
| P6 | 10% | Reporting, backup hygiene, and alert rollups |
| P7 | 5% | Final acceptance audit and portfolio polish |

## Compliance Policy

The project should be framed and implemented as public job indexing, not
unrestricted scraping.

Rules:

- Prefer official APIs, RSS feeds, and source-supported access paths.
- Do not bypass logins, paywalls, CAPTCHAs, robots.txt, rate limits, or explicit
  anti-automation terms.
- Store minimal factual metadata needed for discovery.
- Link users back to the original source to apply.
- Avoid copying full descriptions unless the source license or terms allow it.
- Keep a clear data policy and provide an opt-out/correction path.
- Pause or mark sources as `needs_review` when terms are unclear or hostile to
  automated collection.

Public visibility alone does not make automated collection, storage, and
republishing automatically compliant.

## Do Not Build Unless Strategy Changes

- No auth, payments, subscriptions, resumes, or user accounts.
- No monetization while relying on personal/free-tier constraints.
- No auto-apply tooling.
- No hidden scraping of restricted or login-gated sources.
- No large dashboard platform when a compact public job board solves the job.
- No new paid service unless explicitly approved and documented.

## Engineering Preferences

- Keep the Cloudflare/Astro/D1 path as the active production path.
- Make vertical slices that leave the site deployable after each commit.
- Add observability before increasing ingestion complexity.
- Prefer data-source configuration and source status tables over hard-coded
  one-off decisions.
- Treat "green outside, red inside" CI as a watermelon risk: CI success is not
  acceptance unless source-level health is also recorded.
- Avoid ratholes by time-boxing source-specific fixes; pause a source when it
  repeatedly fails or has compliance uncertainty.
- Keep future agents oriented by updating the recovery docs after meaningful
  changes.
