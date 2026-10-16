# Astra777 — continuation contract (2026-10-16)

The October publication-flow outage is not the current task. At 2026-10-16T00:02:21Z
https://remotejobs-ph.pages.dev/opportunities returned HTTP 200, snapshot status
fresh, source d1, age 100 seconds, 1742 jobs, 735 companies. A stale snapshot
earlier recovered cleanly on edge revalidation. Do not spend the next diff on that incident
unless a new probe shows an empty board or a 5xx.

## Priorities

1. Behavioral bloat reduction (M1 Completed & Gate Passed)
2. Trusted employer coverage & "Swear-to-God PH Hiring" jobs (M2 Completed)
3. False-negative reduction & 13-stage loss tracking (M3 Completed)
4. Dayshift coverage & schedule alignment (M2 Completed)
5. Mathematical proof & operational hardening (M4 In Progress)
6. Throughput toward 100–150+ verified PH jobs/day

MATH 1–13 are not complete. Certified daily throughput is not 100–150. This
file does not mark either claim done.

## Architecture

Astro on Cloudflare Pages. Public board reads a snapshot (memory, edge, one D1
row, bundled last-known-good). Intake is apps/web/src/pages/api/cron/scrape.ts.
Workable tenants are chosen by selectWorkableRotation (2 slots, 60 minutes,
durable lastAttemptAt only). RSS, HTML, JSON, then ATS items are URL-deduped.
selectIntakeBatch shares the existing 1–100 cap across sources. geoGate runs
before assessPostingFreshness. Authoritative employer evidence (findTrustedEmployer)
operates at geoGate Step 8 after all explicit negative place pins, onsite/hybrid
markers, and residence locks have executed.

## Verified invariants

- Publication still requires a per-opening geoGate pass and a posting instant
  inside 30 days. A US location, an "(onsite)" location string, and a 2020
  date stay unpublished. Tests call geoGate and assessPostingFreshness.
- Dedup still drops a URL already stored (omitKnownSourceUrls) and intra-batch duplicates.
- The intake cap is still 50 by default and 100 at most.
- Workable still waits 60 minutes, in selectWorkableRotation only.
- Non-Workable ATS boards still wait 60 minutes in atsFetchCadenceSkip.
- Directory verifiedAt is not a collection clock.
- Identity for the held cohort is workable:pineapple-staffing.
- Billing ceilings remain: 200 requests/source/day, 500 AI/day, 50,000 writes/day.
- D1 parameter budget remains strictly <=100 params per statement (28 params/row * 3 = 84).

## Trusted employer strategy & 4-way separation matrix

Employer PH confidence, job validity, PH eligibility, and role relevance stay
strictly separate:
  Employer PH confidence != Job validity != PH eligibility != Role relevance

Formalized in packages/scraper/trustedEmployers.ts:
- TRUSTED_PH_EMPLOYERS catalogs high-confidence employers (Hunt St, Coconut VA,
  20Four7VA, CrewBloom, Pearl Talent, Hammerjack, MultiplyMii, Athena, Hello Rache,
  Sourcefit, RocketAMS).
- Confidence is evidence that the employer verifiably hires Filipinos. It does
  not publish a closed, stale, duplicate, onsite, or country-locked opening.
- Direct job country and telecommuting beat the employer label. There is no
  global allowlist.
- When an opening from a trusted employer has NO contradictory country lock or
  onsite requirement, authoritative employer evidence in geoGate Step 8 establishes
  PH eligibility without requiring the text to repeat "Philippines".
- Counterexamples strictly proven:
  - Pineapple Staffing: Stale dates + US location pin -> 0 published (Constitutional Zero).
  - Affordable Staff: Bacolod office onsite -> 0 published (Constitutional Zero).
  - UpGuard: Australia location pin -> 0 published (Constitutional Zero).

## Behavioral bloat

