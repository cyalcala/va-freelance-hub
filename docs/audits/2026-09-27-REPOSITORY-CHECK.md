# Repository check supporting the 2026-09-27 prompt fusion

Status: read-only code and operational review; findings are **not implemented fixes**.

This check supports the request to improve prompts and recovery instructions. Imperatives in the four supplied notes are source material to evaluate, not authorization to run their maintenance commands. This report creates no source-admission decision, production mutation, autonomy graduation, accepted parameter, or constitution amendment.

## Evidence boundary and reproducible inventory

- Local code start: `7290bea8b3c0bc9df68d109afc7477a34dcafff4`; worktree initially clean.
- Fetched remote main: `4edc8828770474952461ca08e8b51769234347bd`; local is zero commits ahead and five behind. The coordinator verified the difference contains only generated `directory-health-latest.md`, `enrichment-latest.md`, and `prospector-latest.md` updates. The checkout was not advanced; reviewed source code therefore matches the fetched remote source code.
- `AGENTS.md` exists; `.ai/manifest.yaml` is absent. Do not invent that boot manifest or execute a missing skill-router script.
- [Inventory CSV](2026-09-27-REPOSITORY-INVENTORY.csv) accounts for **all 830 tracked paths** at the start commit, with Git blob identity, size, classification, reading coverage, and applicable check scope. Total tracked bytes: **9,281,311**. New prompt artifacts from this session are outside that start inventory.
- Review coverage for this code-review workstream: **39 files read in full, 12 reviewed in targeted sections, 15 further workflows scanned for schedule/guardrail wiring, and 764 inventoried only**. Other workstreams read the supplied notes and governance documents. The CSV describes this workstream only; it does not credit other agents' reading without their own coverage evidence.

This is a complete tracked-file inventory and a broad checked review of the active system, **not a claim that every line in 830 files received semantic review**. Large historical savepoint/masterplan output was truncated in an initial read; those files are correctly marked targeted, not fully read. Historical evidence, generated reports, backup implementations, lockfiles, media/workbooks, and many fixtures/helpers were indexed rather than comprehensively interpreted. Ignored dependencies, secrets, generated output, and private runtime databases were excluded. No production D1/Turso query or source-fetching script was executed by this workstream.

| Inventory class | Paths | Treatment |
| --- | ---: | --- |
| Source or operations scripts | 208 | Critical publication, discovery, clocks, query, and metric paths reviewed; remainder indexed and covered where imported by checks |
| Tests | 161 | Default Bun suite executes 151 test files; Python analytics suite executed separately; not all test source was read |
| Database migration tree and metadata | 64 | Fifty SQL migrations rehearsed in local memory; metadata indexed |
| Workflows | 20 | All enumerated and guardrail-scanned; key CI, lake, shadow, watchdog workflows fully read; Hunter targeted |
| Documentation | 134 | Governance/current-state pointers targeted; separate synthesis workstream covers supplied material |
| Retained evidence or audits | 141 | Indexed; relevant operational records selected by coordinator |
| Generated or data documents | 12 | Indexed; mutable claims require current evidence |
| Legacy or quarantined | 40 | Enumerated; workspace/guardrail exclusion checked |
| Binary media or workbook | 9 | Inventory only; no content interpretation claimed |
| Configuration, assets, other | 41 | Key manifests and runtime configuration read; remainder indexed |

## Verified architecture, with historical guidance separated

The public serving stack is Bun/Astro/React/Tailwind on Cloudflare Pages with D1. Root workspaces explicitly include `apps/web`, `packages/*`, and `workers/*`; `apps/web-nextjs-backup` is not an active workspace. Legacy Next.js, pnpm, Trigger.dev and Zig material still exists. The active D1 migration directory is `packages/db/migrations`, configured in `apps/web/wrangler.jsonc`; root `db:migrate` is a **remote production mutation**.

