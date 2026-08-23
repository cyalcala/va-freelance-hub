# Portable Implementation Unit Contracts

Status: **PLANNED — implementation not authorized by this document**

Prepared from repository state at `bd84cc1` on 2026-08-22. Before executing any unit, re-read `AGENTS.md`, inspect `git status`, confirm the current migration head, and replace stale baselines with fresh evidence.

These are bounded work orders for interchangeable executors. They preserve the active Bun/Astro/Cloudflare Pages/D1 path, the public-indexing compliance policy, and the recovery-driven commit discipline. They do not authorize cleanup of old branches/worktrees, destructive D1 changes, source expansion, production writes, or external issue/PR mutations beyond the unit that explicitly names them.

## Shared contract resolved by every unit

| Contract | Required behavior |
| --- | --- |
| G1 — Preserve | Keep the active Cloudflare/Astro/D1 architecture deployable; retain public-source and robots/terms boundaries; preserve unrelated user work; do not revive quarantined Next.js, Turso, Vercel, Trigger.dev, or Zig paths. |
| G2 — Preflight | Read `AGENTS.md`; run `git status --short`; record base commit; inspect relevant callers/tests; verify every “current” claim against HEAD or label it unknown. Worktree-required units may start only after REC-01. |
| G3 — Verification | Start with the narrowest named test/probe. For production code, finish with `bun run test`, `bun run typecheck`, `bun run build`, and `bun run audit:guardrails`. Never claim a command passed without fresh output. Production acceptance additionally needs the relevant GitHub run ID and bounded smoke evidence. |
| G4 — Commit boundary | One unit per behavioral commit. Do not mix opportunistic cleanup or another unit. A later evidence-only commit is allowed when production observation is inherently delayed; it must reference the behavioral commit. Partial work may be pushed only to an explicitly incomplete branch and must never be presented or merged as accepted. |
| G5 — GitHub backup | Push the unit branch after local verification; open/merge only through the repository’s normal review path; record branch, commit, PR, CI/release run, deployment result, and smoke result. Never push secrets, raw personal data, or unredacted external response bodies. |
| G6 — Handoff record | Every handoff must state: unit ID; execution status (`PLANNED`, `IN_PROGRESS`, `VERIFYING`, or `TERMINAL`); terminal decision when terminal (`KEEP`, `REVISE`, `REVERT`, `BLOCKED`, `ESCALATE`, or `PAUSED`); base/head commit; branch/worktree; files changed; commands and exact results; artifacts/run URLs; evidence status; decisions/assumptions; remaining acceptance items; blocker/stop condition; rollback point; next exact action; recommended next-model capability. |
| G7 — Model routing | `ASSIGNED MODEL`, `CRITIC`, and `ESCALATION MODEL` below are recommendations only. No provider is required. Prefer the least expensive model that meets the stated capability; use a fresh independent critic when named. |
| G8 — Stop discipline | Stop before broadening scope, destructive cleanup, irreversible data mutation, new paid services, new schedulers, a framework rewrite, or an unreviewed compliance decision. Record the contradiction and escalate instead of improvising architecture. |
| G9 — Terminal decisions | Every completed execution ends in exactly one terminal decision: `KEEP`, `REVISE`, `REVERT`, `BLOCKED`, `ESCALATE`, or `PAUSED`. `PLANNED` is pre-execution only and is never a terminal result. |

## Dependency order

```text
REC-01 repository/worktree truth
  ├─ immediate containment: DATA-05A, REL-09, SEC-03, REL-10, OPS-06
  ├─ evidence: DATA-03, OPS-04
  └─ migration gate: DB-01
         └─ COMP-01A durable robots evidence
                ├─ REL-08 Source Doctor V1 ── SRC-4D Jobicy cadence
                ├─ OPS-05 alert lifecycle
                ├─ COMP-01B reviewed enforcement gate
                └─ DATA-05B provenance repair (also needs DATA-05A + SEC-03)

DATA-03 ── DATA-06 taxonomy/eval convergence
one accepted code unit + one explicit partial checkpoint ── REC-02 resume drill
```

Migration-writing units are sequential even when their functional work is otherwise independent. At execution time, each must claim the next unused migration number rather than assuming the number shown in a draft.

---

## REC-01 — Inventory registered and orphan worktrees without cleanup

| Field | Contract |
| --- | --- |
| UNIT ID | REC-01 |
| TITLE | Establish authoritative worktree/branch inventory; make no cleanup decision |
| MILESTONE | M0 — Repository Truth |
| PRIORITY | P0 prerequisite |
| OBJECTIVE | Record every registered worktree, directory that merely looks like a worktree, branch/HEAD, dirty state, reachability, and ownership uncertainty so later executors do not delete or overwrite recoverable work. |
| WHY THIS MATTERS | Six auxiliary worktrees and four orphan-looking directories carry unknown historical/partial work. Cleanup before classification could destroy the only copy of an interrupted unit. |
| CURRENT EVIDENCE | `git worktree list --porcelain` shows main plus six registered auxiliary worktrees. `.worktrees/` also contains `apex-sec01`, `major-quality-audit`, `production-apex-audit-2026-08-09`, and `production-release` without `.git` pointers. |
| EVIDENCE STATUS | VERIFIED locally at planning time; contents/ownership and remote recoverability remain UNKNOWN. |
| ROOT CAUSE | Recovery work created multiple isolated branches; later directory/metadata cleanup was not completed or durably classified. |
| ROOT CAUSE CONFIDENCE | Medium; the topology is verified, the history/intent is not. |
| PREREQUISITES | G2; read prior checkpoints before interpreting branch names. |
| DEPENDENCIES | None. This gates every new worktree and every cleanup proposal. |
| AFFECTED FILES / SYMBOLS | Read-only Git metadata under `.git/worktrees/`; `.worktrees/*`; expected new evidence file `docs/gauntlet/evidence/REC-01-worktree-inventory.md`; canonical baton `docs/SYSTEM_SAVEPOINT.md`. |
| CALLERS / DEPENDENTS | All later worktree-required units; human cleanup decision; REC-02. |
| BASELINE | 1 main + 6 registered auxiliary worktrees; 4 additional directories lack `.git` pointers. |
| PRIMARY ADDY SKILL / WORKFLOW | `git-workflow-and-versioning`. |
| OPTIONAL SUPERPOWERS MECHANISM | NONE. |
| WHY DISTINCT VALUE | No secondary mechanism adds value to a read-only inventory. |
| ASSIGNED MODEL | Unassigned; recommended capability: low-cost Git/repository forensics with careful evidence labeling. |
| CRITIC | Independent reviewer capable of reconciling worktree, branch, and remote-ref facts. |
| ESCALATION MODEL | Architecture/recovery-capable reasoner only if two artifacts claim conflicting accepted state. |
| WORKTREE REQUIRED | No; creating another worktree would worsen the inventory. |
| ALLOWED SCOPE | Read metadata, run non-mutating Git commands, hash/compare files, document findings. |
| SMALLEST IMPLEMENTATION | One inventory document with a row per directory and a recommendation of `retain`, `candidate for archive`, or `unknown`; all destructive decisions remain pending. |
| MUST PRESERVE | Every directory, branch, ref, stash, untracked file, and current main working tree. G1 applies. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No `git worktree prune/remove`, branch deletion, directory move/delete, reset, checkout, merge, commit inside old worktrees, or remote mutation. |
| REGRESSION SURFACE | Documentation accuracy only; primary risk is misclassifying recoverable work. |
| STEPS | Capture worktree/branch/ref inventory; inspect dirty status without changing it; compare HEADs to main/origin; identify unique commits and untracked files; record uncertainty and safe next decision. |
| TESTS | Re-run `git worktree list --porcelain`; verify every registered entry appears exactly once in the document. |
| PROBES | Enumerate `.worktrees/*/.git`; run `git fsck --no-reflogs --unreachable` only if output handling is bounded and no mutation occurs. |
| BENCHMARK / EVAL | 100% directory coverage; zero filesystem/Git mutations; a second reader can identify the next safe action without chat history. |
| AUTOMATION OPPORTUNITY | A future read-only inventory script may regenerate the table. |
| AUTOMATION CLASS | FULL AUTOMATION for detection; APPROVAL-GATED for any cleanup. |
| MATURITY TARGET | A0 MANUAL. |
| OBSERVABILITY | Record command, timestamp, base commit, branch, HEAD, dirty/untracked counts, remote reachability, and evidence path per entry. |
| IDEMPOTENCY | Re-running replaces only timestamp/current facts; never creates/deletes worktrees. |
| MAINTAINABILITY IMPACT | Reduces archaeology and accidental duplicate work. |
| SCALE IMPACT | Prevents worktree sprawl from becoming untraceable. |
| HARDENING IMPACT | Protects interruption recovery and user-owned changes. |
| ACCEPTANCE | Every registered and orphan-looking directory is classified; no cleanup occurred; unknowns are explicit. |
| ACCEPTANCE EVIDENCE | Inventory diff plus before/after `git worktree list` and directory listing proving topology is unchanged. |
| REVERT | Revert only the documentation commit; filesystem remains untouched. |
| STOP CONDITIONS | Any permission error, unexpected symlink/junction, nested repository, active process ownership, unique unpushed commit, or untracked data. |
| ESCALATION | Human approval is mandatory before any later cleanup/archive operation. |
| DOCUMENTATION | Create the evidence file and update only the REC-01 row/current baton in `docs/SYSTEM_SAVEPOINT.md`. |
| COMMIT PLAN | One documentation-only commit: `docs(gauntlet): inventory worktrees without cleanup`. |
| COMMIT BOUNDARY | REC-01 evidence only; no cleanup implementation. G4 applies. |
| GITHUB BACKUP | Push the docs branch and record commit/PR; do not push branches discovered in old worktrees merely to “save” them without review. |
| HANDOFF | G6 plus the exact path, branch, HEAD, dirty state, unique-commit status, and recommended disposition for all ten auxiliary/orphan entries. |
| STATUS | PLANNED |

## DATA-05A — Contain cross-source apply poisoning and directory inference

| Field | Contract |
| --- | --- |
| UNIT ID | DATA-05A |
| TITLE | Validate apply destinations by attributable source, stop inferred company websites, and repair the bounded incident cohort |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P0 data-integrity containment |
| OBJECTIVE | Reject cross-source application hosts at every active writer and click boundary, preserve same-source/approved ATS links, prevent job URLs from becoming canonical company websites, and repair only the reviewed `remotephjobs.com` incident rows. |
| WHY THIS MATTERS | A poisoned apply URL can misdirect a user and then become a public company trust signal, logo input, audit target, and future enrichment premise. Protocol validation and an aggregator blocklist do not establish attribution. |
| CURRENT EVIDENCE | Read-only production evidence found `remotephjobs.com` apply URLs attached to other sources and the same hostname stored for eight unrelated companies. The owner states that hostname is external; this project's production site is `remotejobs-ph.pages.dev`. `enrichDirectory` promoted the first nonblocked job host, while the click route trusted any syntactically safe stored application URL. |
| EVIDENCE STATUS | VERIFIED code path and committed digest; correctness of each written domain is UNKNOWN. |
| ROOT CAUSE | Syntactic URL safety was mistaken for source attribution, then a heuristic discovery signal was treated as authoritative directory data without provenance, consensus, or review. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01; capture current enrichment counters and tests. |
| DEPENDENCIES | REC-01. DATA-05B must not begin until this containment is accepted. |
| AFFECTED FILES / SYMBOLS | `packages/scraper/urls.ts`; all active ingestion writers; `apps/web/src/lib/outbound-url.ts`; `apps/web/src/lib/directory-enrich.ts`; focused tests; exact incident migration `0031_remotephjobs_incident_repair.sql`. |
| CALLERS / DEPENDENTS | scrape/direct/durable ingestion; `/api/click/[id]`; `/api/cron/directory-enrich`; enrichment workflow/digest; `/directory`; company-logo route; directory audit. |
| BASELINE | Enrichment can write both `website` and `hiringPageUrl`; `websiteSet` was 3 in the latest committed run. |
| PRIMARY ADDY SKILL / WORKFLOW | `incremental-implementation`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion. |
| WHY DISTINCT VALUE | A focused fresh proof is necessary because keeping ATS enrichment while removing only website writes is the central non-regression. |
| ASSIGNED MODEL | Unassigned; recommended capability: standard TypeScript executor comfortable with Drizzle-shaped fakes. |
| CRITIC | Independent data-integrity reviewer. |
| ESCALATION MODEL | Architecture-capable model only if website writes are coupled to verification or ATS activation in an undocumented caller. |
| WORKTREE REQUIRED | No after REC-01, provided the main tree is clean for these files. |
| ALLOWED SCOPE | Validate direct apply links only against their attributable source host or an explicit same-ATS family; fall back to source URLs; protect legacy clicks; report repeated cross-company hosts; remove website inference; exact-value repair of the eight named directory rows and only cross-source `remotephjobs.com` apply rows. |
| SMALLEST IMPLEMENTATION | One shared source-attribution validator used by every writer and click resolution; website gaps become ineligible for enrichment; a tested idempotent migration repairs only current values that still match the reviewed incident conditions. |
| MUST PRESERVE | ATS hiring-page construction, per-target error isolation, random rotation, verification criteria, diagnostics, auth/rate limit, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No hostname-wide ban, no claim that `remotephjobs.com` is owned by this project, no clearing of legitimate same-source rows, no guessed replacement company websites, no ATS policy changes, new lookup provider, or source expansion. |
| REGRESSION SURFACE | Enrichment target selection, counters/digest, ATS URL construction, verification, rotation fairness. |
| STEPS | Add failing tests; remove website-only targeting and writes; retain response field with zero count if needed for compatibility; run focused and full verification; observe one scheduled/manual dry acceptance run without modifying websites. |
| TESTS | Focused URL, click, ingestion diagnostic, migration, and directory tests; then G3. Tests must prove cross-source quarantine, same-source `remotephjobs.com` preservation, missing website exclusion, and ATS hiring-page preservation. |
| PROBES | Compare before/after target SQL; assert no enrichment update contains `website`; dry-run/read-only counts before migration and exact post-migration counts after the normal deployment path. |
| BENCHMARK / EVAL | Same or fewer selected rows; `websiteSet=0`; ATS hiring-page fixture remains `hiringPageSet=1`; no added D1/external calls. |
| AUTOMATION OPPORTUNITY | CI regression permanently guards against reintroducing unproven website writes. |
| AUTOMATION CLASS | FULL AUTOMATION. |
| MATURITY TARGET | A1 AUTOMATED DETECTION. |
| OBSERVABILITY | Keep `websiteSet` and `hiringPageSet` distinct; optionally annotate website inference as disabled without changing response shape. |
| IDEMPOTENCY | Repeated runs never alter `website`; ATS hiring page remains set-once. |
| MAINTAINABILITY IMPACT | Removes a hidden heuristic write path. |
| SCALE IMPACT | Reduces bad-domain amplification as the directory grows. |
| HARDENING IMPACT | Converts unknown evidence into fail-closed behavior. |
| ACCEPTANCE | No active writer stores an unattributable cross-source apply URL; legacy poisoned clicks fall back to source; no enrichment path infers/writes `va_directory.website`; legitimate external same-source links and ATS behavior remain green; exact incident migration counts match the reviewed cohort; full suite/build/guardrails pass. |
| ACCEPTANCE EVIDENCE | Focused/full test output, migration fixture, diff, CI/release run, pre/post read-only counts, one scrape response with quarantine/anomaly fields, and one enrichment response showing zero website writes. |
| REVERT | Revert the single commit only if ATS/verification regression is proven; do not restore heuristic website writes without DATA-05B-grade provenance. |
| STOP CONDITIONS | Discovery that another active caller relies on `websiteSet>0`, or that removing the branch changes verification/visibility semantics. |
| ESCALATION | Resolve product/data contract before broadening; do not substitute a different inference heuristic. |
| DOCUMENTATION | Ownership distinction, exact repaired cohort, and terminal evidence are recorded in `docs/gauntlet/evidence/DATA-05A-remotephjobs-incident.md`. |
| COMMIT PLAN | `fix(data): contain cross-source job URL poisoning`. |
| COMMIT BOUNDARY | Shared URL boundary + active callers + directory containment + exact incident migration/tests + directly coupled documentation only. |
| GITHUB BACKUP | G5; production evidence must identify the first enrichment run after deploy. |
| HANDOFF | G6 plus pre/post target SQL, preserved behaviors, `websiteSet`/`hiringPageSet` results, and whether DATA-05B prerequisites are now satisfied. |
| STATUS | TERMINAL — KEEP (`b824600`; CI/deploy `32555307405`; Hunter acceptance `32556180387`) |