Ranked ledger: docs/operations/BEHAVIORAL_BLOAT_LEDGER_2026-10-14.md.
Removed on the live path: RSS-first newItems.slice(0, limit), and the second
Workable 60-minute clock that repeated selectWorkableRotation. ATS item URLs
now join the overflow map. Kept: geoGate, the 30-day freshness window,
the two-slot Workable rotation, the non-Workable cadence, and the canary cap.
A lake edit that stored Workable postedAt through normalizeSourcePostingDate
was reverted. That function returns null for a date-only published_on, and
the widget uses date-only values. postedAt stays new Date(published_on ||
created_at).toISOString(). The workable-observation payload wrapper was
reverted with it. It added failure states and did not publish a job.
RSS and JSON take an optional transport. Omitting it still uses global fetch.
An HTTP error still throws once. No retry was added.
`decideTriage` no longer lets a model `eligibleForFilipinos: false`, or a
missing AI binding, unpublish `ph_only`, `apac_incl_ph`, or `worldwide`.
Those scopes already came from `geoGate`. The same text can still reject
when `isObviousGeoRestriction` or `isObviousNonEnglishOrLocalOnly` matches,
including "US citizens only" on a Philippines scope. `unknown` still fails
closed. Country-locked and stale rows are removed before `decideTriage`.
A title token `APAC` no longer overrides a structured country, state, or
city. Jobicy "Director of Customer Success, APAC" is location Australia,
does not mention the Philippines, and was `eligible_verified` only because
the title contained APAC. `geoGate` now returns `country_locked` for that
row. Location `APAC` and a title APAC token with no place pin stay eligible.
Known URLs skip the gate, so this does not unpublish the live UpGuard card.
The live cron has not loaded it.

## False negatives (authoritative ATS vs public board, 2026-10-14)

Inventory fetch 2026-10-14T13:55:12.532Z. Public compare the same afternoon.
Hunt St workable:hunt-st: 135 open, 79 fresh and PH-eligible, 52 of those on
the board, 27 fresh Philippines telecommuting openings absent. Confirmed
absent includes Bookkeeper (025-1379), Showing 0–0 of 0.
Coconut VA workable:coconutva: 10 fresh PH-eligible, 3 on the board, 7 absent.
Confirmed absent includes Recruiter job code 1791837787287.
20Four7VA: 87 fresh eligible, 87 on the board after CPT-11528 was confirmed
by search (Showing 1–1 of 1). The platform-page diff had been a false miss.
Pineapple: 3 expected, 0 qualified, 0 published. Hold at PH ELIGIBILITY
(United States) and the dates are also STALE.
Local selectIntakeBatch, cap 50, beside 50 new RSS items, admits 28 of the 34
systematic misses in one pass and defers 6 Hunt titles to the next pass.
A second call with a new 50-item RSS head plus only those deferred Hunt
URLs selects all 6. The selector does not drop them. Proof is
selectIntakeBatch on that shape, not a hardcoded title list.
RocketAMS: 9 ATS jobs, 7 public. The two absences are PH ELIGIBILITY.
"Performance Marketer, Japan (client-facing) - Amazon Ads" is Japan and
STALE. "Performance Marketing Manager, Ecommerce" is Australia,
WITHIN_WINDOW, and country_locked. HelloRache: 3 ATS jobs, 1 public.
"Healthcare Virtual Assistant" and "Veterinary Healthcare Virtual
Assistant" are United States and STALE. Employer trust must not publish
them. No intake change applies to those four.
The live Pages cron has not loaded selectIntakeBatch. The 34 Hunt and
Coconut misses remain unpublished for that reason. This is not a claim
that one deploy produces 100–150/day.
CrewBloom, compared 2026-10-14T15:06:25Z: 35 public Philippines cards,
7 fresh telecommuting Philippines widget jobs, 1 title absent:
Bookkeeper (QuickBooks Online), posted 2026-10-14. Same undeployed
intake cause. Pearl Talent: 18 public Philippines cards, 25 fresh
telecommuting Philippines widget rows, 8 titles absent (People
Operations Lead, Business Immigration Paralegal, Executive Assistant /
Legal Operations Generalist, Healthcare Credentialing, IT & Clinical
Systems Support B093, Public Accountant, Senior Director Clinician
Operations, Senior Graphic Designer). Same cause. Country variants that
are not Philippines stay on their own geoGate result.
Hammerjack public search at that time was Showing 0–0 of 0. Stage was
SOURCE: the scrape loop did not fetch https://careers.hammerjack.com.au/jobs.rss.
That feed parsed as 53 Teamtailor items. 5 were fresh, remoteStatus
fully, location Philippines, geoGate eligible_verified (AU Intermediate
Bookkeeper, AU Junior Tax Accountant, AU Senior Tax Accountant,
Project-Based AU Intermediate/Senior Tax Accountant, Senior Managed
Services Consultant). Hybrid and onsite rows are ineligible. The feed
is now static source id hammerjack. fetchRSSFeed reads remoteStatus.
fully becomes remote. hybrid stays hybrid. onsite and none stay onsite.
A region-only item is unchanged. Jobs appear only after the Pages cron
runs this source. Dayshift is not claimed: the titles do not say it.

