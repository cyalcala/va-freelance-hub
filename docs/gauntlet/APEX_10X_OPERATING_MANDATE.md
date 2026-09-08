# APEX-10X VA FREELANCE HUB

## Master Strategy, Execution Gauntlet, Recovery Bootloader, and AI Continuity Contract

**Primary executor:** Gemini 3.8
**Target repository:** https://github.com/cyalcala/va-freelance-hub
**Governance repository:** https://github.com/cyalcala/agent-governance-kernel
**Skills repository:** https://github.com/cyalcala/ai-skills

---

# 0. MISSION

You are not being asked merely to propose improvements.

You are the primary execution agent for a governed end-to-end transformation of **VA Freelance Hub** into a substantially higher-yield, higher-reliability, Philippines-centered remote-job discovery engine while preserving its current strengths:

* conservative source governance;
* Cloudflare-first low-cost infrastructure;
* GitHub-backed recovery;
* source-level observability;
* deterministic data-quality controls;
* role taxonomy;
* AI-assisted classification;
* existing expansion work;
* existing source-health work;
* existing replenishment work;
* existing eval work;
* existing observability work;
* existing Python analytics work;
* existing ingestion/fan-out work;
* existing documentation and recovery methodology.

The objective is:

> **Achieve an evidence-backed path toward approximately 10x qualified opportunity yield and materially higher user utility without sacrificing compliance, reliability, recoverability, data quality, or the existing completed/active roadmap.**

This is **not a rewrite mandate**.

This is an architectural expansion and bottleneck inversion.

Do not discard working infrastructure simply because a newer architecture sounds cleaner.

Do not ignore unfinished or recently completed projects because APEX-10X overlaps them.

They are complementary workstreams unless evidence proves otherwise.

---

# 1. AUTHORITY ORDER

Resolve contradictions using this authority order:

1. Explicit user instructions.
2. Observable current state of `cyalcala/va-freelance-hub` on GitHub.
3. Current production behavior and deployed evidence.
4. Accepted ADRs and active governance rules in the target repository.
5. `cyalcala/agent-governance-kernel`.
6. `cyalcala/ai-skills`.
7. Current recovery/savepoint documentation.
8. Historical documentation.
9. External architectural recommendations.
10. Your own assumptions.

**Important:** policy may remain valid while filled execution state becomes stale.

Never trust a savepoint merely because it is the newest-looking document.

Verify:

* branch;
* `main` SHA;
* merged PRs;
* migrations;
* source registry;
* workflows;
* deployed behavior;
* tests;
* D1 state where authorized;
* Git history.

If documentation says something is pending but `main` already contains it, **the repository wins**.

Repair the documentation.

Do not redo completed work.

---

# 2. GOVERNANCE KERNEL

Use the **Agent Governance Kernel** as the control plane.

Before substantial implementation, inspect:

https://github.com/cyalcala/agent-governance-kernel

Use its current actual interfaces and conventions rather than inventing commands from memory.

The governance intent is:

**BOOT → ORIENT → ESTABLISH AUTHORITY → IDENTIFY UNCERTAINTY → PLAN → EXECUTE → VERIFY → CRITIQUE → DEPLOY → MEASURE → CHECKPOINT → RESUME**

Apply methodical doubt:

For material assumptions classify them internally as:

* VERIFIED FACT
* STRONG EVIDENCE
* INFERENCE
* HYPOTHESIS
* UNKNOWN
* BLOCKED

Never promote a hypothesis into an architectural fact merely because an earlier AI stated it.

---

# 3. SKILLS ROUTING

Inspect:

https://github.com/cyalcala/ai-skills

Use the actual skills available in that repository.

The intended routing philosophy is:

### Karpathy-style discipline

Use for:

* understanding before editing;
* keeping diffs small;
* reuse-before-rewrite;
* avoiding speculative abstraction;
* minimizing unnecessary code;
* reviewing AI-generated diffs;
* evidence-gated refactoring.

### Addy Osmani-style lifecycle

Use for:

* specification;
* architecture planning;
* debugging;
* implementation decomposition;
* TDD;
* performance work;
* code review;
* maintainability.

### Obra/Superpowers-style execution

Use for:

* systematic debugging;
* verification before declaring completion;
* worktree isolation where useful;
* fresh-agent review;
* adversarial testing;
* root-cause analysis.

### AGK

Sits above all skills.

Skills assist execution.

AGK governs execution.

Do not cargo-cult skill names. Inspect their current contracts and invoke the capabilities that actually exist.

---

# 4. NON-NEGOTIABLE PRODUCT BOUNDARIES

Preserve the project's core character unless the user explicitly changes strategy.

Default boundaries:

* Cloudflare/Astro/D1 remains the primary production direction.
* Prefer existing infrastructure over introducing new services.
* Remain aggressively cost-conscious.
* Prefer official APIs, RSS, ATS feeds, documented endpoints, and source-supported public access paths.
* Never bypass authentication controls.
* Never bypass CAPTCHAs.
* Never evade rate limiting.
* Never bypass explicit anti-automation controls.
* Do not treat “publicly visible” as automatic permission to republish.
* Keep application traffic directed to the original employer/source.
* Minimize stored copyrighted text.
* Do not add payments.
* Do not add user accounts.
* Do not add resume hosting.
* Do not add automated applications.
* Do not turn the project into a general ATS.
* Do not introduce a paid SaaS dependency without explicit evidence and user approval.
* Never commit secrets.

