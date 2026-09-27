# Current resume pointer

## Active bounded unit

HRI-01, HRI-02, and HRI-03 completed and accepted on 2026-09-27. All 488 vetted companies
from `https://remotejobs-ph.pages.dev/directory` were scraped, validated, and ingested into
the Turso Data Lake (`lake_intake_batches` and `lake_intake_items`) with full content hashing
and provenance (batch `batch_20260927_8001e34738`). All 488 were processed with prioritized
focus on Australian & Dayshift VA (22), Global VA (230), and Job Boards (61), discovering
138 new active ATS endpoints enrolled into `lake_ats_discovery`, cataloging 58 candidate job
boards, and matching 3 active production scrapers.

Graduated Sources Visibility Resolution & Strategy delivered:
- Mathematical root-cause strategy authored (`docs/strategies/GRADUATED_SOURCES_VISIBILITY_MATHEMATICAL_STRATEGY.md`).
- 138 agency roles recategorized in production D1 out of 'other' into active categories (admin now 127, customer-service 78, finance 77, marketing 132).
- Direct VA agency spotlight section and hero quick-filter pills added to homepage (`index.astro`).
- Agency filter chips added to `/opportunities` and distinct styling in `OpportunityCard`.
- Full test suite passing (1,313 pass / 0 fail) and clean build verified.

## Optional human research intake — HRI-01/02/03 ACCEPTED

See the [intake plan](../plans/HUMAN_RESEARCH_INTAKE_PLAN.md). Units HRI-01 (durable intake
schema & provenance), HRI-02 (classification, normalization & deduplication), and HRI-03
(link checks, enrichment & source prospecting) are implemented and accepted. HRI-04 (shared
qualification & publication controls) and HRI-05 (contribution reporting) remain follow-on
milestones. MATH-06A publication authority closure remains a prerequisite before public dispatch.

Refreshed 2026-09-27 for **PROMPT-MATH-PROGRAM-V5.2**.
This pointer is navigation and dated evidence, not policy or a dispatch command.

1. Read the newest entry in [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).
2. Use the [maintainer bootloader](MAINTAINER_BOOTLOADER.md) for a fresh session,
   [execution prompt](EXECUTION_PROMPT.md) for a concrete task, and
   [master operating prompt v5.2](MASTER_OPERATING_PROMPT.md) for the full contract.
3. Read the [fusion review](../audits/2026-09-27-PROMPT-FUSION-REVIEW.md) and
   [repository findings](../audits/2026-09-27-REPOSITORY-CHECK.md) before resuming
   publication or source-expansion work.

All three v5.2 prompts explicitly pursue **100 to 150 qualified, unique, fresh
jobs published on the website per day** (100/day floor target; 150/day stretch).
Checkpoints report dated history, verified current flow and target gaps, and the
next action toward sustained delivery. Daily flow was not measured by this edit.

## Mathematical program v5.2

Read the [strategy](../MATHEMATICAL_IMPROVEMENT_STRATEGY.md) and
[plan and working register](../plans/MATHEMATICAL_IMPROVEMENT_PLAN.md).
All 13 challenges have active work cards, dependencies, experiments and acceptance
criteria. Initial program acceptance is **0/13**; existing implementations and
dated findings are baselines, not a claim that nothing works. Direction:
trustworthy publication and measurement -> stable processing -> resilient source
portfolio -> adaptive control -> measured operation with drift and recovery checks.
Trigger.dev is not currently used; scheduling uses the Cloudflare Worker and
GitHub Actions. This is a documentation milestone, not runtime resolution.

## Current documentation checkpoint

- All three active prompts are now version 5.2 and open with the user's exact
  professional identity. Both copyable prompt blocks include that same identity.
  The master explains how to apply it throughout the work. This follows the
  user's explicit identity request and preserves the v4 operating contract.
- The checks and observations below belong to the earlier v4 repository audit;
  they were not repeated as a new runtime audit for this editorial update.
- All four supplied notes were fully read; useful requirements were fused and
  conflicting/self-authorizing instructions were recorded rather than executed.
- Start HEAD: `7290bea8b3c0bc9df68d109afc7477a34dcafff4`.
  Fetched main: `4edc8828770474952461ca08e8b51769234347bd` (five digest commits ahead;
  runtime source unchanged). Re-fetch before the next unit.
- The task changed prompts, review evidence and recovery navigation only.
  No runtime repair, policy amendment, production mutation or release occurred.
- The full file inventory covers 830 tracked paths. The code review was broad
  and selective, not a semantic read of every line; see its coverage ledger.
- Audits, app/Worker typechecks, Python tests, migration rehearsals and build
  passed. Full Bun run: 1543 pass / 1 timeout; targeted longer-timeout rerun:
  2 pass. Local Bun 1.4.2 differs from pin 1.3.14.

## Open operational findings — refresh before acting

- Lake sync bypasses the stated publication gateway; the gateway's missing-row
  fallback and receipt ordering need bounded repair. Scheduled concentration
  checks receive no inventory snapshot. Findings F1/F2/F4 contain code evidence.
- Public-route eligibility and quality-sample denominators are inconsistent.
  An ENFORCED label or passing helper test is insufficient acceptance evidence.
- [EX-03 run 36277921498](https://github.com/cyalcala/va-freelance-hub/actions/runs/36277921498)
  returned HTTP 503 / `d1_quota_or_limit` at 2026-09-26T22:57:38Z. The precise
  storage/limit root cause is unverified. The previous payload-size diagnosis
  does not establish the cause of this newer failure.
- A successful lake workflow is not proof of published rows or source health.
  Current D1/Turso counts, leases, quality samples and fresh daily flow were not
  measured by this task. No source promotion or complete shadow window is certified.

**Follow-on unit after active incident evidence: MATH-06A / PUBLICATION-AUTHORITY-CLOSURE.** Owner: next maintainer.
Trigger: next authorized mathematical maintenance session, after refreshing Git
and operational evidence. Trace every public writer and authority/receipt path;
produce failing fixture cases and a bounded repair contract with rollback.
Continue repair when within the actual authorized task; no redundant approval.
The source-domain queue is the Source Perpetuity implementation plan.
