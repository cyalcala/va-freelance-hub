# VA Directory Audit — Findings (2026-07-20)

Research pass over the 391-company `va_directory`. **252 of 391 companies were
assessed** before the run hit a usage limit; batches 18–28 (~139 companies) and
the entire adversarial verify pass did not complete.

## ⚠️ Status: PROPOSAL ONLY — nothing here has been applied to production

The workflow's safety design is *assess → adversarially verify → apply*. The
**verify pass failed entirely** on the usage limit, so every proposed removal is
unverified. No rows were deleted, de-verified, or edited from these findings.
They are recorded here for a human decision and for the next verified pass.

The recurring **link-health** half of this audit is now fully automated (see
[Automated pulse](#automated-pulse-supersedes-the-manual-link-sweep)); the
**PH-hiring** half below still needs a verified re-run to become actionable.

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