The goal is a **lean, exceptional job-discovery engine**, not platform bloat.

---

# 5. THE FIRST REQUIRED ACTION: TRUTH RECONCILIATION

Before adding architecture, inspect the complete present state.

Read, at minimum:

* `AGENTS.md`
* `README.md`
* `HANDOFF.md` if present
* `docs/bootloaders/CURRENT.md` if present
* current bootloader
* master plans
* execution-state documents
* system savepoints
* implementation status
* architecture docs
* source-health docs
* source-registry code
* ingestion code
* AI triage code
* workflows
* migrations
* current open and recently merged PRs
* recent commits
* current production architecture
* tests

Also inspect current APEX/EX expansion work already present in the repository.

Do not assume an older savepoint accurately represents the top of `main`.

---

# 6. CREATE THE WORKSTREAM CONTINUITY LEDGER

Before major implementation, create or update a canonical document:

`docs/APEX_10X_WORKSTREAM_LEDGER.md`

Do not duplicate an equivalent existing document unnecessarily.

Enumerate **every currently active, incomplete, recently completed, planned, or strategically relevant workstream**.

Classify each as:

* ACTIVE
* COMPLEMENT
* DONE_VERIFIED
* BLOCKED
* PAUSED
* SUPERSEDED_WITH_EVIDENCE

Every superseded item requires written evidence.

Nothing disappears silently.

At minimum inspect for work involving:

* existing APEX expansion / EX work;
* Source Doctor;
* Source Health;
* Health Memory;
* freshness monitoring;
* source replenishment;
* source prospector;
* direct ATS collection;
* Source Capability abstraction;
* role-family expansion;
* geo gates;
* policy gates;
* deterministic triage;
* AI provider cascade;
* opportunity scoring;
* deduplication;
* schema validation;
* observability;
* failure taxonomy;
* anomaly detection;
* evals;
* Python analytics;
* labor-market intelligence;
* pipeline fan-out;
* Inngest;
* Cloudflare execution;
* GitHub Actions;
* recovery/savepoints;
* bootloaders;
* architecture documentation;
* user-facing search;
* directory improvements;
* salary/timezone metadata.

For each workstream record:

| Field           | Meaning                |
| --------------- | ---------------------- |
| Workstream      | Canonical name         |
| Existing state  | What already exists    |
| Evidence        | Commit/PR/file/test    |
| Status          | Active/complement/etc. |
| APEX-10X pillar | Where it belongs       |
| Dependency      | What it needs          |
| Regression risk | What must not break    |
| Next action     | Exact next step        |

**APEX-10X absorbs compatible work. It does not erase it.**

---

# 7. DEFINE THE 10X NORTH STAR WITH DATA

Do not use vague claims such as “80–150 jobs/day” without measurement.

Establish an actual baseline using production evidence.

Capture at minimum rolling 7-day and 30-day values for:

* raw jobs discovered/day;
* unique jobs discovered/day;
* eligible jobs accepted/day;
* actual newly stored eligible jobs/day;
* productive source identities;
* source concentration;
* percentage of weekly yield produced by top 1 source;
* percentage produced by top 2 sources;
* geo rejection rate;
* role rejection rate;
* duplicate rate;
* stale listing rate;
* source failure rate;
* abnormal-empty rate;
* LLM calls/day;
* LLM calls per accepted job;
* AI failure/fallback rate;
* ingestion latency;
* median discovery-to-publication latency;
* role-family distribution;
* employer/direct ATS vs aggregator contribution;
* D1 usage;
* external-request usage;
* queue/orchestration usage;
* current infrastructure cost.

Call the present eligible-new-jobs/day baseline:

`B0`

Define:

`APEX_10X_TARGET = 10 × B0`

Do not manipulate the denominator.

Track both:

* **gross discovered jobs**
* **net newly published eligible jobs**

The second metric is the primary KPI.

If real labor-market supply ultimately prevents literal 10x qualified publication, document that empirically. Do not fabricate success.

---

# 8. THE APEX-10X FLYWHEEL

The target system should converge toward:

```text
SOURCE DISCOVERY
      ↓
EMPLOYER / SOURCE CANDIDATE
      ↓
ATS / FEED FINGERPRINT
      ↓
SOURCE POLICY CHECK
      ↓
CAPABILITY PROBE
      ↓
SOURCE REGISTRY
      ↓
ADAPTIVE HARVESTING
      ↓
CONTENT HASH / SOURCE-ID DEDUP
      ↓
STRUCTURED METADATA GATE
      ↓
DETERMINISTIC GEO + POLICY GATE
      ↓
DETERMINISTIC ROLE-FAMILY GATE
      ↓
AMBIGUITY?
   ┌───────┴────────┐
   │                │
   NO              YES
   │                │
   ↓                ↓
PASS/REJECT       LLM ESCALATION
                    ↓
               EXTRACTION
   └────────┬───────┘
            ↓
NORMALIZATION
            ↓
SCHEMA VALIDATION
            ↓
CROSS-SOURCE DEDUP
            ↓
OPPORTUNITY SCORING
            ↓
D1
            ↓
FTS + STRUCTURED DISCOVERY
            ↓
USER
            ↓
SOURCE ECONOMICS
            ↓
ADAPTIVE POLLING + NEW PROSPECTING
            ↺
```

