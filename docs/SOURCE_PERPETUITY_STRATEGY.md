# Source Perpetuity Strategy

**Status:** Accepted 2026 bootstrap/transition strategy; subordinate to the
Source Replenishment Masterplan

**Date:** 2026-08-29

**Scope:** Sustainable, adaptable job-source supply for VA Freelance Hub

**Behavior change authorized by this document:** None. During bootstrap, every
source activation remains a separate tested, reversible implementation unit.

## Relationship to the durable masterplan

`docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` and ADR-007 are the durable authority
for decades-scale source governance. They replace mandatory founder/reviewer
acceptance as the target steady-state model with constitutional,
evidence-bound autonomous admission.

This strategy remains the accepted 2026 transition program. It does not prove
the autonomous control plane exists. Until the complete named **Autonomy
Cutover Predicate** in `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md` passes, the
exact-six boundary and source-specific bootstrap gates stay in force; any
shorter gate summary is non-exhaustive. Older
human-review wording in completed-unit history records the governance in force
when that work occurred; it is not a permanent founder-approval requirement.

## Executive decision

VA Freelance Hub will keep automated ATS ingestion and expand it into a
**controlled source-replenishment system**.

The system will not choose between compliance and job supply. It will:

1. prefer provider-supported syndication feeds, public posting APIs, and
   employer/customer opt-in;
2. treat public indexing as a bounded, minimal-metadata discovery service, not
   unrestricted scraping or content mirroring;
3. separate compliance authority from technical health so an operational
   outage cannot rewrite a policy decision and an ambiguous policy cannot be
   auto-promoted by a healthy HTTP response;
4. continuously discover, evaluate, shadow, canary, monitor, quarantine,
   replace, and renew sources;
5. measure fresh, unique, Filipino-eligible jobs rather than repeated feed item
   sightings or a stale active-row total; and
6. maintain a diversified live portfolio and a ready reserve so the loss of
   one provider cannot empty the board.

Automated ATS is therefore retained for its original strategic purpose:
one reviewed adapter can support many employer job boards. The adapter is a
distribution integration, not a permission bypass.

## Why this program is necessary

The 2026-08-28 compliance program correctly contained uncertain source paths
and proved robots enforcement for exactly six reviewed production identities.
That was a safety milestone, not a perpetual sourcing model.

The current replenishment path stops too early:

- static source policy lives in `packages/scraper/sources.ts`;
- ATS platform and token policy is hard-coded in
  `apps/web/src/pages/api/cron/scrape.ts`;
- Prospector can discover an ATS token, but it files a human proposal that
  requires a code edit;
- Source Doctor cannot fully evaluate a runtime ATS candidate; and
- `opportunities` stores a display-oriented `source_platform`, not the exact
  configured source identity needed for source economics.

That design is fail-closed, but it is not self-replenishing. A source can be
paused forever, a candidate can remain an issue forever, and the portfolio can
quietly become dependent on one or two providers.

## Live planning baseline

A read-only production D1 query on 2026-08-29 returned the following. Query
metadata reported `changed_db=false` and `rows_written=0`.

| Cohort | Active rows | PH-eligible active | PH-eligible seen in 14d | Eligible first seen in 7d |
| --- | ---: | ---: | ---: | ---: |
| Current six allowed identities, grouped by their five stored platform labels | 647 | 572 | 347 | 93 |
| Paused or legacy platforms | 630 | 303 | 250 | 17 |
| Total | 1,277 | 875 | 597 | 110 |

Interpretation:

- The current six still produced 93 of 110 newly observed eligible jobs in the
  trailing seven days. Strict containment did not eliminate present inflow.
- The 250 fresh-looking eligible rows from paused/legacy platforms will age out
  if those feeds stay inactive. The portfolio therefore needs replacement
  before the stale policy removes that buffer.
- We Work Remotely and Real Work From Anywhere contribute 278 of the 347
  recently seen eligible rows from the current fetching cohort (about 80%).
  Concentration, not only absolute volume, is the main continuity risk.
- These are planning observations, not permanent baselines. Future agents must
  re-run read-only queries and must not quote these values as current truth.
