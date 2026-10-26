> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](../operations/GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

What this repo does: VA Freelance Hub collects permitted public job metadata, keeps acquisition evidence in Turso, publishes through governed Cloudflare D1 controls, and serves a shared public snapshot. Google Secure Source Manager is canonical engineering memory, GitLab is its mirror, and GCP is the intended primary background owner.

Assumed load: 100 unique, newly published, independently verified Philippines-eligible jobs per Manila day, with 150 as stretch; complete private intake for permitted openings at existing VA/Australian/day-shift companies. Preserve source-specific permissions, original posting-date checks, remote/PH restrictions, source cadence, 200 requests/source/day, 500 AI calls/day, 50,000 storage writes/day and five cents/net-new publication. A ten-minute wake is not permission to fetch a source every ten minutes.

This is a one-shot audit/report, not a repair or an execution queue. MATH remains **0/13** and certified daily flow remains **UNKNOWN**. Source baseline is `c5521b1b1ca977e9a762413965db6df3a5dc6019`, plus separately identified dirty candidates. Reported live Pages source is `3065f0d709d5a1950c247d5a11df542b07721bcb`, with migrations through 0054. The current checkout contains later publication schema and must not be deployed wholesale as a lock repair. Concurrent rotation/transport work is candidate evidence, not accepted runtime.

Read skills: local pinned Ponytail, Ponytail Review and Ponytail Audit; archived instruction bytes and reproducible probes are in [the evidence package](../evidence/ponytail-behavioral-2026-10-12/README.md). No paid advisory/model invocation was made. This audit concentrates on behavior and data loss, rather than file length.

## Critical paths and acceptance boundaries

| Path | Actual code/control | What is established; what remains separate |
| --- | --- | --- |
| Existing configured feeds â†’ D1 | Retained Worker/Hunter â†’ authenticated `createScrapeHandler` â†’ registry/opt-out prefence â†’ coarse run lock â†’ source cadence/robots â†’ RSS/JSON/ATS adapters â†’ URL/geo/original-date/AI gates â†’ grouped publication gateway â†’ actual D1 IDs/receipt | Main checkout has tested binding/ID/UNKNOWN repairs. Live 3065 has older callbacks. Accepted source permission is required before any fetch. |
| Existing company ATS intake | Directory plus active/canary registry merge â†’ Workable selection/non-Workable bounded pool â†’ source-key fetch state â†’ common scrape gates | Directory/day-shift membership is prioritization. A registry row's policy and lease govern collection. Old Workable selection can exclude admitted boards before permission is checked. |
| Turso acquisition | GCP miner wrapper â†’ discovery/reconciliation; legacy ingestion/cohort runners â†’ raw observations/candidates/sightings; `processAndRefineCandidate` is the shared intake | Discovery `auto_approved` and private `QUALIFIED_READY` are neither recurring fetch permission nor publication authority. An accepted-source-only recurrent collector is not demonstrated by the miner entrypoint. |
| Turso â†’ D1 | GCP publication wrapper â†’ `syncQualifiedJobsToD1`; current raw-writer fence refuses non-dry-run â†’ future governed authority/intent plus existing publication gateway | Keep the refusal. Deployed GCP artifact must be reconciled separately. Pure/native authority and math contracts are prerequisites; they are not a deployed publisher receipt. |
| D1 â†’ visitors | `publicOpportunityFilters` â†’ snapshot query/build/validation â†’ shared D1 lease â†’ compressed snapshot â†’ isolate/edge/durable fallback â†’ home/index/category/details/sitemap; Apply has independent safeguards | Snapshot age, HTTP cache age, first-seen time, original posted time and first-publication time differ. A fresh snapshot does not certify new qualified daily publications. |

The October 12 [retained live diagnosis](../operations/ZERO_FLOW_SOURCE_DIAGNOSIS_2026-10-12.md) records resumed terminal fetch evidence from 10:30 UTC, before the caller deployment. At 11:39 D1 had 22 public rows first seen that Manila day; only eight carried the stored verified flag. Ledger receipts reported 22 but named only 14 unique IDs. A stale edge snapshot later promoted a newer D1 snapshot without an app deployment. These observations supersede the earlier one-job sample within their bounded window; they do not establish 100/day, ground-truth eligibility or the cause of the earlier 503s.

## Must fix

1. **Successful canary clipping forgets the unselected openings** (`apps/web/src/lib/publish-opportunities.ts`, `scrape.ts` conditional-state recording).

   **What this is:** The helper caps a same-source public proposal and returns only published/failed counters. The route saves feed validators after processing.

   **Problem:** The native probe gives four fresh explicit-PH remote postings to cap two: two are stored, but the ETag/body hash is committed. The next hourly request receives 304 and the other two are still absent. Current and live 3065 share the clipping/retry omission; the executable proof is current native SQLite, not deployed D1.

   **Fix:** Retain all permitted postings privately before clipping and acknowledge validators only after durable coverage accounts for every observed posting. A smaller bridge returns unselected/blocked groups and marks their source for retry; it prevents 304 suppression but cannot establish durable completeness.

   **If we skip it:** Legitimate vacancies can vanish until the feed changes, invalidating all-opening intake and its yield measurements.

2. **Old Workable rotation spends its slots on the wrong boards** (`scrape.ts` Workable selector and registry merge; live 3065).

   **What this is:** The old handler picks two directory verification dates before permission, cadence and dedup filtering. Registry-only rows use `id=-1` and `verifiedAt=null`.

   **Problem:** In five simulated hourly dispatches the actual merge/archived selector always picks `aa,bb`, never `cc`, even though source-key fetch timestamps advance. The retained live audit additionally identifies unadmitted oldest directory tokens excluding seven admitted Workable canaries. Current source has a new rotation candidate; its presence is not deployment acceptance.

   **Fix:** Deduplicate canonical identities and filter permitted, due sources before selection; rank durable source-key attempt/success timestamps with deterministic ties. Reuse the candidate selector after native/independent acceptance; retain the two-board and cadence limits.

   **If we skip it:** Existing permitted Australian/day-shift boards can remain unseen indefinitely while repeated ticks report successful zero work.

3. **A newly seen URL is not a complete durable intake boundary** (`scripts/lake/ingest-to-lake.ts:processAndRefineCandidate`, `scrape.ts` per-run limit).

   **What this is:** Existing lake URLs/fingerprints record a sighting and return; scrape processes only the first 50/default or bounded 100 new items. Conditional retry URL attribution includes RSS/HTML/JSON, not ATS.

   **Problem:** A previously qualified same-URL role changing to onsite or a restricting country does not update its material candidate facts at this shared intake. An ATS opening beyond the per-run limit has no durable candidate merely because its fetch succeeded, and can disappear before the next unconditional pull.

   **Fix:** Connect existing material-delta/replay contracts at the shared intake, and stage every permitted normalized posting before the processing limit. Record original date and observed date separately; changes must re-enter applicable gates.

   **If we skip it:** Qualification can rest on old facts and short-lived openings cannot be replayed. Private qualified status still must not bypass public authority.

4. **Live publication counters lack complete named identity proof** (`live3065 scrape/ingest callbacks`, current `publishGroupedInserts`).

   **What this is:** Legacy callbacks count mutation metadata; the current candidate obtains actual returned IDs and bounds each physical insert to three rows.

   **Problem:** Today's retained D1 sample reported 22 publications but named 14 unique IDs. The old grouped callback also submits whole source groups: existing native binding probes demonstrated four-row statements over D1's 100-binding limit. Main checkout repairs do not change the old live artifact.

   **Fix:** Ship only a separately tested 0054-compatible callback/acknowledgement repair with actual IDs and bounded statements. Preserve one proposal/receipt, confirmed source prefix, and UNKNOWN after possible persistence; do not fabricate missing IDs or replay blindly.

   **If we skip it:** Throughput cannot be independently reconciled, and a larger source batch may stop or physically commit without a trustworthy receipt.

5. **The miner is a discovery runner, not the missing accepted-source collector** (`scripts/gcp/run-lake-miner.ts`, `scripts/lake/run-lake-miner.ts`, `domain-ats-discovery.ts`).

   **What this is:** The entrypoint reconciles candidate tenants and probes employer domains. `evaluateTenant` probes before deriving discovery metrics/verdicts.

   **Problem:** Pointing this runner at known VA agencies does not restrict it to existing admitted identities or prove recurring fetch permission. An `auto_approved` result can feed private intake without constituting the D1 registry's collection authority; meanwhile a publisher/shadow clock does not acquire new accepted-source supply.

   **Fix:** Reuse adapters and shared intake in one bounded accepted-source action with exact source filters, current policy/lease, cadence, endpoint/redirect limits and durable request budgets. Repair and observe the existing route before adding another wake; later GCP ownership needs a fenced replacement/artifact receipt.

   **If we skip it:** More clocks can repeat the wrong work or probe unadmitted sources while the actual acquisition bottleneck remains.

6. **Latest publisher source intentionally refuses its old execution mode** (`scripts/gcp/run-lake-publish.ts`, `scripts/lake/sync-to-d1.ts:syncQualifiedJobsToD1`).

   **What this is:** The wrapper calls sync with `dryRun=false`; the central raw-publication fence throws before acquiring a lake client.

   **Problem:** Rebuilding the GCP job from this checkout cannot preserve the older artifact's apparent successful zero-sync behavior: it must report RAW_LAKE_PUBLICATION_BLOCKED. Removing the fence would restore the unsafe raw D1 path rather than a governed publisher.

   **Fix:** Preserve the fence and artifact/SHA distinction. Use the governed authority/intent/publication contracts for one verified replacement path before a GCP release, with actual publication/visibility receipts and rollback.

   **If we skip it:** A blind source deployment can turn jobs red, or a shortcut can bypass admission, canary and publication correctness.

7. **The live handler lacks the original-date gate in the current candidate** (`live3065 scrape.ts`, `ats.ts`, existing activation paths).

   **What this is:** Live 3065 passes geo-accepted inputs to AI and public insert without the current `assessPostingFreshness` check; it normalizes dates with `new Date`. Its Greenhouse adapter uses `updated_at`, while the current adapter uses `first_published`.

   **Problem:** The offline actual-parser probe demonstrates malformed Workable dates, a one-nanosecond future date and a missing original date with creation fallback appearing fresh after normalization. A stale Greenhouse posting edited today appears fresh in the archived live mapping; live pending recovery/reactivation also lacks the current explicit date gate.

   **Fix:** Reuse strict raw source-date validation and the existing inclusive 30-day assessment in a separately tested 0054-compatible repair, before AI and immediately before each enabled public exposure. Retain UNKNOWN/INVALID/FUTURE/STALE as holds; no acquisition/edit clock, employer priority or new gateway/schema can substitute for original posting evidence.

   **If we skip it:** Restoring company rotation can increase public output while publishing an unproven or stale date cohort.

## Should fix

8. **Dry-run mining still performs expensive and mutating work** (`reconcile-discovered-corpus.ts`, `domain-ats-discovery.ts:evaluateTenant`, `gha-lake-miner.yml`).

   **What this is:** The dry-run flag suppresses selected writes after probing/adjudication; reconciliation loads claims through `ensureDiscoveryTable`.

   **Problem:** The workflow labels it read-only/no database writes, but reconciliation can issue table DDL and an evaluation can make provider/paid AI calls before its dry-run return. This audit did not invoke those runners.

   **Fix:** Make documentation describe the exact current side effects; provide a pure read/plan path only when needed for recovery. Keep collection authority and cost reservation before any probe/advisory call in an eventual executor.

   **If we skip it:** An operator can spend budget or mutate state while believing only a plan is being inspected.

9. **A faster wake invalidates the miner's per-run AI budget arithmetic** (`domain-ats-discovery.ts:HELD_READJUDICATION_CAP_PER_RUN`, `docs/ACCEPTED_PARAMETERS.yaml`).

   **What this is:** The re-adjudication cap is 20 per run, justified in code against eight scheduled runs/day.

   **Problem:** At a ten-minute cadence, 20 Ã— 144 is 2,880 calls/day before other discovery/advisory work, above the accepted 500. Per-process or per-run caps do not reserve a shared daily budget.

   **Fix:** Keep the current bounded cadence until an accepted-source action has durable daily reservations and an exhausted-budget stop. A cheap ten-minute heartbeat can check due work while hourly source floors remain intact.

   **If we skip it:** Adding a scheduler can violate billing guards without producing any additional eligible jobs.

10. **Workable date conversion erases unknown or malformed original-date evidence** (`packages/scraper/ats.ts:fetchWorkable`, `safeNormalizeDate`).

   **What this is:** The adapter runs permissive `new Date` conversion on `published_on || created_at` and supplies an ISO result downstream.

   **Problem:** Calendar rollover/date-only coercion can lose the raw timestamp's validity/precision, and a creation-date fallback is not independently established original-publication evidence. Downstream strict checks cannot recover discarded source meaning.

   **Fix:** Use the existing strict source-date/freshness patterns with field provenance; withhold an unknown original date rather than substituting a successful-looking ISO value. Verify provider semantics before asserting the creation fallback is sufficient.

   **If we skip it:** All-opening completeness can be confused with permission to publish an unproven 30-day cohort.

11. **Workable accepts a malformed successful response as an empty complete board** (`packages/scraper/ats.ts:fetchWorkable`).

   **What this is:** `Array.isArray(data?.jobs) ? data.jobs : []` supplies an empty list for an HTTP 200 body without a jobs array.

   **Problem:** A maintenance/error JSON object is counted as successful zero vacancies and can advance verification/fetch state. The adapters also provide no declared complete-snapshot proof for a partial/paginated response; no actual provider pagination was established in this audit.

   **Fix:** Reject an unexpected response shape and require an explicit completeness contract before destructive reconciliation or claiming all openings. Preserve the last good observation on incomplete input.

   **If we skip it:** Apparent clean zero runs hide collection failures, and future removal/replay decisions can rely on incomplete snapshots.

12. **Company priority facts do not carry vacancy eligibility proof** (`ats.ts` adapters, `geoGate.ts`, `human-intake.ts`, focused cohort seeds).

   **What this is:** Sourcefit exposes structured locations/remote flags; Workable exposes country/telecommuting. Employer/day-shift labels prioritize research, while Workable stores no description and Breezy keeps a location summary.

   **Problem:** A known VA employer's unspecified location remains genuinely unknown, and restrictions available only outside the retained summary cannot be checked from that summary. A company can have both remote and onsite/country-restricted openings; admitting the company cannot certify every vacancy.

   **Fix:** Keep all permitted openings privately and attach exact-tenant, dated employer evidence plus vacancy-specific restriction facts when supported. Narrow employer proof may resolve an otherwise missing field but must never override explicit onsite/hybrid, country/citizenship restrictions, permission or unknown original date; do not copy prohibited full descriptions.

   **If we skip it:** The system either loses legitimate unknown openings or achieves its count by weakening per-vacancy evidence.

13. **The unreachable legacy raw execution body remains an unnecessary escape path** (`scripts/lake/sync-to-d1.ts`, after the dry-run return).

   **What this is:** Non-dry-run throws at entry, and dry-run returns generated offline SQL before a later block that runs remote Wrangler SQL and marks lake rows synced.

   **Problem:** No permitted argument can execute that block while the fence is intact. A future removal of the fence can unintentionally resurrect precisely the raw writer the safety repair refused.

   **Fix:** Remove only the unreachable execution block after consumer/test checks. Keep the central refusal, offline SQL characterizers and their tests; they have real consumers and are not dead math/authority code.

   **If we skip it:** Maintainers must keep reading and guarding an obsolete production side effect that is not the governed replacement.

14. **The miner image does not declare a reachable parser dependency** (`infra/gcp/lake-miner/package.json`, `Dockerfile`, `scripts/lake/ingest-to-lake.ts`).

   **What this is:** The standalone image installs only `@libsql/client`, then copies source packages without installing their workspace dependencies.

   **Problem:** Its entrypoint reaches `ingest-to-lake.ts` â†’ `rss.ts` â†’ `fast-xml-parser`, which the standalone manifest does not declare. Bun's documented default uses local `node_modules` when present, so the earlier standalone install does not establish a parser fallback; this is an inferred source dependency gap, not an observed container failure. [Bun runtime configuration](https://bun.sh/docs/runtime/bunfig).

   **Fix:** Declare the already-used pinned parser dependency and prove an isolated container import before calling this artifact ready. Do not add a new framework or deploy a discovery job as a collector smoke test.

   **If we skip it:** A new GCP schedule can execute an image that fails before its credential and workload guards run.

## Needed behavior and bounded simplification

| Behavior | Consumer evidence / judgment |
| --- | --- |
| Registry/opt-out prefence, leases, source pauses, original-date/geo/remote/outbound gates | Needed trust boundaries. Local ATS tables are used by live fallback code and source-text tests; they are not unused. Two policy copies create maintenance work, but no unverified deletion is proposed. |
| Publication reservations, immutable receipts, actual IDs, UNKNOWN/prefix handling, portfolio/Manila measurement contracts | Gateway calls are present in whole-tree consumer search. They preserve proven invariants and characterize missing runtime acceptance; retain them. Tests/native proofs are useful consumers even where production integration is incomplete. |
| Snapshot shared lease, validation, compression, bounded waits, edge/isolate/durable fallback, headers/head metadata and safe Apply | Needed availability/cost controls. October 12 demonstrated distinct D1 and edge copies, eventual promotion and cache age; no captured log establishes the earlier lag's cause. Keep diagnostics truthful and separate from QUPD certification. |
| `SourceTransport` seam | Needed by an eventual bounded collector, currently supplied in tests and forwarded by RSS/JSON. Existing route/miner calls do not establish a deployed collector using it. Do not label the seam a working GCP acquisition path. |
| Another high-frequency clock or fresh framework/dashboard | Not required to close the demonstrated clipping/selection/receipt gaps. Reuse the current route, existing adapters/intake/gateway, and one accepted-source executor when justified by a tested vertical slice. |

## Smallest complete next slice

First independently accept the current rotation/binding/identity and strict original-date repairs against the appropriate deployed schema and preserve actual runtime receipts. For completeness, add a shared private intake acknowledgement before public/processing clipping: `observed posting keys âŠ† durable terminal-or-queued posting keys`. Commit validators only after that holds; on failure retain old validators/clear retry state conservatively. The bridge that reports deferred source groups is useful immediately, but it is not a durable reservoir or a completed MATH requirement.

Then drain the existing private reservoir through the governed gateway, independent of a provider 304. Recheck current permission, original date, URL/remote/PH evidence and vacancy restrictions; keep canary/public caps and UNKNOWN reconciliation. Attach scoped employer evidence to the existing intake rather than inventing a second qualification/publication route. A GCP collector deployment must map to canonical Git/artifact provenance and demonstrate shared budgets, completeness, fencing and rollback before residual clocks are retired.

There are 14 ranked findings; no smaller unproven style/cleanup findings were counted. The raw execution block is a bounded deletion opportunity; no broader guard deletion is claimed.

Verdict: close the intake-loss, admitted-board selection, original-date and live receipt gaps first; keep source permissions, billing guards and publication/snapshot safeguards.

Lean: -30 lines, -0 dependencies possible by removing only the unreachable raw execution block; source changes and their required checks were not performed by this audit.

Not checked: no provider I/O, paid AI, live database operations, deployment, new runtime observation or container smoke test was performed for this audit. Archived native proofs use synthetic data and their stated clock/driver seams; the ATS date probe is parser/assessment composition and does not execute the live route; prior broader runs included retained Windows timeouts, with affected cases passing separately. Whole-tree static consumer search is not exhaustive dynamic-runtime analysis. Production daily throughput, full employer/vacancy evidence, complete 0054 release acceptance and MATH 1â€“13 remain independently unproven.
