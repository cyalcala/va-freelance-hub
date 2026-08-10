# Major Audit — 2026-08-11: Alerting Regression and Sovereign Crawler Phase 4A/4B

Date: 2026-08-11
Branch: `codex/audit-worktree-bootstrap`
Status: implemented, tested, pushed. Not yet merged or deployed.

## Why This Audit Ran

The previous session verified that the five-track production hardening audit
(Codex/Nemotron, PR #55) was correctly implemented and merged. This session
picked up the forward work: continue where Codex was heading, find whatever the
audit chain had left behind, and close it.

The audit chain itself turned out to contain the most serious finding.

## Ranked Findings

| Priority | Finding | Status |
| --- | --- | --- |
| P0 | Per-run ingestion degradation became invisible when the Hunter schedule was removed | Fixed |
| P1 | `docs/source-health-latest.md` froze on 2026-07-31 while still being advertised as current | Fixed |
| P1 | robots.txt was documented but never enforced at runtime | Fixed (observe mode) |
| P1 | Crawler identity had drifted into five different strings and one absence | Fixed |
| P2 | Declared `Crawl-delay` directives were never parsed | Parsed and surfaced; scheduling is Phase 4D |
| P2 | A stale git worktree held `main` checked out, blocking branch operations | Fixed |
| P2 | Uncommitted MessageChannel polyfill removal from the prior session | Committed |

## P0 — Ingestion alerting was orphaned

### What happened

Commit `b3347f3` (2026-07-31, "audit findings round 2") implemented finding P-5:
*Remove Hunter GHA schedule trigger (Workers cron is primary)*. On its own terms
that was correct — the Cloudflare cron Worker fires every 15 minutes, while
GitHub's free scheduler drifts 1.5–3 hours.

But the Hunter workflow was not only a clock. Its `alerts` job was the sole
consumer of the per-run degradation signals the scrape route returns:

- `insertFailedBatches`, `insertErrors`
- `rejectedInsertFailedBatches`
- `triageFailures`, `triageAiUnavailable`
- `fetchEventLog.failedBatches`
- `failedSources`
- `cadenceGuards.stateAvailable`

Removing the schedule left those reported into an HTTP response that nothing
reads. The Worker validates the response *shape* and then discards it.

This regressed the entire 2026-07-04 silent-error audit (S-1..S-6). S-1 had
already demonstrated the cost of exactly this gap: `source_fetch_events` logging
was silently broken for two months because the failure only reached
`console.warn`.

### How it was found

The Hunter workflow's last run was 2026-07-31 — eleven days before this audit.
Nothing had reported that. Ingestion itself turned out to be healthy (the Medic
digest of 2026-08-09 shows ~425 fetch attempts per source over seven days, and
1,636 active opportunities), so the silence was invisible from the outside.

That is the point: the failure mode was undetectable by design, and it was only
luck that the Worker happened to be healthy throughout.

### The fix

Rather than restoring the GHA schedule — which would duplicate ingestion, waste
the Workers quota, and fight the run-lock — the diagnostics were made durable so
alerting no longer depends on *which clock* fired the run.

`apps/web/src/lib/run-diagnostics.ts` reduces a run to a compact summary parked
on a reserved `__ingest_diag__` row in `source_fetch_state`. This reuses the
pattern the unclear sweep already established with `__sweep_diag__`, so it needs
no schema change.

The row carries two independent signals:

1. **`last_error`** — degradation on the most recent run, null when clean.
2. **`last_attempt_at`** — a heartbeat stamped by *every* run, including clean
   ones. A stale value means the clock itself stopped.

The second signal is the one that did not exist before in any form. It is what
would have caught this regression on day one instead of day eleven.

A degraded run deliberately omits `last_success_at` from the conflict-update
rather than writing null, so the gap between the two columns measures how long
degradation has persisted.

The daily Sentinel pulse reads the row and files a deduped issue when either
signal fires, using a 3-hour staleness threshold (12 missed 15-minute ticks) —
long enough to ride out a transient Cloudflare incident, short enough to catch
a dead clock same-day.

Diagnostics never throw. A failed diagnostic write must not fail a scrape that
otherwise succeeded.

## P1 — The source-health rollup had frozen

`docs/source-health-latest.md` stopped updating on 2026-07-31 for the same
reason: the rollup was a second job on the Hunter workflow that reformatted
Hunter's own `harvest.log` artifact, and it was gated to manual dispatch when
the schedule was removed. `DOCS_INDEX.md` continued to describe it as "the
compact current source-health rollup".

Rebuilt as a scoped job on the daily Sentinel pulse, derived from
`source_fetch_events` in D1 rather than from one workflow's artifact. It now
reflects every scrape regardless of which clock fired it. `contents: write`
stays scoped to the rollup job so the Tier-3 autonomous pause job keeps its
narrower permissions.

## P1 — Sovereign Crawler Phase 4A: robots.txt at runtime

### The gap

Every `robots` reference in the codebase was a human-written `complianceNotes`
string in `sources.ts`, e.g. *"Current review 2026-06-09: robots allows the feed
path"*. There was zero runtime robots.txt fetching or parsing. Compliance was a
snapshot taken when a source was added, not a live contract — a source could
revoke access and we would keep fetching indefinitely.

This matters more than usual here, because the masterplan's Phase 1 ships a
public `/transparency` page asserting ethical crawling. Publishing that page
while the code never reads robots.txt would convert a to-do into a false public
claim.

### What was built

`packages/scraper/robots.ts` — an RFC 9309 subset:

- user-agent group selection by token specificity, with `*` as fallback
- longest-match Allow/Disallow precedence, allow winning equal-length ties
- `*` and `$` wildcards, compiled by escaping all regex metacharacters first so
  a pattern containing regex syntax cannot alter match semantics
- `Crawl-delay` and `Sitemap:` collection
- Cloudflare **Content Signals** (`search` / `ai-input` / `ai-train` / `use`),
  parsed from both the comment and directive forms

`packages/scraper/robotsGate.ts` — orchestration: decisions cached in D1 keyed
by **origin** (one robots.txt governs every source on a host, so one fetch
serves many checks), 24-hour TTL enforced at read time, explicit handling of
fetch failure.

Migration `0030_robots_cache.sql` — idempotent, verified locally, applies twice
cleanly.

### Two decisions worth recording

**1. Unreachable is not permitted.** RFC 9309 §2.3.1.3 already groups 429 with
5xx as unreachable, requiring a complete disallow. We additionally classify
401/403 as `unknown` rather than following §2.3.1.2's grouping with 404. Being
refused permission to read the rules is closer to a refusal than to an absence
of rules, and this project's stated posture is to pause when access is refused.
The cost is asymmetric: over-pausing loses a source, under-pausing means
crawling somewhere we were told not to.

Only an explicit `allowed` clears the gate. Withheld consent is never implied
consent.

**2. Enforcement is staged.** The gate ships in **observe** mode: every decision
is computed, cached and reported, and `robotsWouldBlock` counts what enforce
mode would have skipped — but no fetch is blocked yet.

Shipping a hard gate straight to a live $0 pipeline risks a silent ingestion
halt from a parser bug or a transient wave of 5xx, with falling job counts as
the first symptom. That is precisely the failure class this same audit just
fixed. Enforce mode is fully implemented and tested; only the default differs.

The flip checklist is documented at the `ROBOTS_MODE` constant in `scrape.ts`:

1. `robotsWouldBlock` stays 0 across ~24h of runs, or every non-zero case is
   explained and accepted;
2. `robots_cache` holds a row per active origin;
3. record the decision here and in `IMPLEMENTATION_STATUS.md`, then change the
   constant in its own commit so it can be reverted alone.

### Golden test set

68 tests built from RFC 9309's own worked examples plus the real robots.txt of
our live sources. RemoteOK's Content-Signal line
(`search=yes,ai-train=no,use=reference`) is fixture #1 — it confirms our use
(index, short excerpt, link back) sits in the `search` lane that source
explicitly sanctions, while `ai-train=no` is honored by never training.

One test caught a genuine spec bug during development: 429 was being read as an
allow.

## P1 — Sovereign Crawler Phase 4B: one crawler identity

The identity had drifted into five different strings and one absence:

| File | Before |
| --- | --- |
| `json.ts` | honest bot with a contact URL |
| `rss.ts` | honest bot, no contact URL |
| `html.ts` | declared-bot form with a contact URL |
| `ats.ts` | Breezy impersonated Chrome/120; Lever, Greenhouse, Ashby and Workable sent **no** User-Agent at all |
| `linkHealth.ts` | impersonated Chrome/125 |
| `verify-links.ts` | impersonated Chrome/120 |

Nobody decided that — it accumulated.

`packages/scraper/userAgent.ts` is now the single source of truth, with two
deliberately distinct identities:

- **`COLLECTION_USER_AGENT`** — `Mozilla/5.0 (compatible; RemotePHJobsBot/1.0;
  +url)`, the declared-bot form Googlebot and bingbot use. Applied to every
  collection fetch, including the four ATS endpoints that previously sent
  nothing. Those are public job-distribution APIs; they exist to be read, so
  there was never anything to disguise.

- **`LINK_CHECK_USER_AGENT`** — a browser UA, kept for link-liveness checks
  only. Those requests ask *"would a job seeker clicking this link still reach
  the posting?"*, so they stand in for that person's browser; a bot UA there
  measures bot reachability, which is not the question being asked. Naming it
  makes this a decision on the record rather than drift.

The contact URL points at the repository, which resolves today. When Phase 1
ships `/transparency`, switch `CRAWLER_CONTACT_URL` so the UA never advertises
a 404.

No evasion is introduced or retained: no proxy rotation, no fingerprint
spoofing, no retry-with-a-different-identity. A source that refuses a declared
bot has told us something, and the compliant response is to pause and ask.

### Residual risk

Dropping the Chrome spoof on ATS collection may cause a source to start
returning 403. Exposure is bounded: the RSS/JSON sources already received honest
UAs and work fine, and the ATS endpoints are public distribution APIs. Watch
`failedSources` for Breezy and the HTML sources over the first few runs after
deploy. Per the standing policy, a source that blocks a declared bot should be
paused and asked — not disguised.

## Verification

| Check | Result |
| --- | --- |
| `bun test` | 327 pass, 0 fail, 615 expectations, 36 files (was 234 across 32 at session start) |
| `bun run typecheck` | Clean (strict) |
| `bun run build` | Clean |
| Migration 0030 local apply | Applied; re-applied cleanly (idempotent); all 7 columns verified |
| Workflow YAML | `gha-sentinel-pulse.yml` parses; both jobs present with correct permissions |

## Deliberately Not Done

- **Legacy paths untouched.** `trigger.config.ts`, `.trigger/`, Turso and
  Inngest references, `apps/web-nextjs-backup`, and `scripts/gha/harvest.ts` are
  quarantined legacy and were left alone by owner instruction. `harvest.ts` and
  `trigger.config.ts` already carry throwing `LEGACY_QUARANTINE` guards, and the
  CI guardrail asserts they stay quarantined.
- **Robots enforce mode.** Staged deliberately; see the flip checklist above.
- **Crawl-delay scheduling.** `Crawl-delay` is now parsed and surfaced per
  source, but is not yet used to space requests. That is Phase 4D (adaptive
  cadence), which needs the `next_fetch_at` work.
- **ATS robots gating.** The gate is wired into the configured-source choke
  point (`fetchConfiguredSourceWithStatus`), covering RSS/HTML/JSON. ATS
  fetching is a separate code path and a separate slice.
- **Two orphaned worktree directories.** `.worktrees/major-quality-audit` and
  `.worktrees/production-release` are deregistered leftovers containing
  `node_modules`. They are gitignored and harmless; deleting several hundred MB
  of directories was left to the owner. The live worktree that held `main` was
  removed, so branch operations are unblocked.
- **Leaked secret rotation.** Still an owner action: the `tr_dev_` Trigger.dev
  key, Turso JWT and ISR_SECRET remain in git history and must be rotated at
  their providers.

## Next Safe Work

1. Merge this branch and deploy through the migration-first release path so
   migration 0030 lands before the code that reads `robots_cache`.
2. Watch the first Sentinel run after deploy: it should report
   `Ingestion: healthy` and a heartbeat under 3 hours.
3. Collect ~24h of `robotsWouldBlock` evidence, then flip `ROBOTS_MODE` to
   `enforce` in its own commit.
4. Continue the masterplan: Phase 4C (acquisition ladder — sitemap + JSON-LD
   `JobPosting`, which feeds `applicantLocationRequirements` into the geo gate)
   is the highest-value next slice, since it improves data correctness at the
   source.
