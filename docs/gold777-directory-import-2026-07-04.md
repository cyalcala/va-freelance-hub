# Gold777 Directory Import - 2026-07-04

## Purpose

The user supplied `gold777.xlsx`, a 79-row research list of remote job
platforms, agencies, and companies (columns: `Name`, `Type`, `Rating`,
`Source`). The task: cross-reference it against the production `va_directory`
table, add genuinely new entries, and widen job-opportunity coverage where a
company exposes a public, source-supported ATS feed.

## Cross-Reference Method

1. Exported the full production `va_directory` (265 rows at the time) via
   read-only `wrangler d1 execute --remote`.
2. Normalized both lists (lowercased, stripped punctuation and `.com`/`.ph`
   suffixes) and matched exact/normalized duplicates.
3. Ran a second fuzzy substring pass over the full 265-row list to catch
   near-duplicates missed by normalization.

Result:

- 44 rows were exact/normalized duplicates of existing directory entries
  (mostly generic job boards and marketplaces already tracked: OnlineJobs.ph,
  Upwork, Fiverr, We Work Remotely, 20Four7VA, MyOutDesk, Prialto, Virtual
  Staff Finder, Boldly, etc.).
- 3 rows were near-duplicates caught by the fuzzy pass and skipped:
  - "Pepper Virtual Assistant" -> already present as "Pepper Virtual
    Assistants".
  - "Belay" -> already present as "Belay Solutions".
  - "GetMagic" -> already present as "Magic (GetMagic)".
- 32 rows were genuinely new and were imported.

## New Companies Imported

Website and niche were researched per company (WebSearch for lesser-known
regional platforms; direct knowledge plus spot verification for well-known
global brands). Niche classification followed existing precedent in the
table (e.g. `Accenture Philippines` -> `tech`, `Concentrix` -> `bpo`, `Amazon
(Remote PH)` -> `ecommerce`).

Job boards / platforms (`job-boards`, `is_marketplace = 0` to match existing
job-board rows):

- VA Workers PH, Kerja-Remote, HireBasis, Prosple, Himalayas

BPO / large-corporate PH employers (`bpo`):

- GigaBPO, Remote Philippines, Amentum, Visa, Synchrony, Wells Fargo, Ernst &
  Young, Macquarie Group, Nokia Manila / Networklabs, Century Pacific, WTW
  (Willis Towers Watson)

Global remote-first tech companies (`tech`):

- ClickUp, Canva, Wise, Zapier, Buffer, Automattic, Help Scout, Doist,
  Atlassian, GitLab, Ghost, Basecamp / 37signals, Remote.com

E-commerce (`ecommerce`):

- Shopify

VA agencies (`global-va`):

- Time Etc, Wishup

## Widening Job-Opportunity Coverage (ATS Verification)

Rather than guess ATS tokens, every candidate was probed against the public,
unauthenticated Job Board APIs the project already uses (Greenhouse Job Board
API, Lever postings API, Workable API, Breezy JSON) before anything was wired
up. Only confirmed, live endpoints were enabled:

| Company | Platform | Token | Probe result |
| --- | --- | --- | --- |
| GitLab | greenhouse | `gitlab` | HTTP 200, 143 live jobs |
| Ghost | greenhouse | `ghost` | HTTP 200, 4 live jobs |
| Remote.com | greenhouse | `remotecom` | HTTP 200, 287 live jobs |
| Time Etc | breezy | `time-etc` | HTTP 200, live board confirmed |

Guessed tokens for Zapier, Buffer, Doist, Automattic, ClickUp, Wise, Canva,
Shopify, Help Scout, and Wishup all returned 404 on Greenhouse/Lever/Workable,
and Breezy subdomain guesses for `wishup`/`timeetc` 403-redirected to the
Breezy marketing site. `lever:atlassian` returned HTTP 200 but 0 live
postings, so it was left disabled rather than wired to an empty/stale feed.
These companies were added to the directory with their real website/careers
links only; no ATS scraping was enabled for them, consistent with the
project's compliance policy of only collecting from confirmed, source-
supported public endpoints.

The four confirmed tokens above complete in-progress, previously uncommitted
work already found in the working tree (`packages/scraper/ats.ts` and
`apps/web/src/pages/api/cron/scrape.ts`) referencing "Gold777 review
2026-07-03" — this session finished that slice by adding the matching
`va_directory` rows with `ats_platform`/`ats_token` set, so the ATS scraper's
per-company mapping now has a directory entry to attach to.

## Import Mechanics

- SQL file: `apps/web/gold777_imports.sql` (32 `INSERT` statements, same
  pattern as `apps/web/dayshift_imports.sql`).
- Dry-run: applied against local D1 first (`wrangler d1 execute
  remoteph-jobs-db --local --file=apps/web/gold777_imports.sql`), all 32
  statements succeeded with no SQL errors.
- Production: applied via `wrangler d1 execute remoteph-jobs-db --remote
  --file=apps/web/gold777_imports.sql`.

## Verification

- Pre-import production count: `SELECT COUNT(*) FROM va_directory;` = 265.
- Post-import production count: 297 (+32, matching the import file exactly).
- Spot-checked all 32 new rows by `company_name`/`niche`/`ats_platform`/
  `ats_token` against the intended values.
- `bun test` passed (61/61 tests).
- `bun run --cwd apps/web build` passed.

## Credentials Note

No new credentials were introduced for this work. GitHub access used the
existing `gh` CLI login (`cyalcala`, `repo` scope). Cloudflare/D1 access used
the existing local Wrangler OAuth login already configured on this machine
(`cyrusalcala.agency@gmail.com` account) from prior project sessions. No keys
were read from other tools' config directories.
