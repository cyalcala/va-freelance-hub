# Strategy: Autonomous Company Hunter ("Prospector") - 2026-07-14

## STATUS: Phase 1-2 IMPLEMENTED (2026-07-14)

Built and shipped:
- `packages/scraper/prospector.ts` (+ 16 tests): pure two-gate logic —
  name-quality + source-trust — plus ATS-token extraction, niche inference,
  and `classifyCandidates` (auto-add / review / rejected).
- `apps/web/src/pages/api/cron/prospect.ts`: cron route that mines active
  jobs for companies missing from `va_directory`, applies both gates, and
  **idempotently auto-adds** the trusted quality ones (chunked Drizzle
  inserts, mass-add guard, fail-closed ATS, auth + rate-limit).
- `.github/workflows/gha-prospector-pulse.yml`: runs 4x/day, backs up a
  `docs/prospector-latest.md` digest to git, and files a **human-gated**
  `ats-proposal` issue per discovered ATS token (scraping-enable stays a
  human code edit — Phase 3/4 below).

Production probe (2026-07-14) that validated the approach found real targets
(LawnStarter 28 jobs, Airalo 17, Proxify 12, Lemon.io 12, LiveKit 11,
Sourcegraph 6, Xapo Bank 5) while the two gates correctly excluded the
garbage ("Unknown", "Digital") and RemoteOK recruiter-repost spam.

Remaining (Phase 3-4): promote proposed ATS tokens into `ATS_TOKEN_POLICIES`
on human review, and optionally auto-enable trusted-platform tokens via the
Sentinel Tier-3 PAT after false-positive rates are proven low.

---

## Original plan (retained for context)

This was a **strategy + implementation plan**. The owner wants
the GitHub Actions Hunter upgraded so it hunts not just *jobs* but *new and
emerging companies that hire Filipino talent*, and auto-adds them to
`va_directory` — removing the manual spreadsheet-import loop (gold777,
RemoteWork3.8) that a human currently drives. Cadence target: frequent
(the owner said "48 times a day" = the existing every-30-min Hunter cadence).

Read `AGENTS.md`, `docs/maintenance-bot-2026-07-04.md` (the Tier-1/2/3 bot
model this extends), and `docs/comprehensive-audit-report-2026-07.md` (the
durability rules) before building.

## The core insight (why this is cheap and compliant)

**The system already ingests the signal it needs.** Every scraped
opportunity carries a `company`, a `sourcePlatform`, and a `sourceUrl` — and
it has already passed Filipino-eligibility triage (it is remote and not
geo-excluded). So the freshest source of "new companies that hire Filipino
talent" is **the jobs the Hunter already collects.** Mining them:

- adds **zero new scraping/compliance surface** (data is already in D1);
- is **self-reinforcing** — more jobs surface more companies, whose ATS feeds
  yield more jobs;
- inherits the eligibility filter for free (the jobs already passed triage).

A company that appears repeatedly in the active board but is missing from
`va_directory` is a high-confidence "emerging employer of Filipinos"
candidate. That is the primary discovery channel. ATS-token discovery
(below) is the second.

## Architecture: a three-phase Prospector

### Phase 1 — Candidate extraction (cheap; runs with each Hunter pulse)

Query the data just ingested:

- **Company candidates:** `SELECT company, COUNT(*) ... FROM opportunities
  WHERE is_active = 1 AND company IS NOT NULL GROUP BY lower(company)` minus
  the companies already in `va_directory` (case-insensitive). Rank by active
  job count and recency — a company with several fresh eligible roles is a
  strong signal.
- **ATS-token candidates:** parse `source_url` to auto-extract the ATS org
  token, which removes the manual probing a human does today:
  - `boards.greenhouse.io/{token}` / `boards-api.greenhouse.io/v1/boards/{token}`
  - `jobs.ashbyhq.com/{token}` / `api.ashbyhq.com/posting-api/job-board/{token}`
  - `jobs.lever.co/{token}` / `api.lever.co/v0/postings/{token}`
  - `{token}.breezy.hr` / `apply.workable.com/{token}`
  A token seen in a live job URL is a candidate ATS source for that company.

Persist candidates to a new `company_candidates` table (see Schema) so they
accumulate and dedupe across runs instead of being recomputed from scratch.

### Phase 2 — Verification (the automated version of the manual probe)

For each new candidate, run exactly the checks a human does by hand today:

- **ATS candidates:** probe the public endpoint (HTTP 200 + parseable job
  array + count > 0), reusing the probe shapes already proven in
  `docs/gold777-directory-import-2026-07-04.md` and
  `docs/remotework38-import-2026-07-12.md`. Record the live count.
- **Compliance gate (Goldilocks):** before an ATS token is proposed for
  *scraping*, confirm the endpoint is a documented public job-board API
  (Greenhouse/Ashby/Lever/Breezy posting APIs already are), robots-allowed,
  and linkback-able. Enterprise/Workday/iCIMS candidates get **directory-only**
  status (no scraping), same as Adobe/TTEC/VXI in the RemoteWork3.8 import.
- **Website inference:** derive a website from the ATS org or company domain
  where unambiguous; otherwise leave null (a human can fill later).

### Phase 3 — Add + propose (with the compliance gate intact)

This is where the manual loop is removed — but safely. There is a **natural
fail-closed gate already in the code**: the scrape route resolves ATS policy
via `ATS_TOKEN_POLICIES` (code), and any token not explicitly listed there
falls to the platform default, which is `enabled: false` (paused). So:

- **Auto-add directory rows** (idempotent `WHERE NOT EXISTS`, exactly like the
  migration imports) for verified candidates — including their discovered
  `ats_platform`/`ats_token`. These rows are **paused for scraping by
  default**; adding them is pure data with no scraping side effect.
