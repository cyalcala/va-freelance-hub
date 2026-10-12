# October 12 resumed-flow and zero-tick diagnosis

Read-only evidence, sampled 11:20–11:52 UTC (19:20–19:52 Manila). The owner's
earlier report of one October 12 job was consistent with the old public snapshot.
Production acquisition/publication later resumed before the retained-caller
diagnostic deployment. A successful zero-insert tick does not describe the whole
day. The target remains 100 unique verified PH-eligible first publications/day,
150 stretch; MATH is 0/13 and certified daily flow is UNKNOWN.

No provider endpoint was fetched by this investigation. The only requests were
normal read-only Cloudflare metadata/SELECT APIs, ordinary public site GETs and
a bounded passive scheduled-event tail. SELECT receipts all reported zero rows
written. Ordinary public GETs may schedule the application's existing background
snapshot refresh; no scrape POST, manual refresh, sync, admission, lock reset,
migration or application deployment was performed here. Cached OAuth was used
internally; no credential value, full listing body, applicant information or raw
error/HTTP body was retained. Private acquisition facts remain in the earlier
incident report, with the endpoint/fleet attribution limits recorded there.

## Recovery timeline and the zero tick

The bounded `source_fetch_events` window has durable clean runs at 05:40 and
05:50 UTC, followed by no recorded run until 10:30:57.221 UTC. That is a 4h40m
gap in durable terminal fetch evidence, alongside the previously observed caller
HTTP 503 exceptions. It is not proof that no invocation or lock mutation occurred.
The underlying cause of those 503s remains unknown.

| Run timestamp UTC | Events | Skipped | Unchanged feeds | Changed item observations |
| --- | ---: | ---: | ---: | ---: |
| 10:30:57.221 | 62 | 44 | 1 | 1,151 |
| 10:41:02.629 | 62 | 59 | 1 | 129 |
| 10:51:04.125 | 62 | 60 | 1 | 89 |
| 11:01:14.022 | 62 | 60 | 1 | 89 |
| 11:11:04.247 | 62 | 60 | 2 | 0 |
| 11:20:59.280 | 62 | 60 | 1 | 16 |
| 11:30:59.019 | 62 | 44 | 3 | 1,046 |

All these events have `ok=1`. Repeated whole-feed item counts are observations,
not unique new jobs or eligible supply. Recovery began at 18:30 Manila, before
the caller-only deployment at 19:08; the caller did not cause this recovery.

The independently tailed normal 19:20 tick used Worker version
`5869833f-bdd2-4d74-99f1-ab571a4a5fe4` and returned HTTP 200 / completed /
REPORTED, zero inserts and changes, complete diagnostics, available cadence
state and no reported failures. D1 confirmed the clean diagnostic at
`11:20:59.280Z` and lock release at `11:21:07.899Z`. Neither recognized 503
signature was emitted.

At that tick Remotive returned 16 changed items, WWR was unchanged (89 is its
carried-forward count), and the other four exact-six identities were cadence
skipped. Thirteen admitted ATS identities were cadence skipped; seven Workable
canaries were rotation skipped. A duplicate `breezy:20four7va` directory identity
was explicitly skipped. Other unadmitted identities were policy skipped.
The receipt's absent triage/write-stage counters and the absence of any newly
stored Remotive row support the existing dedup/idle path, rather than an AI or
write failure. The complete endpoint response body was not retained, so its
exact message and raw/dedup counters were not independently captured.

## Actual storage, receipts and public visibility

At 11:39:36 UTC, D1 contained 7,219 rows and 1,634 currently public rows. Using
Manila midnight `2026-10-11T16:00:00.000Z`, 22 public rows were first seen today,
eight carried the stored `eligible_verified` flag, and 17 public rows carried
a source posting date today. These are distinct measures; the flag is not
independent ground-truth verification or a certified first-publication record.

