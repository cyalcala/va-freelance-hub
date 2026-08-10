# Production Apex Audit Design — 2026-08-09

## Goal

Audit every tracked subsystem, then harden the active Cloudflare/Astro/D1
production path through measurable, reversible fixes. Historical Next.js,
Vercel, Turso, Trigger.dev, and Zig material is audited and explicitly
quarantined or documented unless a live reference or security exposure requires
intervention.

## Production boundary

The supported runtime is:

```text
Cloudflare Pages (Astro)
  -> API routes
  -> Cloudflare D1
  -> public opportunity, directory, detail, search, sitemap routes

Cloudflare Freshness Worker + GitHub Actions pulses
  -> authenticated cron APIs
  -> allowed public RSS/API/ATS sources
  -> source state, triage, verification, archive-only maintenance
```

The following are non-production until a separate strategy changes that
designation: `web-nextjs-backup`, Turso/LibSQL local fallbacks, Trigger.dev
helpers, and `packages/zig-parser`.

## Current evidence

- The 2026-08-09 deployment workflow passed validation, D1 migrations, remote
  FTS integrity, and Cloudflare Pages deploy.
- Production route probes return HTTP 200. Approximate compressed transfer
  sizes from the audit location are 130 KB for `/`, 75 KB for
  `/opportunities`, 234 KB for `/directory`, and 140 KB for `/sitemap.xml`.
- Current weekly health data reports 1,636 active opportunities, 741 active
  rows older than 30 days, 641 unseen in feeds for 14+ days, 46 rows without a
  company, and 56 same-title/company duplicate groups.
- The prior hardening tranche eliminated strict typecheck, FTS consistency,
  release-order, and malformed cron-summary defects. It intentionally left
  dependency scanning, fresh source/data metrics, and full runtime error
  contracts for a follow-up audit.

## Decision

Use a production-hardening plus legacy-quarantine approach.

### 1. Evidence and observability first

Establish executable checks for source health, automation outcomes, runtime
responses, dependency state, performance budgets, and release provenance.
Changes that automate data mutation must be bounded, idempotent, and leave an
audit record.

### 2. Fix root causes at subsystem boundaries

Prefer typed environment bindings, validated API payloads, explicit error
responses, bounded D1 batches, query-aligned indexes, and deterministic
workflow inputs over broad rewrites or console-only diagnostics. Add a failing
test before correcting a confirmed behavior defect.

### 3. Treat all external data as untrusted

RSS/API/ATS payloads, Cloudflare bindings, cron responses, AI output, and
workflow artifacts are validated at their boundary. Existing public-source and
archive-only compliance rules remain in force.

### 4. Make deployments reproducible and observable

CI uses the frozen Bun lockfile, deterministic project-owned tests, strict
typecheck, build, workflow syntax validation, and the existing
migrate-before-deploy ordering. Production acceptance requires the run ID,
remote FTS integrity result, and public smoke evidence.

### 5. Quarantine rather than rewrite legacy code

Map every active reference to legacy folders and credentials. If no active
reference exists, add a concise inventory and ownership/deprecation notice,
prevent accidental deployment paths, and remove only confirmed generated
artifacts or exposed secrets with a documented recovery path. Do not delete
historical application code merely for age.

## Ranked workstreams

| Priority | Workstream | Acceptance outcome |
| --- | --- | --- |
| P0 | Production failure contracts | No active API/page path silently converts a D1, auth, or malformed-upstream failure into a plausible empty success response. |
| P0 | CI and supply-chain determinism | Releases use frozen dependencies, a pinned Bun runtime, explicit workflow linting, and an actionable dependency/security signal. |
| P0 | Ingestion/data lifecycle | Source results distinguish skipped, unchanged, failed, accepted, written, and archived outcomes; cleanup remains bounded and reversible. |
| P1 | D1/query and payload efficiency | Hot routes have measured query plans, pagination/caps, cache behavior, and payload budgets based on current production measurements. |
| P1 | Legacy containment | The repository records active versus legacy paths and blocks accidental legacy deployment or secret reuse. |
| P2 | Data quality improvement | Stale, duplicate, missing-company, and date-quality rows are remediated only by source-specific, reviewed policies. |

## Safety constraints

- Preserve the active Cloudflare/Astro/D1 architecture and public-indexing
  compliance posture.
- Do not bypass source terms, logins, CAPTCHA, robots directives, or rate
  limits.
- Do not bulk-delete opportunities, directory records, source history, or
  legacy directories without a separately verified recovery plan.
- Do not add paid services or introduce credentials into repository files.
- Keep each code slice deployable and GitHub-backed.
- Keep the user's original working checkout untouched; all work occurs on an
  isolated `codex/` branch.

## Verification and release contract

Every implementation slice must pass its focused regression test, then the
project-owned test command, strict typecheck, production build, workflow YAML
validation, and `git diff --check`. On `main`, GitHub Actions must pass
validation, D1 migration, FTS integrity, Pages deployment, and public smoke
checks for the landing page, opportunities, search, directory, and sitemap.

## Non-goals

- A rewrite of the legacy Next.js or Turso application.
- New accounts, payments, auto-apply behavior, or paid infrastructure.
- Automated destructive remediation based on one health digest.
- Performance claims without current measurements.
