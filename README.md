# VA Freelance Hub

VA Freelance Hub is a public job index and portfolio project for Filipino
freelancers. It collects allowed public remote and VA-friendly opportunities,
keeps a VA-friendly company directory, and demonstrates a recovery-driven
agentic engineering loop with GitHub-backed evidence.

Live site: [remotejobs-ph.pages.dev](https://remotejobs-ph.pages.dev)

## Current Production Stack

- Runtime and package manager: Bun workspaces
- Frontend: Astro in `apps/web`
- Hosting: Cloudflare Pages
- Database: Cloudflare D1
- Primary ingestion clock: Cloudflare Worker every 10 minutes
- Scheduled maintenance: GitHub Actions pulse workflows
- Ingestion API: Astro API routes under `apps/web/src/pages/api`
- Collection and triage: TypeScript packages under `packages/scraper`, with a
  Gemini -> Groq -> Cloudflare reserve cascade where configured
- Backup and recovery: Git commits, workflow run evidence, and recovery docs

Older Next.js, Vercel, Turso, Trigger.dev, and parser experiments remain in the
repo as historical backup paths. They are not the current production path.

## What It Does

- Shows a public board of remote and VA-friendly opportunities.
- Provides category pages and a company directory.
- Attributes listings and routes users back to original public sources.
- Records source health, skipped sources, insert counts, stale-data policy, and
  recovery checkpoints.
- Keeps the project intentionally small: no auth, accounts, payments, resumes,
  auto-apply tooling, or hidden restricted-source collection.

## Public-Source Policy

This project is framed as public job indexing, not unrestricted scraping.

The operating rules are:

- Prefer official APIs, RSS feeds, and source-supported public access paths.
- Do not bypass logins, paywalls, CAPTCHAs, robots.txt, rate limits, or explicit
  anti-automation terms.
- Store minimal factual metadata needed for discovery.
- Link users back to the original source to apply.
- Block explicit restrictions and put unclear candidates through a bounded,
  evidence-backed review; do not treat uncertainty as permission or as a
  permanent invisible queue.
- Keep opt-out and correction language visible in the data policy.

Public visibility by itself is not treated as blanket permission to automate
collection, store records, and republish them.

## Current Recovery Status

The recovery-driven roadmap is documented in:

- `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md`
- `docs/SOURCE_PERPETUITY_STRATEGY.md`
- `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`
- `docs/decisions/ADR-007-autonomous-constitutional-source-governance.md`
- `docs/decisions/ADR-006-controlled-source-replenishment.md`
- `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md`
- `docs/MASTER_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/AI_RECOVERY_TRAIL.md`
- `docs/SYSTEM_SAVEPOINT.md`
- `docs/DOCS_INDEX.md`
- `docs/gauntlet/OPERATING_MANDATE.md` — verbatim archived source mandate
- `docs/gauntlet/IMPLEMENTATION_UNITS.md`
- `docs/research/agent-reach-study-2026-08-22.md`

As of the 2026-08-31 planning checkpoint, the project has:

- a working `/opportunities` route;
- a ten-minute Cloudflare Worker ingestion clock whose continuity must be
  measured independently of workflow success;
- an accepted exact-six production source boundary, deployed from behavior
  commit `4f5e8dd` by run `33142177229` and retained by its observation window;
- source-level fetch events, generated source/directory/enrichment evidence, and
  a durable pending-triage fallback;
- a terminal historical Gauntlet whose 24 units are not the current queue; and
- an approved Source Perpetuity bootstrap plan for exact attribution,
  registry/lifecycle, supported feeds, employer/partner opt-in, reserves, and
  adaptive replacement; and
- an accepted decades-scale replenishment constitution: ordinary source
  admission ultimately becomes evidence-bound and autonomous, while contracts,
  payments, credentials, real permission, and constitutional changes retain
  accountable human/organizational authority.

The constitutional target is planning authority, not a claim of deployed
autonomy. Exact-six production behavior remains current until the control plane
and each transition are implemented, observed, and accepted.

Start a fresh planning or execution session with
`docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md`. Its counts and SHAs must be
revalidated against the repository and production evidence before use.

## Architecture

```text
Cloudflare freshness Worker (every 10 minutes)
  -> authenticated Astro scrape endpoint
  -> allowed public RSS/API/ATS sources
  -> normalize, deduplicate, geo-gate, and AI-triage
  -> Cloudflare D1
  -> Cloudflare Pages serves the job board and directory
```

GitHub Actions verifies links, prunes stale jobs, audits sources and directory
health, and records operational evidence.

## Local Development

Install dependencies from the repo root:

```bash
bun install
```

Run the active Astro app:

```bash
bun --cwd apps/web dev
```

Build the active app:

```bash
bun run build
```

The production API routes require `PROXY_SECRET` or `CRON_SECRET` for ingestion
and scheduled maintenance calls.

## Operational Checks

Useful production checks:

```bash
gh run list --repo cyalcala/va-freelance-hub --limit 10
```

```bash
cd apps/web
bunx wrangler@4.120.0 d1 execute DB --remote --env production --config wrangler.jsonc --command "SELECT COUNT(*) FROM opportunities WHERE is_active = 1;"
```

```bash
gh workflow run gha-hunter-pulse.yml --repo cyalcala/va-freelance-hub --ref main
```

For the latest compact source-health state, read:

```text
docs/source-health-latest.md
```

## License

MIT License