| Source | Today's public first-seen rows | Stored eligibility | Latest first-seen UTC |
| --- | ---: | --- | --- |
| Sourcefit | 4 | verified | 10:30:57.221 |
| Jobicy supporting APAC | 3 | verified | 10:41:02.629 |
| Remote OK | 1 | verified | 11:30:59.019 |
| We Work Remotely | 14 | likely | 11:01:14.022 |

Seven additional new stored rows were policy rejected: Sourcefit one, Remote OK
one and WWR five. The bounded inactive-state aggregate found no `pending-triage`
or `triage-budget-deferred` row. Historical unclear rows are not a qualified
ready supply count. These facts do not establish that every deferred input was
durably parked.

At 11:43–11:50 UTC, today's publication ledger reported 22 publications across
18 unlimited receipts, but contained only 14 ID occurrences/unique IDs.

| Source | Reported published | Persisted IDs | Deficient receipts |
| --- | ---: | ---: | ---: |
| Sourcefit | 4 | 3 | 1 |
| Jobicy supporting APAC | 3 | 3 | 0 |
| Remote OK | 1 | 0 | 1 |
| WWR | 14 | 8 | 2 |

All 14 emitted IDs existed in D1 and were first seen today. Six were currently
verified public IDs (three Sourcefit and three Jobicy). Empty/incomplete ID
receipts prevent treating reported 22 or flagged eight as a fully reconciled
certified cohort. This investigation did not backfill receipts or reinterpret
missing identity as zero publication. Row `scraped_at` also precedes completed
receipt time on some runs: Sourcefit rows first seen at 10:30 have latest receipt
10:40, and Jobicy rows first seen at 10:41 have receipts at 10:50.

Ordinary public GETs at 11:44:24 UTC returned HTTP 200 but served an edge snapshot
generated at `09:03:02.994Z`, age 9,682 seconds, 1,617 jobs / 735 companies.
Headers and all six HTML head diagnostics agreed. The opportunity index showed
1,617; `fresh=today` rendered only IDs 9153, 9152, 9151, 9150 and 9149. The 17
newly stored public rows were absent from these sampled board/home responses.

At 11:49:57, D1's durable snapshot was already newer: generated
`11:05:22.961Z`, no refresh lease, 665,103 payload characters. At 11:52:23 the
sampled homepage and `fresh=today` had promoted that snapshot, with 1,631 jobs /
735 companies. Today rendered 19 distinct rows and 15 October 12 date labels.
New Sourcefit `/jobs/9159` returned 200 and source-posted timestamp
`09:39:53.963Z`. Thus the sampled stale view recovered without an app deployment.
The mart remained three public rows ahead of this snapshot. Older first-seen
timestamps do not imply those rows were physically persisted before the
snapshot was built. Cloudflare HTTP cache age and snapshot age measure separate
copies; homepage was an HTTP cache HIT with age 128 seconds.

Reported live source `3065f0d7` already includes the 25-second retained background
refresh window and stale minute recheck. Do not diagnose an absent timeout fix
from the current uncommitted source. The precise cause of the earlier edge lag
was not captured in a Pages runtime log.

## Concrete admitted-source bottleneck: Workable rotation

The handler sorts every Workable directory tenant by `verified_at`, takes the
first two tokens, then checks admission. This ordering is present in both
reported live source `3065f0d7` and current source. Current handler anchors:
`apps/web/src/pages/api/cron/scrape.ts:2308` (pre-policy candidates), `:2315`
(two-token selection), `:2323` (policy), and `:2334` (rotation rejection).

Read-back at 11:43:29 identifies the selected tokens:

| Token | Directory verified_at | Registry state | Policy expiry |
| --- | --- | --- | --- |
| virtualstaff365 | NULL | needs_review / candidate | NULL |
| myoutdesk | 2026-06-11T12:43:06.731Z | needs_review / candidate | NULL |

