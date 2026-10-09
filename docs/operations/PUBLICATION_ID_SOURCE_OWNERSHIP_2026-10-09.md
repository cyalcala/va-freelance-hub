# Current publication ID and source ownership

## Bounded owner-authorized unit

START `8817ff6f28baa612fa20e93ab890098a4d55a9ba`, unchanged
`codex/verified-flow-directory-checkpoint`. Reentry verified the previous actual
GitLab SHA/full-history bundle and clean fresh restore. Fallback fetch showed
zero divergence. Origin/cached main and foreign `.agents/skills/`/root
`lucky777.md` remain preserved. No other active repository maintainer was found.
This advances the sole saved NEXT under the existing owner/source task contracts.

Problem: the gateway accepted well-shaped IDs without checking that their current
rows existed, belonged to the authorized source or were active. Web activation
UPDATEs also omitted the selected source predicate. Hypothesis: detach the
authorized request, observe current ownership before a fresh success ledger, and
fence activation UPDATEs to their immutable source snapshots. Shape alone must
not certify a current publication. Historical ledger replay remains immutable.

Effects are local code/tests/build/evidence only. No production/source request,
DB observation/write, migration, deployment, source admission, parameter, grant,
provider, paid service or clock is changed. GCP remains primary background owner;
GitHub provenance, Turso evidence and Cloudflare/D1 serving remain. Rollback is a
normal revert of this unit's source commit; no production compensation occurred.

## Implemented boundary

- The gateway detaches source, count, time, tick/retry keys and callback before
  its first await. Caller mutation cannot retag later ownership or ledger writes.
- Fresh detached IDs must match actual `opportunities` rows with exact
  `source_id` and `is_active = 1`. Parameterized `COUNT(*) AS ownedCount` uses the
  existing `prepare.bind.first` adapter. Every strict numeric safe-integer count
  equals its distinct ID chunk. One source plus at most 99 IDs preserves the
  existing D1 100-parameter limit; later mismatch stops subsequent query chunks.
- Missing/foreign/NULL-owned/inactive IDs and exceptional or malformed ownership
  reads after persistence retain physical rows/FTS, return sanitized existing
  `POST_PERSISTENCE_FAILURE`/`UNKNOWN`, and omit the success ledger. No compensating
  writes are attempted. Sequential helper writers stop with any already
  confirmed prefix distinct from the uncertain failed group.
- Empty acknowledgements and blocked decisions avoid current ownership reads.
  Historical replay remains ledger-only, including rows now missing or changed.
- Grouped activations pass a detached authorized source to persistence. Gate,
  feed, inline triage and Inngest UPDATEs retain current quality/state predicates
  and exact returned IDs while fencing source drift. Pre-UPDATE drift yields a
  normal empty acknowledgement with no foreign activation, rather than claiming
  an ambiguous write occurred.
- Existing no-publicationDb paths retain raw nullable source snapshots. NULL is
  not assigned a guessed identity. These paths still lack gateway authority;
  source fencing does not resolve that separately recorded control gap.
- Feed updates preserve the live confirmed-URL predicate as well as IDs/source/
  state. Actual pinned Drizzle `toSQL().params` determines paired ID/URL capacity;
  every built update is checked against the existing 100-parameter limit. No
  source-request cap or accepted parameter is changed.

