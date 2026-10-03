# Sparse prompt revision review — 2026-10-03

**Unit:** PROMPT-SSAE-V6. **Scope:** documentation and proposed architecture/work cards.
**Status:** local editorial revision; no runtime implementation or rollout acceptance.

## Request and source coverage

The owner asked to improve the master prompt and bootloader from a shared
conversation, then supplied the SSAE-CED v2 portion and confirmed it was the
material to use. The complete shared URL could not be retrieved by web or browser.
No claim is made that the full shared conversation or its reported 72-result
Exa review was read or repeated.

Input: user attachment `Pasted text.txt`, read in chunks including its proposed
master and bootloader. SHA-256:
`2436fb86d907e2cfa0f4b14b62de579ac0e71168a8b210ef0c96e08df20484cc`.
[Shared-link provenance](https://chatgpt.com/share/6ac0ea22-4e50-83ec-8d13-ad8a7f6898f4).
The attachment supplied design proposals, not production authority or measured
current counts. No attachment commands were executed.

Primary-source research verified the latest available DeepSeek release designation
against the [official changelog](https://api-docs.deepseek.com/updates/) and its
[V4.1 technical report](https://arxiv.org/html/2609.19969v1). The
[strategy](../strategies/SPARSE_SOURCE_ATTENTION_STRATEGY.md) records a concise
factual block and separates neural mechanisms from application-level inferences.
Precursor DSA/MLA, Engram, mHC and crawling sources are linked there.
The cited OpenReview crawler was inaccessible behind browser verification;
its percentage claims remain unverified and are not used as evidence.

## Revision and repository boundary

- Full start/local HEAD: `a176bb5d881eb7314222f534a7d1f63f02691987`, branch `main`.
- Fetched remote: `19e94696f906a9ec48a3d1f7815e54b6ddd43499`.
  The intervening commit changes only `docs/prospector-latest.md`; no reset,
  checkout replacement or pull was performed.
- Working tree started clean apart from Git's ignore-file access warnings.
- `.ai/manifest.yaml` and the source repository's `scripts/skill-router.py`
  are absent. Context-engineering guidance and the installed portable
  ai-skills-registry routed this documentation work.
- Deployment/Worker/GCP/database revisions, live supply and runtime health were
  not remeasured. Prior savepoint numbers remain dated observations.

Review covered the canonical three prompts, relevant CURRENT/savepoint sections,
source-policy/cutover and mathematical-plan context, the supplied input, new
strategy/work cards and focused miner/conditional/routing/replay/pacing code.
This was not a whole-repository semantic audit or a production-control acceptance.

## Canonical output and integration

| Artifact | Role |
| --- | --- |
| [Master v6.0](../bootloaders/MASTER_OPERATING_PROMPT.md) | Existing operating contract plus section 10B core sparse-processing rules |
| [Maintainer bootloader v6.0](../bootloaders/MAINTAINER_BOOTLOADER.md) | Copyable task-scoped recovery and sparse-processing entry point |
| [Execution prompt v6.0](../bootloaders/EXECUTION_PROMPT.md) | Concrete TASK wrapper aligned with the master and loader |
| [Sparse strategy](../strategies/SPARSE_SOURCE_ATTENTION_STRATEGY.md) | Proposed detailed application contracts, inference limits and safeguards |
| [SSAE work cards](../plans/SPARSE_SOURCE_ATTENTION_IMPLEMENTATION_PLAN.md) | Sixteen proposed bounded cards under the existing source/MATH authorities |
| [CURRENT](../bootloaders/CURRENT.md) | Short navigation; detailed historical state remains in savepoint and Git |

The long professional identity remains verbatim. The accepted MATH-01..13 program,
optional human research intake, canonical fresh first-publication metrics,
100/day floor and 150/day stretch targets, source controls, full cutover predicate,
parameter lifecycle and current production serving architecture are preserved.
No constitution, accepted parameter, ADR, mandate, SQL, workflow or runtime
implementation was amended.

Application design includes asymmetric work, shared evidence, hierarchical
incremental indexing, deterministic lookup/routing, FULL/REINDEX/REUSE/bounded
replay, material-field/version invalidation, memory tiers, multi-resource allocation,
global host pacing, backpressure, independently sampled exploration, selective AI
and gated speculative preparation. Advanced models remain conditional experiments.
The original sampler is retained as a reproducible control, not labeled random.

## Focused code findings incorporated

At the stated code baseline:

- `import-source-registry.ts:105` selects deterministic family-stride samples;
  `reconcile-discovered-corpus.ts:64` loads discovered rows in ID order.
- `ingest-to-lake.ts:51` can return on fingerprint OR source URL before geo;
  `lake-shared.ts:32` hashes company/title/application hostname. These establish
  identity heuristics, not material equivalence or safe decision reuse.
- Conditional transport primitives exist, but caller persistence/invalidation
  coverage differs; direct lake ATS work cannot be presumed to use them.
- Existing replay primarily covers ambiguous/excluded rows, loses some fields,
  and lacks the proposed dependency cursor. Raw discovery retention samples
  only part of a board; complete replay coverage cannot be assumed.
- Lake pacing/backoff is process-local. Durable shadow-path host backoff exists
  separately; neither that nor a GHA concurrency group proves global Lake limits.
  Live GCP miner concurrency was not verified.

These are findings for future bounded work, not defects fixed by editing prompts.

## Independent review and corrections

One reviewer checked scope, identity, MATH/HRI preservation, authority and the
four-mode contract. A second reviewed code-grounded invalidation, replay,
partial snapshots, host pacing, cost, sampling, reward and inference.
Both returned PASS for documentation with runtime limits.

Corrections applied:
- Replaced unconditional mining activation with a current-task scope gate;
  preserved continuation within an actually authorized maintenance marathon.
- Replaced stale Worker/Actions-only scheduling statements with verified
  responsibility mapping including evidenced GCP jobs.
- Defined reward at the selected-portfolio level, deducting canonical overlap.
- Allowed LIMITED historical/shadow outcomes to create an explicitly permitted
  measurement audit, without granting rollout acceptance.
- Required restrictive replay across qualified/synced/public rows with stable
  cursor/restart and serving-store/cache withdrawal propagation.
- Kept deterministic control, probability audit and read-only shadow distinct.

Jev advisory review was attempted through the installed runner. It failed with
`EPERM` during path resolution before inference; no judgment was obtained.
The skill's non-blocking fallback was used: direct reasoning, focused checks
and independent reviewers. The initial patch tool stalled without editing;
it was stopped, the unchanged file was checked, and normal filesystem edits
completed the draft. Initial fetch failed at FETCH_HEAD under the sandbox;
the approved fetch then succeeded.

## Verification and completion limits

Document checks passed locally:
- Seven prompt/strategy/plan/navigation/review files: 57 local Markdown targets
  resolved; fences, whitespace and replacement-character checks passed.
- All three canonical prompts are v6.0; the original identity appears once in
  the master and twice in each copyable companion (five exact occurrences).
- All four processing modes are present; sixteen ordered SSAE-00..15 cards exist.
- Savepoint diff: forty inserted lines and zero removed/replaced historical lines.
- `git diff --check` passed after the authored changes.

The first validation wrapper had a JavaScript quoting error before running.
The subsequent native-output history comparison reported a mismatch; inspection
showed a pure savepoint prepend (40 additions, 0 deletions). A Git diff-based
preservation check replaced that comparison, and the full document checks passed.
These check failures and corrections are retained rather than reported as an
unbroken first-pass result.

No build or application test suite was run for this documentation-only change.
Historical test counts were not reasserted as current verification. No source
was probed/promoted, no production SQL or job sync was run, and no live scheduler
was dispatched. No commit, push, deployment or database backup was performed.
Files remain local and uncommitted; code and existing policy are unchanged.

## Next action

At the next authorized engineering unit, recover the active source contract and
incidents first. Map SSAE-00 to that unit, inspect the actual miner and available
stage evidence, and produce a bounded profile/measurement contract before
changing the selector. Owner/controller: maintainer. Trigger: the next
authorized compute-allocation implementation task. The prior operational
continuation remains in its applicable runtime savepoint.
