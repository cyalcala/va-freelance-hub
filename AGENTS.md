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

After reading this file, use this recovery read order. It is not policy
precedence; source-domain precedence is defined in the masterplan:

1. `docs/SYSTEM_SAVEPOINT.md`
2. `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md`
3. `docs/SOURCE_PERPETUITY_STRATEGY.md`
4. `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`
5. `docs/decisions/ADR-007-autonomous-constitutional-source-governance.md`
6. `docs/decisions/ADR-006-controlled-source-replenishment.md`
7. `docs/MASTER_EXECUTION_PLAN.md`
8. `docs/gauntlet/IMPLEMENTATION_UNITS.md` for shared G1-G9 execution rules and
   terminal history
9. `docs/IMPLEMENTATION_STATUS.md`, `docs/HANDOFF.md`, and
   `docs/AI_RECOVERY_TRAIL.md`
10. current evidence and generated `docs/*-latest.md` operational reports

The complete user-supplied Gauntlet source is archived verbatim at
`docs/gauntlet/OPERATING_MANDATE.md`. It is immutable source evidence, not the
compact default execution context; consult it for mandate audits or
contradictions.

Current 2026-08-31 planning baseline:

- The prior Gauntlet is terminal historical evidence; its 24 units are not the
  active queue. Do not reopen them without new failure evidence.
- Exact-six source behavior is the accepted production boundary: We Work
  Remotely, Remotive, Real Work From Anywhere, Remote OK, and two Jobicy APAC
  feeds. Behavior commit `4f5e8dd` passed deployment run `33142177229` and its
  accepted observation window.
- The durable target is constitutional, evidence-bound autonomous source
  replenishment under `SOURCE_REPLENISHMENT_MASTERPLAN.md` and ADR-007. The
  founder is not the permanent routine source-approval gate.
- This planning decision does not implement that autonomy. Exact-six behavior
  remains unchanged until the complete named **Autonomy Cutover Predicate** in
  the masterplan passes; shorter summaries elsewhere are non-exhaustive.
- SP-00 through SP-09 and SP-16/SP-17 are terminal. SP-10 is code-only and not
  evidence-ready; SP-11/SP-12/SP-14/SP-15 are one-shot mechanism probes, not
  recurrent shadows or real canaries; SP-13 is a robots NO-GO. Verify the
  current savepoint before relying on these dated classifications.
- A 2026-08-31 read-only audit found the production registry and durable
  candidate reserve empty, all ATS identities skipped, weak exact-source
  attribution, and one automatic ingestion clock with material recent gaps.
  These are dated observations, not current truth; every executor must
  re-measure.
- Do not begin with the historically pending registry SQL. First reconcile the
  remaining SP unit contracts with the masterplan through an explicit bounded
  planning decision; a state label alone does not dispatch a shadow or enforce
  a canary.
- Automation may advance `origin/main`; every unit must fetch, preserve dirty
  work, and restate its full start SHA.

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

- `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md`
- `docs/SOURCE_PERPETUITY_STRATEGY.md`
- `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`
- `docs/decisions/ADR-007-autonomous-constitutional-source-governance.md`
- `docs/decisions/ADR-006-controlled-source-replenishment.md`
- `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md`
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
Source Perpetuity program uses dependency-ordered SP units in
`docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`.

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
- Block explicit restrictions and unsupported access paths. Put genuinely
  unclear candidates into a bounded `needs_review` workflow with an owner,
  missing-evidence list, and deadline; do not leave an invisible permanent
  pause and do not interpret uncertainty as permission to fetch.
- A documented public/auth-free posting API may receive a conditional
  minimal-metadata decision without bespoke “aggregation permitted” wording,
  provided no applicable contrary evidence exists and the unit proves
  attribution, linkback, cadence, opt-out, canary, and rollback.

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
- Avoid ratholes by time-boxing source-specific review. Quarantine technical
  failures, block explicit compliance conflicts, and move unresolved permission
  candidates to dormant state with a dated next trigger.
- Keep future agents oriented by updating the recovery docs after meaningful
  changes.