## REL-09 — Bound verifier external subrequests

| Field | Contract |
| --- | --- |
| UNIT ID | REL-09 |
| TITLE | Keep opportunity verification below the Cloudflare external-subrequest ceiling |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P0 reliability |
| OBJECTIVE | Cap one verifier invocation to a measured safe number of external fetches and add a regression test analogous to directory-audit budget protection. |
| WHY THIS MATTERS | Overflow fetches can be misclassified as transient link failures, rotate rows without truly checking them, and remain below the workflow’s systemic-failure threshold. |
| CURRENT EVIDENCE | `apps/web/src/pages/api/cron/verify-links.ts` selects `VERIFY_LIMIT=120`; each row may issue an external request. `directory-audit.ts` and its workflow document a 50-subrequest free-tier cap and use 40. No verifier budget test exists. |
| EVIDENCE STATUS | Code mismatch VERIFIED; actual production overflow frequency INFERRED until a run exposes subrequest diagnostics. |
| ROOT CAUSE | Verifier rotation/accounting was repaired without reconciling its legacy batch size to the deployment’s egress budget. |
| ROOT CAUSE CONFIDENCE | High for structural risk; medium for live incidence. |
| PREREQUISITES | REC-01; confirm current Cloudflare plan/limit and redirect behavior from authoritative configuration/evidence. |
| DEPENDENCIES | REC-01. Independent of schema work. |
| AFFECTED FILES / SYMBOLS | `apps/web/src/pages/api/cron/verify-links.ts` — `VERIFY_LIMIT`, selection and fetch loop; expected `apps/web/tests/verify-links-budget.test.ts`; `.github/workflows/gha-verifier-pulse.yml`. |
| CALLERS / DEPENDENTS | Verifier workflow; `opportunities.lastVerifiedAt`, `linkFailCount`, `isActive`; public board freshness. |
| BASELINE | 120 selected per invocation; directory audit’s accepted safe precedent is 40; verifier runs every 12 hours. |
| PRIMARY ADDY SKILL / WORKFLOW | `performance`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion. |
| WHY DISTINCT VALUE | The regression is a platform-boundary invariant that must be proven by test and run evidence, not code review alone. |
| ASSIGNED MODEL | Unassigned; recommended capability: standard Cloudflare/TypeScript reliability executor. |
| CRITIC | Independent reviewer familiar with Workers/Pages request limits and failure accounting. |
| ESCALATION MODEL | Architecture-capable model if one row can consume multiple unpredictable subrequests or backlog SLA becomes unacceptable. |
| WORKTREE REQUIRED | No. |
| ALLOWED SCOPE | Lower the default budget, clamp user override to the safe ceiling, surface requested/used/deferred counts, update workflow expectations, add tests. |
| SMALLEST IMPLEMENTATION | Export a single safe limit (initially 40 unless fresh evidence justifies lower), clamp all invocation paths to it, and prove selection never exceeds it. |
| MUST PRESERVE | Oldest-first rotation, exact attempted/succeeded/failed accounting, three-strike behavior, geo page scan, auto-archive semantics, auth, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No concurrency increase, retry storm, link-status reclassification, strike threshold change, scheduler increase, paid-plan assumption, or full verifier rewrite. |
| REGRESSION SURFACE | Verification throughput, never-verified backlog, deactivation timing, workflow failure gate. |
| STEPS | Confirm limit; add failing budget test; clamp selection; add deferred/backlog visibility; run focused/full tests; deploy; inspect at least two rotations. |
| TESTS | New budget test plus verifier/accounting tests; `bun test apps/web/tests/verify-links-budget.test.ts`; then G3. |
| PROBES | Authenticated bounded staging/production invocation; verify `attempted <= limit` and no “Too many subrequests” evidence. |
| BENCHMARK / EVAL | Zero budget-overflow errors; cohort rotation advances; compute days to sweep from active backlog and schedule. |
| AUTOMATION OPPORTUNITY | CI assertion and workflow gate on `attempted > safeLimit`. |
| AUTOMATION CLASS | FULL AUTOMATION. |
| MATURITY TARGET | A1 AUTOMATED DETECTION. |
| OBSERVABILITY | Response/workflow summary records budget, attempted, deferred/remaining, network failures, and platform-budget failures separately. |
| IDEMPOTENCY | Repeated invocations rotate by verification timestamp and do not double-strike on infrastructure failure. |
| MAINTAINABILITY IMPACT | One explicit invariant replaces implicit platform knowledge. |
| SCALE IMPACT | Throughput becomes predictable; backlog growth is measurable rather than hidden. |
| HARDENING IMPACT | Bounds blast radius and false link-health evidence. |
| ACCEPTANCE | All paths stay below the confirmed cap with headroom; rotation/accounting tests pass; two live runs advance cohorts without overflow. |
| ACCEPTANCE EVIDENCE | Test logs, constant/limit rationale, two workflow run IDs, attempted/deferred/backlog metrics. |
| REVERT | Revert code commit if rotation or accounting regresses; never revert to 120 without verified platform capacity. |
| STOP CONDITIONS | Unknown current limit, redirects make 40 unsafe, or backlog SLA requires a scheduler/architecture change. |
| ESCALATION | Present measured throughput options; do not buy capacity or increase schedule without approval. |
| DOCUMENTATION | Limit rationale, failed 40-row canary, redirect revision, live rotations, and 32-day sweep estimate are recorded in `docs/gauntlet/evidence/REL-09-verifier-subrequest-budget.md`. |
| COMMIT PLAN | `fix(verifier): bound external subrequests per invocation`. |
| COMMIT BOUNDARY | Route + focused test + directly coupled workflow summary only. |
| GITHUB BACKUP | G5 with verifier workflow and release evidence. |
| HANDOFF | G6 plus confirmed cap source, selected limit, redirects assumption, backlog estimate, and live run counters. |
| STATUS | TERMINAL — KEEP AFTER REVISE (`137a3ff`; CI/deploy `32556741237`; live `32556799462`, `32556821369`) |

## SEC-03 — Enforce exact-host-or-dot-subdomain trust matching

| Field | Contract |
| --- | --- |
| UNIT ID | SEC-03 |
| TITLE | Close suffix-confusion in trusted-source and ATS-host recognition |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P0 security/data integrity |
| OBJECTIVE | Accept a trusted host only when `host === trusted` or `host.endsWith('.' + trusted)` across Prospector trust and ATS token recognition. |
| WHY THIS MATTERS | Plain suffix checks can treat attacker-controlled names such as `eviljobicy.com` or `evilgreenhouse.io` as trusted, allowing incorrect auto-add/ATS metadata. |
| CURRENT EVIDENCE | `packages/scraper/prospector.ts:isTrustedSourceUrl` includes `host.endsWith(t)`; `extractAtsToken` uses broad suffixes such as `endsWith('greenhouse.io')`, `endsWith('lever.co')`, and equivalents. |
| EVIDENCE STATUS | VERIFIED in code; exploitation in stored data is UNKNOWN. |
| ROOT CAUSE | Host trust was implemented as textual suffix matching rather than DNS-label boundary matching. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01; enumerate every active trusted/ATS host and intended subdomain form. |
| DEPENDENCIES | REC-01. DATA-05B depends on this matcher for its repeated-domain guard. |
| AFFECTED FILES / SYMBOLS | `packages/scraper/prospector.ts` — `hostOf`, `isTrustedSourceUrl`, `extractAtsToken`; `packages/scraper/prospector.test.ts`; optionally a thin shared helper in `packages/scraper/hostTrust.ts` and its test; `apps/web/src/pages/api/cron/prospect.ts` as caller only. |
| CALLERS / DEPENDENTS | Prospector classification/auto-add; ATS discovery metadata; future Source Doctor; directory provenance guard. |
| BASELINE | Trusted-source list has valid hosts, but malicious concatenated suffixes currently pass at least one branch. |
| PRIMARY ADDY SKILL / WORKFLOW | `security-and-hardening`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion. |
| WHY DISTINCT VALUE | Adversarial regression fixtures are the proof that normalization did not merely move the bypass. |
| ASSIGNED MODEL | Unassigned; recommended capability: security-focused TypeScript executor. |
| CRITIC | Fresh reviewer experienced with URL/hostname boundary attacks. |
| ESCALATION MODEL | Security/architecture reasoner if internationalized domains, public suffix logic, or redirects enter scope. |
| WORKTREE REQUIRED | No. |
| ALLOWED SCOPE | Add one pure host-boundary helper, replace unsafe comparisons, add positive/negative fixtures. |
| SMALLEST IMPLEMENTATION | Centralize `exactOrSubdomain(host, trusted)` and use it for all trust/ATS branches without changing the allowlist. |
| MUST PRESERVE | Legitimate exact hosts and documented subdomains, URL parse fail-closed behavior, Prospector quality gates, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No new trusted hosts, public-suffix dependency, DNS lookup, redirect following, auto-enable policy, or repair of existing rows. |
| REGRESSION SURFACE | Legitimate ATS URL extraction; Prospector auto-add/review split; source tests. |
| STEPS | Write malicious-suffix failures; implement helper; migrate every comparison; test exact, one/multiple subdomains, trailing dot/case normalization, concatenated suffixes, invalid URLs. |
| TESTS | `bun test packages/scraper/prospector.test.ts`; new helper tests if extracted; then G3. |
| PROBES | Run a table of current configured source/ATS URLs and prove results are unchanged; malicious fixtures must return false/null. |
| BENCHMARK / EVAL | 100% known-good fixture parity; 100% malicious concatenated-suffix rejection; no network calls/dependency. |
| AUTOMATION OPPORTUNITY | Permanent security regression corpus. |
| AUTOMATION CLASS | FULL AUTOMATION. |
| MATURITY TARGET | A1 AUTOMATED DETECTION. |
| OBSERVABILITY | Prospector continues reporting auto-add/review/rejected counts; do not log sensitive full query strings. |
| IDEMPOTENCY | Pure deterministic matching. |
| MAINTAINABILITY IMPACT | One named predicate removes repeated subtle logic. |
| SCALE IMPACT | New ATS hosts can reuse a safe boundary without new dependencies. |
| HARDENING IMPACT | Closes a data-trust and source-recognition bypass. |
| ACCEPTANCE | All unsafe suffix branches are gone; adversarial and known-good tests pass; no allowlist expansion. |
| ACCEPTANCE EVIDENCE | Focused/full test output and a fixture matrix in the PR/hand-off. |
| REVERT | Revert the atomic commit only if a documented legitimate host is rejected; fix fixture/predicate rather than restoring unsafe suffix matching. |
| STOP CONDITIONS | Any requirement for registrable-domain equivalence, redirects, DNS resolution, or adding sources. |
| ESCALATION | Security review must choose a separately scoped domain canonicalization design. |
| DOCUMENTATION | Note the invariant in source capability/security documentation and execution state. |
| COMMIT PLAN | `fix(security): enforce hostname label boundaries`. |
| COMMIT BOUNDARY | Pure helper/call sites/tests only. |
| GITHUB BACKUP | G5. |
| HANDOFF | G6 plus exact host matrix, rejected malicious cases, and all migrated call sites. |
| STATUS | TERMINAL — KEEP (`6c48810`; CI/deploy `32557360004`; live Prospector `32557448855`) |

## DB-01 — Rehearse the complete migration chain on an empty D1 database

