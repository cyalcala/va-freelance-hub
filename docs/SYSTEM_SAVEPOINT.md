# System Savepoint

## Current Savepoint

Date: 2026-06-06
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Last accepted commit:

- `9657c4a` - `docs: adopt recovery-driven execution plan`
- GitHub Actions run: `27040684807`
- Result: success

Previous accepted audit commit:

- `74c0416` - `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success

Current accepted work:

- Adopt recovery-driven execution methodology.
- Add master roadmap, implementation status, recovery trail, and ADR.
- Update agent context to the active Cloudflare/Astro/D1 architecture.
- Accepted completion: 5%.

Next pending work:

- P1 Slice 1: add `/opportunities` as the canonical paginated opportunity board
  and reduce homepage data volume.

## Production Baseline From Audit

- Public site: `https://remotejobs-ph.pages.dev`
- `/`: 200, roughly 1.75 MB HTML
- `/directory`: 200
- `/categories/tech`: 200
- `/opportunities`: 404
- Authenticated cron/API routes reject unauthenticated calls with 401

## Data Baseline From Audit

- Opportunities: 635 total, 635 active
- Directory companies: 238 total
- ATS-enabled companies: 15
- Content digests: 0
- Active jobs never link-verified: 184
- Active jobs older than 30 days by `posted_at`: 209
- Active jobs missing application URL: 635
- Active jobs missing client timezone: 635
- Active jobs in `other`: 523

## Known Healthy Controls

- GitHub repository is public and active.
- CI guardrail is green at the latest accepted checkpoint.
- Build passed locally during the major audit.
- Cron/API routes require authentication.
- Duplicate `source_url`, `content_hash`, and non-null `description_hash` counts
  were zero in the audit snapshot.

## Known Weak Controls

- GitHub Actions can be green while individual sources fail.
- Source failures are committed too noisily into `docs/scraper-alerts.md`.
- ATS failures can collapse into zero-item successes.
- Batch insert failures can be logged while route response stays 200.
- Insert count can over-report compared with actual D1 changes.
- Hot queries need ordering-aligned indexes.
- Dates need normalization.
- Source compliance states are not yet explicit enough.

## Recovery Command Hints

Common local checks:

```bash
git status --short --branch
bun run build
git diff --check
```

Common GitHub checks:

```bash
gh run list --repo cyalcala/va-freelance-hub --limit 10
gh run view <run-id> --repo cyalcala/va-freelance-hub --log-failed
```

Common production smoke checks:

```bash
curl -I https://remotejobs-ph.pages.dev/
curl -I https://remotejobs-ph.pages.dev/directory
curl -I https://remotejobs-ph.pages.dev/opportunities
```

Use read-only D1 queries for data checks. Never mutate production data during an
audit unless the task explicitly calls for a migration or repair and the change
has been backed up in Git.