They correctly fail admission, but still consume both rotation slots. Every
admitted Workable canary therefore records rotation skips, cannot refresh its
directory ordering, and remains behind these unchanged candidates. All seven
had 27 skipped events today and zero actual fetches in that window. Two retained
Workable fetch-state rows still point to September 27. This is a concrete
selector defect, not evidence that providers had no jobs today.

| Admitted token | Admission evidence ID | Stored adjudication reference suffix |
| --- | ---: | --- |
| coconutva | 17 | coconutva-tier-a-fast-track |
| crewbloom | 18 | crewbloom-tier-a-fast-track |
| hello-rache | 22 | hello-rache-tier-a-fast-track |
| hunt-st | 20 | hunt-st-tier-a-fast-track |
| pearltalent | 19 | pearltalent-tier-a-fast-track |
| pineapple-staffing | 23 | pineapple-staffing-tier-a-fast-track |
| rocketams | 21 | rocketams-tier-a-fast-track |

All seven are conditional / canary, cap two, opt-out false; stored policy and
immutable admission expiry is `2027-03-10T21:31:09.551Z`. Adjudication references
begin `ex-ph-agency-workable-`. Registry, admission and current adapter endpoints
all match `https://apply.workable.com/api/v1/widget/accounts/{token}`. The provider
pointer is the XML Job Feed article, but
`docs/gauntlet/evidence/EX-WORKABLE-ph-agencies-qualification.md` explicitly
records the per-company widget qualification. The pointer alone is not a reason
to invent an endpoint mismatch. Current provider permission was not independently
re-researched here; existing admissions and quality ceilings must be preserved.
Review deadlines in these historical rows have passed; they are separate from
the still-future recorded policy/admission expiry and must retain their defined
governance meaning.

The smallest bounded repair is to build the two-token rotation from identities
that pass existing source-specific admission and required controls, deduplicate
tenant identities before allocating slots, retain the two-tenant allowance and
60-minute cadence, then continue using the existing robots, item quality and
capped publication gateway. A regression should put the two observed candidate
tenants ahead of admitted tenants and prove only admitted tenants consume slots;
also prove duplicate directory/registry identities consume one slot. Source
permission, cap, endpoints and other clocks must not change. Fresh resulting
Workable supply remains unmeasured until a normal permitted production run.

## Current source supply and next evidence

Twenty registry identities were active/canary: five active Breezy tenants
(20four7va, remote-craft, sourcefit, value-virtual-assistants, yokly), one Breezy
canary (time-etc), one Ashby canary (multiplymii), six Greenhouse canaries
(canonical, ghost, gitlab, grafanalabs, nearform, remotecom), and the seven
Workable canaries above. Immutable admission evidence rows and provider evidence
leases were present for these identities. This inventory is not full admission
packet replay or an Autonomy Cutover acceptance.

The non-Workable ATS group made clean actual fetches at 11:30:59: MultiplyMii 56,
20four7va 107, Remote Craft 15, Sourcefit 89, Time Etc one, Value VA 11, Yokly 11,
Canonical 311, Ghost six, GitLab 221, Grafana 105, NearForm 21 and Remote.com zero.
These feed inventories largely repeat stored rows and do not imply this many
new PH-eligible jobs. Sourcefit is concrete already admitted fresh PH supply:
four verified public first-seen rows today, three after recovery, and newest
source posting at 09:39:53.963 UTC. Jobicy supplied three verified rows after
recovery. No cadence increase or new source is needed to observe those paths.

Next evidence should reconcile persisted receipt identity with actual public
visibility, verify any bounded Workable selector repair locally before release,
then observe the existing normal clocks and independent quality sampling. Keep
the old 503 cause unknown, distinguish individual zero ticks from whole-day
flow, and retain both stale and recovered public samples. Neither 22 currently
public first-seen rows, eight stored verified flags, nor six verified emitted
receipt IDs establishes the requested 100/day or independent MATH acceptance.