| Field | Contract |
| --- | --- |
| UNIT ID | DB-01 |
| TITLE | Make empty-D1 recovery executable and prevent unsafe migration premarking |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P0 disaster recovery/data integrity |
| OBJECTIVE | Prove the active migration chain creates a working database from empty state; make `sync_migrations.sql` safe for that case; assert schema/index/FTS and directory niche-default contracts. |
| WHY THIS MATTERS | Release workflows premark foundational migrations before Wrangler applies the rest. That can skip required table creation on a fresh database and is not covered by current tests. |
| CURRENT EVIDENCE | `packages/db/sync_migrations.sql` creates the ledger and marks early migrations applied; `.github/workflows/ci-guardrail.yml` and `deploy-migrations.yml` run it before `wrangler d1 migrations apply`; no full-chain empty-D1 test exists. `va_directory.niche` defaults differ between foundational SQL and `packages/db/schema.ts`. |
| EVIDENCE STATUS | Sequence/default drift VERIFIED; actual clean-database failure INFERRED until rehearsal. |
| ROOT CAUSE | A one-time legacy production bootstrap became an unconditional release step, while tests construct partial schemas rather than replaying the authoritative chain. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01; record current migration head, D1/SQLite versions, release workflow, and production migration ledger. Never point rehearsal at remote production. |
| DEPENDENCIES | REC-01. All later migration-writing units depend on DB-01 acceptance. |
| AFFECTED FILES / SYMBOLS | `packages/db/sync_migrations.sql`; `packages/db/migrations/*.sql`; `packages/db/schema.ts` — `vaDirectory` and indexes; expected `scripts/ci/rehearse-d1-migrations.ts`; `.github/workflows/ci-guardrail.yml`; `deploy-migrations.yml` only if shared safe invocation changes. |
| CALLERS / DEPENDENTS | CI release/deploy-migrations; Wrangler via `apps/web/wrangler.jsonc`; every D1-backed route; COMP-01A and DATA-05B. |
| BASELINE | Migrations 0000–0030 with a numbering gap; journal metadata is stale; FTS unit test applies only 0026/0027 to a hand-built table; no empty-chain gate. |
| PRIMARY ADDY SKILL / WORKFLOW | `deprecation-and-migration`. |
| OPTIONAL SUPERPOWERS MECHANISM | Worktree isolation + verification before completion. |
| WHY DISTINCT VALUE | A disposable isolated D1 rehearsal contains migration risk, and fresh verification is the only acceptable proof of recovery. |
| ASSIGNED MODEL | Unassigned; recommended capability: high-skill SQLite/D1 migration and CI executor. |
| CRITIC | Independent migration reviewer who checks both empty and legacy-ledger paths. |
| ESCALATION MODEL | Frontier architecture/data model reasoner for any destructive table rebuild or production-ledger contradiction. |
| WORKTREE REQUIRED | Yes, after REC-01. |
| ALLOWED SCOPE | Disposable local D1 rehearsal, conditional/bootstrap-safe ledger logic, schema assertions, CI gate, minimal niche contract correction that does not rewrite production data. |
| SMALLEST IMPLEMENTATION | Add a script that applies the exact release sequence to a fresh temporary D1 store, then asserts tables, columns, indexes, FTS triggers/query, and niche default/explicit-insert behavior; make premarking conditional or remove it from fresh paths. |
| MUST PRESERVE | Existing production ledger/history, applied migration files, data, release ordering, FTS behavior, D1 binding name, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No remote write during development, deletion/reordering/editing of already-applied migrations, blanket ledger reset, destructive production rebuild, ORM/framework swap, or migration-number reuse. |
| REGRESSION SURFACE | Production upgrades, legacy databases, fresh recovery, FTS triggers, schema defaults, deploy workflow duration. |
| STEPS | Reproduce fresh path in temp storage; capture failure; define legacy-vs-empty premark invariant; implement safe sequence; assert schema/defaults/FTS; add CI invocation; rehearse upgrade from a copied synthetic legacy ledger. |
| TESTS | Run the new rehearsal script twice against fresh temp locations; `bun test packages/db`; then G3. CI must execute the rehearsal without credentials. |
| PROBES | `PRAGMA table_info`, `index_list`, FTS insert/update/delete/query, migration-ledger query; a synthetic legacy database must not replay already-applied migrations. |
| BENCHMARK / EVAL | Fresh chain succeeds from zero files; second run is a no-op; legacy upgrade succeeds; runtime remains bounded for CI. |
| AUTOMATION OPPORTUNITY | Mandatory CI disaster-recovery rehearsal on every migration/workflow change. |
| AUTOMATION CLASS | FULL AUTOMATION. |
| MATURITY TARGET | A1 AUTOMATED DETECTION. |
| OBSERVABILITY | Script emits machine-readable migration count, applied/skipped IDs, schema assertion results, FTS result, and temp path; never logs credentials. |
| IDEMPOTENCY | Rehearsal uses disposable paths; release sync logic is safe on empty and already-synced ledgers. |
| MAINTAINABILITY IMPACT | Establishes one authoritative executable migration contract. |
| SCALE IMPACT | Prevents future migrations from compounding an untested bootstrap path. |
| HARDENING IMPACT | Makes disaster recovery and new-environment creation testable. |
| ACCEPTANCE | Empty and legacy rehearsals pass locally and in CI; unsafe unconditional premark behavior is eliminated/gated; niche contract is explicit and asserted. |
| ACCEPTANCE EVIDENCE | Script output, temp schema report, full CI run, diff of release sequence, and reviewer verdict. |
| REVERT | Revert CI/script logic if false-positive; for additive migration artifacts, disable dependent writers/readers rather than dropping production columns/tables. |
| STOP CONDITIONS | Rehearsal indicates applied-migration checksum drift, requires editing applied SQL, requires a production table rebuild, or production ledger cannot be explained. |
| ESCALATION | Produce a migration contradiction record and require architecture/human approval before any remote action. |
| DOCUMENTATION | Record authoritative migration path, bootstrap rule, niche contract, rehearsal command, and evidence in recovery docs. |
| COMMIT PLAN | `test(db): rehearse empty and legacy D1 migrations`. |
| COMMIT BOUNDARY | Rehearsal + minimal safe bootstrap/schema contract + CI invocation; no unrelated schema feature. |
| GITHUB BACKUP | G5; require CI evidence before merge and release evidence after merge. |
| HANDOFF | G6 plus migration head, exact fresh/legacy commands, ledger before/after, schema assertions, and whether later migration units may proceed. |
| STATUS | TERMINAL — KEEP (`af960d7`; CI/deploy `32574532452`; rehearsal 85/85 assertions fresh+legacy) |

## REL-10 — Restore homepage detail-link data contract

| Field | Contract |
| --- | --- |
| UNIT ID | REL-10 |
| TITLE | Include PH eligibility in the slim homepage projection and type the contract |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P1 public correctness |
| OBJECTIVE | Ensure eligible homepage cards can link to internal `/jobs/:id` pages by selecting and typing the field the card uses. |
| WHY THIS MATTERS | The detail page provides sanitized content and structured data, but homepage cards currently bypass it because eligibility is absent from the projection. |
| CURRENT EVIDENCE | `apps/web/src/pages/index.astro` omits `phEligibility`; `apps/web/src/components/opportunity-card.tsx` requires it to allow an internal detail link; `latestOpportunities` is effectively `any[]`, so typecheck misses the mismatch. |
| EVIDENCE STATUS | VERIFIED structural behavior; live click path not browser-probed during planning. |
| ROOT CAUSE | An untyped slim projection drifted from the card’s behavioral input contract. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01; capture generated homepage/card behavior. |
| DEPENDENCIES | REC-01. |
| AFFECTED FILES / SYMBOLS | `apps/web/src/pages/index.astro` — slim select and `latestOpportunities`; `apps/web/src/components/opportunity-card.tsx` — detail-link predicate/type; expected `apps/web/tests/homepage-opportunity-contract.test.ts`. |
| CALLERS / DEPENDENTS | Homepage hydrated `OpportunitySearch`; `/jobs/[id].astro`; click analytics route for external links. |
| BASELINE | Six newest jobs per category; omitted `phEligibility` makes the internal-link predicate false. |
| PRIMARY ADDY SKILL / WORKFLOW | `frontend-ui-engineering`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion. |
| WHY DISTINCT VALUE | A rendered-link assertion catches the behavior that SQL/typecheck alone missed. |
| ASSIGNED MODEL | Unassigned; recommended capability: standard Astro/React/TypeScript executor. |
| CRITIC | Independent frontend/data-contract reviewer. |
| ESCALATION MODEL | Architecture-capable frontend model only if the card requires broader Opportunity fields than intended. |
| WORKTREE REQUIRED | No. |
| ALLOWED SCOPE | Add `phEligibility`, define a minimal projection/card type, test eligible/unclear/ineligible link rules. |
| SMALLEST IMPLEMENTATION | Select the missing field and replace `any[]` with a named minimal card projection accepted by `OpportunityCard`. |
| MUST PRESERVE | Six-per-category payload strategy, active/category ordering, external routing for unclear rows, hidden detail pages for non-positive eligibility, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No card redesign, query expansion to full rows, eligibility policy change, route rewrite, or payload growth beyond required field/type metadata. |
| REGRESSION SURFACE | Homepage serialization/hydration, card link targets, detail privacy boundary, payload size. |
| STEPS | Add failing contract test; select/type field; render fixtures for verified/likely/unclear; build and inspect generated bundle/HTML. |
| TESTS | New homepage contract test; relevant opportunity/card tests; then G3. |
| PROBES | Local SSR/browser check that positive jobs link `/jobs/:id` and unclear jobs retain external route. |
| BENCHMARK / EVAL | Homepage payload increase is limited to one compact field per displayed job; no new client chunk. |
| AUTOMATION OPPORTUNITY | Type-level projection contract plus rendered-link regression in CI. |
| AUTOMATION CLASS | FULL AUTOMATION. |
| MATURITY TARGET | A1 AUTOMATED DETECTION. |
| OBSERVABILITY | No new runtime logging; acceptance artifact records link targets and payload delta. |
| IDEMPOTENCY | Pure read/render change. |
| MAINTAINABILITY IMPACT | Removes `any` at a behavioral boundary. |
| SCALE IMPACT | Preserves slim projection. |
| HARDENING IMPACT | Restores eligibility/detail-route invariant. |
| ACCEPTANCE | Eligible fixtures render internal detail URLs, unclear fixtures do not, typecheck/build/full tests pass, payload remains bounded. |
| ACCEPTANCE EVIDENCE | Test output, rendered snippets/browser assertions, before/after payload bytes, CI run. |
| REVERT | Revert atomic commit if hydration/query regression occurs; no data rollback. |
| STOP CONDITIONS | Fix requires loading descriptions/full Opportunity rows or changes public eligibility policy. |
| ESCALATION | Define a formal card DTO in a separate unit if multiple routes have incompatible contracts. |
| DOCUMENTATION | Update implementation status/recovery trail with the restored invariant. |
| COMMIT PLAN | `fix(homepage): preserve opportunity detail-link contract`. |
| COMMIT BOUNDARY | Projection + DTO/type + focused test only. |
| GITHUB BACKUP | G5 with production homepage smoke. |
| HANDOFF | G6 plus payload delta and link results for all eligibility states. |
| STATUS | TERMINAL — KEEP (`5690d54`; CI/deploy `32561624073`; production smoke verified) |

## OPS-06 — Make Hunter recovery compatible with the scrape lock

| Field | Contract |
| --- | --- |
| UNIT ID | OPS-06 |
| TITLE | Remove the impossible two-second Hunter retry loop and expose truthful recovery state |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P1 recovery reliability |
| OBJECTIVE | Make manual Hunter either perform one useful scrape or report a bounded, actionable lock/backlog handoff; do not pretend ten rapid calls can drain work behind an eight-minute lock. |
| WHY THIS MATTERS | A recovery workflow that spends its budget on known lock-held no-ops creates noise and can claim progress from only the first response. |
| CURRENT EVIDENCE | `.github/workflows/gha-hunter-pulse.yml` loops up to 10 times with two-second sleeps. `scrape.ts` claims `__scrape_run_lock__` with an eight-minute stale window and returns `lockState='held'`, `backlogRemaining=1`. Prior OPS-02 made this truthful but did not make the loop useful. |
| EVIDENCE STATUS | Structural mismatch VERIFIED; frequency of manual use/lock collisions UNKNOWN. |
| ROOT CAUSE | Hunter’s legacy multi-batch contract predates the scrape route’s cooldown-style lock and scheduled-worker ownership. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01; read accepted OPS-02 evidence; measure normal scrape duration and lock response fields. |
| DEPENDENCIES | REC-01. Do not redesign the lease without a new approved unit. |
| AFFECTED FILES / SYMBOLS | `.github/workflows/gha-hunter-pulse.yml` — batch loop and health summary; `apps/web/src/pages/api/cron/scrape.ts` — lock-held response only if retry metadata is missing; expected `scripts/gha/hunter-recovery.test.ts` or workflow contract test. |
| CALLERS / DEPENDENTS | Manual Hunter dispatch; source-health artifact/alerts; scheduled worker shares the same scrape endpoint. |
| BASELINE | Max 10 calls, 2-second wait, 8-minute lock TTL, 15-minute workflow timeout. |
| PRIMARY ADDY SKILL / WORKFLOW | `ci-cd-and-automation`. |
| OPTIONAL SUPERPOWERS MECHANISM | Systematic debugging + verification before completion. |
| WHY DISTINCT VALUE | Timing/lock behavior must be reproduced and the proposed workflow challenged against concurrent scheduled invocation. |
| ASSIGNED MODEL | Unassigned; recommended capability: strong workflow/concurrency executor. |
| CRITIC | Independent reliability reviewer focused on lock ownership and truthful completion. |
| ESCALATION MODEL | Frontier concurrency/architecture reasoner if real lease release/renewal is required. |
| WORKTREE REQUIRED | No for workflow-only correction; yes if lock protocol changes. |
| ALLOWED SCOPE | Prefer one useful call plus explicit `blocked`, `backlog`, and next-safe-at reporting; add bounded retry only when server-provided timing proves it fits. |
| SMALLEST IMPLEMENTATION | Replace rapid loop with a single invocation; fail or conclude `needs-rerun` truthfully when lock-held/backlog remains; optionally expose nonsecret retry-after metadata. |
| MUST PRESERVE | Scheduled worker as sole clock, lock safety, auth, insertion/fetch diagnostics, source-health artifact, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No unconditional lock deletion/release, TTL reduction, parallel Hunter calls, new scheduler, source failure threshold change, or ingestion rewrite. |
| REGRESSION SURFACE | Manual recovery UX, artifact aggregation, alert job conditions, concurrent scheduled scrape. |
| STEPS | Reproduce response sequence with fixtures; define terminal states; test workflow evaluator; remove useless retry loop; perform manual dispatch away from scheduled boundary; verify artifact truth. |
| TESTS | Workflow/script contract test for success, lock-held, backlog, malformed response, non-2xx; then G3. |
| PROBES | One controlled manual dispatch; correlate server response, workflow conclusion, and subsequent scheduled heartbeat. |
| BENCHMARK / EVAL | No more than one known-no-op call; zero false “drained” conclusions; recovery instruction includes exact next-safe action/time. |
| AUTOMATION OPPORTUNITY | Pure response evaluator can be automated; actual recovery remains manual/guarded. |
| AUTOMATION CLASS | GUARDED AUTOMATION. |
| MATURITY TARGET | A2 EVIDENCE COLLECTION. |
| OBSERVABILITY | Record call count, lock state, reason, backlog state, next-safe-at/retry-after, and totals from useful responses only. |
| IDEMPOTENCY | Re-dispatch during a lock performs no mutation and reports the same bounded state. |
| MAINTAINABILITY IMPACT | Removes obsolete multi-batch assumptions. |
| SCALE IMPACT | Prevents recovery traffic amplification. |
| HARDENING IMPACT | Preserves mutual exclusion and honest status. |
| ACCEPTANCE | Workflow never rapid-retries a held lock, never calls lock-held backlog drained, and a controlled dispatch yields an actionable terminal state. |
| ACCEPTANCE EVIDENCE | Contract tests, workflow run ID/log, scrape heartbeat correlation, call count. |
| REVERT | Revert workflow commit; retain server lock. Never “fix” by deleting the lock. |
| STOP CONDITIONS | Requirement becomes “drain all backlog in one dispatch,” measured run exceeds lock TTL, or lock ownership cannot be identified safely. |
| ESCALATION | Open a separate lease-design decision with durations/overlap evidence. |
| DOCUMENTATION | Supersede—not erase—OPS-02 status; explain single-call/manual-rerun contract. |
| COMMIT PLAN | `fix(hunter): align recovery loop with scrape lock`. |
| COMMIT BOUNDARY | Workflow/evaluator and minimal response metadata only. |
| GITHUB BACKUP | G5; manual workflow run is required evidence. |
| HANDOFF | G6 plus measured lock/run duration, call count, terminal state, and exact manual rerun instruction. |
| STATUS | PLANNED |

