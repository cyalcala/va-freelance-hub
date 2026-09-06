# Apex Source Expansion Design — 2026-09-06

**Status:** Proposed strategy. Planning only. This document does not activate a
source, write `source_registry`, enable a schedule, loosen geo-gate, or change
exact-six fetch.

**Owner goal:** more Filipino-eligible jobs appearing every day, using the
widest net that is still fair and reasonable.

**Authority:** `docs/SOURCE_REPLENISHMENT_MASTERPLAN.md`, ADR-007, ADR-006,
`docs/SOURCE_PERPETUITY_STRATEGY.md`, `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`.
Mutable truth: `docs/SYSTEM_SAVEPOINT.md` Run 48 plus this spec.

**Loop:** `docs/gauntlet/EXPANSION_LOOP.md`

## 1. What “apex / widest net” means here

Widest net is **maximum legitimate, measurable, reversible supply**, not
maximum HTTP. The board exists for Filipino freelancers. A job that is
ineligible, disallowed, duplicated, or stale is not a win.

Fair and reasonable therefore means:

- prefer official RSS, public posting APIs, documented XML, and employer
  opt-in over HTML scraping;
- keep robots, terms, partner-feed, and opt-out gates;
- keep PH eligibility (`geoGate` + triage) — do not inflate count by showing
  US-only or onsite roles;
- admit many sources through one governed loop, not one giant scraper;
- cap new mechanisms until observation proves them;
- never restore unlimited canary.

Rejected definition of widest net: unpause every ATS token, scrape
OnlineJobs.ph / Dribbble / Authentic Jobs, or drop the geo-gate.

## 2. Current truth (do not treat as eternal)

Production read-only D1, `as_of=2026-09-06T07:21:23.158Z`, SHA-256
`B564F4C2EF19C77E1CB854C20992D2D9B67D811283BFEC84622A7CFE51C6B36A`:

- 825 eligible active rows; 7 first stored in 24h; 94 in 7d
- top two sources = 80/94 (85.1%) of seven-day first storage
- `source_registry=0`, candidates=0, shadow observations=0, publication ledger=0
- SP-23C writers and migration 0041 are live; canary fetch is off; shadow
  dispatch is deployed and unscheduled

Live fetch set is still the exact six: We Work Remotely, Remotive, Real Work
From Anywhere, Remote OK, Jobicy admin-support APAC, Jobicy supporting APAC.

Expansion is **not** underway. Daily volume will stay at exact-six yield until
this program executes.

## 3. Approaches considered

### A. Serial one-source bootstrap

Admit Greenhouse `grafanalabs` only, observe seven days, then canary, then the
next source. Lowest risk. Slowest path to “more jobs every day.”

### B. Parallel shadow, serial canary (recommended)

Put every **review_ready** public mechanism into recurring shadow together.
Promote to capped canary one source at a time after that source’s observation
contract passes. In parallel: repair exact-six accepted yield, stand up
Workable as hourly GitHub preprocessing (SP-09 decision already KEEP), and
keep Prospector + employer intake as the discovery flywheel.

This is the widest net that still respects caps, robots, and rollback.

### C. Firehose

Unpause all directory ATS tokens, fetch paused HTML boards, loosen
eligibility. Rejected. Public readability is not aggregation authority.
SmartRecruiters is a host-wide robots NO-GO. OnlineJobs.ph, Dribbble, and
Authentic Jobs stay paused for terms/robots.

**Decision pending owner approval: Approach B.**

## 4. The actual widest fair inventory

### Band 0 — already live (repair, do not replace)

| Identity | Why it is in the net | Constraint |
| --- | --- | --- |
| `we-work-remotely` | Largest current 7d yield | Uncapped exact-six |
| `real-work-from-anywhere` | Second 7d yield; 24h recently 0 | Hourly min interval |
| `remote-ok` | Official JSON; high later reject/unclear | Do not loosen geo-gate to “fix” rejects |
| `remotive` | Allowed RSS; 0 eligible first-storage in last windows | Diagnose parser/triage, do not drop |
| `jobicy-supporting-apac` | Allowed; cadence-grouped | Shared Jobicy origin |
| `jobicy-admin-support-apac` | Allowed; 0 eligible first-storage in last windows | Same origin; more Jobicy categories only if documented and cadence-safe |

### Band 1 — review_ready, write held (first expansion)

One-shot probes already exist. Recurring observation does not.