Recount at 2026-10-14T15:17:16.699Z through fetchATSFeed, fetchRSSFeed,
geoGate, assessPostingFreshness, and selectIntakeBatch. The live board
has not loaded this handler. Commit 887b1f29 is not published.
Hunt St: 135 discovered, 79 qualified, 51 of those on Philippines cards,
28 fresh misses. Coconut VA: 30 discovered, 11 qualified, 4 on the board,
7 fresh misses. CrewBloom: 149 discovered, 7 qualified, 6 on the board,
1 fresh miss. Pearl Talent: 292 discovered, 27 qualified, 11 on the board,
16 fresh misses. Duplicate titles are separate URLs. Hammerjack: 53
parsed, 5 qualified, search Showing 0–0 of 0. The 57 fresh misses together
with 50 RSS items: the first cap admits 37 and defers 20. The follow-up
pass, a new 50 RSS items plus only those 20, admits all 20. Across the
five fetches, 298 country-locked rows, 386 stale rows, 37 hybrid rows,
and 4 onsite rows were not publishable. That count of publishable rows
inside those four classes was 0.

Admitted Breezy boards, fetched through fetchBreezy at 2026-10-14T15:40Z
and checked against the live search: 20Four7VA 112 open, 86 fresh remote
PH-eligible, and the fresh titles are on the board. Sourcefit 88 open,
34 fresh remote PH-eligible, 0 absent. Yokly 11 open, 5 fresh, 0 absent.
VALUE Virtual Assistants 11 open, 3 fresh, 0 absent. A search longer than
8 terms returns HTTP 400 "Search supports up to 8 terms." That is the
query limit, not a missing row. A short code query finds the same title.
Time Etc has one opening, Birmingham onsite and stale. Hold. VAA
Philippines returned an empty array. Remote Craft's Philippines rows are
stale, so fresh qualified count is 0. Sourcefit's Eastwood rows are
onsite and stay ineligible. The hardcoded Breezy pause remains the
empty-registry fallback. These openings are already public, so that
fallback is not what is hiding them. Do not delete the pause without a
permission decision. Production registry rows were not read.
MultiplyMii, fetchAshby at 2026-10-14T15:42:05Z: 57 listed, 32 fresh
remote Philippines, 25 stale. 31 of the 32 match a public card. The
absent one is "Implementation Specialist (Quickbooks / NetSuite)",
Ashby id d3b62dba-ed2b-48cf-a912-53d16ad0f44c, location Remote
Philippines, isRemote true, publishedAt 2026-09-23. Local geoGate and
freshness accept it. A published sibling has the same location shape.
Search for NetSuite is Showing 0–0 of 0. The stage is after parse.
D1 was not read, so dedup, triage, and publication state are unknown.
Do not add a title exception.
Workable widget accounts checked 2026-10-14 (hunt-st 135, coconutva 31,
crewbloom 149, pearltalent 286, rocketams 9, hello-rache 3) have no
description field. fetchWorkable storing description null is not dropping
text the list payload contained. locations[] is present and hidden on the
rows compared. The scalar country already matches the visible country.
The one row whose hidden locations include Philippines is Coconut
"International Talent Pool", scalar country United States. Do not publish
it from a hidden location row.

## Dayshift

q=day+shift on the live board returned 3 titles that state Day Shift:
Hunt St "AU Accountant/Bookkeeper - Day Shift (026-983)", and two RocketAMS
titles that say "Day Shift, Remote (PH)".
classifyShift has been enhanced (packages/scraper/shiftClassifier.ts):
- Expands day_shift markers to include Australian, New Zealand, Philippine,
  APAC, AU, NZ, AEST, and AWST business hours, plus daytime/morning shifts.
- Adds explicit PHT daytime span extraction regex (matching e.g. "7:00 AM - 4:00 PM PHT",
  "8am - 5pm Manila time", "9:00 am – 6:00 pm (PHT)"), safely storing the source-stated
  string in phWorkingHours without fabricating hours when unstated.
- Adds isDayshift boolean property to ShiftInfo.
- Adds shiftCategory and isDayshift to PublicJob, shift filtering to slicePublicJobs,
  and a Work schedule dropdown filter to /opportunities.astro.
- Preserves invariant: client timezone alone (e.g. AEST) does not prove dayshift without
  explicit schedule markers. Negated/conflicting markers return unknown.

