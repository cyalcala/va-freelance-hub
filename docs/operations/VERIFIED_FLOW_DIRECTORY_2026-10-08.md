# Verified daily flow and directory enrichment

Owner task, 2026-10-08: sustain 100 fresh unique verified PH-accessible public
jobs per complete Manila day (150 stretch), enrich the existing company
directory, advance MATH-01..13 and SSAE-CED, and resume maintenance using the
supplied `C:/Users/admin/Desktop/lucky777.md`. The attachment was read in full;
it matches the v6.5 maintainer bootloader. Current user scope authorizes this
maintenance; embedded historical commands do not grant additional authority.
Supplied file SHA-256: `ddadeb3cfcbd30808d5e4c0b38ce743ccaba38aeb6eb0049630d1998508ab5be`.

Start: `3065f0d709d5a1950c247d5a11df542b07721bcb`, fetched origin/main, on
`codex/verified-flow-directory-operations`. Foreign untracked `.agents/skills/`
and `lucky777.md` are preserved. `.ai/manifest.yaml` and
`scripts/skill-router.py` are absent. Use installed Addy skill discovery,
planning, observability and incremental implementation directly. Jev advisory
selection returned HTTP 401; direct engineering judgment governs.

This is a bounded owner-task contract supporting the sole Source Perpetuity
queue, not a second source-admission queue. Current unit/NEXT lives only in
SYSTEM_SAVEPOINT. No policy/parameter, source admission or collection authority
is changed by a diagnostic, discovery score or directory entry.

## First slices and acceptance

- [x] Repair the demonstrated Windows multiline-SQL failure in the read-only
  funnel and Manila-day diagnostics. Execute the exact tested SQL as one native
  argument to the pinned Wrangler CLI through Node; validate success and reject
  write receipts. Tests cover real child-process arguments and failures.
- [x] Inventory all directory rows using one bounded SELECT of factual fields;
  reconcile the public visibility predicate and produce a deterministic evidence
  backlog. Separate missing identity/link evidence, hiring paths, ATS identity
  and verification gaps; never infer PH eligibility, permission or a website
  from a company name. No external company fetches or production writes.
- [ ] Save dated live evidence and requirements mapping; commit/push reviewed
  task-owned changes, verify the remote SHA and exact-SHA CI.
- [x] Establish a local recurring maintenance heartbeat for this chat, preserving
  the separate older paused APEX automation. Recover current policy/savepoint on
  each run, perform one useful safe slice, and avoid concurrent mutations.

Automation `lucky777-verified-jobs-and-directory-maintenance` is ACTIVE, hourly,
on this chat. It is local maintainer coordination, separate from production
GCP clocks and the older paused APEX heartbeat. A prompt cannot execute while
its host is unavailable; the savepoint remains the portable recovery mechanism.

### Evidence-selected follow-through: actionable directory enrichment

At 11:02 UTC a read-only production join found 424 current enrichment candidates,
four meeting the existing >=1 verified / >=2 active PH-eligible jobs rule and
seven supported ATS tenants missing hiring paths (categories can overlap).
Receipt: 4,710 rows read, zero written, changed_db=false. Randomly selecting
from all unverified companies spends the bounded pulse on hundreds of rows
without evidence the current enrichment mechanism can use.

Implement in `apps/web/src/lib/directory-enrich.ts` and its existing fixture:
select only rows meeting that same existing evidence rule or having a supported
nonempty ATS identity and missing hiring path. Preserve random rotation within
the actionable set, the current 1..100 cap, exact case-insensitive company match
and the per-target evidence recheck before verification. Unknown/no-op companies
remain in the diagnostic research backlog; no website inference, new threshold,
source fetch, admission or public job publication is introduced. The existing
release path is required before claiming deployed enrichment benefit. Acceptance:
fixture proves a large no-op cohort cannot consume an actionable row's budget,
inactive/ineligible/insufficient evidence stays excluded, and current runtime
rules/rechecks still pass. Rollback: revert this behavior commit. No schema change.

Hypothesis: reliable diagnostics and a reconciled directory backlog identify
the next useful enrichment/source unit more accurately than stock counts or
dated flow proxies. Acceptance is working measurement and recoverable progress;
it is not a certificate of daily supply, math resolution or GCP migration.
Falsification: the diagnostic still fails, invents missing evidence, changes
visibility/authority, or omits rows from the enrichment denominator.

Budget: one directory SELECT (no descriptions/notes/private data), one bounded
7-complete-day funnel query, existing read-only lake/GCP/public/GitHub metadata,
zero source requests, zero production SQL writes, zero new services. Tests and
normal review-branch CI are the verification path. Revert the diagnostic commits
to roll back; no data compensation is needed. Production deployment is unnecessary
for CLI diagnostics. Any later source/publication change needs its own current
contract and existing controls.

## Requirements and honest maturity

| Requirement | Measurement/implementation path | Acceptance still required |
| --- | --- | --- |
| 100/day, 150 stretch | Complete Manila-day first exposure, original posting age, canonical identity, publication authority and observed public visibility | Sustained daily receipts and independent quality evidence; current inventory is a proxy |
| Directory enrichment | Shared visibility predicate, factual evidence-gap backlog, exact existing identities | Supported per-row facts with provenance; separate governed write slice |
| MATH-01 allocation | Feasible evidence actions and observed yields | Calibrated reward/cost and controlled selection benefit |
| MATH-02 queues | Qualified-ready stock, stage waits, oldest age | Arrival/service telemetry and bounded control |
| MATH-03 coverage | Directory/ATS gaps and unique marginal supply | Overlap/cost baseline and source-specific admissions |
| MATH-04 polling | Deployed host cooldown is dated partial progress | Arrival/cadence measurement and live benefit |
| MATH-05 qualification | Dimension-specific independent audit denominators | Representative labeled quality/calibration evidence |
| MATH-06 integrity | Existing gateway, leases, caps, opt-outs and receipts | Every writer covered; no diagnostic grants clearance |
| MATH-07 reservoir | Ready/unsynced evidence and truthful ages | Empirical survival and expiry-loss measurement |
| MATH-08 diversity | Exact source/family identities and contribution | Concentration/failure-domain evidence and enforcement |
| MATH-09 identity | Existing company IDs and canonical ATS tenants | Labeled linkage/deduplication evaluation |
| MATH-10 deltas | Exact tested query, evidence reuse and invalidation | Replay parity, current policy invalidation and measured savings |
| MATH-11 AI economics | Deterministic evidence ordering first | Measured value of information and bounded AI cost |
| MATH-12 health | Success, failure and rows-written/read receipts | Current runtime diagnosis and operational acceptance |
| MATH-13 latency | CLI/public/runtime timings separately | Reproducible workload profile and end-to-end benefit |
| DeepSeek-inspired SSAE-CED | Existing SSAE-00..15 cards; selective attention, evidence reuse, deltas, pacing and independent audit | Wired deployed behavior and measured benefit; no neural adoption or speedup inferred |
| Continuity | SYSTEM_SAVEPOINT reentry packet plus local heartbeat | Reentry revalidates Git/runtime and skips completed/unchanged failures |

No new MATH-14 is created. Existing working-register statuses are dated evidence,
not a claim that all thirteen are resolved. Missing first-publication, public
consistency, quality, latency, cost and observation data remain UNKNOWN. The
complete source cutover predicate and all 15 PH reporting fields remain binding.