| Identity | Probe | Why first |
| --- | --- | --- |
| `greenhouse:grafanalabs` | HEALTHY_WITH_RESULTS, 134 jobs, robots allowed, `review_ready` | Best proven public Job Board GET |
| Recruitee `myjewellery.recruitee.com` | HEALTHY_WITH_RESULTS, 91 jobs, robots allowed, `review_ready` | Second public XML mechanism |
| Teamtailor `career.teamtailor.com` | HEALTHY_WITH_RESULTS, 13 jobs, `/jobs.rss` allowed, `review_ready` | Third public RSS mechanism |
| Lever `lever:lever` | HEALTHY_EMPTY | Keep the mechanism; retarget a currently-hiring public board before canary |

Other known Greenhouse boards (`nearform`, `gitlab`, `ghost`, `remotecom`)
enter the same way, one identity at a time, after Grafana Labs observation is
running. The five-token Greenhouse pause is not globally removed.

### Band 2 — large official feed, different runtime

| Identity | Evidence | Constraint |
| --- | --- | --- |
| `workable:global-feed` | SP-09: 11,603 raw jobs, 2,421 remote, 337 `country=PH`; SP-10 adapter exists; live SP-07 probe UNREACHABLE at 14.66 MiB | Hourly GitHub preprocessing, then shadow. Not inside the 10-minute Worker scrape. |

### Band 3 — directory / Prospector / employer flywheel

- Directory rows with `ats_platform` + `ats_token` become **candidates**, never
  live fetches, until that exact identity has current evidence, robots, and
  (for Ashby/Breezy) partner or customer permission.
- Ashby stays paused until Dedicated Partner Job Feed or equivalent permission
  is recorded. Robots HTTP 401 is not allow.
- Breezy career-site `/json` stays paused; documented v3 API is authorized.
- Prospector already writes durable non-publishing candidates (SP-06 KEEP).
  The loop drains that queue into QUALIFY→PROBE, it does not publish from it.
- Employer “bring your feed” (SP-16 KEEP) and partner-permission packets
  (SP-17 KEEP) are how the net grows after the first mechanisms are proven.

### Band 4 — permanently out unless the legal fact changes

| Identity | Why out |
| --- | --- |
| SmartRecruiters host | `api.smartrecruiters.com` robots disallow every crawler except LinkedInBot |
| Authentic Jobs `/feed/` | robots disallow |
| Dribbble | terms prohibit automated access |
| OnlineJobs.ph HTML search | terms: no automated means |
| ProBlogger, Jobspresso, Remote.co | dead, placeholder, or unreliable until a supported feed exists |

## 5. Architecture of Approach B

```text
DISCOVER     Prospector, directory ATS tokens, employer intake, Jobicy category audit
    ↓
QUALIFY      evidence packet, robots, terms, opt-out, exact identity, PH plausibility
    ↓
PROBE        bounded SP-07 shadow (2 req / 512 KiB unless a dedicated preprocessor)
    ↓
INTEGRATE    registry profile + candidate via SP-23B current-evidence gateway
    ↓
OBSERVE      SP-22 shadow-dispatch on a real schedule, revision-scoped, 7d policy
    ↓
REPAIR       pause / quarantine / rollback-to-shadow; 0041 withdraws canary exposure
    ↓
REPLACE      retire dead identities; promote the next review_ready candidate
    ↓
EXPAND       capped canary through 0041; active only after canary KEEP
```

Live scrape stays exact-six unlimited until a source is `active`. A `canary`
never uses the unlimited path. Hidden pending/rejected rows are not exposure.

Shadow-dispatch may be scheduled only after at least one registry shadow row
exists, or in the same unit that writes the first shadow row. An empty
registry still dispatches nothing; the new recurring third-party fetch is the
thing that needs the unit’s own G8 review.

## 6. Success measures

Use first-storage of eligible active rows, not “items seen in a feed.”

| Signal | Target after first 14 days of observation |
| --- | --- |
| Eligible first-storage / 24h | Materially above the current 7, without geo-gate loosening |
| Eligible first-storage / 7d | Diversified above 94 |
| Top-two concentration | Below 80% of 7d first-storage |
| Registry | ≥1 shadow identity with multi-day observations |
| Ledger | canary ticks capped; exact-six still unlimited |
| Safety | zero NO-GO hosts fetched; opt-outs honored |

## 7. What this spec does not authorize

- SP-10..SP-15 registry SQL from 2026-08-30 applied as a batch dump
- Global unpause of Greenhouse / Lever / Ashby / Breezy / Workable tokens
- Canary fetch in the legacy scrape loop
- Unlimited canary
- New paid APIs or credentials
- Contacting providers as if permission were already granted
- Implementation before owner approval of Approach B

## 8. Approval gate

Approve Approach B and the loop in `docs/gauntlet/EXPANSION_LOOP.md` to unlock
the implementation plan (`writing-plans`) and then EX-01. Rejecting B returns
to Approach A or a named subset of Band 1.