## DATA-03 — Refresh the read-only data-quality cohort baseline

| Field | Contract |
| --- | --- |
| UNIT ID | DATA-03 |
| TITLE | Produce a source-stratified stale, unseen, duplicate, missing-company, and eligibility baseline |
| MILESTONE | M3 — Baseline + Eval Corpus |
| PRIORITY | P1 evidence gate |
| OBJECTIVE | Generate a fresh, reproducible, read-only quality report before approving any cohort mutation or ranking/taxonomy optimization. |
| WHY THIS MATTERS | Historical aggregate counts cannot identify whether a problem belongs to one source/policy cohort or the whole board; mutation without stratification can remove valid jobs. |
| CURRENT EVIDENCE | Historical Medic evidence reported large older/unseen/never-verified cohorts; `docs/major-audit-2026-06-11.md` is obsolete. Local direct D1 reads have previously failed with Cloudflare 7403. |
| EVIDENCE STATUS | Need for refresh VERIFIED; current row counts/root causes UNKNOWN. |
| ROOT CAUSE | Operational reports aggregate top-line health but do not preserve a current source/policy-stratified cohort artifact. |
| ROOT CAUSE CONFIDENCE | High for evidence gap; unknown for data defects. |
| PREREQUISITES | REC-01; working read-only remote D1 credentials or an approved GitHub workflow path; agreed UTC cutoffs. |
| DEPENDENCIES | REC-01. DATA-06 consumes this baseline. DATA mutation units may use it but must define separate authorization. |
| AFFECTED FILES / SYMBOLS | `packages/db/schema.ts` — opportunity quality fields; `.github/workflows/gha-medic-pulse.yml` as query precedent; expected `scripts/diagnostics/data-quality-cohorts.ts` and test; `docs/gauntlet/evidence/DATA-03-quality-baseline.md` plus redacted JSON/CSV summary. |
| CALLERS / DEPENDENTS | Planning, Medic, DATA-06 eval sampling, prune/verify policy decisions. |
| BASELINE | Latest historical evidence is dated; no fresh source-stratified artifact exists. |
| PRIMARY ADDY SKILL / WORKFLOW | `data-analytics`. |
| OPTIONAL SUPERPOWERS MECHANISM | NONE. |
| WHY DISTINCT VALUE | Read-only measurement does not need execution amplification. |
| ASSIGNED MODEL | Unassigned; recommended capability: SQL/data-analysis executor with privacy discipline. |
| CRITIC | Independent analyst who validates denominators, cutoffs, and mutually exclusive cohorts. |
| ESCALATION MODEL | Data architecture reasoner if mixed date formats or schema drift make results ambiguous. |
| WORKTREE REQUIRED | No. |
| ALLOWED SCOPE | Read-only parameterized queries, aggregation, small redacted samples, reproducible report generation. |
| SMALLEST IMPLEMENTATION | One script/query bundle with fixed UTC cutoffs and source/category/eligibility/activity dimensions; output counts plus capped IDs/URLs hashed or omitted. |
| MUST PRESERVE | Production rows, minimal-data policy, source labels, inactive-reason distinctions, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No update/delete/backfill/prune, no full descriptions or personal data in artifacts, no unbounded export, no remote auth workaround. |
| REGRESSION SURFACE | Read load and misleading analysis only; cap queries and samples. |
| STEPS | Define cohort SQL and denominators; unit-test on fixture DB; run read-only EXPLAIN; execute remote read; independently reconcile totals; publish dated artifact and unknowns. |
| TESTS | Fixture test for cutoff boundaries, overlap, null dates, inactive reasons, and source grouping; `bun test` focused then G3 if code is added. |
| PROBES | Remote `SELECT`/`EXPLAIN QUERY PLAN`; reconcile total active count to sum of partitions and latest public count. |
| BENCHMARK / EVAL | Query plan uses relevant indexes or finishes within a documented D1 budget; all totals reconcile; sample caps hold. |
| AUTOMATION OPPORTUNITY | Weekly generated quality artifact after query cost is proven. |
| AUTOMATION CLASS | GUARDED AUTOMATION initially; FULL AUTOMATION after two safe runs. |
| MATURITY TARGET | A2 EVIDENCE COLLECTION. |
| OBSERVABILITY | Emit query timestamp, commit, DB environment, cutoffs, duration, rows read/returned, totals, and reconciliation deltas. |
| IDEMPOTENCY | Same snapshot/cutoffs produce the same report; script performs no writes. |
| MAINTAINABILITY IMPACT | Replaces one-off audit SQL with a reproducible baseline. |
| SCALE IMPACT | Query-plan evidence prevents an analytics report from becoming a D1 hot path. |
| HARDENING IMPACT | Evidence gates future destructive quality actions. |
| ACCEPTANCE | Fresh report exists, partitions reconcile, queries are demonstrably read-only/bounded, and no mutation recommendation is disguised as accepted action. |
| ACCEPTANCE EVIDENCE | Script/test output, D1 read run ID, query plans, dated report, independent reconciliation. |
| REVERT | Revert report/script commit; no data rollback exists because no writes are allowed. |
| STOP CONDITIONS | Cloudflare 7403/auth failure, query scans exceed budget, mixed dates invalidate cutoffs, or counts do not reconcile. |
| ESCALATION | Record the exact blocker; refresh credentials or design indexed aggregate query—never mutate to “fix” measurement. |
| DOCUMENTATION | Add dated evidence and update baseline pointers without overwriting historical reports. |
| COMMIT PLAN | `docs(data): refresh source-stratified quality baseline` with generator if added. |
| COMMIT BOUNDARY | Read-only generator/tests/report only. |
| GITHUB BACKUP | G5; artifact must exclude secrets and bulky/raw records. |
| HANDOFF | G6 plus cutoffs, SQL version/hash, totals, query plans, reconciliation, and explicit mutation prohibition. |
| STATUS | PLANNED |

## OPS-04 — Diagnose the directory unreachable spike

| Field | Contract |
| --- | --- |
| UNIT ID | OPS-04 |
| TITLE | Separate Cloudflare egress/transient failures from origin-specific directory failures |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P1 diagnosis before policy change |
| OBJECTIVE | Add bounded diagnostic reason codes and gather comparative evidence for the 43% unreachable cohort without changing strikes, visibility, or verification. |
| WHY THIS MATTERS | `unreachable` intentionally preserves strikes, but the current generic evidence cannot distinguish timeout, DNS/TLS, egress restriction, subrequest exhaustion, or source behavior. Changing thresholds would treat symptoms. |
| CURRENT EVIDENCE | `docs/directory-health-latest.md` reports 17 unreachable of 40 on 2026-08-22. `packages/scraper/linkHealth.ts:checkDirectoryLink` collapses thrown fetches to a short cause/name; `directoryHealthStatus` degrades only at 80%. |
| EVIDENCE STATUS | Spike VERIFIED; root cause UNKNOWN. |
| ROOT CAUSE | Unknown by design; current telemetry discards the detail needed to localize the fault. |
| ROOT CAUSE CONFIDENCE | None—diagnosis is the unit. |
| PREREQUISITES | REC-01; preserve a pre-change run artifact; confirm no subrequest-budget violation in the 40-row route. |
| DEPENDENCIES | REC-01. Findings may create a later repair unit. |
| AFFECTED FILES / SYMBOLS | `packages/scraper/linkHealth.ts` — `LinkVerdict`, `checkDirectoryLink`; `apps/web/src/pages/api/cron/directory-audit.ts` — tally/response; `apps/web/src/lib/directory-health.ts`; `apps/web/tests/directory-health.test.ts`; `.github/workflows/gha-directory-pulse.yml`; latest digest as generated evidence. |
| CALLERS / DEPENDENTS | Directory audit route/workflow, `va_directory.link*` fields, directory visibility. |
| BASELINE | 40 checked: 17 OK, 6 bot wall, 17 unreachable, 0 hard dead; three suspected strike rows. |
| PRIMARY ADDY SKILL / WORKFLOW | `debugging-and-error-recovery`. |
| OPTIONAL SUPERPOWERS MECHANISM | Systematic debugging. |
| WHY DISTINCT VALUE | Reproduce → classify → compare runtimes → isolate is necessary because the cause is explicitly unknown. |
| ASSIGNED MODEL | Unassigned; recommended capability: network/Cloudflare diagnostic executor. |
| CRITIC | Independent reliability reviewer who rejects strike-policy changes without evidence. |
| ESCALATION MODEL | Cloud/network architecture reasoner if runtime/provider behavior is implicated. |
| WORKTREE REQUIRED | No unless route contract changes become broad. |
| ALLOWED SCOPE | Structured non-sensitive reason codes, capped samples/counts, dry/read-only comparison probes, digest visibility. |
| SMALLEST IMPLEMENTATION | Preserve `status='unreachable'` and `isHardDead=false`; add stable diagnostic categories and aggregate them in the response/workflow. |
| MUST PRESERVE | 40 budget, no-strike unreachable semantics, three hard-dead strikes, URL immutability, per-company isolation, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No strike reset/increment changes, de-verification threshold change, website edits, concurrency/budget increase, proxy service, browser automation, or mass recheck. |
| REGRESSION SURFACE | Error redaction, response/digest schema, link-health classifier, workflow systemic gate. |
| STEPS | Build failure taxonomy; test exception variants; instrument aggregate/capped evidence; deploy; compare at least two Cloudflare cohorts and a bounded GitHub/local probe of the same small sample; state supported root cause or remain unknown. |
| TESTS | Extend `directory-health.test.ts` and `packages/scraper/linkHealth.test.ts`; run directory budget test; then G3. |
| PROBES | Same 5–10 redacted hosts from two runtimes, fixed timeout/user agent, no repeats; never commit full URLs if sensitive. |
| BENCHMARK / EVAL | 100% unreachable results get one stable reason code; no raw stack/secret leakage; no added request count; cross-runtime comparison is reproducible. |
| AUTOMATION OPPORTUNITY | Aggregate reason distribution in the scheduled digest. |
| AUTOMATION CLASS | GUARDED AUTOMATION. |
| MATURITY TARGET | A3 DIAGNOSIS. |
| OBSERVABILITY | Reason counts, capped redacted samples, timeout, runtime, run ID, and ratio; retain top-level compatibility. |
| IDEMPOTENCY | Diagnostics do not alter strike behavior; repeated checks only update existing check timestamp/status as before. |
| MAINTAINABILITY IMPACT | Replaces opaque strings with a small stable taxonomy. |
| SCALE IMPACT | Aggregates, rather than logging unbounded per-host errors. |
| HARDENING IMPACT | Prevents policy changes based on indistinguishable network failures. |
| ACCEPTANCE | Cause is narrowed with comparative evidence or explicitly remains unknown; strike/visibility semantics are byte-for-byte equivalent in tests; two runs produce reason distributions. |
| ACCEPTANCE EVIDENCE | Focused/full tests, two workflow runs, bounded cross-runtime matrix, before/after update assertions. |
| REVERT | Revert instrumentation if response compatibility or redaction fails; no data rollback. |
| STOP CONDITIONS | Evidence exposes credentials/private hosts, probes trigger rate limits, sample requires >10 hosts, or proposed fix touches strikes. |
| ESCALATION | Create a new finding/unit for the proven domain; do not fold remediation into OPS-04. |
| DOCUMENTATION | Append diagnosis to dated directory-health evidence and execution state; preserve older digest. |
| COMMIT PLAN | `feat(directory): expose bounded egress diagnostics`. |
| COMMIT BOUNDARY | Diagnostic taxonomy/aggregation/tests/workflow summary only. |
| GITHUB BACKUP | G5 with two run IDs. |
| HANDOFF | G6 plus reason distribution, runtime comparison, rejected hypotheses, and whether a new remediation unit is justified. |
| STATUS | TERMINAL — KEEP. Behavior `83f94d0`; CI/deploy `32568634636`; live runs `32568721809` (5 unreachable, all EGRESS_BLOCKED) + `32568795476` (0 unreachable); cross-runtime probe of the same 5 hosts returned 2 bot_wall (403) + 3 ok (200), 0 dead. Cause: Cloudflare egress-side transport failure, not origin death; no strike/policy change. Remediation (non-Cloudflare probe path) is a separate future unit. Evidence: `docs/gauntlet/evidence/OPS-04-unreachable-diagnosis.md`. |

## COMP-01A — Persist robots decisions for static and ATS sources