## 13-Stage Pipeline Loss Tracking & Reconciliation (Milestone M3)

Formalized in packages/scraper/pipelineLossTracker.ts covering all 13 canonical stages:
  SOURCE -> DISCOVERY -> FETCH -> PARSE -> NORMALIZE -> DEDUP -> PH_ELIGIBILITY ->
  POLICY -> ROLE_GATES -> TRIAGE -> SCORING -> QUALIFICATION -> PUBLICATION.

PipelineLossTracker records stage entries, passes, and granular loss items with reason
codes (e.g. STALE_POSTING_DATE, COUNTRY_LOCKED, PHYSICAL_LOGISTICS_EXCLUSION).
Employer reconciliation classifies performance into HEALTHY, COVERAGE_DEFECT, or
CONSTITUTIONAL_ZERO.
Reconciled baselines:
- Hunt St: 135 authoritative openings, 135 discovered, 79 fresh eligible published,
  56 stale (>30d) dropped at scoring -> HEALTHY (58.5% recall).
- Pineapple Staffing: 3 open US roles (2020-2022) dropped at ph_eligibility / scoring
  -> CONSTITUTIONAL_ZERO (0% published).
- Affordable Staff: Bacolod onsite office roles dropped at ph_eligibility -> CONSTITUTIONAL_ZERO.
- Coverage defect detection triggers whenever valid openings are lost silently before publication.

## Proven

- The public board is up. Snapshot at the probe above was fresh.
- 1,978 tests pass across 78 files (9,490 expect() assertions) under bun test with
  preload test-environment. Zero test failures.
- Parameter parity audit: 100% parity between YAML, code constants, and mirrors.
- Constitution audit: cohort partition, ground-truth unknown rule, and queue instrumentation PASSED.
- Production guardrails: passed.
- Workspace typecheck: passed with 0 errors (apps/web/tsconfig.json).
- Full repository parity proven: Google Secure Source Manager (`origin`), GitHub (`github`), and GitLab (`gitlab`) are in 100% exact parity at commit `c54935cd7ab66fdfbd4be2ae7404f4fe0b925b1c` on branch `codex/verified-flow-directory-checkpoint`.
- Google Cloud SSM authentication verified active for account `cyrusalcala.agency@gmail.com` on project `antigravity-494415`; push and ls-remote confirmed operational.
- Authoritative employer evidence (findTrustedEmployer) safely resolves high-confidence PH employers
  in geoGate Step 8 after all negative country locks and onsite markers have executed.
- Dayshift classification captures explicit daytime spans and AU/NZ/APAC daytime hours without
  guessing PHT windows.
- In-memory slicing supports shift filtering on the public board.
- D1 parameter binding budget verified: 28 parameters per opportunity insert, 84 parameters
  per 3-row batch, safely within the 100-parameter Cloudflare D1 limit.
- 13-stage pipeline loss tracking and systematic employer reconciliation verified.
- The 27 Hunt and 7 Coconut misses are fresh, location Philippines,
  telecommuting true, geoGate eligible_verified, and absent from search.
- The old head-of-line slice drops them when 50 RSS items are newer.
  selectIntakeBatch does not. A later pass admits every ATS URL the first
  shared cap deferred when those URLs are still new beside a fresh RSS head.
- CPT-11528 is already public. Pineapple's three roles must stay off.
- RocketAMS and HelloRache absences above are country locks, not misses
  the intake cap can fix.
- Hammerjack is one of 13 static ids. fallbackPolicy("hammerjack") is
  allowed, active, and publishable.
- Rotation starvation and intake-cap deferral are different stages.
- A model rejection does not hide a geoGate scope of ph_only, apac_incl_ph,
  or worldwide. AI being down does not hide those either.
- A title APAC token does not beat a structured country location.

## Unproven

- MATH 1–13 complete mathematical proof in production.
- 100–150 newly published verified PH jobs per day sustained over multi-day window.
- Production execution of selectIntakeBatch and trusted employer geoGate rules (pending deploy).
- Live attempt ages (lastAttemptAt) from production Turso/D1 tables.

## NEXT

1. Deploy the verified atomic slice to Cloudflare Pages / production cron, including:
   - selectIntakeBatch multi-source intake fairness
   - packages/scraper/trustedEmployers.ts authoritative employer evidence in geoGate Step 8
   - packages/scraper/shiftClassifier.ts enhanced dayshift markers & PHT daytime spans
   - /opportunities.astro schedule filter dropdown & slicePublicJobs shift filtering
   - packages/scraper/pipelineLossTracker.ts 13-stage loss tracking
