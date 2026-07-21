# VA Directory Audit — Findings (2026-07-20)

Research pass over the `va_directory` (391 companies at audit time). **All 391
assessed; the adversarial verify pass completed** (a first attempt was
usage-limited at 252/391 — the resumable workflow finished it from cache).

## ✅ Status: APPLIED (reversibly) — 2026-07-20

The workflow's safety design is *assess → adversarially verify → apply*, and it
ran end to end. What was applied, all reversible, no hard deletes:

- **Migration 0023** — 12 moved-domain URL repairs (each replacement re-checked
  live first) + 40 marketplace/job-board flags.
- **Migration 0024** — 25 companies soft-hidden via `hires_filipinos=0`
  (defunct, duplicates, verified non-PH-hiring); `directory.astro` now filters
  on that flag. Flip the flag to restore any row.

**What the verify pass changed vs. the raw proposal:** it confirmed only
genuinely *defunct* domains for removal (MS Virtual Assistant #300, Philippines
Recruitment UK #328, KOOS #432 — each NXDOMAIN with no successor) and correctly
*rejected* removing alive-but-miscategorized companies (Hilton, KPMG, Magic,
Scotiabank came back "not defunct"). Those alive non-PH companies were instead
soft-hidden by scope (the reversible flag), never deleted. Two generator errors
were caught in review before applying: #309 (kept as the primary of a dup pair,
only its dup #310 hidden) and #405 Majorel (kept — a real BPO, not a clear
remove). Medium-confidence non-PH verdicts were left visible.

## What the 252 assessed companies looked like

| Action | Count | Meaning |
| --- | ---: | --- |
| keep | 160 | Alive and genuinely hires Filipino talent |
| recategorize | 42 | Real, but mislabeled — job boards / marketplaces, not employers |
| remove (proposed) | 22 | Defunct, duplicate, or does not hire Filipinos — **unverified** |
| review | 16 | Genuinely ambiguous, needs a human glance |
| update_url | 12 | Company alive but moved domains — fix the link |

By PH-hiring category: 162 `hires_ph_direct`, 31 `job_board`, 18 `marketplace`,
13 `no_ph`, 11 `global_remote_incl_ph`, 11 `unclear`, 6 `defunct`.

Full row-level data: [`findings-2026-07-20.json`](findings-2026-07-20.json).

## Highest-signal proposed changes (for human review)

**Moved domains — fix URL, keep company (12):** e.g. Kaya Services → kaya.services,
Olivia Pros careers → oliviapros.ph, Support Shepherd → rebranded "Somewhere"
(somewhere.com), REassist → .net.au, Surge VA → surgefreelancingmarketplace.com.

**Does-not-hire-Filipinos (proposed remove/relabel):** BELAY (US-only
contractors), Boldly (US/UK/CAN/EU W-2), GetFriday (India-based), UAssist.ME &
SharkHelpers (LatAm), Virtalent (UK-only), MS Virtual Assistant (AU-only).

**Miscategorized non-employers:** Elastic Path (commerce SaaS), Hilton Hotels
AU, KPMG Canada, Scotiabank, Staffing.com (a Toptal content blog).

**Duplicates:** StaffingSolutions.io #356 dups #355; Magic VA #302 dups #301.

**Defunct (dead domain, no successor found):** FJ Accountants, Hammerhead VA,
Philippines Recruitment UK, Virtual Assistants Philippines.

## Automated pulse (supersedes the manual link sweep)

The dead-link detection that started this audit is now a daily bot —
`.github/workflows/gha-directory-pulse.yml` → `/api/cron/directory-audit`,
using `packages/scraper/linkHealth.ts` (the same bot-wall-vs-dead classifier the
manual sweep validated). A company must fail **3 consecutive** hard-dead checks
before it is de-verified and annotated; it is **never deleted** and its URL is
**never edited**. Digest committed daily to `docs/directory-health-latest.md`.

## To finish the PH-hiring half

Re-run the assessment workflow (resumes from cache — 252 already done) to cover
the remaining ~139 companies, then let the verify pass complete. Only
verify-confirmed changes should be applied, via an idempotent migration, with
moved-domain URL fixes and recategorizations (marketplace/job_board flags)
batched separately from any removals.