| Field | Contract |
| --- | --- |
| UNIT ID | COMP-01A |
| TITLE | Build durable, queryable robots evidence before enforcement |
| MILESTONE | M6 — Health Memory |
| PRIORITY | P1 compliance |
| OBJECTIVE | Persist one bounded robots decision record for every actual static or ATS fetch attempt, including verdict, evidence class, would-block, mode, origin, and observation time. |
| WHY THIS MATTERS | Static decisions are currently transient response fields and dropped from `source_fetch_events`; ATS fetches bypass the runtime robots gate entirely. Enforcement cannot be reviewed from durable evidence. |
| CURRENT EVIDENCE | `scrape.ts:SourceFetchResult` carries robots fields; `recordSourceFetchEvents` writes only 12 non-robots columns; `robotsCheckForSource` wraps configured static sources; `fetchOneAts` directly calls the ATS fetcher. `ROBOTS_MODE='observe'`. |
| EVIDENCE STATUS | PARTIAL capability VERIFIED; durable static evidence and ATS coverage MISSING. |
| ROOT CAUSE | Robots support was staged around the static registry, while the event schema and dynamic ATS path were not completed. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01 and DB-01 accepted; inventory active static/ATS origins and endpoint construction; claim next unused migration number. |
| DEPENDENCIES | REC-01, DB-01. REL-08, COMP-01B, DATA-05B migration ordering, and SRC-4D depend on this. |
| AFFECTED FILES / SYMBOLS | `packages/db/schema.ts` — `sourceFetchEvents`; next unused migration, likely `packages/db/migrations/0031_source_event_robots_evidence.sql`; `apps/web/src/pages/api/cron/scrape.ts` — `SourceFetchResult`, `robotsCheckForSource`, `fetchOneAts`, `recordSourceFetchEvents`, bind-column count; `apps/web/src/lib/robots-store.ts`; `packages/scraper/robotsGate.ts`; focused robots/event tests. |
| CALLERS / DEPENDENTS | Scrape route, source-health rollup/Sentinel, Source Doctor, enforcement review. |
| BASELINE | Static `robotsWouldBlock` appears only in a run response; ATS has no runtime decision; cache is origin-keyed and retained. |
| PRIMARY ADDY SKILL / WORKFLOW | `compliance-checker`. |
| OPTIONAL SUPERPOWERS MECHANISM | Worktree isolation + verification before completion. |
| WHY DISTINCT VALUE | Additive schema/central ingestion changes need isolation and proof across both source families. |
| ASSIGNED MODEL | Unassigned; recommended capability: high-skill D1/TypeScript compliance executor. |
| CRITIC | Independent compliance and migration reviewer. |
| ESCALATION MODEL | Architecture/compliance reasoner if ATS endpoint robots semantics or terms are ambiguous. |
| WORKTREE REQUIRED | Yes. |
| ALLOWED SCOPE | Additive event columns or a minimal append-only evidence table; shared robots gate for actual static/ATS endpoints; bounded sanitized evidence; read-only reporting. |
| SMALLEST IMPLEMENTATION | Extend the existing event record rather than create a second health system; run the same cached gate before ATS fetches; remain observe-only. |
| MUST PRESERVE | Existing source-event fields/readers, D1 bind limit/chunking, source cadence, ATS allowlist/pause state, cache TTL, no full robots bodies in events, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No enforcement flip, source enable/disable, full-body ledger, terms interpretation, retry, cadence change, or destructive migration. |
| REGRESSION SURFACE | D1 insert parameter count, event readers/rollups, external subrequests/cache behavior, ATS availability. |
| STEPS | Define compact evidence schema; migrate/add index only if query plan warrants; add event mapping/chunk recalculation; gate ATS endpoint with cache; test allowed/disallowed/unreachable/cached cases; deploy migration/code; observe. |
| TESTS | Migration rehearsal; robots/robotsGate tests; source-event batch-limit test; static and ATS scrape fixtures; then G3. |
| PROBES | Controlled observe-mode run; query latest evidence for every actually fetched active origin; verify cache prevents per-source robots amplification. |
| BENCHMARK / EVAL | 100% actual fetch attempts have a decision or explicit `gate_error`; event insert stays under D1 bind cap; robots fetch count approximates unique expired origins, not source count. |
| AUTOMATION OPPORTUNITY | Daily compliance rollup generated from durable events. |
| AUTOMATION CLASS | FULL AUTOMATION for observation; enforcement remains approval-gated. |
| MATURITY TARGET | A2 EVIDENCE COLLECTION. |
| OBSERVABILITY | Source ID, family, endpoint origin, verdict enum, reason class, mode, would-block, crawl delay, cache age, timestamp; sanitized/capped text only. |
| IDEMPOTENCY | Append-only events; origin cache upsert; migration ledger controls one-time schema change. |
| MAINTAINABILITY IMPACT | One evidence path for static and ATS instead of parallel assertions. |
| SCALE IMPACT | Origin caching bounds robots subrequests; indexed compact evidence supports rollups. |
| HARDENING IMPACT | Makes compliance failures visible without prematurely halting ingestion. |
| ACCEPTANCE | Static and ATS fixtures persist decisions; live observe run covers every actual fetch origin or records explicit gate error; no enforcement; migrations/full CI pass. |
| ACCEPTANCE EVIDENCE | Migration rehearsal, tests, run response, bounded D1 evidence query, event insert counts, reviewer verdict. |
| REVERT | Revert readers/writers to ignore additive columns; leave deployed additive schema intact. Never drop evidence in emergency rollback. |
| STOP CONDITIONS | ATS robots endpoint cannot be defined safely, event insert exceeds D1 limits, cache outage would cause unbounded fetches, or terms require source pause. |
| ESCALATION | Pause only the affected source through existing policy if required; escalate enforcement/terms decision separately. |
| DOCUMENTATION | Update source capability/compliance docs and execution state with schema and query. |
| COMMIT PLAN | Behavioral migration/code/test commit, then optional evidence-only acceptance commit after observation. |
| COMMIT BOUNDARY | Robots evidence only; no enforcement/cadence/source changes. |
| GITHUB BACKUP | G5; migration and Pages release evidence required. |
| HANDOFF | G6 plus migration number, event schema, bind math, active-origin coverage, gate errors, and start time for COMP-01B observation window. |
| STATUS | TERMINAL — KEEP (`c992dfe` app layer + `60f4838` DB layer; CI/deploy `32573525387` app + `32574532452` full; 520 tests, 1,207 assertions, migration 0032 applied, FTS verified, Pages deployed) |

## REL-08 — Native TypeScript Source Doctor V1

| Field | Contract |
| --- | --- |
| UNIT ID | REL-08 |
| TITLE | Add a compliance-first, side-effect-free source diagnostic command |
| MILESTONE | M5 — Source Doctor V1 |
| PRIORITY | P1 diagnosability |
| OBJECTIVE | Provide a native TypeScript command that reports a source’s configured active path and bounded diagnostics without D1 writes, job ingestion, AI calls, or bypass behavior. |
| WHY THIS MATTERS | Today a model must traverse a large route and multiple registries to answer whether a source is enabled, policy-approved, cadence-blocked, robots-blocked, reachable, parseable, or failing. |
| CURRENT EVIDENCE | Static registry, ATS adapters, robots engine, conditional fetch helpers, and source events exist, but no `source doctor` command or stable `activePath`/`diagnostic` JSON contract exists. |
| EVIDENCE STATUS | MISSING capability; reusable primitives VERIFIED. |
| ROOT CAUSE | Diagnostics evolved inside ingestion/workflows instead of a thin read-only boundary. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01, SEC-03, COMP-01A; read bounded agent-reach study if available, but do not import its package or architecture. |
| DEPENDENCIES | REC-01, SEC-03, COMP-01A. SRC-4D and COMP-01B use its output. |
| AFFECTED FILES / SYMBOLS | Expected `packages/scraper/source-doctor.ts`, `packages/scraper/source-doctor.test.ts`, `scripts/source-doctor.ts`; `packages/scraper/sources.ts`; thin ATS policy/catalog extraction from `apps/web/src/pages/api/cron/scrape.ts` only if required; `package.json` script optional. |
| CALLERS / DEPENDENTS | Human/model diagnostics, incident handoffs, SRC-4D probes, COMP-01B review; not scheduled ingestion. |
| BASELINE | Diagnosing one source requires broad manual code/log retrieval; no machine-readable contract. |
| PRIMARY ADDY SKILL / WORKFLOW | `source-driven-development`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion. |
| WHY DISTINCT VALUE | Fixture-backed output/safety verification proves the doctor remains diagnostic rather than a second fetch pipeline. |
| ASSIGNED MODEL | Unassigned; recommended capability: strong TypeScript API/observability executor. |
| CRITIC | Independent reviewer checking side effects, compliance, and duplication. |
| ESCALATION MODEL | Architecture reasoner if exposing ATS policy requires broad registry refactor. |
| WORKTREE REQUIRED | No unless policy extraction touches more than five files/high-centrality route sections. |
| ALLOWED SCOPE | One-source-at-a-time static/ATS descriptors, robots/policy/cadence/status/parse checks, strict time/byte/request limits, JSON output, redaction. |
| SMALLEST IMPLEMENTATION | Compose existing helpers behind `bun scripts/source-doctor.ts --source <id> --json`; output `{activePath, diagnostic}` with explicit `not_checked` fields and exactly one terminal outcome: `HEALTHY_WITH_RESULTS`, `HEALTHY_EMPTY`, `DEGRADED_ANOMALOUS`, `SCHEMA_BROKEN`, `RATE_LIMITED`, `UNREACHABLE`, `POLICY_BLOCKED`, `INTERNAL_PIPELINE_FAILURE`, or `UNKNOWN`. Probe subcodes may add detail but may not replace these outcomes. |
| MUST PRESERVE | Existing ingestion as sole writer, source policies, paused state, robots rules, user agent, request caps, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No daemon/scheduler/UI, no generic crawler/framework, no login/paywall/CAPTCHA bypass, no D1 write, no AI, no automatic source enable/pause, no full response storage. |
| REGRESSION SURFACE | Shared source config extraction, request headers, parsers, accidental side effects, secrets/logging. |
| STEPS | Define versioned JSON schema; implement pure active-path resolution; add optional bounded network probe; reuse robots gate; add fixtures for static/ATS/paused/unknown/failure; document command. |
| TESTS | Unit tests mock all network/storage; guard that zero D1 writes/AI calls occur; then G3. |
| PROBES | Run against one enabled static, one enabled ATS, one paused, and one unknown ID; maximum one listing request plus cached/one robots request per command. |
| BENCHMARK / EVAL | Bounded requests/bytes/time; deterministic schema; a fresh model identifies likely fault domain from JSON without opening `scrape.ts`. |
| AUTOMATION OPPORTUNITY | Attach doctor JSON to incidents after a detector fires. |
| AUTOMATION CLASS | MANUAL V1; later GUARDED AUTOMATION for evidence collection. |
| MATURITY TARGET | A3 DIAGNOSIS. |
| OBSERVABILITY | Version, commit, timestamp, source ID/family, activePath stages, exact terminal outcome enum, optional probe subcode, policy/robots/cadence results, request count/bytes/duration, redacted error, `mutations=0`. |
| IDEMPOTENCY | Default/config-only mode is pure; network mode is read-only, bounded, and makes no persistent state change. |
| MAINTAINABILITY IMPACT | Centralizes diagnosis while reusing—not replacing—source primitives. |
| SCALE IMPACT | Single-source scope prevents broad probe cost; schema supports future tooling. |
| HARDENING IMPACT | Fail-closed policy/robots reporting and explicit unknowns reduce unsafe manual probing. |
| ACCEPTANCE | Command covers all nine terminal outcomes with fixtures, has zero mutation capability, respects bounds, and fresh-executor evaluation reaches the correct fault domain from output. No additional top-level terminal outcome is accepted. |
| ACCEPTANCE EVIDENCE | Tests, four redacted outputs, request-budget proof, mutation guard, fresh critic result. |
| REVERT | Revert command/thin exports; ingestion behavior must remain unchanged throughout. |
| STOP CONDITIONS | Requires duplicated policy registry, unbounded body, live secret exposure, production mutation, or more than a thin extraction from scrape route. |
| ESCALATION | Split a source-catalog extraction unit before continuing; do not copy policies. |
| DOCUMENTATION | Command usage/schema/safety limits in source docs and execution state. |
| COMMIT PLAN | `feat(diagnostics): add bounded native source doctor`. |
| COMMIT BOUNDARY | Doctor, thin reusable exports, fixtures/tests, docs; no scheduler or remediation. |
| GITHUB BACKUP | G5. |
| HANDOFF | G6 plus output schema version, request limits, four fixtures, zero-mutation proof, and known unsupported paths. |
| STATUS | TERMINAL — KEEP (`4c33d96`; CI/deploy `32576239721`; 534 tests, 1,264 assertions; 14 source-doctor tests covering all 9 outcomes; 4 fixture runs verified; zero mutations, zero AI calls, zero D1 writes) |

## DATA-05B — Repair directory website evidence with provenance and anomaly guards