- The cohort uses `source_platform` as a proxy because exact source attribution
  is missing. Closing that measurement gap is the first implementation phase.

## Operating posture

The accepted posture is **reasonable public indexing**:

- An official, documented, unauthenticated posting API or syndication feed is
  affirmative access evidence when it exposes published jobs for public
  distribution.
- Bespoke written permission is not required for every officially public feed.
- Explicit prohibitions, login requirements, paywalls, CAPTCHAs, access-token
  boundaries, unsupported private endpoints, and applicable robots disallows
  remain blocking.
- Public readability alone is not sufficient. The mechanism must be documented
  or expressly provided for public jobs, syndication, or a customer-authorized
  integration.
- Public-API ingestion defaults to factual metadata and canonical linkback.
  Full descriptions are omitted unless the distribution terms or explicit
  permission support their use.
- Discovery from search or a public page creates a candidate only. It never
  creates authority by itself.
- A verified employer/provider removal request hides the affected source or
  records promptly and is preserved as durable opt-out evidence.

This is a project operating policy, not a claim that one rule resolves every
legal jurisdiction. Truly ambiguous or high-impact cases stay permissioned or
blocked until clarified.

## Source portfolio

| Tier | Purpose | Default behavior | Examples |
| --- | --- | --- | --- |
| Core | Proven official RSS/API sources | Active under reviewed cadence and health controls | Current exact six |
| Supported distribution | Provider explicitly offers public job-board/API/RSS/XML distribution | Evidence packet, shadow, then bounded canary | Workable global XML, Lever public postings, SmartRecruiters Posting API, Teamtailor RSS |
| Public index | Official public posting API, but broad republication language is limited | Minimal facts, linkback, short evidence lease, one-board canary | Greenhouse Job Board GET; cautiously reviewed Recruitee XML |
| Permissioned | Customer opt-in, employer-provided feed, or ATS partner feed | Activate only after permission evidence is recorded | Ashby dedicated partner feed, employer-authorized Breezy, Jobvite feed |
| Candidate reserve | Discovered source with no publishing decision yet | Metadata/evidence only; no recurring production publication | Prospector discoveries, directory hiring URLs, user/employer submissions |
| Blocked/dormant | Explicit restriction, unsupported access, expired evidence, or failed source | No recurring fetch; reopen only on new evidence | Breezy generic extraction, unpermissioned Jobvite, login/CAPTCHA paths |

Ten organizations on one ATS are useful supply, but they are one correlated
provider risk for diversification accounting.

## Provider acquisition map

The URLs below are official provider documentation checked on 2026-08-29.
They must be revalidated before implementation.

| Provider | Preferred path | Planning disposition |
| --- | --- | --- |
| Workable | Global hourly XML feed intended for job boards/partners: <https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed> | First high-yield feasibility and shadow unit. Consume no faster than hourly, retain original URLs, and filter before triage. Do not revive undocumented per-token paths. |
| Lever | Public Postings API; published jobs are public and provider docs acknowledge third-party scraping: <https://github.com/lever/postings-api> | Enable through a minimal-metadata one-site canary; pursue the partner/XML path for durable scale. |
| Greenhouse | Job Board GET data is public and authentication-free: <https://docs.greenhouse.io/job-board.html> | Replace the project’s indefinite blanket pause with one-board minimal-index shadow/canary. Application POST remains out of scope. |
| SmartRecruiters | Posting API is public data that requires no authentication: <https://developers.smartrecruiters.com/docs/authentication> and <https://developers.smartrecruiters.com/docs/endpoints> | Add a public-API adapter after registry/measurement foundations. Do not mine HTML. |
| Teamtailor | Career-site `/jobs.rss`; provider describes the metadata as public and shareable: <https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide> | Add a paginated RSS adapter; pursue the opt-in job-board partner feed for scale. |
| Recruitee | Company XML feeds; XML is excluded from the 2027 Careers API token change: <https://support.recruitee.com/en/articles/8213076-faq-api> and <https://docs.recruitee.com/reference/authentication-1> | Cautious XML-only adapter with indexability and rapid opt-out safeguards; partner feed preferred. |
| Ashby | Dedicated partner feed with customer opt-in: <https://developers.ashbyhq.com/docs/dedicated-partner-job-feeds> | Keep current generic identities paused during the first expansion wave; pursue the dedicated feed. Revisit public-API minimal indexing only as its own approved decision. |
| Breezy | Documented positions API requires authorization: <https://developer.breezy.hr/reference/authorization> | Permissioned only. Do not use the undocumented career-site `/json` route as the perpetual path. |
| Jobvite | Customer XML/keyed feed or partner path | Permissioned only because the public site terms restrict scraping/distribution. |

