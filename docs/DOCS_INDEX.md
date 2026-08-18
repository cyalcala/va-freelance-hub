# Docs Index

## Purpose

This index tells future AI agents which documents are canonical, which are
historical, and where to resume. Start here instead of guessing from filenames.

## Current Checkpoint

Before any new implementation or deployment, read these documents in this
order:

1. AGENTS.md
2. docs/apex-audit-2026-08-18.md — **latest**: Apex debugging & hardening audit.
   Fixed U1 (directory-enrich `ORDER BY id ASC` starvation, `d6114b2`) and F2
   (directory-audit 60-fetch subrequest-cap breach → budget 40, `6e07bcf`);
   verified the rest of the system robust. Confidence scores + deferred work.
3. docs/directory-growth-strategy-2026-08-16.md — Directory Growth
   Engine strategy: enrichment cron (website inference + auto-verification),
   curated VA agency seed (28 companies), GHA workflow, daily cycle documentation
3. docs/checkpoint-2026-08-16-documentation-backup.md — consolidated
   2026-08-15/16 session summary (AI-subrequest freeze incident, budget fix,
   Inngest durable triage, FinalizationRegistry polyfill) and current repo state
4. docs/incident-2026-08-15-ai-subrequest-freeze.md — the freeze + emergency budget fix
5. docs/inngest-durable-triage-2026-08-15.md — the Inngest structural fix + owner activation steps
6. docs/checkpoint-2026-08-15-deepseek-continuation.md — Apex gauntlet units completed
7. docs/major-audit-2026-08-11.md — prior: alerting regression + Sovereign Crawler Phase 4A/4B
8. docs/labor-engine-masterplan-2026-07.md — the standing forward roadmap
9. docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md
10. docs/HANDOFF.md
11. docs/SYSTEM_SAVEPOINT.md
12. docs/AI_RECOVERY_TRAIL.md

The 2026-08-15 work is merged to `main` (`5986311`, `77101b5`) and **Inngest is
activated in production** (2026-08-16): valid `INNGEST_SIGNING_KEY` set, app
registered, `triage-drain` cron live every 10 min. Remaining acceptance: confirm
the `pending_triage` backlog (155 @ 22:02Z) drains and the board advances past
2026-08-14. Full owner steps: docs/checkpoint-2026-08-16-documentation-backup.md.

The 2026-08-11 checkpoint is on branch `codex/audit-worktree-bootstrap`,
pushed but not merged or deployed. It carries migration 0030, which must be
applied through the migration-first release path **before** the code that reads
`robots_cache`.

The earlier 2026-08-10 production hardening audit
(`docs/major-production-audit-2026-08-10.md`) has since been merged to `main`
and independently verified; treat it as history, not as a pending checkpoint.

## Canonical Recovery Trail

Read these in order:

0. `docs/labor-engine-masterplan-2026-07.md` - **the standing forward roadmap**
   (2026-07-21): verified $0 free-tier capacity ledger, non-negotiable
   invariants, 8 phased upgrades (trust surface → retention → push → semantic
   search → engine hardening → prospector autonomy → recurrence → gated
   accounts), and the executor protocol. New sessions doing forward work start
   here; recovery/debugging sessions continue with the trail below.
1. `docs/checkpoint-2026-08-16-documentation-backup.md` - **latest session
   summary**: the 2026-08-15 AI-subrequest freeze incident and its three-layer
   fix (budget tourniquet `21cbbeb`, Inngest durable triage `c897560`,
   FinalizationRegistry polyfill `1d60282`), the completed Apex gauntlet units,
   and the current repo state. Start here for anything after 2026-08-15.
2. `docs/incident-2026-08-15-ai-subrequest-freeze.md` - the freeze root cause
   (Workers Free 50-subrequest/invocation cap), the budget fix, verification,
   and deployment path.
3. `docs/inngest-durable-triage-2026-08-15.md` - the Inngest durable-triage
   architecture, the signing-key feature flag, and owner activation steps.
4. `docs/checkpoint-2026-08-15-deepseek-continuation.md` - Apex gauntlet units
   completed by the continuation agent.
5. `AGENTS.md` - active project context and operating rules.
6. `docs/maintenance-bot-2026-07-04.md` - the Tier-1 maintenance bot: Hunter
   alert issues, daily Sentinel flapping-source detector, weekly Medic
   health digest. Detection is automated; decisions stay human/agent-gated.
