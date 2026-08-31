# ADR-006: Adopt Evidence-Tiered Controlled Source Replenishment

## Status

Accepted; routine-admission governance amended by
[`ADR-007`](./ADR-007-autonomous-constitutional-source-governance.md)

This ADR accepts a planning direction. It does not activate a source, change a
runtime policy, or relax an existing production guard. Its 2026 bootstrap rule
made every source activation a separately reviewed, tested, reversible, and
deployable unit. ADR-007 supersedes only the permanent human-acceptance and
per-identity deployment requirements after the autonomous control plane itself
is implemented and accepted; the exact-six production boundary remains current
until then.

## Date

2026-08-29

## Context

VA Freelance Hub needs a durable supply of relevant opportunities without
turning public-job indexing into unrestricted scraping. The existing
fail-closed work successfully contained uncertain and noisy sources, but a
blanket source-expansion freeze is not a sustainable replenishment strategy.

Production currently permits six configured source identities to fetch:

- We Work Remotely;
- Remotive;
- Real Work From Anywhere;
- Remote OK; and
- two Jobicy feeds sharing one provider, origin, and cadence group.

The six identities therefore represent only five independent providers. A
policy, outage, commercial change, or feed retirement at one provider can
remove a material share of the portfolio. Keeping the board useful in
perpetuity requires a maintained reserve and a controlled path for replacing
lost supply.

The current ATS boundary is also difficult to extend safely. Platform defaults,
provider notes, and individual Ashby, Greenhouse, and Breezy token decisions are
hard-coded in the scrape route. Unknown ATS platforms and tokens fail closed,
which is a correct runtime default, but each addition becomes a code-policy
exception. The exact-six robots enforcement literal is an accepted production
guard, not a source portfolio or review system.

Past reviews have also combined several different questions:

- whether a provider supports distribution or exposes a documented endpoint;
- whether this project's intended recurring indexing use is defensible;
- whether robots evidence permits this path;
- whether the endpoint is healthy, useful, and affordable to operate; and
- whether a specific tenant or feed has passed release gates.

Combining those questions can leave a source in `needs_review` indefinitely or
make an operational failure look like a compliance prohibition. The project
needs explicit evidence, bounded decisions, renewable review dates, and staged
runtime promotion.

## Decision

Replace indefinite blanket source freezes as the normal planning posture with
an evidence-tiered controlled-replenishment system. Emergency, provider, or
source-specific freezes remain valid controls. Production continues to fail
closed for unknown sources until the replenishment system promotes them through
the lifecycle below.

### Relationship to earlier decisions

ADR-001 remains accepted: this project is a public job index that minimizes
stored data, attributes sources, links users back to original postings, and
does not bypass access controls. ADR-006 supersedes only an **indefinite blanket
freeze as the normal growth posture**. It replaces that posture with bounded,
source-specific evidence, promotion, renewal, and replacement. ADR-003 remains
the job-detail display contract.

### 1. Keep compliance and operational state independent

Every source identity has two independently recorded state axes.

| Axis | States | Question answered |
| --- | --- | --- |
| Compliance | `needs_review`, `allowed`, `conditional`, `awaiting_permission`, `blocked`, `deprecated` | May the project use this access path for the stated collection and display policy? |
| Operational | `candidate`, `shadow`, `canary`, `active`, `review_due`, `degraded`, `quarantined`, `paused`, `retired` | Is this exact source healthy, useful, and currently permitted to run in production? |

Examples:

- A source may be compliance-`allowed` but operationally `degraded` after
  repeated timeouts.
- A healthy public endpoint may remain compliance-`needs_review` and must not be
  fetched merely because it works.
- A provider-wide outage can operationally pause its sources without rewriting
  the compliance decision.
- An explicit prohibition makes the relevant source or path
  compliance-`blocked`, regardless of its operational quality.