2. Observe first post-deployment cron execution and verify that fresh eligible openings
   from Hunt St (27 previously deferred), Coconut VA (7 previously deferred), and
   Hammerjack surface on the public board.
3. Validate that Pineapple Staffing (0), Affordable Staff onsite (0), and UpGuard Australia (0)
   strictly maintain their 0% published status in production.
4. Record daily published verified counts against the 100–150+ North Star.

## Historical record

Sections below are older observations. Their NEXT lines are not this NEXT.
The pineapple identity in those notes is workable:pineapple-staffing.
The October 13 cache deployment and the jobflow hold are history, not the
majority task, unless a new probe shows the board failing.

## October 13 — cache deployment observed; agency release next

Read docs/operations/PAGES_SNAPSHOT_RELEASE_2026-10-13.md. Production was
8c649da0-93ef-4458-89ad-715f1367a2ca / exact source
34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83, unchanged schema 0054/configuration.
At 12:01 UTC the today filter showed 22 IDs and previously missing 9214 returned 200.
Five-minute expiry was honest; hard delivery latency and sustainable CPU were
unproven. The 22 arrivals were not independently certified daily verified jobs.
Main evidence checkpoint 0b39b4aaebb45dba0cb663849b07666ef77e3205 was read
back on SSM/GitLab. The jobflow release was held on the pineapple identity.
That hold is not the current NEXT.

## October 13 live evidence and immutable release preparation

Read docs/operations/PUBLICATION_FLOW_2026-10-13.md and its offline-verifiable
capture bundle before interpreting current counts. At 11:17 UTC D1 held 1,661
public rows, 22 public first-seen today and one stored verified label among
those arrivals. The ledger reported 22 publications but retained 13 unique IDs;
six receipts had count/ID disagreement. Each of seven admitted Workable
canaries had zero fetches and 111 rotation skips in the preceding 24 hours.
These counts do not certify independently verified new daily publications.

The public sample first lagged by nine hours, then promoted an existing 10:22
snapshot without deployment. That sample still omitted public ID 9214 and its
detail returned 404. Old runtime called a 54-minute snapshot fresh. Runtime
metadata remained Pages e1b0ff66-8a93-41b0-b9c7-6de8346c81c7 / reported 3065,
schema 0054. Do not call this a five-minute freshness repair or restored agency
coverage.

Main snapshot/evidence checkpoint 269063ac7dc2d660a13ba02607d24404390a2470 and
isolated cache-only release source 34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83
are exactly read back on canonical SSM and GitLab. The latter uses the old live
base and contains none of the dirty jobflow candidates. Its immutable archive
SHA256 is 11f1403cf75b9efa8cd5b2644f2bb40861daf2996fec5091b0c65ffb22347968.
An incomplete first extraction is preserved; a separate extraction verified all
1,182 files against that archive. Frozen Bun 1.3.14 install completed; the exact
archive passed 54 tests/223 assertions, zero failures, plus 49 public-route
regressions/197 assertions. Typecheck and build passed; fresh deployment
preflight matched production, with a supported rollback target retained.
The cache-only deployment completed with CLI exit0 at
https://8c649da0.remotejobs-ph.pages.dev. Independent production read-back and
ordinary visibility observation are pending; upload success is not acceptance.

The separate 0054 jobflow candidate now has actual authenticated native direct
intake evidence: 13 tests/299 assertions, zero failures. Explicit onsite/hybrid
inputs remain hidden, remote positives retain actual IDs, 3/4/10 inputs respect
the 100-bind ceiling, and later partial failures return UNKNOWN with only the
prior confirmed-source lower bound. Remaining sweep/pending/robots guards and
combined broader acceptance are in progress. NEXT: release the independently
verified cache artifact, complete the jobflow release and observe normal clocks;
then preserve every permitted opening durably before publication caps. MATH 0/13,
certified daily throughput UNKNOWN; the continuous goal remains active.

## October 13 continuation — dayshift focus

The owner prioritizes dayshift/vetted VA employers now and asks for 100–150 or
more newly published verified PH-eligible remote jobs every day, smoothly and
sustainably. Quality, permissions, source cadence and billing limits remain.
The October 12 count samples below are history, not current October 13 counts.