- **Enabling scraping stays human/PR-gated** per the standing rule ("enabling
  sources and editing scraper logic stay human-gated" —
  `docs/comprehensive-audit-report-2026-07.md`). The Prospector opens a
  **PR/issue** listing newly discovered, live-verified ATS tokens with their
  probe evidence, for one-click promotion into `ATS_TOKEN_POLICIES`. This is
  the same Tier-2/Tier-3 pattern the Sentinel already uses for pausing —
  reused here for the opposite direction, but kept gated because *enabling* a
  source is not fail-safe the way *pausing* is.

Net effect for the owner: **new companies land in the directory automatically;
the only human touch left is a one-click approval to actually start scraping a
newly found ATS feed** — and even that can be dropped later (see Rollout).

## Cadence design (honoring "48 times a day")

Discovery signal changes slowly, so running the full verify+add every 30 min
is wasteful. Recommended split:

- **Extraction (Phase 1): every Hunter pulse** (~48/day). It is a cheap D1
  query on data already loaded — piggyback it on the existing Hunter run.
- **Verification + add (Phases 2-3): a dedicated `Prospector` pulse, hourly or
  daily,** with a cadence guard (only act when the candidate table has new,
  unverified rows). This respects rate limits on the probed ATS endpoints and
  avoids opening redundant PRs.

Present this tradeoff to the owner; "48x/day extraction, batched
verification" gives the frequency they want without hammering third parties.

## Schema / code changes

1. **`company_candidates` table** (new migration): `id`, `company_name`,
   `normalized_name` (unique), `ats_platform`, `ats_token`, `sample_source_url`,
   `active_job_count`, `first_seen_at`, `last_seen_at`, `status`
   (`discovered` | `verified` | `directory_added` | `scraping_proposed` |
   `rejected`), `probe_result`, `notes`. Unique on `normalized_name` (unlike
   `va_directory` — learn from the audit's missing-unique-index finding).
2. **`packages/scraper/prospector.ts`**: pure, unit-tested helpers —
   `extractAtsToken(sourceUrl)`, `normalizeCompanyName(name)`,
   `rankCandidates(...)`. Keep network probing in the workflow, logic in
   testable functions (the durability-rule pattern).
3. **Extraction step** in `gha-hunter-pulse.yml` (or a new
   `gha-prospector-pulse.yml`) that writes candidates to D1 via the ingest
   path or a small authenticated API route.
4. **`gha-prospector-pulse.yml`**: verify + idempotent directory insert +
   PR/issue for scraping-enable proposals. Mirror the Sentinel workflow's
   safety rails (mass-add guard, one-PR-per-day, `--force-with-lease`,
   in-runner `bun test` + build before merge).
5. **Reuse:** `sanitizeApplyUrl`, `toContentHash`, `chunkArray`,
   `maxRowsPerD1Batch`, and the Ashby/Greenhouse adapters already exist.

## Compliance guardrails (non-negotiable)

- Only companies drawn from **already-eligible, already-ingested** jobs — no
  new crawling of arbitrary sites for company names.
- ATS scraping-enable requires the Goldilocks check (public documented API,
  robots-allowed, linkback, minimal metadata, pause-on-objection) — same bar
  every current source met.
- **Mass-discovery guard:** if a single run would add more than N companies
  (e.g. > 15), treat it as anomalous (a new bulk source, a parsing bug) and
  file an alert instead of bulk-adding — mirrors the Sentinel's >3-flapping
  infrastructure guard.
- Directory adds are reversible (a row, `is_active`-style); nothing is
  hard-deleted.

## Rollout plan (phased, each independently shippable)

1. **Observe (read-only):** build extraction + `company_candidates`; the
   Prospector only *reports* what it would add (a weekly digest, like Medic).
   Confirms signal quality before any writes. Zero risk.
2. **Auto-add directory-only:** promote verified candidates into
   `va_directory` as paused/directory rows via idempotent migration or the
   ingest path. Still no new scraping (tokens paused by default).
3. **Propose scraping-enables:** Prospector opens PRs adding verified ATS
   tokens to `ATS_TOKEN_POLICIES` with probe evidence; human one-click merge.
4. **(Optional) Auto-enable trusted platforms:** for platforms with a clean
   public API and a passing automated robots/linkback check (Ashby,
   Greenhouse), allow the Tier-3 PAT auto-merge — but only after phases 1-3
   have shown low false-positive rates, and keep the mass-add + robots guards.

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Auto-enabling a hostile/paywalled source | Enabling stays PR-gated (phases 1-3); Goldilocks probe before proposing |
| Duplicate/garbage company names | `normalized_name` unique on the candidate table; idempotent directory inserts |
| Bulk-add from a parsing bug | Mass-discovery guard (> N/run → alert, no add) |
| Probing rate-limits third parties | Batched verification cadence, not every 30 min |
| Directory bloat with dead companies | Reuse the verifier/stale policy; candidates with 0 active jobs age out |

## Effort estimate

- Phase 1 (observe): ~1 session — table, extraction helpers + tests, reporting.
- Phase 2-3 (auto-add + propose): ~1-2 sessions — Prospector workflow, probe
  reuse, idempotent inserts, PR path mirroring Sentinel.
- Phase 4 (optional auto-enable): ~0.5 session once phases 1-3 are trusted.

Total: ~3 focused sessions to full autonomy, with value shipping at each phase.
The owner gets "companies add themselves" after Phase 2; the compliance-gated
scraping-enable is the last, smallest, and most safety-critical piece.