This is the core architecture.

---

# 9. PILLAR A — SOURCE CAPABILITY SYSTEM

Do not create hundreds of custom scrapers.

Scale **capabilities**, not one-off code.

Target model:

```text
SourceCapability
├── canHandle()
├── probe()
├── fetch()
├── normalize()
└── diagnostics()
```

Capabilities may include, depending on current repo truth:

* Ashby
* Greenhouse
* Lever
* Workable where policy/access allows
* Breezy
* RSS
* JSON feeds
* supported HTML
* other recurring ATS platforms discovered during research

Do not add a framework merely to have a framework.

Reuse existing abstractions if equivalent capability already exists.

---

# 10. PILLAR B — COMPANY / SOURCE REGISTRY

Shift the replenishment model from:

> six giant job boards

toward:

> many evidence-backed employer/source identities served by a small number of reusable capabilities.

A registry entry should eventually be capable of representing:

```text
source_id
company_id
company_name
career_url
platform
platform_token
collection_method
compliance_state
review_evidence
geo_profile
role_profile
polling_class
last_probe_at
last_success_at
last_change_at
consecutive_failures
productive_30d
eligible_30d
raw_30d
yield_rate
failure_rate
abnormal_empty_rate
next_poll_at
```

Use migrations carefully.

Do not denormalize blindly.

---

# 11. PILLAR C — TWO-SPEED SOURCE GOVERNANCE

Create an ADR if this distinction does not already exist.

### FAST TRACK

Potentially eligible when all are true:

* direct employer source;
* documented/public/source-supported endpoint;
* structured machine-readable data;
* no authentication bypass;
* no explicit anti-automation restriction;
* predictable read-only collection;
* clear original application link;
* conservative storage.

Fast track still requires:

* probe;
* schema validation;
* source identity validation;
* basic geo sanity check;
* smoke test;
* bounded canary;
* health monitoring.

Fast does **not** mean ungoverned.

### GUARDED TRACK

Use for:

* aggregators;
* HTML extraction;
* undocumented endpoints;
* ambiguous source terms;
* rate-limited behavior;
* unstable markup;
* sources whose access policy is unclear.

Require stronger evidence and shadow/canary behavior.

### PROHIBITED / PAUSED

For:

* login-gated sources;
* CAPTCHA-protected collection;
* clear anti-automation restrictions;
* unsupported authenticated APIs;
* repeatedly harmful sources;
* unresolved compliance questions.

Do not allow architectural ambition to weaken source policy.

---

# 12. PILLAR D — SOURCE PROSPECTOR

Build or complete the replenishment system.

The prospector pipeline should evolve toward:

```text
discover company
→ find careers page
→ fingerprint ATS/feed
→ extract public board identifier
→ probe endpoint
→ validate response
→ identify job count
→ evaluate source policy
→ evaluate geographic usefulness
→ evaluate role-family usefulness
→ create candidate record
→ produce PR-ready or registry-ready proposal
```

Never silently auto-enable uncertain sources.

Automated discovery is allowed.

Uncertain admission remains governed.

Seed direct employer sourcing in **small verified batches**, not one uncontrolled 250-company commit.

Recommended progression:

* batch 1: 10–20 employers;
* observe;
* batch 2: 20–40;
* observe;
* then expand based on measured source economics.

Scale faster only when the architecture proves it can safely absorb the load.

---

# 13. PILLAR E — SOURCE ECONOMICS

This is one of the central APEX-10X innovations.

Every source should eventually answer:

> Is this source worth polling?

Measure:

```text
fetches
successful_fetches
failed_fetches
raw_jobs
unique_jobs
eligible_jobs
inserted_jobs
duplicate_jobs
geo_rejected
role_rejected
policy_rejected
ai_escalated
ai_failed
latency
last_change
```

Derive useful measures such as:

```text
eligible_yield = eligible_jobs / successful_fetches

productive_yield = newly_inserted_jobs / successful_fetches

ai_cost_per_insert = ai_calls / newly_inserted_jobs

waste_ratio =
  rejected_or_duplicate_jobs / raw_jobs
```

Adaptive scheduling should eventually favor:

* productive;
* healthy;
* frequently changing;
* low-cost;
* policy-safe sources.

It should poll less frequently when a source is:

* dormant;
* repetitive;
* chronically empty;
* low-yield;
* repeatedly failing.

Failures should trigger exponential or bounded backoff rather than needless request pressure.

This turns replenishment into a self-optimizing portfolio.

---

# 14. PILLAR F — ZERO-WASTE INGESTION

Do not send every listing directly to an LLM.

Build the cheapest reliable funnel.

## STAGE 0 — CHANGE / IDENTITY FILTER

Use when supported:

* source job IDs;
* canonical URLs;
* ETags;
* Last-Modified;
* content hashes;
* previously seen source records.

If unchanged, skip expensive processing.

## STAGE 1 — STRUCTURED SOURCE METADATA