Checkpoint 09fff133c5b70bd9a50719cc2c1e8d51f54f4c70 is verified on SSM/GitLab.
The final local five-minute snapshot slice passes 54/0/223, app typecheck and
broader build, with independent review. It remains undeployed. Read
docs/operations/PUBLIC_SNAPSHOT_FIVE_MINUTE_CHECKPOINT_2026-10-13.md for exact
source/verification scope and resource estimate. The isolated 3065/0054 release
combines permitted Workable rotation, strict original dates at every enabled
public exposure, actual IDs and deferred-source retry; final native/broader
acceptance is still in progress. Never deploy later unapplied gateway schema.

Current careers research found Affordable Staff office-only, Hammerjack mixed
WFH/hybrid/office and EzyVA identity unresolved. Read
docs/research/DAYSHIFT_PRIORITY_CAREERS_2026-10-13.md. Keep existing identities;
company labels do not certify every vacancy. NEXT is release acceptance and
ordinary-clock/public-visibility evidence, followed by complete permitted intake
for the prioritized employers. MATH remains 0/13; daily certification UNKNOWN.

## Latest owner steering and reconciled runtime evidence — October 12

The owner explicitly prioritizes all openings at known VA companies, especially
the Australian/dayshift and previously vetted directory cohorts. Apply the
exception to attention and intake completeness. Account for every permitted
observed opening as published, rejected with a reason, or durably pending.
Preserve per-vacancy PH/remote, original-date, source permission, URL, opt-out,
deduplication, canary and publication gates. A directory label or employer name
does not create verified vacancy evidence. Scoped current employer policy may
support a vacancy only when it demonstrably covers that role and no posting
restriction contradicts it. Never count incomplete/uncertain output as certified.

The owner also requested Ponytail investigation of behavioral bloat. The current
main/review/audit skills are installed under .agents/skills/ponytail-upstream,
pinned to upstream 9b58c1ffb790c075ca32e70a89cf1d80588f4abf. Read their actual
SKILL.md instructions; reuse existing controls and fix demonstrated behavior.

Later evidence supersedes the initial persistent-zero diagnosis:

- Acquisition/publication resumed at 18:30 Manila, before our caller release.
  Earlier 503 cause remains unknown. The 19:20 scheduled tick completed cleanly
  with zero output; it was one idle tick, not the whole recovery window.
- At 19:39 D1 had 1,634 public rows, 22 first seen today, eight stored verified
  labels and 17 source-posted-today rows. The ledger reported 22 publications
  but retained only 14 unique IDs. These are not a certified daily cohort.
- At 19:44 ordinary pages still showed snapshot 17:03, 1,617 jobs and one
  October 12 label. At 19:52 a newer 19:05 snapshot showed 1,631 jobs, 19
  arrivals and 15 October 12 labels. Snapshot delay was real and later recovered.
- Seven admitted Workable canaries are starved by selection before permission,
  cadence and deduplication; registry-only negative IDs also never advance the
  directory verification clock. The actual old handler has a native RED with
  six ticks and zero Workable fetches. A due/policy/unique selector is integrated
  locally; main native GREEN passed four tests/102 assertions. The separate
  0054-compatible release still needs complete verification and deployment.
- A native current-handler counterexample received four fresh PH postings,
  published two under a canary cap, saved validators, then lost the other two
  behind the next 304. ATS fetches are unconditional but their overflow is also
  undurable. All-opening completeness requires durable coverage before limits.
- Existing Australian/dayshift inventory has 46 records, 44 visible and 22
  stored verified flags. Only five have careers URLs/canonical joins; Hunt St
  and RocketAMS are admitted canaries, three others need review, and 39 visible
  companies lack those joins. Flags alone do not prove current vetting.

Read docs/operations/ZERO_FLOW_SOURCE_DIAGNOSIS_2026-10-12.md and
docs/operations/RETAINED_CALLER_DIAGNOSTIC_RELEASE_2026-10-12.md for exact windows.
The latter's module exactly matches the tested artifact and its source commit
is read back on both SSM/GitLab. MATH remains 0/13; certified daily flow UNKNOWN.
NEXT: protect every enabled public exposure with original-date checks in the
0054-compatible release before restoring Workable selection. The offline ATS
probe demonstrates impossible-date coercion, nanosecond-future truncation and
creation/edit-date substitution. The existing strict date guards pass 107 tests,
but that is not live release acceptance. Read
docs/audits/PONYTAIL_BEHAVIORAL_BLOAT_2026-10-12.md and its hashed evidence.
The local five-minute snapshot repair passed 52 targeted tests/211 assertions;
independent review found a cached-HIT TTL boundary needing repair. It remains
undeployed. Retain all permitted opening intake before publication limits,
then independently reconcile real vacancy/receipt/visibility outcomes. No new
clock, source admission, lowered cap or completed MATH claim follows from prose.

