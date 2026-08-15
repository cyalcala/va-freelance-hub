# Directory Growth Strategy — 2026-08-16

## Problem

The `/directory` page shows 412 companies but many entries (auto-added by the
Prospector from job feeds) have no website ("Website unavailable"), are
unverified, and lack hiring page URLs. This degrades trust and usability.
Meanwhile, the pipeline for adding new agencies daily is working but the
quality layer was missing.

## Strategy: Directory Growth Engine

Three automated layers ensure the directory grows daily with quality entries.

### Layer 1: Continuous Discovery (existing — Prospector)

**Already running.** The Sovereign Prospector (`gha-prospector-pulse.yml`) runs
4x/day and auto-adds companies discovered from ingested jobs. It applies two
quality gates (name quality + source trust) and files ATS-enable proposals as
GitHub Issues for human review.

- Schedule: `15 */6 * * *` (4x/day)
- Drains up to 15 companies per run from the eligible backlog
- Anomaly ceiling at 120 candidates/run → adds nothing, alerts instead

### Layer 2: Quality Enrichment (NEW — Enrichment Pulse)

**New.** The Sovereign Enrichment Pulse (`gha-enrichment-pulse.yml`) runs
2x/day and improves existing directory entries:

1. **Website inference**: For companies missing a website, queries the
   `opportunities` table for their recent job `application_url` and
   `source_url` values, extracts the root domain (filtering out ATS/aggregator
   hosts), and sets it as the company website.

2. **Hiring page URL from ATS**: For companies with `ats_platform` +
   `ats_token`, builds the public ATS career page URL (Greenhouse, Lever,
   Ashby, Breezy, Workable).

3. **Auto-verification from job signals**: Companies with 2+ active jobs where
   at least one has `ph_eligibility = 'eligible_verified'` are auto-verified
   (`is_verified = true`). This confirms they are legitimately hiring Filipino
   talent based on real job data, not assumptions.

- Schedule: `30 3,15 * * *` (2x/day)
- Budget: 40 companies per run
- Safety: additive only — never deletes, never overwrites an existing website
- Endpoint: `/api/cron/directory-enrich`
- Backup: `docs/enrichment-latest.md` committed each run

### Layer 3: Curated Baseline (NEW — Seed Import)

**New.** A curated list of 28 VA agencies and BPOs known to hire Filipinos,
with verified websites and proper niche classification. Added via a one-time
authenticated POST to `/api/cron/directory-seed`.

The seed is idempotent — existing companies (matched by normalized name) are
skipped. Entries include:

- SupportNinja, Cloudstaff, ConnectOS, Filta, Penbrothers, Deployed
- Wing Assistant, FreeUp, iSupport Worldwide, MCVO Talent Outsourcing
- Clark Staff, Remote Staff, TaskBullet, Outsource Access, VirtualStaff.ph
- GlobalWorker, MultiplyMii, Yempo Solutions, FGC+, Activate Talent
- TaskUs, Telus International Philippines, Sitel (Foundever)
- More Staffing, Aux, LevelUp, Shepherd, Dojo4

Data file: `apps/web/src/data/curated-va-agencies-2026-08.ts`

### Layer 4: Link Health Maintenance (existing — Directory Audit)

**Already running.** The Sovereign Directory Pulse
(`gha-directory-pulse.yml`) checks company websites 4x/day. Three consecutive
hard-dead verdicts → de-verified (hidden from "vetted" set) but never deleted.
Bot walls (403/429 from live sites) never count a strike.

## Daily Cycle

```
Every 15 min:
  Freshness Cron Worker → /api/cron/scrape → jobs flow in

4x/day (every 6h):
  Prospector → discovers new companies from ingested jobs → auto-adds
  Directory Audit → checks company link health → maintains quality

2x/day:
  Enrichment Pulse → fills websites, sets hiring pages, auto-verifies
```

This produces a self-sustaining daily cycle:
1. New jobs arrive every 15 minutes
2. New companies are discovered and added 4x/day
3. Company quality is enriched 2x/day
4. Dead links are caught and flagged 4x/day

## Data Sources

Active feed sources (ingested by the Freshness Cron → scrape endpoint):

| Source | Type | Status |
| --- | --- | --- |
| We Work Remotely | RSS | allowed |
| Remotive | RSS | allowed |
| Real Work From Anywhere | RSS | allowed |
| Jobicy Admin Support APAC | RSS | allowed |
| Jobicy Customer Support APAC | RSS | allowed |
| Remote OK | JSON API | allowed |

Active ATS sources (14 tokens across 5 platforms):

| Platform | Tokens |
| --- | --- |
| Greenhouse | grafanalabs, nearform, gitlab, ghost, remotecom |
| Ashby | supabase, camunda, tremendous, amplify, ashby |
| Breezy | 20four7va, sourcefit, vaaphilippines-recruitment, time-etc |

## Expansion Path

To increase the rate of new agency additions:

1. **Add more Jobicy feeds**: marketing, design, tech categories for worldwide
   (not just APAC) → more companies discovered by Prospector.
2. **Probe more ATS tokens**: the Prospector files GitHub Issues for discovered
   tokens; a human reviews and enables them in `ATS_TOKEN_POLICIES`.
3. **Re-evaluate paused sources**: Remote.co, Jobspresso, ProBlogger may have
   recovered; check and re-enable if compliant.
4. **Curated seed updates**: run additional `/api/cron/directory-seed` calls
   with expanded data files as new VA agencies are discovered.

## Legitimacy Verification

Every company in the directory passes through multiple verification layers:

1. **Source trust gate** (Prospector): only auto-adds from curated, high-trust
   feeds (WWR, Remotive, RWFA, Jobicy, ATS boards).
2. **Filipino eligibility gate** (geo-triage): jobs are classified for PH
   eligibility at ingestion time using location signals.
3. **Auto-verification** (Enrichment): companies with verified PH-eligible
   jobs get `is_verified = true` automatically.
4. **Link health** (Directory Audit): dead/parked websites are flagged and
   de-verified after 3 consecutive checks.
5. **Visibility filter**: only `hires_filipinos = 1` AND `link_fail_count < 3`
   companies appear on the public page.

## Files Added/Modified

| File | Purpose |
| --- | --- |
| `apps/web/src/lib/directory-enrich.ts` | Enrichment logic (website inference, auto-verification) |
| `apps/web/src/pages/api/cron/directory-enrich.ts` | Enrichment API endpoint |
| `apps/web/src/data/curated-va-agencies-2026-08.ts` | 28 curated VA agencies |
| `apps/web/src/pages/api/cron/directory-seed.ts` | Seed import API endpoint |
| `.github/workflows/gha-enrichment-pulse.yml` | 2x/day enrichment GHA workflow |
| `docs/directory-growth-strategy-2026-08-16.md` | This document |