## Two independent state axes

One overloaded `paused` flag cannot explain whether a source is forbidden,
waiting for evidence, temporarily unhealthy, or permanently retired.

### Compliance state

```text
needs_review
  -> allowed
  -> conditional
  -> awaiting_permission
  -> blocked
  -> deprecated
```

- `needs_review`: the mechanism has no current allow/block decision and cannot
  publish or run a shadow fetch.
- `allowed`: documented authority and content scope are current.
- `conditional`: collection is allowed only under named controls such as
  minimal facts, linkback, cadence, or one-tenant scope.
- `awaiting_permission`: the supported path requires provider/customer
  permission and external evidence is pending; no fetch is authorized.
- `blocked`: explicit restriction or unsupported mechanism.
- `deprecated`: intentionally abandoned and retained for history.

`review_ready` is an evidence-workflow status, not a compliance state. It means
the packet is complete enough for a dated decision.

### Operational state

```text
candidate -> shadow -> canary -> active
                          |        |
                          |        +-> review_due -> paused/active
                          +----------> degraded -> quarantined -> paused/active
                                                        |
                                                        +-> retired
```

- `candidate`: discovery/evidence only; no recurring production fetch.
- `shadow`: bounded fetch and parse evidence; zero public writes and available
  only to compliance-`allowed` or compliance-`conditional` sources.
- `canary`: small, reversible publishing cohort with explicit stop conditions.
- `active`: accepted source within its policy, cadence, and volume envelope.
- `review_due`: the evidence lease is nearing or inside its bounded grace
  window; new promotion stops while renewal completes.
- `degraded`: still running inside policy but missing a health/yield target.
- `quarantined`: automatically stopped for technical or evidence-drift review.
- `paused`: deliberately stopped by a reviewed decision; never auto-resumed.
- `retired`: no active use; replacement workflow triggered.

Compliance holds never auto-promote. Operational recovery may be automatic only
for a source whose compliance state remains `allowed` or `conditional` and
whose recorded conditions still hold.

## Evidence leases and deadlines

| Event | Default bound |
| --- | ---: |
| Automated evidence packet | 7 days from discovery |
| Allow/block decision after packet is ready | 14 days |
| Awaiting external permission | 30 days, then dormant |
| Shadow observation | 7 days, no publication |
| Canary observation | 7 days, capped at 10% of new additions |
| Initial economics review | 30 days after activation |
| Public/documented access evidence lease | 180 days; automated drift check at least every 90 days |
| Explicit opt-in/partner evidence lease | 365 days; confirmation reminder at 180 days |
| Renewal work begins | 30 days before evidence expiry |
| Technical quarantine before replacement | 14 days unless a shorter provider rule applies |

Deadlines create a decision or dormant state; they do not manufacture
permission. No candidate remains in an indefinite open review queue.

## Perpetual acquisition loop

```text
Discover without publishing
  -> validate exact host, provider, and provenance
  -> create durable candidate + review deadline
  -> assemble official-source evidence packet
  -> decide compliance state and content scope
  -> run bounded Source Doctor shadow probe
  -> observe seven days of zero-publish yield/quality/health
  -> canary one source at <=10% of new additions
  -> review 30-day economics and concentration
  -> activate, quarantine, replace, or retire
  -> renew evidence before expiry
```

Acquisition channels:

1. provider-supported global or per-company feeds;
2. ATS tokens and career URLs discovered from already accepted jobs;
3. verified directory hiring pages;
4. a no-account “bring your feed” GitHub/email intake carrying employer
   consent and the canonical feed URL; and
5. ATS partner/customer opt-in programs.

Search discoveries are leads only. The evidence packet must identify the
supported acquisition mechanism.