7. `docs/major-audit-2026-07-04.md` - latest major audit: found and fixed the
   silent fetch-event logging failure (D1 bound-parameter limit), rewrote the
   hard-deleting prune endpoint to soft-archive, surfaced triage failures and
   cadence-guard state in scrape responses, and set the durability rules for
   future write paths.
8. `docs/gold777-directory-import-2026-07-04.md` - directory-import
   checkpoint: 32 new `va_directory` companies cross-referenced from
   `gold777.xlsx`, plus verified Greenhouse/Breezy ATS tokens for GitLab,
   Ghost, Remote.com, and Time Etc.
9. `docs/IMPLEMENTATION_STATUS.md` - current percentage, phase status, and next
   task.
10. `docs/HANDOFF.md` - latest stop/resume note.
11. `docs/MASTER_EXECUTION_PLAN.md` - full roadmap and acceptance strategy.
12. `docs/AI_RECOVERY_TRAIL.md` - backup loop and evidence requirements.
13. `docs/SYSTEM_SAVEPOINT.md` - current saved state and operational baseline.
14. `docs/gemini-masterplan-handoff-2026-06-13.md` - current Gemini-ready
    masterplan, latest QA baseline, and next ordered workstreams.
15. `docs/remote-ok-json-source-handoff-2026-06-13.md` - latest source-specific
   handoff for Remote OK JSON ingestion, quality filtering, production D1
   evidence, and next safe work.
16. `docs/source-expansion-2026-06-12.md` - accepted source-expansion
   implementation evidence, D1 source-state snapshot, and next safe work.
17. `docs/goldilocks-source-expansion-handoff-2026-06-12.md` - source-expansion
   plan for balanced compliance, ingestion caps, cadence, and indexing.
18. `docs/ats-policy-follow-up-2026-06-12.md` - latest ATS source policy
   hardening and Hunter evidence.
19. `docs/wrangler-d1-audit-2026-06-12.md` - latest Wrangler v4 and local D1
   audit recovery evidence.
20. `docs/major-audit-2026-06-11.md` - major health audit and hotfix evidence.
21. `docs/major-audit-2026-06-10.md` - post-Lens 2 health audit and timestamp
   backfill evidence.
22. `docs/major-audit-2026-06-06.md` - original recovery-roadmap major audit
   findings.
23. `docs/source-review-2026-06-09.md` - latest RSS/HTML source keep/pause
   evidence.
24. `docs/ats-source-review-2026-06-09.md` - earlier ATS source policy
   evidence.
25. `docs/data-quality-snapshot-2026-06-09.md` - latest production data-quality
   metrics.
26. `docs/stale-policy-dry-run-2026-06-09.md` - latest no-mutation stale policy
   dry run.
27. `docs/application-url-backfill-2026-06-09.md` - latest reversible P5 data
   quality improvement.
28. `docs/hunter-health-artifacts-2026-06-09.md` - latest P6 Hunter reporting
   and backup-hygiene checkpoint.
29. `docs/source-health-rollup-2026-06-09.md` - latest P6 source-health rollup
   checkpoint.
30. `docs/source-health-latest.md` - current repo-readable source-health state.
31. `docs/final-acceptance-audit-2026-06-09.md` - final recovery-roadmap
   acceptance audit.
32. `docs/decisions/ADR-001-recovery-driven-public-job-index.md` - accepted
   methodology and compliance decision.
33. `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md` - accepted
   timestamp normalization decision.

## Agent Entry Points

- `AGENTS.md` is the main cross-agent instruction file.

## Agent Entry Points

- `AGENTS.md` is the main cross-agent instruction file.
- `CLAUDE.md` is a pointer back to the canonical recovery trail.
- Future agent-specific files should point back here instead of duplicating
  architecture details.

## Operational Docs

- `docs/scraper-alerts.md` records historical source failure commits. P6 Slice
  1 stopped new per-run alert commits; use Hunter artifacts for current per-run
  evidence until the repo-readable rollup lands.