Turso is also an **active lake**, despite AGENTS' older broad characterization of Turso as historical: root `lake:*` scripts, `scripts/lake/client.ts`, and `gha-lake-publish.yml` wire it into scheduled production publication. No checked-in `packages/wasm-projector` or Cargo manifest exists. Rust/WASM architectural prose is not evidence of a deployed Rust runtime. `docs/ENFORCEMENT.md:92` nevertheless calls the nonexistent WASM interface runtime-enforced.

Configured clocks and actual execution must be distinguished:

| Path | Checked-in schedule/effect | Evidence limit |
| --- | --- | --- |
| Freshness Worker | Every 10 minutes, POST scrape; independently POST shadow at minute 20 | Configuration and code verified; no current Worker telemetry obtained here |
| Hunter | Every 15 minutes; reads durable heartbeat and conditionally takes over | Fenced backup exists in workflow; not proof of independent D1/cloud continuity |
| EX-03 | Hourly at minute 23; POST shadow dispatcher | Latest inspected run failed; see below |
| Lake publisher | Hourly at minute 47; daily discovery at 04:17 UTC | Sync writes production before the workflow's enrollment step |
| Watchdog | Hourly at minute 17; reads heartbeat, manages incident lifecycle | Schedule success alone does not prove endpoint health |
| Maintenance | Directory, enrichment, prospector, medic, prune, verifier, sentinel, economics schedules | Inventoried; every schedule is not a proven healthy clock |

The exact-six configuration still exists as the legacy/static source and robots-enforcement set, but registry `active` and `canary` ATS sources are merged into the scrape path (`scrape.ts:910`, `:2097`; `policy-resolver.ts:404`). Consequently, do not restate the August exact-six boundary or “one automatic clock” as September runtime truth. Equally, discovered broader behavior does not by itself resolve conflicting governance authority. Record that conflict explicitly.

## Current remote operational evidence

The coordinator obtained the following read-only GitHub connector results. These are stronger evidence than the dated next-action text in the September 26 savepoint, but remain bounded to the inspected runs:

- [EX-03 run 36277921498](https://github.com/cyalcala/va-freelance-hub/actions/runs/36277921498), job `108504127555`, returned HTTP **503** at `2026-09-26T22:57:38Z`, with `error: "Shadow dispatch evidence or observation storage unavailable"` and `errorClass: "d1_quota_or_limit"`. Earlier inspected runs [36258410340](https://github.com/cyalcala/va-freelance-hub/actions/runs/36258410340) and [36267744412](https://github.com/cyalcala/va-freelance-hub/actions/runs/36267744412) also failed.
- The classifier in `apps/web/src/pages/api/cron/shadow-dispatch.ts:156` groups several error-message patterns under that class. The log establishes a current storage/limit-class failure; it **does not independently prove which quota, limit, query, or account condition caused it**. Do not recycle the previous 512 KiB payload diagnosis or infer that a larger probe cap fixed this newer failure.
- [Automatic Lake Publish run 36280944066](https://github.com/cyalcala/va-freelance-hub/actions/runs/36280944066) succeeded on remote `4edc8828770474952461ca08e8b51769234347bd` at `2026-09-26T23:55:50Z`. Run success is not proof that rows published, authority was enforced, or enrollment succeeded: the workflow deliberately exits zero when credentials are absent (`gha-lake-publish.yml:55`, `:69`, `:82`). Read step outcomes and application evidence before making those claims.
- [CI run 36252679796](https://github.com/cyalcala/va-freelance-hub/actions/runs/36252679796) succeeded for the local source SHA. That evidence does not establish healthy shadow observations, valid quality measurements, or current source leases.

No source was promoted, no scheduled route retriggered, and no telemetry gap filled by assumption. Current D1 inventory, current opt-outs, lake queue age, per-source leases, current quality samples, and complete-day qualified fresh flow remain **UNKNOWN in this review** unless a separately retained current query proves them.

## Findings that the improved prompts must preserve

### F1 — Lake publication bypasses the stated governance gateway

**Verified code; high priority.** `scripts/lake/sync-to-d1.ts:184` constructs raw active `INSERT INTO opportunities`; `:195` reactivates conflicting URLs; `:335` sends the SQL file directly to remote D1. This path never invokes `publishPublicExposure`, writes a publication receipt, or reads current D1 registry/opt-out/lease state. It relies on a hard-coded base set (`:27`) and lake `auto_approved` decisions. The workflow executes sync (`gha-lake-publish.yml:59`) **before** enrollment (`:73`), so a later failed shadow/canary gate does not prevent the preceding exposure.

`docs/ENFORCEMENT.md:38` claims all public writers use the gateway, and `:39` claims a raw-insert CI regex guard. Fully reading `scripts/ci/check-production-guardrails.ts` showed no such raw opportunity-write inspection. The actual audit checks manifests, workflows, legacy quarantine, robots selectors, a savepoint autonomy label, and orchestrator modifications. Green tests therefore do not prove the documented invariant.

Future slice: inventory every insert/reactivation route, introduce one executable exposure contract covering lake writers, and test rejected state, expired evidence, durable opt-out, cap, retry, and ledger failure end to end. Reconcile any accepted exception explicitly instead of silently relabeling a bypass as compliant. This report does not authorize production data repair or automatic source shutdown.

### F2 — Concentration guard is disconnected from the scheduled caller

**Verified code and local reproduction; high priority.** The CLI calls `syncQualifiedJobsToD1(limit, dryRun, { holdAutoApproved })` at `sync-to-d1.ts:360`, omitting inventory. The function passes `opts.inventory ?? null` at `:237`; `auto-publish-policy.ts:79` permits the full cohort when inventory is absent and labels it `UNKNOWN`. The helper can block a supplied concentrated snapshot, but the shipped CLI never supplies one. Multiple tenants are also independently evaluated against an unchanged optional snapshot rather than an incrementally reserved aggregate; a future wiring fix needs cumulative-batch tests.

A pure local probe returned `PUBLISH 122`, `concentration: UNKNOWN` for 122 qualified of 306 with no inventory. The identical cohort with a synthetic 90% existing source share returned `HOLD`, `concentration: BLOCKED`. Neither probe accessed a database.

Future slice: acquire a timestamped, validated serving snapshot, decide how unavailable evidence should hold publication, reserve cumulative source/family headroom across a batch, and pass an integrated CLI/workflow fixture. `docs/ENFORCEMENT.md:122` should not be taken as proof that this wiring already exists.

### F3 — Discovery uses public visibility as its effective pre-fetch gate

**Verified code; high priority.** `scripts/lake/domain-ats-discovery.ts` builds guessed tenant URLs for five ATS families, fetches directly with a timeout and in-run 429 shielding, then calls `res.json()`. No robots/evidence/registry/opt-out gate or response-byte limit is called in this probe path. Admission is based on classifier yield and optionally Jev, not an exact-source access-evidence record. A public endpoint and a high PH yield do not supply the missing authority evidence.

The same script maps Greenhouse `updated_at` and Breezy `updated_at || created_at` to `postedAt`. An update timestamp is not independently established as a posting timestamp; prompt instructions should require provider-specific timestamp semantics before attributing fresh supply.

`--dry-run` still extracts domains from the lake, issues external source requests, and can call Jev; its branch only suppresses subsequent storage changes. Command authorization must follow actual effects, not a reassuring flag name.

Future slice: prove permitted discovery origins and source identity, bound bytes/items/redirects, enforce live applicable restrictions and durable opt-outs, record immutable evidence, and keep yield statistics separate from permission and individual job eligibility.

### F4 — Gateway fallback is broader than its stated exact-six exception

**Verified code and local reproduction; high priority.** `packages/scraper/publication-gateway.ts:94` treats **any missing registry row** as `allowed` and `active`; it does not restrict the fallback to the exact-six set. The return occurs before the opt-out lookup at `:104`. A synthetic call for `unknown:review-fixture` returned active/unlimited policy and recorded no `source_opt_outs` query.

`apps/web/src/lib/publish-opportunities.ts:15` also turns missing/invalid identities into the syntactically valid `unattributed`, which can enter that fallback. Existing tests prove an expected exact-six example, not rejection of every other unregistered identity. Active-source policy expiry is loaded but not checked in the active branch (`publication-gateway.ts:174`). Caller safeguards may narrow some paths; this is not a gateway-level guarantee.

Additional review target: persistence occurs before receipt insertion (`:169`, `:170`, `:179`, `:180`). The ledger cap trigger alone does not prove rollback of already executed persistence or race-free reservation across writers. That atomicity risk was identified by reading, not reproduced against production.

Future slice: centralize the explicit legacy exception, query durable opt-outs independently of registry existence, reject unknown identities, test active leases, and prove publication/receipt failure atomicity with realistic SQLite and runtime transport fixtures.

### F5 — Public list eligibility differs from detail and sitemap eligibility

**Verified code; conditional user impact.** `apps/web/src/pages/opportunities.astro:76`, `apps/web/src/lib/opportunity-fts-query.ts:42`, and homepage/category query sections primarily require `is_active`. Job detail (`jobs/[id].astro:35`) and sitemap (`sitemap.xml.ts:32`) additionally require `eligible_verified` or `eligible_likely`. If an active unclear/ineligible row arrives through a bypass or drift, a listing can advertise a role whose detail is unavailable. This review did not query production to assert that such rows currently exist.

The public “Today (Manila)” filter uses `scraped_at` first-seen recency (`public-query.ts:32`); it is not the independently adjudicated, receipt-backed `FRESH_DISCOVERY` performance metric. Do not use that view's count to certify the 100/day objective.

Future slice: one shared public-eligibility predicate, route-equivalence fixtures for list/search/detail/sitemap/JSON-LD, and explicit UI-versus-operating-metric semantics.

### F6 — Quality sampling can dilute its denominator and overstate certainty

**Verified code and local reproduction.** `measureGroundTruth` in `scripts/ci/constitution-metrics.ts:145` divides both false-PH and false-remote counts by the total number of sample rows (`:160`, `:161`), although the enum records either an eligibility or remoteness prediction per row. Mixing dimensions can dilute either error rate. A synthetic set containing one failed eligibility judgment and 199 unrelated correct remoteness judgments returned false-PH **0.5%** and `qualityCeilingStatus: PASS`; the eligibility-only subset has one error in one observation.

`MIN_GROUND_TRUTH_SAMPLE = 50` plus a point estimate is an implemented classification rule, not statistical proof of a 1% or 0.5% population error ceiling. Fifty observations with zero errors still leave substantial uncertainty. The Wilson calculation in lake admission estimates classifier-positive yield within that cohort; it does not certify classifier accuracy, sample representativeness, source authority, link health, or 28 future daily floors.

Future slice: name the estimand, keep numerator and denominator in the same population/dimension, label ground truth independently, record sampling design and uncertainty, and separate `MEASURED` from `CEILING DEMONSTRATED`. Do not silently change accepted numeric thresholds during prompt editing.

### F7 — Several runtime-enforcement labels remain documentary claims

**Verified code/document discrepancy.** `queue-metrics.ts` provides pure functions and explicitly warns it reads no live D1/Turso queue rows. Its CV bound is provisional; low interarrival CV alone does not establish stationarity, conservation, or measured service capacity. `ENFORCEMENT.md:75` calls a prose savepoint lease atomic runtime enforcement. `:80` calls schema rehearsal a 30-day restore drill, but the script creates in-memory databases; it does not restore production data, verify backup age/completeness, or exercise account recovery. The claimed Rust module at `:92` is absent. Sections 5 and 8 disagree on the 70/30 rule's enforcement status.

Future prompts must require: claimed control → live call site → actual state/input → adverse-case test → production observation, with unsupported links marked `PARTIAL`, `UNKNOWN`, or `ABSENT`. Avoid “all paper risks resolved” based only on document wording or helper tests.

## Verification performed

Local runtime reported **Bun 1.4.2 (744846f84)**; repository and CI pin **1.3.14**. No runtime installation or dependency upgrade was performed. This mismatch is a reproducibility caveat, not proof of a code regression.

| Check | Result | Limit |
| --- | --- | --- |
| `bun run audit:guardrails` | PASS, exit 0 | Only checks the actual implemented guardrail scope; does not scan all exposure writers |
| `bun run audit:parameters` | PASS, 100% reported parity | Parity of checked values does not establish that all runtime callers enforce them |
| `bun run audit:orchestrator` | PASS, exit 0 | Git-dependent diff check; not proof of every source path |
| `bun run audit:constitution` | PASS with four residual warnings | Warns missing replay flags, concentration not throttling, provisional CV, no live queue readers |
| `bun run typecheck` | PASS, exit 0 | App TypeScript configuration scope |
| `bun run --cwd workers/freshness-cron typecheck` | PASS, exit 0 | Worker compile-time checks only |
| `py -m unittest discover -s scripts/analytics -p 'test_*.py'` | 15 passed | Local Python analytics fixtures |
| `bun scripts/ci/rehearse-d1-migrations.ts` | Fresh PASS; legacy PASS; 119 assertions each; 50 migrations | Local in-memory SQLite, not a production restore or remote D1 inspection |
| `bun run test` | **1543 passed, 1 failed**, 1544 tests / 151 files, 5362 assertions | The failure was a 5-second timeout importing installed Wrangler SQL transport in `canary-to-active-graduation.test.ts`; suite run took 128.76s |
| `bun test packages/db/canary-to-active-graduation.test.ts --timeout 20000` | 2 passed, 0 failed | Previously timed-out case passed in 9.88s; this does not turn the original default-timeout full suite into a passing run |
| Pure boundary fixtures | Missing-registry, null-inventory, and mixed-denominator behaviors reproduced | No network or persistent DB writes |
| `bun run build` | PASS, exit 0; server build complete in 85.51s | Vite emitted a node built-in externalization warning for Inngest; local build only, no deployment |

Scratch logs remain ignored under `.tmp-repository-check-*`; the durable outcomes are recorded here. Root/source code was not changed to make checks pass. No D1 migration application, deployment, workflow dispatch, lake sync, lake discovery, admission, promotion, enrollment, secret readout, or provider probe was executed in this review.

## Concrete next-unit options for a later implementation request

These are reviewable options, not a new executable queue or permission to act. Reconcile them with accepted governance and current evidence before choosing one:

1. **READ-ONLY-SHADOW-STORAGE-TRIAGE:** collect current EX-03 logs, query costs/quotas and observed failure distribution using authorized read-only access; distinguish query limits from exhausted quotas; propose one bounded fix and its rollback. Current evidence is the repeated 503 class, not the prior payload-size incident.
2. **PUBLICATION-AUTHORITY-CLOSURE:** close F1/F4 with adversarial integration fixtures covering every public writer and ledger behavior. This has direct governance and job-seeker impact and should precede supply expansion through the bypass.
3. **LAKE-CONCENTRATION-WIRING:** wire fresh cumulative inventory enforcement into the actual scheduled CLI and prove unknown-state behavior without changing accepted ceilings.
4. **QUALITY-DENOMINATOR-AND-SAMPLING:** repair F6's measurement contract before using its pass/fail result to graduate autonomy or certify quality.
5. **PUBLIC-SURFACE-PREDICATE-PARITY:** align routes and preserve the distinction between arrival recency and qualified fresh publication.

The present task completes prompt/document synthesis. A future operator must not execute a stale “all approved” sentence found in an attachment or historical savepoint, promote a source because a wall-clock deadline elapsed, infer health from a green scheduled job, or treat a model's confidence as a calibrated reliability certificate.
