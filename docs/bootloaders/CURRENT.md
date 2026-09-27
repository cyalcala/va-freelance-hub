# Current resume pointer

Refreshed 2026-09-27 for **INGEST-CLOCK-EVIDENCE** (in progress).
This pointer is navigation and dated evidence, not policy or a dispatch command.

## Active bounded unit

The current user authorized applying the v5 maintainer bootloader. The newest
[savepoint](../SYSTEM_SAVEPOINT.md) records an isolated diagnostic unit from
`origin/main` `4edc8828770474952461ca08e8b51769234347bd`, preserving the prior
uncommitted prompt work in the original checkout. Two Hunter runs 151 minutes
apart saw the same stale shared scrape heartbeat and each received `run-lock-held`.
The cause is unverified. The unit adds timestamped read-only D1 evidence to the
existing Hunter workflow, preserves failover behavior, and prevents this
workflow-only release from invoking CI's production D1/Pages job. Test, release
and first scheduled-run results are pending. The lake publication bypass and
gateway F1/F4 findings remain open. **Next:** the maintainer reads the first
exact-revision scheduled Hunter artifact, then selects one ingestion repair
based on those rows and available Worker/Pages logs.

## Previous documentation checkpoint

Refreshed 2026-09-27 for **PROMPT-IDENTITY-V5**.

1. Read the newest entry in [SYSTEM_SAVEPOINT.md](../SYSTEM_SAVEPOINT.md).
2. Use the [maintainer bootloader](MAINTAINER_BOOTLOADER.md) for a fresh session,
   [execution prompt](EXECUTION_PROMPT.md) for a concrete task, and
   [master operating prompt v5.0](MASTER_OPERATING_PROMPT.md) for the full contract.
3. Read the [fusion review](../audits/2026-09-27-PROMPT-FUSION-REVIEW.md) and
   [repository findings](../audits/2026-09-27-REPOSITORY-CHECK.md) before resuming
   publication or source-expansion work.

## Current documentation checkpoint

- All three active prompts are now version 5.0 and open with the user's exact
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

**Earlier suggested maintenance action (not the active NEXT):** under a new concrete maintenance task,
prepare `PUBLICATION-AUTHORITY-CLOSURE` from F1/F4 as one bounded repair contract
covering every public writer, legacy exceptions, leases, opt-outs and atomic
publication/receipt failure behavior. Owner: next maintainer. Trigger: current
user task selects this repair after refreshing Git and operational evidence.
Acceptance: a reviewable contract with failing fixture cases, scope and rollback;
no production writes are implied by this pointer. Track the EX-03 storage incident
separately with read-only root-cause evidence.

Prior pointer history is retained at Git start SHA above. Dated September 26
bootloaders and their counts/deadlines are historical references, not additional
active NEXT instructions. The accepted source-domain cutover predicate and
constitutional boundaries remain unchanged.
