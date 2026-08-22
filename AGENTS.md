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
- Primary ingestion clock: Cloudflare Worker every 10 minutes
- Scheduled maintenance: GitHub Actions pulse workflows
- Ingestion API: Astro API routes under `apps/web/src/pages/api`
- Scrapers: TypeScript packages under `packages/scraper`
- AI/category helpers: Gemini -> Groq -> Cloudflare reserve where configured;
  durable inline deferral is the production default
- Versioning and backup: GitHub commits, pushes, workflow run evidence

## Active Architecture

```text
Cloudflare freshness Worker (every 10 minutes)
  -> authenticated Astro /api/cron/scrape route
  -> allowed RSS/API/public ATS sources
  -> normalize, deduplicate, geo-gate, and AI-triage
  -> Cloudflare D1
  -> Astro pages serve the public board and directory

GitHub Actions daily/periodic maintenance
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
/opportunities       Paginated/filterable opportunity index
/jobs/[id]           Eligible active opportunity detail
/sitemap.xml         Public sitemap
```

## Current Audit Baseline

Read the current authority in this order:

1. `docs/SYSTEM_SAVEPOINT.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/gauntlet/IMPLEMENTATION_UNITS.md`
4. `docs/IMPLEMENTATION_STATUS.md`
5. generated `docs/*-latest.md` operational evidence

The complete user-supplied Gauntlet source is archived verbatim at
`docs/gauntlet/OPERATING_MANDATE.md`. It is immutable source evidence, not the
compact default execution context; consult it for mandate audits or
contradictions.

Current 2026-08-22 planning baseline:

- Planning began from clean synchronized `main`/`origin/main` at `bd84cc1`;
  automation may advance it, so every unit must fetch and restate its start SHA.
- Latest accepted behavior is `07f582b`, verified by CI/deploy run
  `32475868471`: 454 tests, 0 failures, 1,209 assertions, plus typecheck,
  guardrails, build, and live checks.
- The ten-minute Worker clock and latest accepted pending queue are healthy.
- Source health reports 41 identities; the two current failures are Jobicy
  feeds returning HTTP 429.
- The first implementation priority is DATA-05A: contain recurring unrelated
  company-domain writes from directory enrichment.
- Source expansion is frozen until the current data, hostname, Doctor,
  taxonomy, and compliance evidence gates pass.

The June audits remain historical baselines. Do not use their counts or missing
route findings as current production truth.

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
- `docs/gauntlet/OPERATING_MANDATE.md`
- `docs/gauntlet/IMPLEMENTATION_UNITS.md`
- `docs/research/agent-reach-study-2026-08-22.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/AI_RECOVERY_TRAIL.md`
- `docs/SYSTEM_SAVEPOINT.md`
- `docs/major-audit-2026-06-06.md`
- `docs/decisions/ADR-001-recovery-driven-public-job-index.md`

## Historical Percent-Based Roadmap (Accepted)

These P0–P7 percentages describe the completed recovery program. The current
Gauntlet uses dependency-ordered units in `docs/MASTER_EXECUTION_PLAN.md`.

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