- `docs/source-health-audit.md` contains operational SQL queries for auditing recent scraper trends, latencies, success rates, and errors.
- `docs/breezy-source-review-2026-06-13.md` contains the fresh compliance and operational review of currently configured Breezy ATS subdomains.
- `docs/data-quality-snapshot-2026-06-13.md` contains the active opportunities data quality snapshot.
- `docs/stale-policy-report-2026-06-13.md` contains the stale policy report and pruning logs.
- `docs/query-indexing-audit-2026-06-13.md` contains the query performance audit and index optimization results.
- `docs/source-expansion-2026-06-13.md` contains the details of the Jobicy Customer Support APAC source expansion.
- `docs/source-review-2026-06-09.md` records the current RSS/HTML source
  compliance and usefulness review behind P4 Slice 2.
- `docs/ats-source-review-2026-06-09.md` records the ATS duplicate-token and
  Workable pause decisions behind P4 Slice 3.
- `docs/ats-policy-follow-up-2026-06-12.md` records the follow-up that pauses
  unreviewed/noisy ATS platforms by default and verifies Hunter source health.
- `docs/goldilocks-source-expansion-handoff-2026-06-12.md` records the latest
  balanced source-expansion posture, candidate source evidence, and next
  implementation plan.
- `docs/source-expansion-2026-06-12.md` records the accepted bounded RSS source
  expansion, durable cadence tracking, source-state D1 evidence, production
  deployment recovery, and next safe source work.
- `docs/remote-ok-json-source-handoff-2026-06-13.md` records the accepted
  Remote OK JSON adapter, direct-link compliance posture, physical-role quality
  filter, cleanup migration, workflow evidence, and production D1 snapshot.
- `docs/gemini-masterplan-handoff-2026-06-13.md` records the current
  Gemini-ready masterplan after Codex QA, including the `e719a2c` CI-test
  guardrail checkpoint, current source posture, ordered next workstreams,
  verification commands, and stop conditions.
- `docs/data-quality-snapshot-2026-06-09.md` records the read-only P5 Slice 1
  production data-quality baseline.
- `docs/stale-policy-dry-run-2026-06-09.md` records the P5 Slice 2 no-mutation
  stale/source candidate policy.
- `docs/application-url-backfill-2026-06-09.md` records the P5 Slice 3
  reversible application URL backfill and ingestion write-path evidence.
- `docs/hunter-health-artifacts-2026-06-09.md` records the P6 Slice 1 Hunter
  artifact-reporting change and no-bot-commit proof.
- `docs/source-health-rollup-2026-06-09.md` records the P6 Slice 2 rollup job
  and generated `docs/source-health-latest.md` proof.
- `docs/source-health-latest.md` is the compact current source-health rollup.
  Regenerated daily by the Sentinel pulse from `source_fetch_events` in D1.
  (It froze between 2026-07-31 and 2026-08-11 while it was still tied to the
  Hunter workflow's artifact — see `docs/major-audit-2026-08-11.md`.)
- `docs/final-acceptance-audit-2026-06-09.md` records the P7 final acceptance
  audit.
- `docs/major-audit-2026-06-11.md` records the latest health audit, Hunter D1
  insert recovery, category payload reduction, repo hygiene cleanup, and
  post-fix verification evidence.
- `docs/wrangler-d1-audit-2026-06-12.md` records the Wrangler v4 upgrade,
  restored local direct D1 audit capability, and post-deploy verification.
- `docs/scraper-troubleshooting.md` contains useful history but may reference
  older Trigger.dev-era assumptions.
- `docs/system-audit-and-optimizations.md` contains earlier optimization notes;
  check against `docs/major-audit-2026-06-06.md` before treating it as current.
- `docs/major-audit-2026-06-10.md` is the post-Lens 2 health audit showing
  readiness and the final timestamp normalization completion.

## Historical Or Backup Code Paths

- `apps/web-nextjs-backup` is a backup/historical Next.js app path.
- `packages/zig-parser` exists but is not the active production HTML parser.
- `.trigger` and `trigger.config.ts` are historical unless a newer accepted
  decision reactivates Trigger.dev.

## Current Resume Rule

If the repo is clean, resume from the current focus in
`docs/IMPLEMENTATION_STATUS.md` and the next safe task in `docs/HANDOFF.md`.
If the user says stop, pause, or backup, only update the recovery docs and push
that checkpoint.
