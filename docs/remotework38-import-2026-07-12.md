# RemoteWork3.8 Import & Ashby ATS Expansion - 2026-07-12

## Purpose

The user supplied `RemoteWork3.8_Updated (1).xlsx` (40 rows: Company/Platform,
Type, Website, Status) and asked to add the new Filipino-hiring agencies and
"expand the ATS net if possible using new sources," done strategically and
surgically. This checkpoint delivers both: a deduped directory import and a
genuinely new ATS platform adapter (Ashby).

## Cross-Reference Method

Cross-referenced the 40 rows against the production `va_directory`
(297 companies after the gold777 import). Because the live D1 read path was
returning Cloudflare API error 7403 (expired local Wrangler OAuth token — a
known periodic issue; `d1 info` still worked), the import is delivered as a
**data migration applied by CI** (`deploy-migrations.yml` uses the repo's own
`CLOUDFLARE_API_TOKEN` secret), and every INSERT is made **idempotent** with a
`WHERE NOT EXISTS (... lower(company_name) ...)` guard. This is safe regardless
of current directory state and needs no local D1 auth — and is robust given
`va_directory` has no UNIQUE index on `company_name`.

Result:
- ~25 rows were already present from the gold777 import and earlier work
  (all the `.ph` job boards, OnlineJobs.ph, Upwork, GitLab, Zapier, MyOutDesk,
  Wishup, GetMagic, Amazon, Concentrix, Athena, Remote Philippines, etc.).
- 1 row skipped: "Remote Philippines Jobs" (`remotephilippinesjobs.com`) —
  spreadsheet Status = **Caution**, so it is deliberately not added as a
  trusted source.
- 14 rows genuinely new and imported.

## ATS Net Expansion (the "new source")

Every candidate tech/BPO company was probed against public ATS APIs before
anything was wired (no guessed tokens). The finding: **Ashby** — an ATS
platform the project did not support — exposes a clean, documented public
posting API (`api.ashbyhq.com/posting-api/job-board/{org}`) and multiple
listed orgs from the sheet publish through it. This is the surgical expansion.

Live probe results (2026-07-12):

| Company | Platform | Token | Probe |
| --- | --- | --- | --- |
| Supabase | ashby (NEW) | `supabase` | 200, 51 jobs |
| Ashby | ashby (NEW) | `ashby` | 200, 64 jobs |
| Camunda | ashby (NEW) | `camunda` | 200, 36 jobs |
| Amplify | ashby (NEW) | `amplify` | 200, 35 jobs |
| Tremendous | ashby (NEW) | `tremendous` | 200, 20 jobs |
| Grafana Labs | greenhouse | `grafanalabs` | 200 |
| Nearform | greenhouse | `nearform` | 200, 34 jobs |

Greenhouse/Lever/Ashby probes for Adobe, Alorica, BCD Travel, Conduent, TTEC,
VXI, and Virtual Coworker all 404'd (enterprise Workday/iCIMS or no public
feed), so those 7 were added as **directory-only** entries (real website, no
ATS scraping) — consistent with the compliance policy of only collecting from
confirmed, source-supported public endpoints.

### New Ashby adapter (code)

- `packages/scraper/ats.ts`: added `fetchAshby()` mirroring the Greenhouse
  adapter — filters `isListed !== false`, links back to the `jobUrl`
  (jobs.ashbyhq.com), carries `applyUrl` as `applicationUrl`, throws on non-200
  and non-array payloads so a broken org surfaces as a failed source rather
  than a silent empty. `ashby` added to the `fetchATSFeed` platform union +
  switch.
- `packages/db/schema.ts`: `ats_platform` enum extended with `ashby`
  (Drizzle-level text enum; no DB constraint change needed).
- `apps/web/src/pages/api/cron/scrape.ts`: `AtsPlatform` type + a fail-closed
  `ATS_PLATFORM_POLICIES.ashby` (paused by default) + 7 enabled
  `needs_review` token policies (5 Ashby + 2 Greenhouse) under the Goldilocks
  posture (public API, minimal metadata, linkback, pause on objection).
- `packages/scraper/ashby.test.ts`: 6 tests covering the listed-filter,
  missing-field skip, non-200 throw, non-array throw, and applyUrl/date
  tolerance.

## Import Mechanics

- Migration: `packages/db/migrations/0019_remotework38_directory.sql`
  (14 idempotent INSERTs; applied by `deploy-migrations.yml` on push).
- Local dry-run: applied to local D1 twice — first run inserted all 14 with
  correct ATS mappings; second run inserted 0 (idempotency proven).

## Verification

- `bun test`: 97/97 (6 new Ashby adapter tests).
- `bun run --cwd apps/web build`: passed (enum + adapter + policy changes).
- Local D1: 14 rows present, 7 with ATS tokens; re-run kept count at 14.
- ATS endpoints probed live before wiring; only confirmed tokens enabled.

## Post-Deploy Acceptance (to confirm after CI applies)

1. `deploy-migrations` run green for `0019`; production `va_directory` count
   rises by up to 14 (fewer if any name already existed).
2. Next Hunter run: the 7 new ATS tokens appear in `source_fetch_events`
   (ashby:* and the two greenhouse:*), with the new Ashby sources returning
   published jobs and 0 failed sources.
3. New tech roles from Supabase/Camunda/Tremendous/Amplify/Ashby/Grafana/
   Nearform begin appearing on the board after triage.

## Credentials Note

No new credentials introduced. GitHub via the existing `gh`/git auth;
production D1 write via the repo's existing `CLOUDFLARE_API_TOKEN` secret
through CI (local OAuth was expired, hence the migration-based delivery).