| Field | Contract |
| --- | --- |
| UNIT ID | DATA-05B |
| TITLE | Add website provenance and perform a reversible evidence-only repair |
| MILESTONE | M4 — Verified P0/P1 Failures |
| PRIORITY | P1 data quality after containment |
| OBJECTIVE | Identify website values created by the retired heuristic, quarantine only demonstrably unsupported values through compare-and-set updates, preserve an undo artifact, and require provenance/consensus for any future automated website proposal. |
| WHY THIS MATTERS | Containment stops new errors but leaves unknown historical values. Repeated unrelated companies resolving to one domain is an anomaly signal, not permission for broad clearing. |
| CURRENT EVIDENCE | Enrichment notes include dated `website=...` text but no structured provenance. Current code selects the first acceptable domain from up to five job URLs. The live anomaly cohort has not yet been measured. |
| EVIDENCE STATUS | Provenance gap VERIFIED; affected rows and repeated-domain anomalies UNKNOWN pending report mode. |
| ROOT CAUSE | Authoritative website state lacks source/evidence/confidence fields and reversible repair tooling. |
| ROOT CAUSE CONFIDENCE | High for design gap; medium/unknown for row-level corruption. |
| PREREQUISITES | DATA-05A accepted for the exact incident; SEC-03, DB-01, COMP-01A accepted; fresh read-only report; human-approved repair evidence; claim next unused migration sequentially. The bounded DATA-05A incident migration does not authorize any broader repair here. |
| DEPENDENCIES | REC-01, DATA-05A, SEC-03, DB-01, COMP-01A. Must not run in parallel with another migration unit. |
| AFFECTED FILES / SYMBOLS | `packages/db/schema.ts` — `vaDirectory`; next unused migration, likely after COMP-01A; `apps/web/src/lib/directory-enrich.ts`; expected `scripts/diagnostics/directory-website-repair.ts` and test; `apps/web/tests/directory-enrich.test.ts`; generated redacted evidence/undo artifact. |
| CALLERS / DEPENDENTS | Directory page/logo, audit, enrichment, future curated seed/import paths. |
| BASELINE | No structured website provenance; latest enrichment wrote three websites; affected historical count unknown. |
| PRIMARY ADDY SKILL / WORKFLOW | `data-analytics`. |
| OPTIONAL SUPERPOWERS MECHANISM | Worktree isolation + verification before completion. |
| WHY DISTINCT VALUE | A reversible data repair and additive migration need isolation and independent proof that scope did not broaden. |
| ASSIGNED MODEL | Unassigned; recommended capability: high-skill D1/data-repair executor. |
| CRITIC | Independent data-quality/migration reviewer. |
| ESCALATION MODEL | Frontier data architecture reasoner if provenance requires table redesign or evidence is contradictory. |
| WORKTREE REQUIRED | Yes. |
| ALLOWED SCOPE | Additive provenance fields/table; report-first tool; exact-host/domain guard; compare-and-set repair of explicitly approved IDs; append audit note; emit restoration artifact. |
| SMALLEST IMPLEMENTATION | `--report` is default and read-only; `--apply --evidence <approved-file>` updates only rows whose ID+old website still match, setting unknown/cleared state with repair provenance; no new inference writer. |
| MUST PRESERVE | Curated/manual websites, safe ATS hiring pages, directory records, notes/history, visibility policy, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No domain-frequency-only deletion, fuzzy company matching, blanket clearing, automatic apply, new lookup provider, DNS crawling, directory deletion, or overwrite of concurrent edits. |
| REGRESSION SURFACE | Directory rendering/logo, audit targets, schema migration, enrichment selection, restoration ability. |
| STEPS | Add provenance schema; produce report with source note/domain frequency/company mismatch; review IDs; snapshot exact old values; dry-run CAS SQL; apply approved set once; verify; retain undo artifact; add forward-write invariant tests. |
| TESTS | Migration rehearsal; fixture report/apply/no-op/concurrent-change/undo tests; directory/enrichment tests; then G3. |
| PROBES | Read-only remote report and post-apply exact-ID query; public route smoke for affected/unchanged rows. |
| BENCHMARK / EVAL | 100% applied rows appear in approved evidence and undo artifact; zero curated/concurrently changed rows touched; repeated-domain guard flags but never mutates automatically. |
| AUTOMATION OPPORTUNITY | Automatic anomaly reporting; repair stays approval-gated. |
| AUTOMATION CLASS | GUARDED detection; APPROVAL-GATED mutation. |
| MATURITY TARGET | A4 GUARDED RECOVERY. |
| OBSERVABILITY | Proposal/applied/skipped-CAS counts, provenance type, evidence hash, affected IDs, domain frequency; redact full query strings/descriptions. |
| IDEMPOTENCY | CAS makes reapply a no-op; migration additive; undo consumes exact after-state and refuses drift. |
| MAINTAINABILITY IMPACT | Makes canonical website responsibility explicit. |
| SCALE IMPACT | Domain-frequency guard catches amplification before broad writes. |
| HARDENING IMPACT | Provides provenance, concurrency safety, and rollback for data repair. |
| ACCEPTANCE | Report reviewed; only approved matching rows change; undo is tested; no automated inference remains; migration/full CI/public smoke pass. |
| ACCEPTANCE EVIDENCE | Pre/post redacted report, evidence hash, CAS counts, undo dry-run/result, migration/CI/release runs, route smoke. |
| REVERT | Code revert plus approved undo artifact for row changes; leave additive provenance schema in place. |
| STOP CONDITIONS | Evidence cannot prove heuristic provenance, affected set exceeds approved cap, CAS drift appears, curated values overlap, or repeated domain may legitimately host multiple companies. |
| ESCALATION | Human data owner reviews ambiguous rows; no mutation until resolved. |
| DOCUMENTATION | Record schema, evidence criteria, affected count, undo path, and unresolved cohort. |
| COMMIT PLAN | Commit schema/tool/tests first; separate approval-gated data/evidence commit if repository policy records data operations. |
| COMMIT BOUNDARY | Provenance/repair only; no new enrichment provider or general directory cleanup. |
| GITHUB BACKUP | G5; never commit raw secrets/full opportunity data; encrypt or omit sensitive undo data as policy requires. |
| HANDOFF | G6 plus migration, report/evidence hashes, approved/applied/skipped IDs, restoration command, and unresolved anomalies. |
| STATUS | VERIFYING — code slice deployed (`df35fdf` schema 0033, `848abbe` report/CAS tooling + tests, `6e31cd7f` critic hardening; CI/deploy `32605834663` applied the migration to production D1); fresh read-only remote report recorded 2026-08-23 (344 unclassified / 35 note-evidence / 39 shared-host / 17 mismatch; sha256 in evidence doc); BLOCKED at the human-approved evidence gate before any CAS mutation. Evidence: `docs/gauntlet/evidence/DATA-05B-directory-website-provenance.md` |

## DATA-06 — Converge taxonomy and triage decisions on one path

| Field | Contract |
| --- | --- |
| UNIT ID | DATA-06 |
| TITLE | Remove duplicate verdict/category logic and add a labelled evaluation fixture |
| MILESTONE | M8 — Job Taxonomy + Evals |
| PRIORITY | P1 correctness/maintainability |
| OBJECTIVE | Make inline ingestion, pending drain, Inngest, stored categories, homepage grouping, and category pages consume one deterministic verdict/category contract; measure it on a small labelled corpus. |
| WHY THIS MATTERS | Duplicated mapping/verdict logic can publish, reject, or categorize the same listing differently depending on execution path, while homepage heuristics can disagree with stored totals. |
| CURRENT EVIDENCE | `packages/scraper/triage-decision.ts` exports `decideTriage` and `mapTriageCategoryToUiCategory`; `scrape.ts` defines another mapper and duplicates main-loop verdict logic; `apps/web/src/lib/categories.ts:getJobCategory` heuristically reclassifies stored `other` only for display. No labelled eval corpus/threshold exists. |
| EVIDENCE STATUS | Duplication VERIFIED; observed production disagreement frequency UNKNOWN. |
| ROOT CAUSE | Triage evolved in inline, durable, and UI paths without a single versioned decision DTO/evaluation gate. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01 and DATA-03; define approved category vocabulary and active/unclear policy without changing it. |
| DEPENDENCIES | REC-01, DATA-03. Independent of schema unless evidence proves a stored-data migration is needed; such migration is a separate unit. |
| AFFECTED FILES / SYMBOLS | `packages/scraper/triage-decision.ts`; `packages/scraper/triage-decision.test.ts`; `packages/scraper/triage.ts`; `apps/web/src/pages/api/cron/scrape.ts` — duplicate mapper/main loop; `apps/web/src/lib/inngest/functions/triage-drain.ts`; `apps/web/src/lib/categories.ts`; expected labelled fixture/eval under `packages/scraper/fixtures/triage-eval.json` and `triage-eval.test.ts`. |
| CALLERS / DEPENDENTS | Inline ingestion, pending drain, Inngest, homepage, `/categories/*`, Prospector category input. |
| BASELINE | Unit tests cover examples but no labelled corpus or cross-path parity assertion; display may reinterpret stored `other`. |
| PRIMARY ADDY SKILL / WORKFLOW | `spec-driven-development`. |
| OPTIONAL SUPERPOWERS MECHANISM | Fresh independent critic + verification before completion. |
| WHY DISTINCT VALUE | A fresh critic should challenge labels and cross-path parity separately from the builder. |
| ASSIGNED MODEL | Unassigned; recommended capability: high-skill AI-eval/TypeScript executor. |
| CRITIC | Independent domain/taxonomy reviewer, not the fixture author. |
| ESCALATION MODEL | Frontier product/AI architecture reasoner for disputed taxonomy or active-unclear policy. |
| WORKTREE REQUIRED | Yes if main scrape-loop refactor exceeds a focused five-file slice; otherwise no. |
| ALLOWED SCOPE | One versioned decision DTO, one mapper, cross-path adapter removal, small curated labelled corpus, deterministic eval metrics. |
| SMALLEST IMPLEMENTATION | Import shared mapper/verdict everywhere; remove private duplicate; make UI consume stored category or one explicitly shared pure fallback; add 25–50 non-copyrighted minimal fixtures with expected verdict/category. |
| MUST PRESERVE | Existing category slugs, geo gate before AI, fail-closed unavailable behavior, active/unclear policy, source tags, pending durability, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No model/provider change, prompt rewrite beyond parity need, wholesale category expansion, historical backfill, ranking, source expansion, or full descriptions in fixtures. |
| REGRESSION SURFACE | Acceptance/rejection, category counts/routes, tags, pending/Inngest parity, AI call budgets. |
| STEPS | Specify DTO/invariants; build labelled fixture from synthetic/minimal snippets; assert current path deltas; route all consumers through shared logic; remove duplicates; run parity and full tests; critic reviews labels. |
| TESTS | Existing triage/decision/pending/Inngest/category tests plus new cross-path/eval tests; then G3. |
| PROBES | Replay the same fixtures through inline decision and pending/Inngest adapters with mocked providers; compare exact normalized output. |
| BENCHMARK / EVAL | 100% cross-path parity; agreed minimum fixture accuracy by category/verdict; zero extra AI calls; report confusion matrix and ambiguous labels separately. |
| AUTOMATION OPPORTUNITY | Run deterministic eval in CI; periodic human-reviewed fixture growth. |
| AUTOMATION CLASS | FULL AUTOMATION for regression; APPROVAL-GATED for label changes. |
| MATURITY TARGET | A1 AUTOMATED DETECTION. |
| OBSERVABILITY | Decision version, path, verdict reason, mapped category, and AI-unavailable/budget reason in existing diagnostics; no prompt/body logging. |
| IDEMPOTENCY | Same normalized triage result produces the same stored decision across paths. |
| MAINTAINABILITY IMPACT | Removes multiple sources of truth. |
| SCALE IMPACT | New role families extend one contract/eval rather than several routes. |
| HARDENING IMPACT | Parity tests bound silent path-specific publication errors. |
| ACCEPTANCE | Duplicate mapper/verdict logic is removed; every path passes parity; labelled eval and critic meet thresholds; no model/call-budget change. |
| ACCEPTANCE EVIDENCE | Diff, parity output, fixture manifest, confusion matrix, critic verdict, G3/CI run. |
| REVERT | Revert atomic refactor; retain fixture if it documents a real gap, but mark expected/current behavior explicitly. |
| STOP CONDITIONS | Label disagreement changes product taxonomy, fixture contains licensed full text, stored data requires backfill, or parity needs provider/prompt change. |
| ESCALATION | Create a taxonomy decision record and separate migration/model unit. |
| DOCUMENTATION | Update job taxonomy/eval docs, decision version, and execution state. |
| COMMIT PLAN | `refactor(triage): unify decision and taxonomy contract`. |
| COMMIT BOUNDARY | Shared decision/mapping + adapters + labelled eval only. |
| GITHUB BACKUP | G5. |
| HANDOFF | G6 plus DTO version, removed duplicates, fixture license/source, metrics, disagreements, and critic result. |
| STATUS | TERMINAL — KEEP (`a014e71`; CI/deploy `32579585128`; 569 tests, 1,335 assertions; 30-case labelled eval + cross-path anti-drift guard; fresh critic SHIP; behavior-preserving 1:1 branch parity; sweep exception preserved; UI `getJobCategory` unification escalated as follow-up DATA-06B). Evidence: `docs/gauntlet/evidence/DATA-06-taxonomy-convergence.md` |

## DATA-06B — Unify UI surfaces on the stored job category

| Field | Contract |
| --- | --- |
| UNIT ID | DATA-06B |
| TITLE | Make homepage preview, totals, and category pages agree on the stored category |
| MILESTONE | M12 — Display/Data Taxonomy Consistency (follow-up spun out of DATA-06) |
| PRIORITY | P1 user-visible correctness |
| OBJECTIVE | Remove the display-time `getJobCategory` regex reclassification so every surface (homepage preview grouping, `categoryTotals` badge, `/categories/[slug]`, `/opportunities` filter) reflects the stored D1 `category` column. |
| WHY THIS MATTERS | A stored-`other` job with a techy title rendered under ENGINEERING & IT on the homepage while its count badge and `/categories/tech` disagreed, so "See all N" links could understate or contradict what users just saw. |
| CURRENT EVIDENCE | Inconsistency documented in `docs/gauntlet/evidence/DATA-06-taxonomy-convergence.md` (Deliberate exceptions item 2); sole inconsistent surface is `OpportunitySearch` grouping via `getJobCategory`. |
| EVIDENCE STATUS | Defect VERIFIED in code; product direction UNKNOWN until owner decision 2026-08-23. |
| ROOT CAUSE | Display-side heuristic reclassification predates the DATA-06 ingestion taxonomy convergence; it duplicated a decision path the plan had just unified. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | DATA-06 accepted; explicit owner product decision between option (a) trust stored category everywhere and option (b) shared server-side fallback. |
| DEPENDENCIES | REC-01, DATA-06. |
| DECISION | Owner selected **option (a): trust the stored category everywhere** on 2026-08-23. Stored-`other` jobs appear only under GENERAL & OTHER; miscategorized rows are an upstream ingestion-quality concern, not a display-time concern. |
| AFFECTED FILES / SYMBOLS | `apps/web/src/lib/categories.ts` — `getJobCategory`; `apps/web/tests/ui-category-contract.test.ts` (new). |
| CALLERS / DEPENDENTS | `OpportunitySearch.tsx` (sole consumer of `getJobCategory`). |
| BASELINE | Pre-change: six regex families reclassified stored-`other` rows at render time on the homepage only. |
| PRIMARY ADDY SKILL / WORKFLOW | `spec-driven-development` (plan default; contract row = committed spec, owner decision = human gate). |
| OPTIONAL SUPERPOWERS MECHANISM | Fresh independent critic + verification-before-completion. |
| WHY DISTINCT VALUE | User-visible product-taxonomy change requires independent challenge plus recorded owner authority. |
| ASSIGNED MODEL | Repository executor. |
| CRITIC | Independent reviewer with no role in authorship; verified scope, unknown-slug behavioral equivalence, remaining disagreement paths, and test regression-detection power. |
| ESCALATION MODEL | Frontier product/architecture reasoner if a future surface needs reclassification semantics again. |
| WORKTREE REQUIRED | No (single-file behavior deletion + tests; clean synchronized main, sole executor). |
| ALLOWED SCOPE | Simplify `getJobCategory`; add regression tests; document decision. |
| SMALLEST IMPLEMENTATION | `return opp.category || 'other'` plus focused contract tests pinning all six legacy families against stored-`other`. |
| MUST PRESERVE | Stored-category SQL surfaces untouched; no D1 writes/backfill; ingestion/triage/model/source behavior unchanged; G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No category backfill/mutation, no `/categories/[category]` or `/opportunities` query changes, no ingestion/triage changes, no schema change, no new dependencies. |
| REGRESSION SURFACE | Homepage preview group membership; badge/total agreement; hydration payload size (unchanged projection). |
| STEPS | Record owner decision; write failing focused test; implement one-line resolution; run focused then full G3; fresh critic; CI/deploy; record evidence. |
| TESTS | `apps/web/tests/ui-category-contract.test.ts`: stored slugs pass through unchanged; stored-`other` survives every legacy reclassification family (tech/marketing/design/customer-service/admin/finance titles); missing/empty falls back to `other`. |
| PROBES | Post-deploy homepage spot-check that totals badge equals card membership per category. |
| BENCHMARK / EVAL | Focused suite green; full suite green; no other test references `getJobCategory` (grep-verified by critic). |
| AUTOMATION OPPORTUNITY | None beyond existing CI. |
| AUTOMATION CLASS | GUARDED AUTOMATION after owner decision. |
| MATURITY TARGET | A4/A5. |
| OBSERVABILITY | Existing CI; display-only change with no runtime metrics surface. |
| IDEMPOTENCY | Pure function of the row; repeated renders identical. |
| MAINTAINABILITY IMPACT | Removes the last duplicate classification path; single source of truth = stored column. |
| SCALE IMPACT | Removes six regex evaluations per job per keystroke from client grouping. |
| HARDENING IMPACT | Eliminates title-derived rendering divergence; unknown non-slug stored values behave exactly as before (unrendered in preview groups, redirect-guarded on category routes). |
| ACCEPTANCE | Owner decision recorded; focused + full suites green; fresh critic SHIP; CI/deploy green including production Pages deploy. |
| ACCEPTANCE EVIDENCE | `docs/gauntlet/evidence/DATA-06B-ui-category-consistency.md`. |
| REVERT | Revert the two commits; display-only change, no data touched. |
| STOP CONDITIONS | Critic REVISE beyond bounded test hardening; out-of-unit test failures; owner reverses decision. |
| ESCALATION | Revert and return to owner with evidence. |
| DOCUMENTATION | This contract row, evidence file, savepoint baton. |
| COMMIT PLAN | Behavior commit then bounded critic-recommended test-hardening commit. |
| COMMIT BOUNDARY | `getJobCategory`, its consumer's import surface, and its tests only. |
| GITHUB BACKUP | G5 with CI/deploy run IDs. |
| HANDOFF | Decision provenance, diff scope proof, equivalence analysis, run IDs. |
| STATUS | TERMINAL — KEEP (`f00478c` behavior + `041bc2c` test hardening; CI/deploy `32602546093` incl. deploy job `97102984274`; local 606 tests, 0 failures, 1,418 assertions at behavior commit; focused 5/5 after hardening; fresh critic SHIP with one test-power recommendation applied in-unit). Evidence: `docs/gauntlet/evidence/DATA-06B-ui-category-consistency.md` |