## Target control architecture

The implementation should converge on one registry instead of adding more
hard-coded exceptions to the scrape route.

### Provider profile

- provider ID and correlated-risk family;
- supported mechanism (`syndication_feed`, `public_api`, `customer_auth`,
  `partner_feed`);
- endpoint pattern and exact allowed hosts;
- official evidence URLs and captured evidence hash/date;
- authentication class;
- visibility filter (`published`, `listed`, public/indexable);
- permitted content scope;
- minimum/maximum cadence and provider rate guidance;
- robots handling and last decision;
- removal/disappearance semantics;
- evidence lease and next review date; and
- default compliance/operational state for newly discovered organizations.

### Source account

- exact durable `source_id` and provider profile;
- company/token/feed identity and discovery provenance;
- permission or public-access evidence;
- compliance and operational states;
- review deadline, policy expiry, and owner;
- last shadow/canary/active decision;
- opt-out state; and
- health/economics rollups.

### Candidate and observation records

- discovery evidence is stored without publication;
- every probe is attributable to a candidate/source and declared mode;
- raw -> normalized -> deduplicated -> geo-passed -> triage-passed -> inserted
  counts form a source funnel; and
- intentional skips are distinct from fetch success and from zero-yield feeds.

## Content and removal contract

For public-index sources, store only what is needed for discovery:

- title;
- company;
- factual location/remote scope;
- work type and compensation when explicitly supplied;
- published/updated timestamps;
- provider and source attribution; and
- canonical job/apply URL.

Do not mirror full descriptions unless the feed or recorded permission supports
that content scope. Route applications to the provider/employer. Do not collect
candidate data.

When a job disappears from a successfully fetched complete feed, deactivate it
within one successful reconciliation cycle when the adapter can prove complete
feed semantics. For partial/paginated/error outcomes, fail closed and do not
mass-archive. Verified opt-out requests should hide affected content promptly
and create a durable do-not-reingest record.

## Robots and access authority

Robots evidence, API documentation, terms, authentication, and customer
permission are related but distinct signals.

- Follow every explicit applicable robots disallow.
- Treat server/network-unreachable robots evidence conservatively and retain a
  last-known-good decision where the standard permits.
- RFC 9309 classifies a 4xx robots response as “unavailable” and says a crawler
  may access resources; it does not turn that response into a content license:
  <https://www.rfc-editor.org/rfc/rfc9309.html>.
- An official public API can provide affirmative mechanism evidence even when
  an API origin does not publish a usable robots file. That exception must be
  explicit in the provider profile and independently reviewed.
- Never use robots status to bypass authentication or an explicit provider
  restriction.

The existing exact-six enforcement and anti-expansion guard remain intact until
a dedicated implementation unit changes them with source-specific evidence,
canary, rollback, CI/deploy, and production observation.

## Supply and diversification objectives

### Survival floor

- at least six active allowed identities;
- at least five independent origins;
- at least two permission-ready or shadow-ready reserve sources; and
- no silent 24-hour period without a new visible eligible job.

### Growth target

- at least ten source families;
- at least eight independent origins;
- at least three acquisition channels;
- two independent source families serving every priority category; and
- no provider/origin above 35% of trailing-30-day net-new accepted jobs.

Warn above 40% concentration. A concentration warning triggers replacement
work; it does not automatically disable a productive source.

Until exact attribution produces a clean eight-week baseline:

- warn when weekly net-new accepted jobs fall below 80% of the trailing
  eight-week median;
- declare a supply incident below 60% for two consecutive weeks; and
- retain the existing 36-hour frozen-board incident threshold while adding a
  24-hour early warning.

The primary KPI is **net-new unique accepted jobs**, sliced by 7/14/30-day
freshness. Repeated “items seen” across unchanged polls is not supply.

## Unit-level deployment contract

Every implementation unit must:

1. fetch and restate its start SHA and preserve unrelated dirty work;
2. name the exact source/provider/mechanism and policy evidence;
3. add or update tests before enabling behavior;
4. begin in non-publishing shadow mode unless it is purely foundational;
5. define stop conditions and an empty or source-scoped rollback;
6. commit and push an atomic slice;
7. require exact-SHA CI/deploy evidence for behavior changes;
8. observe at least one real scheduled event, plus the unit-specific window;
9. use read-only D1 acceptance queries unless mutation is the approved unit;
10. update the plan board, implementation status, and system savepoint.