`needs_review` is a bounded queue state, not a permanent compromise. Each
review must end in a dated decision: allowed, conditional with named controls,
awaiting permission, blocked, deprecated, or a documented ADR-007
external-authority escalation. During the original bootstrap, that escalation
was routed to the owner.
`review_ready` is evidence-workflow status, not a third policy axis.

### 2. Classify access evidence instead of treating every public URL alike

The source registry records one of these evidence classes for each proposed
access path, ordered by the strength of evidence for this project:

1. **Provider-supported distribution.** An official RSS feed, syndication feed,
   export, job-distribution API, or provider statement intended for downstream
   job distribution.
2. **Customer- or partner-authorized feed.** A provider feed, API, or integration
   provisioned for this project, with the participating customer or provider's
   permission and any scope or expiry recorded.
3. **Public documented API.** An official, unauthenticated read API for public
   job posts. Review must still determine whether recurring third-party indexing
   is consistent with the documented purpose and terms; technical readability
   alone is not authority.
4. **Candidate reserve.** A promising company, provider, public careers page, or
   endpoint that has not yet earned collection authority. Reserve membership
   authorizes research and queueing only, not production collection or display.
5. **Blocked.** The relevant terms or owner prohibit the use, robots explicitly
   disallows the collection path, the path requires an unapproved login or
   credential, access controls resist automation, or no fair supported route is
   available after bounded review.

A higher evidence class does not bypass source-specific checks. A lower class
does not become allowed through repeated successful HTTP requests.

### 3. Apply a minimal-publication contract

Unless stronger redistribution rights are recorded, an activated source may
contribute only the factual metadata needed for discovery:

- job title and company;
- location, remote scope, employment type, and relevant dates when supplied;
- compact project-generated category and eligibility fields; and
- the canonical source and application URLs.

Every public result attributes the originating platform or employer and links
the user back to the original posting to read and apply. Full descriptions,
logos, images, and other expressive content are not copied without recorded
permission. Source-specific display rules in ADR-003 continue to apply.

### 4. Record provider profiles and source identities in a typed registry

Provider-wide evidence and tenant-specific decisions must not remain scattered
across chat history, prose reports, and route literals.

Each **provider profile** records:

- provider name and access mechanism;
- official documentation and terms evidence;
- supported endpoint pattern, authentication rules, rate/cadence guidance, and
  required attribution;
- allowed metadata/display scope;
- robots origins and the latest robots evidence;
- evidence class, reviewer, decision rationale, review date, lease expiry, and
  evidence artifact identifiers; and
- provider-wide stop conditions and kill switch.

Each **source identity** records:

- stable source ID, provider reference, tenant/token, endpoint, and canonical
  careers URL;
- the independent compliance and operational states;
- evidence references and any tenant/customer permission;
- cadence, response budget, expected schema, geo relevance, and deduplication
  behavior;
- promotion stage, owner, reviewer, last successful observation, and next
  review date; and
- rollback/disable control and reason history.

The registry becomes the generated input to runtime policy after a separately
approved migration. Unknown providers and identities continue to fail closed.
Existing literals remain authoritative until that migration is implemented and
accepted; this ADR does not silently replace the exact-six guard.

### 5. Make reviews bounded and evidence renewable

New candidates receive an initial disposition within 14 calendar days of
entering the review queue. A review may request owner/provider clarification,
but it must set a next action and deadline rather than leave an unbounded
`needs_review` record.

Evidence receives a lease so old conclusions are not treated as permanent:

- provider-supported distribution and recorded customer/partner authority:
  review at least every 365 days or sooner if the agreement expires, with a
  confirmation reminder at 180 days;
- public documented APIs and conditional decisions: review at least every
  180 days, with an automated evidence-drift check at least every 90 days; and
- time-limited exceptions: use the shorter date stated in the decision.

An expired lease blocks new promotions. An already-active source enters a
14-day `review_due` grace window unless new evidence shows an explicit
prohibition or access-control conflict, which causes an immediate stop. If the
lease is not renewed by the end of the grace window, the source is paused.

