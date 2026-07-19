# VA Directory Audit — July 2026 (IN PROGRESS)

Goal: clean dead links out of the `va_directory` company list (391 rows) and
verify each company genuinely hires Filipino talent. Requested 2026-07-18;
interrupted by a usage limit mid-run; artifacts checkpointed here so the work
can resume without repeating anything.

## Phase 1 — Link health sweep (COMPLETE, deterministic)

Every `website` and `hiring_page_url` was fetched twice: a first sweep
(`link-report.json`) plus a second verification pass (`recheck-report.json`)
that retried failures and root-domain-checked 404s so bot-walls aren't
mistaken for dead sites.

| Verdict | Count | Meaning |
| --- | --- | --- |
| LIVE | 253 | Website responds OK |
| ALIVE_BOT_WALL | 29 | 403/429 to bots but real (Canva, Fiverr, Indeed, TTEC, …) — NOT dead |
| ALIVE_CERT | 10 | TLS quirk but up (FlexJobs, Remote.co, MedVA, …) |
| DEAD_DNS | 12 | Domain no longer resolves (verified twice) |
| PARKED | 2 | Domain parked / for sale (Kaya Services #296, Legacy Property Buyers #469) |
| DEAD_404_ROOT | 2 | Homepage 404s (Vyla #247, Magic VA Services #302) |
| DEAD_404_PATH_ALIVE_ROOT | 1 | Careers path dead, site alive (Olivia Pros #312 — fix URL) |
| NO_WEBSITE | 82 | No URL on file — renders as a non-clickable entry |

**16 truly-dead candidates** (DEAD_DNS + PARKED + DEAD_404_ROOT). Several are
reputable PH BPOs (Diversify OSS #243, Unity Communications #413) that likely
*moved domains* rather than shut down — Phase 2 resolves that before any
removal.

Also found: `hires_filipinos = 1` for **all 391 rows** — the flag was
blanket-set on import and carries no signal. Phase 2 rebuilds it from
research.

## Phase 2 — Existence + PH-hiring research (PARTIAL: 98/391 assessed)

A fan-out workflow (`audit-workflow-reference.js`, data injected from
`directory-slim.json`) classifies each company:
`hires_ph_direct | global_remote_incl_ph | marketplace | job_board | unclear | no_ph | defunct`
with actions `keep | update_url | recategorize | remove | review`. Every
proposed removal gets an independent adversarial verification pass before it
is accepted (default = keep when uncertain).

Status at checkpoint: 7 of 28 assess batches complete (98 companies).
Resumable — the workflow run `wf_11a94bcf-492` caches finished batches, so
resuming re-runs only the remainder.

## Phase 3 — Apply fixes (NOT STARTED)

Planned as an idempotent, reversible migration (repo standard):
- `update_url` → fix `website` / `hiring_page_url`
- confirmed `remove` → soft-delete/annotate, never hard-delete on first pass
- `recategorize` → set `is_marketplace` etc. (Indeed/Fiverr/FlexJobs are
  platforms, not employers)
- rebuild `hires_filipinos` from research instead of the blanket 1

## Files

- `link-report.json` — raw first-pass link check, all 391 rows
- `recheck-report.json` — second-pass verdicts for the 56 first-pass failures
- `directory-slim.json` — compact merged dataset fed to the research workflow
- `audit-workflow-reference.js` — the workflow script (template form)

No production data has been modified yet. The directory on the live site is
unchanged until Phase 3 lands as a reviewed migration.