Cloudflare's [prepared statement/first method](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
and [D1 parameter limit](https://developers.cloudflare.com/d1/platform/limits/)
support the existing adapter and query bound. Drizzle's
[operators](https://orm.drizzle.team/docs/operators) and
[UPDATE RETURNING](https://orm.drizzle.team/docs/update#returning) were checked
against installed 0.45.2; native SQLite uses the production Drizzle adapter.
Addy TDD/source/Git/review methods apply. Unchanged Jev401 is non-blocking and
not reprobed; these bounded decisions are settled by deterministic evidence.

## Verification and explicit limits

Original native gateway RED: **41 pass/20 fail, 307 assertions, 2.49s Bun**;
the 20 failures reproduce missing ownership and mutable request acceptance.
Original activation RED: **0 pass/7 fail, 9 assertions, 1.203s Bun**.
Independent review caught a feed fallback refactor regression during this unit:
the old live URL predicate was dropped. Genuine in-unit URL-drift RED:
**0 pass/2 fail, 2 assertions, 708ms**, then predicate restoration and actual
multi-chunk bind checks passed. This is distinct from the original ownership bug.

Gateway focused GREEN: **180 pass/zero fail, 831 assertions, 3 files, 2.91s**,
including all **61 native gateway cases**. Final web focused GREEN:
**56 pass/zero fail, 263 assertions, 2 files, 2.66s**. Native cases include
source/URL drift, unchanged nullable fallbacks, 55-target update chunks,
post-commit ownership throw/malformed/mismatch, and nonzero confirmed prefix
followed by failure with the third source never written. Compatibility failures
in old fake adapters are separate from behavioral RED; successful policy fakes
now explicitly supply ownership counts and still default to null.

Final repository suite: **3,540 pass/zero fail, 324,071 assertions, 242 files,
90.63s Bun/90.877s command**, net 41 tests. Its first run was **3,538 pass/2 fail**:
two stale heartbeat fixtures threw at the new initial candidate SELECT before
their intended mid-run error. Only that setup was corrected, preserving every
UNKNOWN/sanitization/heartbeat/three-update/epoch-release assertion; affected
tests **3 pass/zero fail, 18 assertions** before the successful full rerun.
Old fake-adapter failures are not relabeled behavioral RED or successful runs.
Final thirteen-file typecheck **18.664s** and frozen-production Astro build
**24.753s** pass. Production hashes remained unchanged after the build and four
passing audits; later edits were fixture-only. Parameter parity is 100%; audit
warnings remain explicit, including provisional concentration/variance controls
and absence of live queue measurements. Independent final thirteen-file review
PASS. [Finite checks and frozen hashes](publication-ownership-local-checks-2026-10-09.json)
retain commands, timings, failed-run classification and local acceptance limits.

Current-row observations are not an atomic snapshot with the ledger, proof that
IDs arose from this specific write, or full item remote/PH/freshness/URL/safety
qualification. Later mutations, parallel siblings, durable uncertainty attempts,
shared budgets/epochs/leases and all-writer controller acceptance remain open.
No production performance/headroom, supply benefit or deployment is established.

## Durability and required report

Reviewed thirteen-file source commit
`0678e57c5d3fab9fbd70f442d95e4378afed1458` was pushed normally to the existing
GitLab review branch and read back exactly at **2026-10-09 10:20:41 UTC**.
[Source backup receipt](gitlab-publication-ownership-source-backup-2026-10-09.json)
also verifies independent README main remained unchanged and inspects repository
CI configuration at that exact SHA. Final recovery documents follow in one
finite commit. Their actual remote SHA, full selected-branch history bundle and
fresh clean restore will be recorded outside Git at
`C:/Users/admin/Desktop/va-freelance-hub-recovery/publication-ownership-2026-10-09-102100Z.full.bundle`
and matching `.full.receipt.json`. This prospective pointer is not a completed
restore assertion; verify the actual external receipt. Hosted/group-policy
or equivalent CI remains UNKNOWN; the unchanged API404 and GitHub suspension are
not reprobed. GitHub backup/review/release and runtime acceptance remain separate
pending obligations. Git source history does not restore Turso/D1 or GCP state.

| Required field | This unit / current evidence |
| --- | --- |
| 1 Sources evaluated | 0; local integrity fixtures only |
| 2 Sources resolved | 0 |
| 3 ATS/provider identities discovered | 0 |
| 4 Sources admitted | 0 |
| 5 Sources shadowed | 0 new source shadows |
| 6 Sources blocked, with exact reasons and triggers | 0 new blocks; unchanged holds/owners/changed-evidence triggers retained in SYSTEM_SAVEPOINT |
| 7 Raw jobs observed | 0 actual source jobs; fixture rows/counts are synthetic |
| 8 PH-qualified jobs generated | 0 |
| 9 Net-new unique jobs | 0 |
| 10 QUALIFIED_READY added | 0 |
| 11 Jobs synced to D1 | 0 |
| 12 Jobs visibly active on the site | Current stock UNKNOWN; 0 new production jobs from this unit; certified fresh daily flow NULL/UNKNOWN |
| 13 Source economics changes | None; accepted budgets unchanged; production cost benefit UNKNOWN |
| 14 Primary remaining bottleneck | Production access/provenance and unresolved publication controls; serving eligibility is the next local integrity gap |
| 15 Next autonomous action | PUBLICATION_SERVING_ELIGIBILITY_PARITY, the sole NEXT in SYSTEM_SAVEPOINT after this checkpoint |

MATH-06/12 and SSAE-01/07/09 gain local integrity prerequisites only. Accepted
MATH remains **0/13**; full rollout, optimization and daily supply acceptance
remain open. Directory discovery/enrichment confers no publication authority.
