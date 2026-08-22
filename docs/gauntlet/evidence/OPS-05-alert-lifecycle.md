# OPS-05 Source-Alert Incident Lifecycle

## Decision

`OPS-05` is **TERMINAL — KEEP**. Automated health alerts now have a stable
incident identity (a hidden body marker, not the date-titled title) and a
verified recovery lifecycle: repeated detections dedupe onto one open incident,
continued failure and recovery progress append bounded evidence comments, and an
incident closes only after two consecutive confirmed-healthy observations. The
lifecycle never unpauses or enables a source and never mutates production; the
only GitHub effects are open / comment / edit-body-marker / close on tracking
issues. Real healthy incidents remain candidates until the threshold is met by
confirmed evidence.

## Execution record

| Field | Evidence |
| --- | --- |
| Unit | `OPS-05` |
| Start | synchronized clean `main` / `origin/main` at `f1d5029` was already the behavior commit from a prior interrupted session; this session resumed at it and completed verification + acceptance |
| Behavior commits | `f1d5029` (`feat(ops): add verified source-alert lifecycle`); bounded revisions `dc2699f`, `7f0040b` |
| Branch/worktree | `main`; primary worktree (no worktree required) |
| Primary Addy workflow | `ci-cd-and-automation` |
| Superpowers mechanism | verification-before-completion + fresh independent operations critic (two rounds) |
| Files | `scripts/gha/source-alert-lifecycle.ts`, `scripts/gha/source-alert-lifecycle.test.ts`, `.github/workflows/gha-ingest-watchdog.yml`, `.github/workflows/gha-sentinel-pulse.yml`, `.github/workflows/gha-hunter-pulse.yml` |
| Local G3 | 589 tests, 0 failures, 1,367 assertions; typecheck, build, guardrails all pass (at `7f0040b`) |
| Focused tests | 20 pass / 0 fail / 32 assertions (`source-alert-lifecycle.test.ts`) |
| CI/deploy | runs `32587929436` (`f1d5029`), `32588597297` (`dc2699f`), `32589627739` (`7f0040b`) — all success incl. D1 migrations, FTS verify, Pages deploy |
| Synthetic lifecycle drill | workflow_dispatch run `32588713203` on `dc2699f`: issue [#72](https://github.com/cyalcala/va-freelance-hub/issues/72) created `2026-08-22T17:45:56Z` with unique key `synthetic-32588713203`, healthy observation 1/2 recorded (streak marker 0→1 + comment), auto-closed `2026-08-22T17:46:00Z` at threshold 2 |
| Permission diff | no new scope beyond pre-existing `issues: write`; watchdog unchanged (`contents: read`, `actions: read`, `issues: write`); Sentinel unchanged top-level; Hunter scopes `issues: write` to the new lifecycle job only (`gha-hunter-pulse.yml:389`) |
| Real-candidate dry-run | in-run step succeeded (read-only); reproduced locally against live open issues: 5 unkeyed `source-health` issues (#51–54, #69); failing → `CREATE` (with #69 title-adoption path), healthy → `HOLD`. No real closure occurred anywhere in acceptance. |
| Critic | fresh independent critic round 1: **REVISE** (I-1 cross-evaluator false closure; I-2 match-order orphaning) → bounded revision `7f0040b` → same critic round 2: **SHIP** |
| Decision | `KEEP` |

## Design contract

- `decideAlertLifecycle()` is pure: given one incident class's health signal
  (`failing | healthy | unknown`) plus the currently-open issues, it emits
  exactly one action — `CREATE | UPDATE | HOLD | CLOSE`. Workflows execute only
  that action.
- Stable incident keys per class: `ingestion-health` (watchdog + Sentinel),
  `enrichment-health` (Sentinel enrichment), `hunter-source-health` (Hunter).
  Keys ride in hidden body markers (`<!-- incident-key: ... -->`,
  `<!-- healthy-streak: N -->`), so legacy date-titled issues stay untouched.
- Fail-closed: an unknown/unproven signal (post-deploy grace window, unreadable
  heartbeat, unreadable issue list) always yields `HOLD`; nothing can be created
  or closed on it.
- Idempotent: stable key + streak markers mean reruns of the same state produce
  `HOLD`, not duplicate issues/comments.
- Adoption over duplication: a pre-existing unkeyed date-titled alert for the
  same class is adopted (markers + one comment added, never closed). Post-create
  self-dedupe closes only an issue the run itself just created when an older
  keyed sibling exists.
- Oldest-wins binding: if duplicate keyed siblings transiently exist, the
  evaluator always advances/closes the lowest-numbered (oldest) issue, so a race
  twin can never orphan the real incident as permanently stale.

## Honest failure record during acceptance

1. First synthetic drill attempt (run `32588399580`) failed at its step 2: the
   drill re-read the just-created issue via search-backed `gh issue list`, which
   had not indexed it yet (~1s old), so the evaluator correctly reported "no
   open incident". Root cause was the probe's query mechanism, not the
   evaluator; fix `dc2699f` reads the issue back via direct REST
   (`gh issue view`). Orphaned synthetic issue #71 was closed with a corrective
   comment referencing the failed run.
2. Fresh critic found two real weaknesses, both fixed in `7f0040b`:
   - **I-1**: Sentinel shared the `ingestion-health` key but its healthy
     predicate omitted board freshness — Sentinel could have closed a
     watchdog-opened "board frozen" incident on heartbeat freshness alone.
     Fixed by mirroring the watchdog query + 36h board-stale threshold exactly
     (absent/unreadable values skip, never false-alarm).
   - **I-2**: evaluator matched the first key hit in API order (newest-first),
     which could permanently orphan an older keyed twin. Fixed with
     deterministic oldest-wins binding + regression test.

## Recorded follow-up findings (not blocking; do not reopen OPS-05)

- Marker hardening: interpolated evidence text precedes trailing markers;
  provenance analysis makes injection improbable, not impossible (strip HTML-
  comment tokens from evidence or honor last marker occurrence).
- Sentinel `pull-requests: write` looks vestigial (PR ops use the PAT); trim in
  a dedicated least-privilege pass.
- Drill-orphan cleanup: a mid-drill abort leaves a keyed `synthetic-*` issue
  open forever; add a `if: failure()` cleanup step.
- Documented residual: inventory→close TOCTOU window (minutes on hourly/daily
  clocks; watchdog re-CREATEs within the hour if wrong) accepted; empty-`opportunities`
  board-age NULL skips the check symmetrically in both evaluators.

## Rollback

Revert the three commits (`f1d5029`, `dc2699f`, `7f0040b`); issues remain as
durable evidence. Any falsely closed incident would be reopened with a
corrective comment — none were.