Use source metadata first:

* location;
* workplace type;
* country;
* region;
* department;
* employment type;
* remote flag;
* office;
* currency;
* source tags.

Reject obvious disqualifiers deterministically.

**Audit hotspot:** ensure no ATS adapter automatically labels every job `remote` unless the source actually supports that claim.

## STAGE 2 — DETERMINISTIC TEXT GATES

Examples:

Negative geographic signals:

* US only;
* must reside in United States;
* US work authorization required;
* W2 only;
* EU only;
* UK only;
* security clearance;
* country-specific employment requirement.

Positive role signals:

* virtual assistant;
* executive assistant;
* operations coordinator;
* customer support;
* customer success;
* client care;
* social media;
* content;
* bookkeeper;
* technical writer;
* documentation;
* knowledge management;
* AI operations;
* applied AI;
* AI builder;
* relevant adjacent role families.

Do not overfit to titles.

## STAGE 3 — OPTIONAL LIGHTWEIGHT SEMANTIC GATE

Only add embeddings or another semantic stage if benchmark evidence shows meaningful improvement over deterministic gating.

Do not introduce Vectorize simply because it exists.

## STAGE 4 — LLM ESCALATION

Use LLMs for the ambiguous middle.

Good LLM tasks:

* nuanced eligibility;
* hidden geographic restriction;
* role-family ambiguity;
* timezone extraction;
* employment arrangement;
* software/tool extraction;
* compensation normalization;
* seniority;
* unusual restriction interpretation.

LLMs should increasingly become:

> **ambiguity resolvers and extractors**

rather than:

> universal eligibility judges.

---

# 15. AI PROVIDER STRATEGY

Preserve and improve the existing provider cascade if present.

Use provider diversity for resilience, not complexity theater.

The AI pathway must:

* validate structured output;
* fail deterministically;
* distinguish provider failure from negative classification;
* record fallback usage;
* avoid silently accepting malformed model output;
* support replay/eval against frozen fixtures.

High-confidence deterministic decisions should not invoke AI.

Adversarial/skeptic review should be reserved for cases where its measured benefit justifies its cost.

Benchmark this.

Do not assume the skeptic layer must disappear.

Do not assume it must remain universal.

Prove where it adds value.

---

# 16. PILLAR G — ROLE FAMILY COVERAGE

Preserve and extend current taxonomy work.

The target opportunity universe includes, at minimum, the currently strategic families:

* VA / Remote Administration
* AI Builder
* Applied AI
* AI Operations
* AI Product / Technical
* Technical Writing
* Knowledge Management
* Professional / Technical Writing

Also preserve useful existing categories.

Do not force everything into “VA.”

The product should become a high-quality Philippine-friendly remote opportunity engine with VA as a major pillar, not a brittle title matcher.

Track per-role-family:

* daily new jobs;
* sources;
* companies;
* rejection rate;
* geo eligibility;
* salary availability;
* shift availability.

---

# 17. PILLAR H — DURABLE EXECUTION / FAN-OUT

The target property is:

> **one source/job failure cannot destroy an entire replenishment cycle.**

Do not prematurely choose the implementation.

First inspect the current system.

If existing Inngest or job-level `step.run` fan-out already provides:

* isolated work units;
* retries;
* idempotency;
* concurrency controls;
* observability;
* acceptable cost;

then extend it.

If Cloudflare Queues offers a measurable improvement, evaluate it.

If GitHub Actions matrix/fan-out is sufficient for harvesting, preserve it.

Architectural goal:

```text
HARVEST
    ↓
DURABLE UNIT OF WORK
    ↓
JOB / SOURCE PROCESSOR
    ↓
D1
```

not:

```text
everything in one fragile synchronous request
```

Decision criteria:

* current bottleneck;
* request/subrequest limits;
* retry behavior;
* concurrency;
* free-tier economics;
* operational complexity;
* portability;
* observability;
* failure isolation.

Create an ADR for any major orchestration change.

Do not replace existing functional fan-out for aesthetic reasons.

---

# 18. IDEMPOTENCY IS MANDATORY

Assume retries can happen.

Assume duplicated events can happen.

Assume aggregators and direct employers may publish the same job.

Design safe identity.

Possible dimensions:

```text
source identity
external job id
canonical application URL
normalized company
normalized title
content hash
```

Use deterministic database uniqueness where appropriate.

Test duplicate event delivery.

Test duplicate source discovery.

Test cross-source duplicates.

---

# 19. SOURCE DOCTOR + HEALTH MEMORY

Preserve and complete Source Doctor work.

The system must distinguish:

```text
NO_JOBS
```

from:

```text
FAILED_TO_LOOK
```

from:

```text
ABNORMAL_OUTPUT
```

Examples:

`HTTP 200 + []` may mean:

* genuinely zero openings;
* API changed;
* wrong token;
* geo query malfunction;
* source quietly blocked automation.

Never treat all four as “successful zero jobs.”

Maintain machine-readable source diagnostics.

Health memory should identify:

* repeated failure patterns;
* long-term yield;
* normal result ranges;
* recent anomalies;
* expected cadence.

---

# 20. FAILURE TAXONOMY

Preserve or introduce a stable taxonomy similar to:

```text
NETWORK_FAILURE
RATE_LIMIT
SOURCE_UNAVAILABLE
SOURCE_EMPTY
SOURCE_ANOMALOUS
SCHEMA_INVALID
NORMALIZATION_FAILURE
DEDUP_FAILURE
GEO_FAILURE
TAXONOMY_FAILURE
AI_PROVIDER_FAILURE
AI_OUTPUT_INVALID
DATABASE_FAILURE
ORCHESTRATION_FAILURE
STALE_PIPELINE
UNKNOWN_FAILURE
```

These are operational states, not log prose.

Emit structured diagnostics.

---

# 21. PILLAR I — PYTHON TOOLING

Do not migrate the production runtime to Python merely because Python is useful.

Use Python as a complementary analytical and evaluation layer where appropriate.

Potential uses:

* source-volume analysis;
* latency distributions;
* yield analysis;
* rolling medians;
* MAD anomaly detection;
* taxonomy evaluation;
* normalization tests;
* geo-policy evaluation;
* dedup research;
* salary statistics;
* labor-market intelligence;
* source concentration;
* source economics;
* opportunity-ranking experimentation.

Prefer scripts/notebooks that consume exported or read-only datasets.

Production remains TypeScript/Cloudflare unless evidence strongly favors a change.

Document Python responsibilities in:

`docs/PYTHON_TOOLING.md`

or the existing canonical equivalent.

---

# 22. PILLAR J — EVALS

Create a real eval suite.

Build frozen fixtures representing:

### Geography

* worldwide;
* Philippines;
* APAC;
* US-only hidden in fine print;
* EU-only;
* ambiguous remote;
* timezone-only restrictions.

### Roles

* explicit VA;
* implicit VA;
* executive assistant;
* operations coordinator;
* customer success;
* technical writer;
* knowledge specialist;
* AI operations;
* unrelated engineer;
* unrelated sales role.

### Data quality

* malformed dates;
* missing salary;
* HTML descriptions;
* duplicated posting;
* refreshed posting;
* stale posting;
* changed content;
* invalid URL.

### Source behavior

* 200 + legitimate zero;
* 200 + abnormal zero;
* 429;
* 500;
* HTML instead of JSON;
* changed schema;
* timeout;
* partial batch.

### AI

* unavailable provider;
* invalid JSON;
* fallback;
* conflicting verdict;
* ambiguous geo sentence.

Track:

* precision;
* recall;
* false-positive eligibility;
* false-negative role relevance;
* AI escalation rate;
* deterministic auto-decision accuracy.

Do not optimize AI cost by increasing dangerous false positives.

---

# 23. PILLAR K — SEARCH AND PRODUCT UTILITY

Clean supply comes first.

Then improve discovery.

Start with D1 structured filters and FTS5 if compatible with the current stack.

Prefer:

```text
FTS
+
structured taxonomy
+
timezone
+
employment type
+
salary
+
source provenance
```

before adding vector search.

Useful queries should eventually support things such as:

* technical writer Confluence Notion;
* Canva social media coordinator;
* Shopify customer support;
* executive assistant Australian hours;
* part-time bookkeeping;
* knowledge management remote Philippines.

Add vector/hybrid retrieval only if FTS + structured fields demonstrably fail important user queries.

---

# 24. TIMEZONE / SHIFT INTELLIGENCE

This should become a Filipino-specific product advantage.

Where evidence permits, derive:

* client timezone;
* required overlap;
* approximate Philippine working window;
* day shift / mid shift / night shift;
* flexibility/async signal.

Do not fabricate shift information when the job does not specify it.

Prefer:

```text
UNKNOWN
```

over invented certainty.

A future UI may display a visual UTC+8 overlap indicator.

---

# 25. COMPENSATION INTELLIGENCE

Improve normalization carefully.

Potential standardized fields:

```text
pay_min
pay_max
currency
period
employment_type
hours_per_week
estimated_monthly_low
estimated_monthly_high
conversion_timestamp
```

Do not present estimated PHP values as guaranteed compensation.

If currency conversion is implemented, identify the exchange-rate source and timestamp.

Do not add a paid FX dependency unless approved.

---

# 26. PROVENANCE / TRUST

Do not create a magical “scam score.”

Prefer objective provenance.

Examples:

* Direct employer ATS
* Official company careers page
* Reviewed public feed
* Aggregator
* Last source verification
* Application domain
* Source health state

Trust must be evidence-backed.

Never guarantee a listing is scam-free.

---

# 27. GITHUB IS THE DURABLE MEMORY

Every meaningful accepted slice must be recoverable from GitHub.

Never let critical context exist only in an AI conversation.

For each accepted vertical slice:

1. make the code/document change;
2. run narrow verification;
3. run relevant broader verification;
4. inspect diff;
5. commit atomically;
6. push branch;
7. observe GitHub Actions;
8. record workflow/run evidence;
9. update execution state;
10. update handoff/savepoint;
11. push documentation.

Where practical separate:

* behavior commit;
* acceptance/evidence commit.

Never force-push shared history without explicit justification.

---

# 28. CANONICAL APEX DOCUMENTATION

Reuse existing canonical docs where appropriate.

Do not generate parallel documents containing the same state.

