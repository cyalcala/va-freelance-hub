# Tier-1 Maintenance Bot - 2026-07-04

## Purpose

After the 2026-07-04 major audit (`docs/major-audit-2026-07-04.md`), the user
asked for a free, 24/7, internally-run maintenance bot. The chosen design is
the deterministic tier: GitHub Actions (free on this public repo) doing
detection, alerting, and reporting — with all *decisions* (pausing sources,
merging code) left to a human or a supervised agent session, per the
compliance rules in AGENTS.md.

This deliberately avoids an autonomous code-editing agent. The audit's own
findings justify that: unsupervised destructive automation (the old prune
endpoint) caused the worst damage, while honest reporting made everything
fixable. The bot therefore proposes; it never disposes.

## Components

### 1. Hunter `alerts` job (in `gha-hunter-pulse.yml`)

After every Hunter run, parses `harvest.log` and files a GitHub issue
(label `source-health`) if any internal degradation is present:

- failed sources > 0
- `fetchEventLog.failedBatches` > 0
- `triageFailures` > 0
- `insertFailedBatches` > 0
- `cadenceGuards.stateAvailable` != true

At most one issue per UTC day (title `Source health alert (YYYY-MM-DD)`,
deduped against open issues). Healthy runs create nothing. Uses only the
built-in `GITHUB_TOKEN` with `issues: write`.

### 2. Sentinel pulse (`gha-sentinel-pulse.yml`, daily 01:30 UTC)

Queries `source_fetch_events` (real history since the audit fix) with a
window-function SQL — validated against production before shipping — for
sources whose **last 4 non-skipped fetch attempts all failed**. For each,
files a pause-recommendation issue (`Auto-pause recommended: <source_id>`,
deduped while one is open) containing the evidence, the sample error, and
the exact files to edit (`packages/scraper/sources.ts` or
`ATS_TOKEN_POLICIES` in `scrape.ts`). Read-only D1 access via the same
`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets CI already uses.

### 3. Medic pulse (`gha-medic-pulse.yml`, weekly Sunday 02:00 UTC)

Automates the read-only data-quality snapshot that major audits previously
gathered by hand: active/total counts, staleness buckets, never-verified
backlog, missing-company count, duplicate title+company groups, and a
7-day per-source reliability table (attempts / ok / skipped / items).
Writes `docs/health-digest-latest.md` and commits it with the same
guarded once-per-date pattern as the daily source-health rollup.
Week-over-week drift becomes visible in the file's git history.

## Cost And Runtime Posture

- $0: public-repo GitHub Actions minutes are free; D1 reads are far inside
  the free tier; no new services, tokens, or scopes were added.
- Event/cron-driven, not always-on: nothing idles; "24/7" coverage comes
  from the schedule mesh (Hunter ~30min, Sentinel daily, Prune daily,
  Verifier 12h, Medic weekly, rollup daily).
- GitHub cron lag (observed hours-level delay on the 30-min Hunter cron)
  affects timing but not correctness; all detectors read durable state.

## Guardrails

- The bot never pushes code and never edits scraper configuration.
- The only bot commits are docs files (`health-digest-latest.md`), matching
  the pre-existing rollup pattern.
- Issues are deduplicated (per-day for alerts, per-source-while-open for
  pause recommendations) to prevent notification spam.
- All D1 access is read-only; the digest job's only write is a docs commit.

## Tier 2 (Implemented 2026-07-04, same day)

Both issue-filing bots now append an advisory Workers AI diagnosis as an
issue comment after creating an issue:

- Hunter `alerts` job: sends the degradation evidence (failed sources,
  fetch-event log state, triage/insert failures, cadence state) to Workers
  AI and comments a root-cause analysis on the daily alert issue.
- Sentinel pulse: sends each flapping source's failure row and comments a
  transient-vs-persistent assessment and pause-now-or-wait call on the
  pause-recommendation issue.

Design properties that keep Tier 2 as safe as Tier 1:

- **Advisory-only output path.** The model's text lands in an issue
  comment — inert report text a human reads. It is never executed, never
  written to code, and never fed back into automation. This is the
  guardrail that makes prompt injection from scraped content harmless:
  even if a malicious job posting smuggled instructions into an error
  string, the worst outcome is a misleading paragraph in a comment.
- **Untrusted-data framing.** The system prompt explicitly instructs the
  model to treat all evidence as data, never as instructions.
- **Graceful degradation.** AI steps are `continue-on-error` / fallible by
  design; if Workers AI is down or over quota, the deterministic issue
  stands alone, unchanged.
- **Zero new credentials.** Reuses `CLOUDFLARE_API_TOKEN` (which already
  carries the `ai` scope for triage) and the built-in `GITHUB_TOKEN`.
- **Proven models.** Uses the same Llama model chain
  (`@cf/meta/llama-3.1-8b-instruct` with fallback) that production triage
  has run daily for weeks, within the Workers AI free allocation.

## Tier 3 / Level A Auto-Pause (Documented, Not Implemented)

If fuller autonomy is wanted later: upgrade Sentinel from
recommend-a-pause to open-a-pause-PR with auto-merge on green CI. Pausing
is fail-safe and policy-encoded, so it is the one code change safe to
automate. Requires a fine-grained PAT secret (GITHUB_TOKEN-created PRs do
not trigger CI) and enabling repo auto-merge. Enabling sources and editing
scraper logic stay human-gated regardless.

## Verification

- All five workflow YAML files parse cleanly (local PyYAML check).
- Sentinel detection SQL validated against production D1: window functions
  supported; returned empty (no flapping sources) on 2026-07-04.
- Medic reliability SQL validated against production D1: returned 34
  sources including the gold777 ATS additions (greenhouse:gitlab with 143
  items, greenhouse:ghost 4, breezy:time-etc 1), confirming the audit's
  fetch-event fix end-to-end.
- First live runs: Sentinel 2026-07-05 01:30 UTC, Medic 2026-07-06 (Sunday)
  02:00 UTC, alerts job on the next Hunter tick. Each can also be run via
  workflow_dispatch from the Actions tab.