Material evidence changes bypass the normal lease schedule. Terms changes,
provider notices, new authentication requirements, explicit robots disallows,
takedown requests, or repeated rate-limit signals trigger immediate review and
can activate the kill switch.

### 6. Promote sources through a reversible lifecycle

The normal lifecycle is:

```text
candidate reserve
  -> bounded compliance decision
  -> shadow
  -> canary
  -> active
  -> degraded/quarantined/paused/retired when evidence requires
```

- **Candidate reserve:** no production fetch or public display.
- **Shadow:** permitted only after the compliance decision allows limited
  collection. It validates endpoint shape, item counts, payload size, cadence,
  rate-limit behavior, geo yield, duplicate rate, and evidence capture without
  publishing jobs.
- **Canary:** one source identity runs at a conservative cadence and metadata
  cap. It must pass tests, source-level diagnostics, a defined observation
  window, and rollback rehearsal. During bootstrap it also requires reviewer
  acceptance; after the ADR-007 control plane is accepted, a replayable
  constitutional decision replaces routine human acceptance.
- **Active:** during bootstrap, promotion occurs in a separate exact-source
  deployment after the canary evidence is accepted. In the ADR-007 steady
  state, a typed decision event may perform the bounded transition. Monitoring
  and the kill switch remain enabled in either model.

Shadow mode is not a loophole for unresolved access authority. No platform-wide
flip or wildcard tenant approval is allowed. Technical health alone never
promotes a source. ADR-007 permits automatic promotion only after current
authority, recurrent observation, enforced canary bounds, decision replay, and
rollback all pass **and** the masterplan's complete named Autonomy Cutover
Predicate is satisfied; this shorter list is non-exhaustive. Each identity must
remain independently attributable and reversible.

### 7. Manage supply and concentration as service objectives

Source health is insufficient if all healthy sources produce the same thin or
concentrated supply. Generated portfolio evidence must track these initial
service-level objectives (SLOs), which may be revised through versioned evidence
rather than hidden code edits:

- **Supply floor:** until exact attribution establishes a clean eight-week
  baseline, warn when weekly net-new accepted jobs fall below 80% of the
  trailing eight-week median and declare an incident below 60% for two
  consecutive weeks. Versioned evidence may add absolute thresholds later.
- **Provider diversity:** work toward at least ten active source families,
  eight independent origins, and three acquisition channels; the current
  five-origin/six-identity portfolio is an explicit initial gap, not a release
  failure.
- **Concentration:** no provider should contribute more than 35% of rolling
  30-day accepted opportunities, and the top three providers should contribute
  no more than 70%. A breach opens replenishment work; it does not authorize an
  unsafe source.
- **Mechanism diversity:** maintain active supply from at least three
  acquisition channels, such as RSS/syndication, documented public APIs, and
  authorized ATS/customer feeds.
- **Replacement runway:** maintain at least two compliance-reviewed,
  shadow-ready provider candidates and a broader reserve spanning at least four
  provider families.
- **Review throughput:** disposition at least 90% of new candidates within 14
  days and allow no unowned review item to age beyond 30 days.

SLO breaches create prioritized, bounded replenishment units. They never
override an explicit compliance block, access control, or release gate.

### 8. Treat robots evidence as distinct from access authority

Robots evidence is stored and reviewed independently from terms, provider
documentation, and customer/partner authority:

- robots allowance does not grant permission to copy, republish, or use a
  private interface;
- a missing, unreadable, or HTTP 401 robots response does not by itself prove
  either permission or prohibition;
- an explicit disallow for the collection path remains blocking under project
  policy; and
- logins, CAPTCHAs, signed/private endpoints, anti-automation controls, and
  other access restrictions are never bypassed.

This separation prevents a robots result from being misreported as a complete
legal or ethical decision while preserving the project's stronger stop rules.

### 9. Make every activation auditable

This ADR authorizes the portfolio and planning model only. During bootstrap,
every source activation is an implementation unit. After the ADR-007 control
plane is accepted, routine identities under an established mechanism may be
auditable decision events instead. In either form, every activation names the
exact identity and includes:

- current official evidence and its lease;
- metadata/display limits and attribution behavior;
- endpoint, schema, cadence, payload, and rate-limit tests;
- shadow results and canary acceptance thresholds;
- source-level observability and anomaly handling;
- an isolated kill switch and tested rollback;
- exact-SHA CI/deployment evidence and post-deploy read-only verification; and
- recovery-doc and GitHub evidence updates.

Provider profiles may reduce duplicated research, but they do not convert all
current or future tenants into an approved wildcard.

## Alternatives Considered

### Keep a permission-only indefinite freeze

Benefits:

- Lowest ambiguity for recurring third-party collection.
- Simple fail-closed operational rule.

Costs:

- Concentrates production on a shrinking fixed portfolio.
- Treats provider silence as a permanent decision rather than a review task.
- Leaves the ATS adapter and discovery pipeline without a usable promotion
  path.
- Cannot replace sources quickly when feeds retire or change policy.

Rejected as the permanent strategy. Explicit permission remains the strongest
evidence, but supported distribution paths and bounded conditional decisions
must also be evaluated.

### Collect anything publicly readable unless explicitly prohibited

Benefits:

- Maximizes short-term source and job volume.
- Requires little review infrastructure.

Costs:

- Confuses technical reachability with authority for recurring indexing.
- Increases copyright, terms, rate-limit, takedown, and portfolio-reputation
  risk.
- Makes safety dependent on discovering prohibitions after collection starts.

Rejected. Public readability is evidence to review, not blanket approval.

### Continue hand-coded platform and token allowlists

Benefits:

- Explicit and easy to fail closed.
- Proven for a small, static portfolio.

Costs:

- Duplicates provider evidence and tenant decisions inside orchestration code.
- Requires code changes for routine evidence renewal and source-state changes.
- Encourages stale notes, wildcard reasoning, and policy/runtime drift.
- Does not provide a reserve, review SLA, or diversification objective.

Rejected as the long-term control plane. Typed generated runtime policy may
still use exact allowlists, but its source of truth must be the reviewed
registry and each production change remains exact and reviewable.

## Consequences

- The project gains a repeatable way to discover, review, trial, activate,
  replace, and retire sources without weakening fair-access rules.
- Source growth becomes an evidence and reliability process rather than a
  one-time expansion campaign.
- Compliance and operational incidents can be handled independently and
  explained accurately.
- The reserve and SLOs expose concentration early, before job supply collapses.
- Provider research can be reused while tenant activation remains exact and
  independently auditable. During bootstrap it is separately reviewed; after
  the complete ADR-007/masterplan cutover it may be a constitutional decision
  event.
- Evidence leases create recurring maintenance work. This is intentional:
  changing terms and endpoints cannot support a perpetual one-time approval.
- Registry, reporting, and staged-promotion machinery add implementation and
  review overhead.
- Some technically public jobs will remain excluded when authority is unclear,
  the source is not useful, or the controls are disproportionate.
- Existing source and ATS pauses remain in force until explicit implementation
  units produce accepted activation evidence. No previously paused Ashby,
  Greenhouse, Breezy, Workable, Lever, or other identity is enabled by this ADR.

## Non-Goals

- This ADR is not legal advice and does not declare a universal right to index
  public web pages or ATS data.
- It does not authorize bypassing logins, paywalls, CAPTCHAs, robots disallows,
  rate limits, signed endpoints, or anti-automation controls.
- It does not authorize unrestricted HTML crawling, full-description copying,
  logo reuse, or content republication beyond the recorded source policy.
- It does not create auto-apply tooling, user accounts, payments,
  subscriptions, or a hidden applicant-tracking platform.
- It does not activate any source, remove the exact-six production guard, or
  automatically promote a provider, platform, tenant, or token.
- It does not eliminate emergency freezes or fail-closed defaults. It replaces
  indefinite blanket freezes as the normal growth strategy with scoped,
  evidenced, renewable decisions.