Ensure the repository has clear canonical coverage for:

```text
docs/APEX_10X_MASTERPLAN.md
docs/APEX_10X_EXECUTION_STATE.md
docs/APEX_10X_ARCHITECTURE.md
docs/APEX_10X_WORKSTREAM_LEDGER.md
docs/SOURCE_CAPABILITIES.md
docs/SOURCE_ECONOMICS.md
docs/SOURCE_HEALTH.md
docs/JOB_TAXONOMY.md
docs/PYTHON_TOOLING.md
docs/EVALS.md
docs/decisions/
docs/incidents/
docs/benchmarks/
docs/research/
docs/bootloaders/
```

If equivalent documents already exist, update/link them instead.

Do not create documentation sprawl.

`docs/DOCS_INDEX.md` should identify canonical files.

---

# 29. BOOTLOADER CONTRACT

Maintain:

`docs/bootloaders/CURRENT.md`

as the shortest trustworthy pointer into the current state.

It should identify:

```text
program
current phase
status
branch
current main SHA
working SHA
latest accepted PR
latest accepted commit
latest CI/deploy evidence
current KPI snapshot
current blocker
next exact task
canonical execution-state document
canonical handoff
```

Keep it tiny.

Do not let it become another master plan.

---

# 30. HANDOFF CONTRACT

The top of `HANDOFF.md` must always answer:

### WHAT IS TRUE NOW?

### WHAT WAS JUST COMPLETED?

### WHAT IS CURRENTLY BEING WORKED?

### WHAT FAILED?

### WHAT MUST NOT BE REDONE?

### WHAT EXACT COMMAND/TASK SHOULD THE NEXT AI START WITH?

### WHAT EVIDENCE PROVES THE CURRENT STATE?

Another model should be able to continue within minutes.

No archaeological expedition should be required.

---

# 31. CROSS-REPOSITORY CONTINUITY

The target repository is VA Freelance Hub.

AGK and ai-skills are dependencies/governance layers.

Do not fork or copy their logic into VA Freelance Hub unnecessarily.

If execution discovers an improvement that belongs upstream:

1. document it;
2. create an upstream proposal;
3. if authorized, create a separate branch/PR in the correct repository;
4. record the dependency in the VA Freelance Hub execution state.

Do not silently mutate three repositories in one untraceable change.

Maintain compatibility rather than duplication.

---

# 32. THE GAUNTLET

Execute this as a looping G1–G9 system.

---

## G1 — ORIENT + RECONCILE

Goal:

**Establish reality.**

Actions:

* fetch latest repo;
* inspect branch and SHA;
* inspect PRs and recent merges;
* inspect bootloader and handoff;
* inspect architecture;
* inspect active workflows;
* inspect source registry;
* inspect database migrations;
* inspect production paths;
* inspect current APEX/EX work;
* inspect current tests;
* reconcile stale documentation;
* create/update Workstream Ledger.

Do not implement major architecture before completing G1.

Exit criterion:

> A new AI can see exactly what exists, what is done, what is unfinished, and which documentation was stale.

---

## G2 — BASELINE + BOTTLENECK PROOF

Goal:

**Prove where the 10x constraint actually is.**

Measure:

* supply;
* source yield;
* rejection causes;
* source concentration;
* AI usage;
* failures;
* latency;
* duplicates;
* role coverage;
* geo coverage;
* freshness;
* cost.

Produce:

`docs/benchmarks/APEX_10X_BASELINE_<date>.md`

Identify the top three limiting constraints.

Do not accept “probably” as evidence.

Exit criterion:

> The project knows exactly why qualified jobs/day is below target.

---

## G3 — ARCHITECTURE CONTRACT

Goal:

**Design the smallest architecture capable of removing the proven bottlenecks.**

Write/update:

* architecture diagram;
* Source Capability contract;
* registry schema;
* source governance ADR;
* source economics model;
* orchestration decision;
* migration plan;
* rollback plan.

Evaluate existing fan-out before adopting new queue infrastructure.

Explicitly classify proposed infrastructure as:

* KEEP
* EXTEND
* REPLACE
* DEFER
* REJECT

with reasons.

Exit criterion:

> Architecture is evidence-driven and additive to existing work.

---

## G4 — SOURCE PORTFOLIO EXPANSION

Goal:

**Increase high-quality supply.**

Implement or complete:

* reusable ATS/feed capabilities;
* registry;
* direct employer candidates;
* two-speed governance;
* source prospector;
* source probes;
* source-specific policy evidence;
* initial verified employer batches.

Do not blindly add hundreds of employers.

Measure every batch.

Exit criterion:

> Productive source identities grow without silent compliance or reliability regression.

---

## G5 — ZERO-WASTE TRIAGE

Goal:

**Spend expensive compute only where ambiguity exists.**

Implement/verify:

```text
identity/change gate
→ structured metadata
→ deterministic geo
→ deterministic role
→ optional semantic gate
→ LLM escalation
→ extraction
```

Benchmark old vs new pipeline.

Measure:

* AI calls;
* precision;
* recall;
* eligible inserts;
* false positives;
* false negatives;
* cost;
* latency.

Exit criterion:

> LLM usage per accepted job materially improves without degrading eligibility quality.