## SRC-4D — Investigate and adapt Jobicy combined-origin cadence

| Field | Contract |
| --- | --- |
| UNIT ID | SRC-4D |
| TITLE | Stop Jobicy 429s with shared-origin evidence and bounded adaptive cadence |
| MILESTONE | M5/M11 — Source Doctor and Controlled Source Quality |
| PRIORITY | P1 source health |
| OBJECTIVE | Determine whether the two Jobicy feeds exceed one origin-level allowance; if verified, coordinate them under a persisted bounded cadence/backoff without retries or source-count expansion. |
| WHY THIS MATTERS | Per-source one-hour guards still permit two near-simultaneous requests to the same origin. Repeated 429s are both a reliability and compliance signal. |
| CURRENT EVIDENCE | `packages/scraper/sources.ts` has two enabled `jobicy.com` RSS feeds, each 60 minutes. The 2026-08-22 rollup shows two HTTP 429 failures for each. `sourceCadenceSkipReason` is per source ID. |
| EVIDENCE STATUS | 429s and configuration VERIFIED; combined-origin cause INFERRED until bounded probe/event timing confirms it. |
| ROOT CAUSE | Hypothesis: cadence state is source-scoped while provider limits are origin-scoped; alternative provider policy/outage remains possible. |
| ROOT CAUSE CONFIDENCE | Medium. |
| PREREQUISITES | REC-01, COMP-01A, REL-08; review Jobicy published access guidance/robots/terms; inspect last 7 days of event timing. |
| DEPENDENCIES | REC-01, COMP-01A, REL-08. |
| AFFECTED FILES / SYMBOLS | `packages/scraper/sources.ts` — two Jobicy entries and optional cadence group; `apps/web/src/pages/api/cron/scrape.ts` — `sourceCadenceSkipReason`/fetch-state selection; `source_fetch_state` existing fields if sufficient; expected source-cadence tests; source-health workflow/report only for new metrics. |
| CALLERS / DEPENDENTS | Static RSS scrape path, conditional validators, source events/Sentinel, public Jobicy jobs. |
| BASELINE | Two independently eligible requests/hour to one origin; latest rollup has four Jobicy 429 events total. |
| PRIMARY ADDY SKILL / WORKFLOW | `debugging-and-error-recovery`. |
| OPTIONAL SUPERPOWERS MECHANISM | Systematic debugging + verification before completion. |
| WHY DISTINCT VALUE | The cause must be isolated before adaptive logic is introduced, then live evidence must prove the rate fell without a retry storm. |
| ASSIGNED MODEL | Unassigned; recommended capability: HTTP rate-limit/source reliability executor. |
| CRITIC | Independent compliance/reliability reviewer. |
| ESCALATION MODEL | Architecture/compliance reasoner if provider guidance is unclear or both feeds cannot be retained safely. |
| WORKTREE REQUIRED | No unless shared cadence becomes a generic schema change. |
| ALLOWED SCOPE | Read-only event analysis, Source Doctor probes, optional `cadenceGroup`, deterministic alternation, capped exponential cooldown on 429, metrics/tests. |
| SMALLEST IMPLEMENTATION | Prefer a Jobicy-specific/shared-origin pure scheduler using existing state; on 429 increase next eligible time within fixed min/max and never retry in the same invocation. |
| MUST PRESERVE | Conditional validators per feed, both category intents unless evidence requires pause, one scheduler, robots/terms, dedupe, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No immediate retry, concurrency increase, IP/proxy rotation, user-agent evasion, new Jobicy endpoints/categories, CAPTCHA/bot-wall bypass, or global adaptive scheduler. |
| REGRESSION SURFACE | Feed freshness, alternation starvation, validator state, source-health counts, shared-origin fairness. |
| STEPS | Query event timing; run bounded Source Doctor checks separated by approved interval; verify hypothesis; add failing shared-origin scheduler tests; implement min/max/backoff/recovery; deploy; observe at least 48 hours. |
| TESTS | Pure cadence fixtures for two feeds, 429 backoff, success recovery, clock skew, missing state, starvation; RSS/conditional tests; then G3. |
| PROBES | At most one controlled Jobicy request per approved window; rely primarily on scheduled evidence; record headers/status without body. |
| BENCHMARK / EVAL | Zero same-invocation retry; 429 rate falls to agreed threshold; each feed receives bounded turns; publication lag remains within documented target. |
| AUTOMATION OPPORTUNITY | Bounded origin-level adaptive cadence from persisted status; no autonomous source enabling. |
| AUTOMATION CLASS | GUARDED AUTOMATION. |
| MATURITY TARGET | A4 GUARDED RECOVERY. |
| OBSERVABILITY | Group ID, selected/deferred source, reason, next eligible time, backoff level, 429/success counts, publication lag. |
| IDEMPOTENCY | Scheduler decision is pure for state/time; one state update per actual attempt; repeated 429 response cannot enqueue retries. |
| MAINTAINABILITY IMPACT | Adds one optional group primitive only if two-source evidence proves need. |
| SCALE IMPACT | Bounds provider load; do not generalize until another origin needs it. |
| HARDENING IMPACT | Honors rate-limit signals and prevents retry amplification. |
| ACCEPTANCE | Root cause verified or unit stops with source pause recommendation; if implemented, 48-hour evidence shows reduced 429s, no starvation/retries, and bounded freshness. |
| ACCEPTANCE EVIDENCE | Seven-day pre-baseline, tests, Source Doctor output, 48-hour post-rollup, per-feed attempt/429/publication-lag table. |
| REVERT | Revert cadence config/helper to last known interval; retain evidence/state; pause Jobicy rather than increase traffic if 429s return. |
| STOP CONDITIONS | Terms/robots disallow, Retry-After exceeds product need, hypothesis disproved, 429 persists at minimum traffic, or adaptation needs new infrastructure. |
| ESCALATION | Human chooses pause/one-feed-only/provider contact; no evasion. |
| DOCUMENTATION | Update source capability/health and record accepted cadence/backoff bounds. |
| COMMIT PLAN | `fix(source): coordinate Jobicy origin cadence` only after diagnosis; evidence-only commit may precede it. |
| COMMIT BOUNDARY | Jobicy/shared-origin cadence and tests only; no source expansion. |
| GITHUB BACKUP | G5 with 48-hour evidence follow-up. |
| HANDOFF | G6 plus provider guidance, pre/post event timings, chosen bounds, state key, starvation proof, and next review date. |
| STATUS | PLANNED |

## OPS-05 — Close or roll up recovered source-health alerts