The system savepoint is the sole mutable current-session baton. Change this
strategy or ADR-006 only when the decision itself changes. Update
`docs/HANDOFF.md` and `docs/AI_RECOVERY_TRAIL.md` at a milestone or interruption,
not by copying every mutable SHA and count into every document.

No unit may bundle multiple provider activations. Foundations can be shared;
source canaries remain one provider/mechanism at a time.

## Program phases

1. **Truthful measurement** — exact source attribution and net-new funnel.
2. **Registry and lifecycle** — provider profiles, source candidates, deadlines,
   evidence leases, and behavior-preserving policy resolution.
3. **Non-publishing discovery** — Prospector candidate queue, runtime Source
   Doctor, evidence packets, and reserve health.
4. **Supported distribution** — Workable feasibility first, followed by
   bounded Lever and Greenhouse canaries.
5. **Portfolio expansion** — SmartRecruiters, Teamtailor, and Recruitee as
   separate adapters/canaries.
6. **Permission flywheel** — employer feed intake and ATS partner/customer
   opt-in paths, including Ashby; Breezy/Jobvite remain permissioned.
7. **Adaptive operations** — cadence, quarantine/recovery, evidence renewal,
   concentration alerts, and automatic replacement triggers.
8. **Perpetuity acceptance** — prove supply, diversity, reserves, recovery,
   documentation, and independent AI resumeability.

The executable unit breakdown is in
`docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`.

## Stop conditions

Stop the current unit without broadening scope when any of these occurs:

- official docs or terms contradict the planned mechanism;
- authentication, CAPTCHA, paywall, explicit robots disallow, or anti-automation
  control appears;
- the adapter cannot distinguish published/listed jobs from private/unlisted;
- full-feed completeness is uncertain and a reconciliation would archive rows;
- a provider rate limit or payload size invalidates the planned runtime;
- a canary exceeds its volume cap or degrades control sources;
- source attribution or metrics cannot distinguish duplicates from new supply;
- CI/deploy does not correspond to the exact behavior SHA;
- production evidence has unknown/null policy provenance; or
- unrelated user work would need to be overwritten.

A stop creates a bounded follow-up or a dormant candidate. It does not justify
an alternate undocumented endpoint.

## Initial program acceptance

The first Source Perpetuity capability epoch may be accepted when:

- source supply meets the measured freshness SLO across a representative
  30-day window;
- diversification and two-source reserve targets are met;
- at least one supported distribution source, one public API source, and one
  permissioned/opt-in channel have completed their lifecycle;
- quarantine, rollback, replacement, evidence renewal, and opt-out are proven;
- source economics are exact and do not rely on repeated item sightings;
- no restricted mechanism was bypassed; and
- a fresh AI session can resume correctly using only repository docs and the
  reusable bootloader.

That finite acceptance does not make replenishment terminal. Evidence renewal,
source replacement, failover, restore, reserve, model-replacement, and
succession drills continue permanently under the masterplan.

## Authority and recovery

Read in this order:

1. `AGENTS.md`, including any nearer directory-specific instructions
2. `docs/SYSTEM_SAVEPOINT.md`
3. `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md`
4. this strategy
5. `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`
6. `docs/decisions/ADR-007-autonomous-constitutional-source-governance.md`
7. `docs/decisions/ADR-006-controlled-source-replenishment.md`
8. `docs/MASTER_EXECUTION_PLAN.md` for wider project constraints and source
   sections explicitly marked as superseded
9. `docs/gauntlet/IMPLEMENTATION_UNITS.md` for shared G1-G9 execution rules and
   terminal history
10. `docs/IMPLEMENTATION_STATUS.md`, `docs/HANDOFF.md`, and
   `docs/AI_RECOVERY_TRAIL.md`
11. current evidence and operational `docs/*-latest.md` reports

The prior Gauntlet remains accepted historical evidence. This program does not
reopen its terminal units; it builds the next controlled growth layer on top of
them.