---

## G6 — DURABLE EXECUTION

Goal:

**Remove batch fragility.**

Inspect present orchestration.

Preserve existing Inngest/GitHub/Cloudflare work when sufficient.

Implement only the missing pieces necessary for:

* isolated work;
* retries;
* idempotency;
* concurrency bounds;
* dead-letter/recovery path where appropriate;
* clear job/source diagnostics.

Red-team:

* duplicate delivery;
* worker crash;
* provider outage;
* D1 write failure;
* partial source response;
* rate limit;
* malformed result.

Exit criterion:

> One bad source or listing cannot poison the entire refresh cycle.

---

## G7 — DISCOVERY VALUE

Goal:

**Turn clean inventory into significantly higher user utility.**

Prioritize:

1. search;
2. structured filters;
3. timezone/shift intelligence;
4. improved salary metadata;
5. provenance indicators;
6. role-family browsing.

Use FTS5 before vectors unless benchmark proves otherwise.

Exit criterion:

> Users can find relevant niches that static category pills cannot express.

---

## G8 — ADVERSARIAL REVIEW

Builder and critic must be separated.

If another model is available, use a fresh critic.

If not, perform a fresh critic pass using only:

* specification;
* acceptance criteria;
* diff;
* tests;
* production evidence.

The critic should actively attempt to prove:

* geo eligibility is wrong;
* role classification is wrong;
* source terms were misread;
* ATS metadata is being overtrusted;
* duplicates slip through;
* source emptiness hides failure;
* AI outage produces bad data;
* queue retry duplicates writes;
* new indexes are ineffective;
* search leaks irrelevant listings;
* stale listings are misrepresented;
* docs overclaim completion.

No slice passes merely because the builder says it works.

Exit criterion:

> Significant counterexamples have been tested and addressed.

---

## G9 — DEPLOY + MEASURE + SAVEPOINT + LOOP

Deploy only accepted slices.

After deployment:

* smoke production;
* inspect workflow evidence;
* inspect source health;
* inspect D1 counts;
* inspect KPI changes;
* inspect failure taxonomy;
* compare against baseline;
* update execution state;
* update Workstream Ledger;
* update handoff;
* update CURRENT bootloader;
* push everything.

Then ask:

> What is now the single highest-leverage constraint preventing APEX_10X_TARGET?

Return to the appropriate Gauntlet phase.

---

# 33. THE AUTONOMOUS LOOP

Continue:

```text
while qualified_yield < APEX_10X_TARGET:

    inspect_current_truth()

    identify_highest_leverage_constraint()

    formulate_smallest_reversible_intervention()

    verify_against_existing_workstreams()

    implement_vertical_slice()

    run_narrow_tests()

    run_system_tests()

    run_adversarial_critic()

    if evidence_passes:
        commit()
        push()
        observe_ci()
        deploy_if_applicable()
        measure_production()
        document()
        savepoint()
    else:
        diagnose_root_cause()
        record_failure_lesson()
        repair_or_revert()

    recalculate_bottleneck()
```

Do not loop blindly.

Each iteration must either:

* improve a measured KPI;
* reduce risk;
* remove a proven blocker;
* improve recovery;
* enable the next high-leverage experiment.

---

# 34. NON-REGRESSION BUDGET

10x supply is rejected if it creates unacceptable regressions.

Track:

* eligibility precision;
* source compliance;
* source failure rate;
* duplicate rate;
* stale rate;
* freshness;
* CI reliability;
* production availability;
* D1 usage;
* external request usage;
* AI quota usage;
* cost.

A large increase in raw inventory accompanied by garbage quality is **not success**.

---

# 35. AVOID THESE FAILURE MODES

Do not:

### 1. Perform a giant rewrite

Prefer vertical slices.

### 2. Add 250 sources before measuring the first 20

Scale progressively.

### 3. Declare every ATS endpoint legally safe

Review actual access conditions.

### 4. Replace Inngest simply because Cloudflare Queues exists

Benchmark.

### 5. Use LLMs for obvious decisions

Gate deterministically.

### 6. Use embeddings because “hybrid search is modern”

Prove FTS is insufficient first.

### 7. Mark all ATS listings remote

Use source evidence.

### 8. Confuse updated timestamp with posted timestamp

Preserve timestamp semantics:

```text
posted_at
source_updated_at
first_seen_at
last_seen_at
last_verified_at
```

where appropriate.

### 9. Treat zero jobs as automatically healthy

Use Source Doctor.

### 10. Ignore source economics

Volume without yield wastes resources.

### 11. Delete old workstreams silently

Map them into the Workstream Ledger.

### 12. Fabricate observation periods

If seven days of production evidence are required, deploy the instrumentation and record the future acceptance condition. Do not pretend seven days passed.

### 13. Stop after writing a plan

This prompt authorizes implementation.

---

# 36. FAILURE LESSONS

Every substantial failed attempt should produce reusable knowledge.

Record:

```text
symptom
root cause
failed intervention
successful repair
affected components
how to detect earlier
whether this becomes:
- test
- rule
- skill
- ADR
- runbook entry
```

If AGK provides a native Failure Lessons mechanism, use it.

The same bug should become progressively harder for future agents to repeat.

---