| Field | Contract |
| --- | --- |
| UNIT ID | OPS-05 |
| TITLE | Give automated health issues a stable incident key and verified recovery lifecycle |
| MILESTONE | M15 — Automation Sweep |
| PRIORITY | P1 operational signal quality |
| OBJECTIVE | Deduplicate repeated alerts into one active incident, append evidence, and close it only after a defined healthy observation threshold; never auto-unpause or change production. |
| WHY THIS MATTERS | Current workflows avoid duplicate open issues but do not close/roll up normal recovered incidents, leaving stale warnings and eroding trust in automation. |
| CURRENT EVIDENCE | Sentinel/watchdog/Hunter create date-titled `source-health` issues and skip creation when a matching open issue exists. Only synthetic watchdog issues are explicitly closed. No shared recovery evaluator exists. |
| EVIDENCE STATUS | VERIFIED workflow behavior; current stale-issue count not queried during planning. |
| ROOT CAUSE | Alert creation was automated before a stable incident identity and recovery state machine were defined. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01; COMP-01A and REL-08 for source incidents; inventory current labels/open issues read-only; define healthy streak/window per alert class. |
| DEPENDENCIES | REC-01, COMP-01A, REL-08. COMP-01B benefits from this but does not authorize unpause. |
| AFFECTED FILES / SYMBOLS | Expected `scripts/gha/source-alert-lifecycle.ts` and test; `.github/workflows/gha-sentinel-pulse.yml`; `.github/workflows/gha-ingest-watchdog.yml`; `.github/workflows/gha-hunter-pulse.yml` only if manual alerts remain active; source-health report links. |
| CALLERS / DEPENDENTS | GitHub Actions, GitHub Issues, human incident queue, auto-pause PR notes. |
| BASELINE | One open issue suppresses duplicates; recovery produces no comment/closure except synthetic watchdog. |
| PRIMARY ADDY SKILL / WORKFLOW | `ci-cd-and-automation`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion. |
| WHY DISTINCT VALUE | A synthetic lifecycle test must prove create/update/recover/close behavior without touching real incidents accidentally. |
| ASSIGNED MODEL | Unassigned; recommended capability: GitHub Actions/API automation executor. |
| CRITIC | Independent operations reviewer focused on false closure and permissions. |
| ESCALATION MODEL | Architecture/security reasoner if stable incident identity requires a new external store or broader token scope. |
| WORKTREE REQUIRED | No. |
| ALLOWED SCOPE | Pure lifecycle evaluator, stable incident key in title/body/label, comments on continued failure/recovery, close after threshold, synthetic test issue. |
| SMALLEST IMPLEMENTATION | Use GitHub Issues as existing state: one issue per incident key; pure script emits `CREATE`, `UPDATE`, `HOLD`, or `CLOSE`; workflow executes only that action. |
| MUST PRESERVE | Existing source-health evidence, mass-failure guard, no duplicate issue storm, PAT fallback, auto-pause human unpause rule, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No automatic unpause/source enable, code change based on issue text, AI-generated actions, bulk-closing historical issues, new bot/service, or broader token permissions. |
| REGRESSION SURFACE | Issue search collisions, workflow permissions, synthetic tests, comments/noise, false recovery. |
| STEPS | Define incident keys/states; implement/test pure evaluator; dry-run against mocked issue list; add workflow steps; create-update-close a uniquely labelled synthetic incident; deploy with close threshold. |
| TESTS | Fixture tests for no issue/failing/open/recovered-one/recovered-threshold/recurred/malformed API; workflow syntax/guardrails; then G3. |
| PROBES | Synthetic issue lifecycle with unique run key; read-only inventory of real candidates; no real closure until two healthy observations. |
| BENCHMARK / EVAL | One open issue per key; one bounded comment per state transition; zero false close in fixtures; synthetic lifecycle completes and records timestamps. |
| AUTOMATION OPPORTUNITY | Incident evidence/closure is repeatable and safe; unpause remains human-gated. |
| AUTOMATION CLASS | GUARDED AUTOMATION. |
| MATURITY TARGET | A5 AUTOMATED VERIFICATION for the alert lifecycle; this is not production self-repair. |
| OBSERVABILITY | Incident key, detector, first/last failure, healthy streak, evidence run URLs, action, issue number, close reason/time. |
| IDEMPOTENCY | Stable key + state transition means reruns produce `HOLD`, not duplicate issues/comments/closures. |
| MAINTAINABILITY IMPACT | Shared evaluator replaces duplicated shell fragments. |
| SCALE IMPACT | Incident-key rollup bounds issue/comment growth. |
| HARDENING IMPACT | Healthy streak and synthetic proof prevent premature closure. |
| ACCEPTANCE | Synthetic create/update/recovery/close passes; real healthy incidents are only candidates until threshold; no unpause or production mutation occurs. |
| ACCEPTANCE EVIDENCE | Unit tests, workflow run, synthetic issue URL/timestamps, permission diff, dry-run real action plan. |
| REVERT | Revert workflow/script; issues remain as durable evidence. Reopen any falsely closed issue with corrective comment. |
| STOP CONDITIONS | Search cannot identify incidents uniquely, token needs broader permissions, recovery signal is not authoritative, or workflow would auto-unpause. |
| ESCALATION | Human reviews incident key/threshold or closes historical issues manually. |
| DOCUMENTATION | Document lifecycle states, keys, thresholds, permissions, and explicit no-unpause rule. |
| COMMIT PLAN | `feat(ops): add verified source-alert lifecycle`. |
| COMMIT BOUNDARY | Evaluator/tests/workflow lifecycle only; no detector threshold or source policy changes. |
| GITHUB BACKUP | G5; synthetic issue is required acceptance evidence. |
| HANDOFF | G6 plus incident key schema, thresholds, synthetic issue, real dry-run plan, and permissions. |
| STATUS | TERMINAL — KEEP (`f1d5029` behavior + `dc2699f`, `7f0040b` bounded revisions; CI/deploy `32587929436`, `32588597297`, `32589627739`; 589 tests, 1,367 assertions; synthetic drill run `32588713203` created/advanced/closed issue #72 with timestamps; read-only real dry-run: 5 unkeyed issues → failing CREATE / healthy HOLD; fresh critic REVISE→SHIP). Evidence: `docs/gauntlet/evidence/OPS-05-alert-lifecycle.md` |

## COMP-01B — Gate robots enforcement on reviewed observation evidence

| Field | Contract |
| --- | --- |
| UNIT ID | COMP-01B |
| TITLE | Review a complete observe window, then enable bounded enforcement only if it passes |
| MILESTONE | M6/M15 — Health Memory and Guarded Automation |
| PRIORITY | P1 compliance gate |
| OBJECTIVE | Decide per active source/endpoint whether enforcement is safe from durable evidence; enable fail-closed skipping only behind a reversible gate and only for reviewed coverage. |
| WHY THIS MATTERS | Immediate global enforcement can silently halt ingestion from parser/transient errors, while indefinite observe mode knowingly fetches would-block sources. |
| CURRENT EVIDENCE | `ROBOTS_MODE='observe'`; code comments propose roughly 24 hours but evidence is not durably complete today. COMP-01A is designed to provide static+ATS decisions. |
| EVIDENCE STATUS | Enforcement need VERIFIED; pass/fail decision UNKNOWN until COMP-01A observation window. |
| ROOT CAUSE | Enforcement was intentionally deferred until trustworthy coverage; the missing durable evidence prevented the ratchet. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | COMP-01A and REL-08 accepted; at least one complete reviewed cadence window (minimum 48 hours if any source cadence is 24 hours, otherwise max active cadence plus margin); OPS-05 recommended for alert lifecycle. |
| DEPENDENCIES | REC-01, DB-01, COMP-01A, REL-08; OPS-05 should be accepted before automatic issue closure is claimed. |
| AFFECTED FILES / SYMBOLS | `apps/web/src/pages/api/cron/scrape.ts` — `ROBOTS_MODE`, static/ATS gate handling; `apps/web/wrangler.jsonc` or typed nonsecret env config if mode becomes deploy-configurable; `scripts/ci/check-production-guardrails.ts`; robots tests; compliance evidence report. |
| CALLERS / DEPENDENTS | Every active source fetch, source events, worker acceptance, Sentinel/source-health, public freshness. |
| BASELINE | Observe-only; no reviewed all-active-origin durable window. |
| PRIMARY ADDY SKILL / WORKFLOW | `compliance-checker`. |
| OPTIONAL SUPERPOWERS MECHANISM | Verification before completion + fresh independent critic. |
| WHY DISTINCT VALUE | The decision has a high compliance/freshness blast radius and needs both live proof and an independent challenge. |
| ASSIGNED MODEL | Unassigned; recommended capability: high-skill compliance/reliability executor. |
| CRITIC | Independent compliance and operations reviewer with no role in COMP-01A implementation. |
| ESCALATION MODEL | Frontier architecture/legal-policy reasoner; legal advice may require a qualified human. |
| WORKTREE REQUIRED | Yes for the enforcement commit. |
| ALLOWED SCOPE | Evidence query/report, per-source reviewed disposition, reversible observe/enforce config, fail-closed skip diagnostics, canary/rollback guard. |
| SMALLEST IMPLEMENTATION | If and only if evidence passes, switch reviewed sources to enforcement through a typed config with default observe for unknown/unreviewed endpoints; do not rely on one global unreviewed flip. |
| MUST PRESERVE | Source policy statuses, durable evidence, no bypass, run health truth, source freshness alerting, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No robots override/evasion, no terms reinterpretation, no source auto-enable, no silent allow on gate error, no deletion of evidence, no global enforcement without complete coverage. |
| REGRESSION SURFACE | Source availability, job freshness, robots subrequests/cache, run failure semantics, false block from transient robots outage. |
| STEPS | Query complete window; classify every active endpoint `pass`, `block/pause`, or `unknown`; reviewer signs; add config/tests; canary one source/family if possible; deploy; monitor one full cadence window; expand only after acceptance. |
| TESTS | Observe/enforce allowed/disallowed/unreachable/cache-error tests for static+ATS; config default test; worker response failure/skip accounting; then G3. |
| PROBES | Source Doctor for every active endpoint; pre/post event query; public freshness and source counts through full cadence window. |
| BENCHMARK / EVAL | 100% active endpoint coverage; zero unreviewed fetch under enforce; expected blocked sources skipped with explicit reason; no unexplained freshness collapse. |
| AUTOMATION OPPORTUNITY | Automated observation report and guardrail; enforcement decision remains approval-gated per source. |
| AUTOMATION CLASS | APPROVAL-GATED transition, then GUARDED AUTOMATION. |
| MATURITY TARGET | A5 AUTOMATED VERIFICATION. |
| OBSERVABILITY | Mode/disposition per source, would-block/blocked/gate-error counts, last allowed fetch, freshness delta, rollback trigger. |
| IDEMPOTENCY | Enforcement repeatedly skips the same disallowed endpoint without writing jobs or retrying; config changes are declarative. |
| MAINTAINABILITY IMPACT | Makes compliance mode explicit and source-scoped. |
| SCALE IMPACT | New sources cannot enter enforcement without observation evidence. |
| HARDENING IMPACT | Converts compliance intent into testable fail-closed behavior with rollback. |
| ACCEPTANCE | Reviewed evidence covers every active endpoint; critic passes; canary/full cadence shows explicit expected blocks and no unexplained outage; rollback tested. If evidence fails, accepted outcome is `BLOCKED/NO FLIP` with source pause recommendations. |
| ACCEPTANCE EVIDENCE | Observation report, reviewer sign-off, config diff, test/CI/release runs, pre/post cadence metrics, rollback drill. |
| REVERT | Flip affected source config to observe or pause it; retain evidence and additive schema; revert code only if gate behavior is defective. |
| STOP CONDITIONS | Any active endpoint lacks evidence, robots result/terms ambiguous, gate errors spike, freshness drops beyond threshold, or rollback cannot be performed quickly. |
| ESCALATION | Pause affected source and request human compliance/architecture decision; never bypass. |
| DOCUMENTATION | Record each source disposition, window, reviewer, enforcement date, and rollback trigger. |
| COMMIT PLAN | One isolated config/guard commit after evidence approval; later evidence-only acceptance commit. |
| COMMIT BOUNDARY | Enforcement gating only; no source/cadence/parser changes. |
| GITHUB BACKUP | G5 with canary/full observation run IDs. |
| HANDOFF | G6 plus endpoint matrix, evidence window, reviewer, config, block/error/freshness metrics, and rollback trigger. |
| STATUS | PLANNED |

## REC-02 — Minimal-context interruption and resume drill

| Field | Contract |
| --- | --- |
| UNIT ID | REC-02 |
| TITLE | Prove a fresh executor can resume verified partial work without chat history |
| MILESTONE | M23 — Interruption-Recovery Drill |
| PRIORITY | P1 program competence |
| OBJECTIVE | Intentionally pause a safe bounded unit at a durable checkpoint, hand only repository artifacts/branch to a fresh executor, and measure correct resumption, non-repetition, verification, and escalation. |
| WHY THIS MATTERS | Portability is an unverified claim until a new model can determine what happened, what remains, what not to redo, and the next exact action from GitHub/repository state alone. |
| CURRENT EVIDENCE | Recovery docs and historical checkpoints exist, but no controlled minimal-context resume drill with scored results is present. |
| EVIDENCE STATUS | MISSING eval; repository memory mechanisms VERIFIED to exist. |
| ROOT CAUSE | Continuity practices grew incidentally and have not been tested adversarially as a system. |
| ROOT CAUSE CONFIDENCE | High. |
| PREREQUISITES | REC-01 accepted; at least one low-risk code unit accepted; choose a new low-risk non-migration/non-security unit with a safe midpoint; human agrees to synthetic interruption. |
| DEPENDENCIES | REC-01 and one completed checkpoint. It should run before the program claims multi-model portability. |
| AFFECTED FILES / SYMBOLS | `docs/gauntlet/IMPLEMENTATION_UNITS.md`; canonical baton `docs/SYSTEM_SAVEPOINT.md`; `docs/HANDOFF.md`; expected `docs/gauntlet/evidence/REC-02-resume-drill.md`; temporary branch/worktree for the selected unit. Production files are only those already authorized by that selected unit. |
| CALLERS / DEPENDENTS | All future executors, execution-state process, GitHub checkpoint practice. |
| BASELINE | No measured handoff success rate, time-to-next-action, repeated-work count, or hidden-context dependency. |
| PRIMARY ADDY SKILL / WORKFLOW | `executing-plans`. |
| OPTIONAL SUPERPOWERS MECHANISM | Fresh subagent execution + worktree isolation. |
| WHY DISTINCT VALUE | Context isolation is the object of the test; a fresh executor and isolated branch are materially distinct, not ceremony. |
| ASSIGNED MODEL | Unassigned; first executor and fresh resumer should be different sessions/providers if practical; recommended capability: standard bounded coding agent. |
| CRITIC | Independent observer scores the handoff without supplying missing context. |
| ESCALATION MODEL | Architecture/process reasoner only after the fresh executor records a genuine contradiction. |
| WORKTREE REQUIRED | Yes, newly created only after REC-01. |
| ALLOWED SCOPE | Safe selected unit, explicit incomplete checkpoint, pushed branch, execution-state/handoff updates, timed/scored resume, cleanup after acceptance and human-approved merge disposition. |
| SMALLEST IMPLEMENTATION | First executor completes baseline + failing test or another reversible midpoint, commits `WIP/INCOMPLETE`, pushes, updates baton, stops; fresh executor receives only G6 artifacts and continues or correctly blocks. |
| MUST PRESERVE | Incomplete status, no merge/deploy of partial work, unrelated worktrees, original unit acceptance, test evidence, and G1. |
| DO NOT TOUCH / FORBIDDEN SCOPE | No migration/security/compliance/enforcement/data-repair unit as drill subject, no hidden chat briefing, no fabricated interruption, no force push, no merge of failing code to main, no cleanup before evidence capture. |
| REGRESSION SURFACE | Selected low-risk unit only; process risk is accidental merge or missing checkpoint. |
| STEPS | Select subject/rubric; create branch/worktree; executor A records baseline and partial proof; push incomplete checkpoint; clear context; executor B reads only allowed artifacts; score comprehension/action; finish/revert subject; critic reviews; document improvements. |
| TESTS | Selected unit’s focused/full tests at both checkpoints; verify incomplete branch cannot enter normal release; validate links/commands in handoff. |
| PROBES | Ask executor B five questions before action: current status, verified work, remaining work, forbidden redo, next command; record answers/time/files opened. |
| BENCHMARK / EVAL | Correct answers 5/5; zero hidden prompts; zero repeated/destructive work; reaches correct next action within agreed file/context budget; final unit meets its own acceptance or blocks correctly. |
| AUTOMATION OPPORTUNITY | Handoff schema lint and stale execution-state detector. |
| AUTOMATION CLASS | MANUAL drill; later FULL AUTOMATION for lint only. |
| MATURITY TARGET | A6 SELF-DOCUMENTING/REPORTING. |
| OBSERVABILITY | Timestamps, models/capability class, files opened, commands, context supplied, time-to-orientation, repeated steps, questions, outcome. Do not record private chain-of-thought. |
| IDEMPOTENCY | Drill uses a unique branch/run ID; reruns create separate evidence and never overwrite prior scores. |
| MAINTAINABILITY IMPACT | Tests whether docs reduce future reasoning cost. |
| SCALE IMPACT | Establishes a repeatable way to swap executors without multiplying archaeology. |
| HARDENING IMPACT | Proves partial work cannot masquerade as accepted or disappear. |
| ACCEPTANCE | Fresh executor correctly resumes or correctly blocks using only allowed artifacts; no partial merge/deploy; critic scores rubric; identified documentation gaps are fixed. |
| ACCEPTANCE EVIDENCE | Both commits/branch, before/after execution state, exact context packet, rubric scores, command logs, critic verdict, final branch disposition. |
| REVERT | Revert/abandon the drill branch through normal recoverable Git process; retain evidence document; do not delete worktree until human confirms nothing unique remains. |
| STOP CONDITIONS | No safe subject unit, branch protection cannot prevent partial merge, executor receives hidden context, unique user work appears, or checkpoint cannot be pushed safely. |
| ESCALATION | Human selects another subject or approves cleanup/disposition; process owner resolves documentation contradiction. |
| DOCUMENTATION | Create drill evidence; update handoff template/execution state with only proven improvements. |
| COMMIT PLAN | Incomplete checkpoint commit on drill branch, accepted/reverted subject commit, separate docs evidence commit on normal planning branch. |
| COMMIT BOUNDARY | Do not combine drill-process fixes with unrelated production behavior. |
| GITHUB BACKUP | Mandatory pushed incomplete branch labelled non-mergeable, followed by final disposition and evidence commit. |
| HANDOFF | G6 plus exact context packet, five-question answers, score, files/commands used, deviations, final disposition, and next drill improvement. |
| STATUS | PLANNED |

## Execution checkpoints

### Checkpoint A — immediate safety

REC-01, DATA-05A, REL-09, SEC-03, DB-01, REL-10, and OPS-06 are individually accepted or explicitly blocked. No migration-writing unit starts while DB-01 is unresolved.

### Checkpoint B — trustworthy evidence

DATA-03 and OPS-04 have fresh bounded evidence. COMP-01A has deployed durable robots observations for static and ATS paths. Unknowns remain labelled unknown.

### Checkpoint C — guarded capability

REL-08, DATA-05B, DATA-06, SRC-4D, and OPS-05 meet their own evals. No source was expanded, no automatic unpause was added, and no data repair occurred without approved evidence.

### Checkpoint D — compliance and portability

COMP-01B either passes its reviewed observation/canary gate or records a safe no-flip outcome. REC-02 proves or disproves minimal-context resumption with durable evidence.