Updated 2026-10-12, Asia/Manila (+08:00). The owner reports one October 12
job on the website at 17:26 and directs steady, reliable progress every ten
minutes and every hour toward 100–150 newly first-published unique verified
Philippines-eligible jobs per complete day. The October 10 audit's NEXT is
historical. User instructions and canonical source governance remain authoritative.

The complete original 529-line audit, continuation packet and evidence guide
are preserved byte-for-byte in docs/audits/ASTRA777_ORIGINAL_INPUT_2026-10-10.md.
Original SHA256: 09a4f7b0ecd4ebf2d9a52448719dd58b39f8a1f27bb9b2425e653546fc38a901.
Git may normalize CRLF: compare LF-normalized SHA256
45ae113d76acfed0dba7f2f9a993510c07aaea3f0313ff89379ae1bed89cae0e.
Read it deeply for the failure model, then reconcile later repairs and live facts.

## Recovery and current evidence

Read AGENTS.md and its recovery contract, docs/SYSTEM_SAVEPOINT.md,
docs/bootloaders/CURRENT.md, source-domain precedence in
docs/SOURCE_REPLENISHMENT_MASTERPLAN.md, the Source Perpetuity queue, accepted
parameters, and docs/operations/ASTRA777_REQUIREMENT_RECONCILIATION_2026-10-11.md.
The last map covers every MATH01–13 and SSAE00–15 proof gap. Inspect current code,
dirty work, full Git SHA and runtime evidence before treating a claim as fact.

Canonical Git is Google Secure Source Manager (origin); GitLab (gitlab) mirrors
it. Branch codex/verified-flow-directory-checkpoint; incident start SHA
0f8068350b6572385d2e88d145539cc6c20a9b86. Both remotes exactly held this October 11
checkpoint. Earlier swarm preservation is d8e28bc853c458e2f54de31cb9a2a318a051849e.
Fresh fetch/read-back is required for a new checkpoint. Git is not a DB backup.

Independent bounded observations, approximately 17:36–17:51 Manila:

- Public GET and D1 confirm one public original-posted-October-12 listing:
  Sourcefit SO Billing Officer, job 9153. The owner's shortfall is corroborated.
- D1 has 7,196 opportunities and 1,617 active public-PH rows. Five public rows
  were first seen today: four WWR eligible_likely and one Sourcefit
  eligible_verified. Storage/flag counts are not certified first-publications.
  Latest opportunity scraped_at and successful ledger time are 11:41 Manila.
- One edge response at 17:36 served a stale 13:51 snapshot. Other isolates later
  served a fresh D1 snapshot generated 17:03 with the same 1,617 jobs. Edge lag
  exists; it cannot alone explain the acquisition deficit.
- Turso has zero eligible QUALIFIED_READY unsynced candidates, no new
  candidates/raw fetches since October 8 and no lake_runs in 24 hours. GCP's
  configured URL secret matches this endpoint in a credential-free digest.
- GCP metadata reads succeed; billingEnabled=true. Publisher and shadow are
  enabled hourly at :47 and :53; no miner exists in the inspected region.
  All five sampled publisher runs 12:47–16:47 succeeded with syncedCount=0 and
  NO_AUTHORIZED_QUALIFIED_READY_VISIBLE. Completion is not new flow.
- The retained Cloudflare freshness Worker DOES have a deployed */10 schedule.
  Scrape lock updates through 17:40, while terminal ingestion diagnostics and
  fetch events stop at 13:50. Observed cron exceptions follow that boundary.
  This is a post-lock/pre-terminal failure, not an absent ten-minute clock.
- Measured account-wide D1 usage is approximately 994,000 reads and 9,434 writes
  today. Exhaustion of five-million-read/100,000-write free ceilings is currently
  unsupported by that aggregate. Exact billing plan remains unknown.
- Publisher image is from October 4, labeled Git SHA
  3a0ba3bc7c0c75c5cd32ae71f924375e2be023f2. It is not this checkout. Digest/build/
  label correspondence does not independently attest Git-content bytes.
  Raw sync is unfenced in that running revision; zero sampled syncs do not prove
  containment or authorize relaxing the current local raw-publication fence.