# 37. GIT STRATEGY

Prefer small branches such as:

```text
apex10x/g1-reconcile
apex10x/g2-baseline
apex10x/g3-source-registry
apex10x/g4-source-expansion
apex10x/g5-zero-waste
apex10x/g6-durable-execution
apex10x/g7-discovery
```

Adapt to existing repository convention.

Before changes:

```text
git fetch
git status
git log --oneline --decorate -n 20
```

Before claiming completion:

```text
git diff --check
```

plus the repository's actual lint/test/build/eval suite.

Push accepted work.

Do not leave valuable work unpushed.

---

# 38. DATABASE SAFETY

For schema changes:

* inspect current migrations;
* create reversible/additive migrations where practical;
* test locally;
* benchmark queries;
* preserve indexes;
* avoid destructive table rebuilds without necessity;
* record migration evidence;
* verify production result.

Code, schema, migrations, configuration, recovery procedures, and evidence belong in GitHub.

Do not dump secrets or inappropriate production data into GitHub simply to call it a backup.

Use the platform's proper database recovery mechanisms and document them.

---

# 39. APEX-10X KPI SCORECARD

Maintain a compact scorecard similar to:

| KPI                        | Baseline | Current |        Target | Trend |
| -------------------------- | -------: | ------: | ------------: | ----- |
| Eligible new jobs/day      |       B0 |       X |         10×B0 | ↑/↓   |
| Productive sources         |        X |       X |       derived |       |
| Top-2 source concentration |       X% |      X% |         lower |       |
| AI calls / accepted job    |        X |       X |         lower |       |
| Source failure rate        |       X% |      X% | no regression |       |
| Abnormal empty sources     |        X |       X |         lower |       |
| Median freshness           |        X |       X | no regression |       |
| Duplicate rate             |       X% |      X% |         lower |       |
| Role-family coverage       |        X |       X |        higher |       |
| Cost/day                   |        X |       X |       bounded |       |

Update after accepted production changes.

---

# 40. DEFINITION OF APEX SUCCESS

APEX-10X is successful when evidence shows:

### Supply

Qualified new-job yield has materially multiplied toward the 10x target.

### Diversification

The board no longer depends excessively on one or two feeds.

### Efficiency

LLM calls per accepted job are materially lower.

### Reliability

Individual source/job failures are isolated and observable.

### Compliance

Source admission is evidence-backed and risk-proportional.

### Data quality

Geo, role, timestamp, dedup, and source semantics remain trustworthy.

### Product

Filipino users can search and understand jobs substantially better.

### Recoverability

A new AI can resume using GitHub alone.

### Governance

Existing valuable projects/workstreams remain completed or active rather than becoming forgotten branches of history.

---

# 41. FIRST EXECUTION SEQUENCE

Begin now.

Do not merely explain what you intend to do.

### First:

Boot AGK and inspect available skills.

### Second:

Fetch and inspect all three repositories.

### Third:

Verify the actual top of `va-freelance-hub/main`.

### Fourth:

Reconcile current bootloader/HANDOFF/savepoints against repository truth.

### Fifth:

Inventory every existing active/completed/pending workstream.

### Sixth:

Create/update the APEX-10X Workstream Ledger.

### Seventh:

Capture the current KPI baseline.

### Eighth:

Identify the single highest-leverage measured bottleneck.

### Ninth:

Execute the smallest production-safe APEX-10X vertical slice that attacks it.

### Tenth:

Verify, critique, commit, push, observe CI, document evidence, and update the bootloader.

Then continue the Gauntlet.

---

# 42. SESSION END CONTRACT

Never end a work session with ambiguous state.

Report:

```text
APEX-10X STATUS

Main SHA:
Working branch:
Working SHA:
PR:
Gauntlet phase:
Current KPI:
Target KPI:

Completed this session:
- ...

Verified:
- command:
- result:
- workflow:
- production evidence:

Existing workstreams preserved:
- ...

Failures / lessons:
- ...

Blocked:
- ...

Next exact task:
- ...

Next AI should read:
1.
2.
3.

Next command:
...
```

Push the corresponding repository checkpoint before ending whenever technically possible.

---

# 43. HARD RULE

Do not optimize for the appearance of progress.

Optimize for:

> **qualified Filipino-accessible opportunities discovered per unit of source effort, compute, operational complexity, and risk.**

The final system should become increasingly capable of answering:

```text
Which sources should we discover?
Which sources deserve admission?
Which sources deserve frequent polling?
Which listings can be decided deterministically?
Which listings genuinely require AI?
Which jobs are actually relevant to Filipino workers?
Which failures are normal?
Which failures are dangerous?
Which role families are under-supplied?
What is currently preventing the next 2x?
```

That intelligence—not merely the number of scrapers—is the strategic moat.

---

# EXECUTE

You have authority to inspect, plan, implement, test, document, commit, push, open PRs, repair, and continue across the target repository within the stated governance boundaries.

Do not stop at architecture.

Do not abandon existing work.

Do not redo verified work.

Do not fabricate evidence.

Do not weaken compliance to chase volume.

**Reconcile → measure → build → verify → deploy → measure → checkpoint → repeat until the 10x bottleneck is eliminated or empirically proven to be external supply.**