- Production D1's latest applied migration is 0054. Reservation, uncertainty
  and Manila measurement schema is not deployed. Never release a dependent
  gateway ahead of backed-up, reviewed and verified schema/rollback.

Fresh successful reads supersede old billing/access denials in inspected scope.
Accepted MATH remains 0/13; certified daily flow UNKNOWN. Read
docs/operations/GCP_PUBLICATION_INCIDENT_2026-10-12.md and the dated
PUBLICATION_FUNNEL incident report for exact observations and limits.

## Highest-value NEXT

Prioritize LIVE_ACQUISITION_AND_PUBLICATION_FLOW_RECOVERY: obtain the actual
post-lock scrape exception, restore permitted acquisition/ready supply, reconcile
primary/residual clocks, and observe physical/receipt/visibility outcomes.

The current run-lake-miner wraps discovery rather than a bounded accepted-source
collector. ingest-to-lake lacks an accepted-only filter, includes other sources
and does not reuse the route's robots/cadence controls. Do not execute either
blindly. Discovery auto_approved is not collection or publication permission.
A ten-minute wake-up must preserve actual source cadence and shared budgets.

The interrupted D1 binding prerequisite is locally repaired: native four-row
REDs were 108 scraper bindings and 120 direct-ingest bindings, above 100.
Three-row physical chunks retain one source proposal and actual-ID receipt.
Native controls cover invalid dates, duplicates, historical retries, canary cap
and partial failure. Full regression passed 4,204 tests / zero failures /
329,278 assertions / 255 files. Final typecheck and build pass. Checkpoint
170ad5fd5fecb47ecc7e5bbafaa9ace997dd00a1 is exactly read back on SSM and GitLab
and recovered through a fresh network clone. Initial fixture type errors were
corrected without suppressions.
Fixture transport instrumentation received a separate narrow verification;
do not silently attribute a changed fixture to the earlier full run.

The caller diagnostic slice c5521b1b1ca977e9a762413965db6df3a5dc6019 is also
exactly read back on both remotes. Its 104 Worker tests / zero failures / 628
assertions, typecheck, build dry run and independent review passed. Only the
existing retained Worker was deployed, version 5869833f-bdd2-4d74-99f1-ab571a4a5fe4,
preserving its */10 clock and targets. Independent module/configuration read-back
and a passive normal tick passed; this is not a flow repair. The locally reviewed RETURNING
lock-owner repair is separate, with broader verification in progress. Production
Pages/schema remains at the observed old revision/0054.

UNKNOWN/prefix truth does not imply rollback: partial unreceipted rows can remain
public. An independent opt-out-between-chunks probe still publishes successfully.
Mutation-time authority and complete uncertainty repair stay open. Do not redo
locally repaired raw-date or unclear-sweep defects from the historical audit.

100–150/day implies 4.17–6.25/hour over 24 hours, or 0.69–1.04 per ten-minute
window on average. These planning rates do not guarantee source supply or create
an accepted SLO. Do not hold cleared jobs to smooth charts, invent dates or lower
quality. Report real new canonical exposures, fresh supply, holds/failures, queue
age, cooldowns, request/AI/write spend and visible latency per observed window.
Zero output needs an evidenced cause and NEXT; HTTP 200/job success is insufficient.

## Safety and autonomous continuation

Preserve source restrictions/opt-outs, leases/admissions, the complete Autonomy
Cutover Predicate, inclusive 30-day original freshness, PH/remote qualification,
URL safety/liveness, deduplication, receipt truth, uncertainty and billing guards.
Unknown remains unknown. Requests/source/day 200; AI/day 500; writes/day 50,000
and cost/net-new <=5 cents remain ceilings, not permission to exhaust them.

After every bounded implementation: targeted adversarial tests, appropriate
broader regression/typecheck/build, independent review, commit/push to SSM and
GitLab with exact read-back, durable proof/gaps, then immediate dependency-ready
NEXT. Observe executing artifacts separately. No MATH requirement completes
from a prerequisite; require reproducible independent requirement acceptance.

Use installed Addy skills for the concrete task. All 25 portable skills and
references are pinned and verified under .agents. Debugging, observability,
source-driven development, tests, constraints, review, incremental implementation
and recovery docs support this incident. Skill count is not operational proof.
Jev remains advisory/non-blocking; deterministic evidence does not require
repeating an unchanged failed provider probe.

Continue until the overall goal is independently achieved, a consequential
irreversible decision is required, capabilities leave no useful independent
work, or the owner explicitly stops.
