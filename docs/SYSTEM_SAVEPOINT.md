# System Savepoint

## Run 30 — SP-13 BLOCKED (real NO-GO, robots.txt) (2026-08-30)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-13 SmartRecruiters public Posting API adapter)**. First unit needing a genuinely NEW adapter — SmartRecruiters was not previously supported anywhere in this project, unlike SP-11 (Lever)/SP-12 (Greenhouse) which both reused existing `ats.ts` fetch functions.

`packages/scraper/smartrecruiters.ts` (self-contained; does not extend `ats.ts`'s `AtsPlatform` union or touch `scrape.ts`'s live cron loop): `parseSmartRecruitersListResponse` filters `visibility==="PUBLIC"` and normalizes to minimal fields — the list endpoint carries no description content at all, so nothing needs active stripping. `hasMoreSmartRecruitersPages` is deterministic offset/limit/totalFound pagination. `deriveSmartRecruitersPostingUrl` reconstructs the canonical apply URL from `id`+slugified title (the list response omits it; a per-posting detail fetch would be an N+1 pattern this project avoids) — verified to exactly reproduce two real live postings, including one with a trailing space in the title (SmartRecruiters keeps a trailing hyphen; the slugify function reproduces this exactly). `packages/scraper/smartrecruiters-canary.ts` provides the profile/candidate-row builder, reusing SP-12's shared `decidePromotionToShadow` from `source-promotion.ts`.

**Curated-company discovery repeated SP-11's lesson at a new layer.** Several guessed real companies (`visa`, `mcdonalds`, `bosch`, `skechers`, `ikea`, `yelp`, and others) all returned `HTTP 200` with `totalFound:0` — this is the API's lenient behavior for a non-existent or feed-disabled `companyIdentifier`, not proof of zero postings (the docs note not every customer plan has the public feed enabled). Settled on the vendor's own dogfooded account (`companyIdentifier=smartrecruiters`) — same pattern as SP-11's Lever choice — which had 2 real, genuinely open postings with correct `visibility`/pagination fields, confirming the schema.

**Then the real finding: `api.smartrecruiters.com`'s own `robots.txt` disallows the entire host for every crawler except LinkedIn's bot specifically:**

```
User-agent: LinkedInBot
Allow: /v1/companies/
User-agent: *
Disallow: /
```

Confirmed by a direct `curl` fetch, not just the probe's own read. This is host-wide (all SmartRecruiters customers share this one API origin), so it is not company-specific and there is no point trying a different one. The real, live SP-07 shadow probe correctly refused to fetch at all (`POLICY_BLOCKED`, `requestCount: 1`, stopped after the robots check); `buildEvidencePacket` correctly returned `status: candidate` with `missingEvidence` naming the robots block explicitly; `decidePromotionToShadow` correctly returned `ok: false`. **This is the evidence-gating machinery working exactly as designed** — refusing a source its own robots.txt disallows, matching this project's long-standing "public readability is not aggregation authority" posture already applied to Greenhouse and Breezy (SP-12, SP-17).

**This is meaningfully different from SP-11/SP-12: there is no pending write to authorize.** The evidence itself is negative. This unit's outcome is a genuine dead end for the current robots-observe-then-enforce posture, not a hold awaiting owner sign-off. It would only become viable with explicit written permission or a documented partner path overriding the blanket disallow — the same evidence bar SP-17 already applies to the permission tier. None was sought or fabricated.

Deploy evidence:

- Behavior commit **`0b25e87`** on `codex/sp-13-smartrecruiters-adapter` (PR #94); merge commit **`5a0b915`** on `main` (squash). (First merge attempt hit a transient GitHub API TLS-handshake timeout with no state change — confirmed via `gh pr view` before retrying; the retry succeeded cleanly.)
- PR exact-SHA CI run **`33291457568`** (head `0b25e87`, pull_request): validate 941/0 + build ok; deploy skipped (PR path).
- `main`-push exact-SHA CI/deploy run **`33291789840`** (head `5a0b915`): validate ✅, migrate/deploy ✅ (no schema change).
- Local full gate at behavior `0b25e87`: `941 pass / 0 fail / 3022 assertions / 92 files` (+19 from SP-11's 922), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok.
- **Environment note:** disk swung from 894MB down to 152MB and back up to 894MB again across this one unit's gate steps; paced typecheck/guardrails/build each behind an explicit check, waiting out one low point before attempting the build. Nothing failed or was attempted against a critical disk state.

Terminal decision: **BLOCKED** (a distinct status from VERIFYING — the code/evidence are complete and correct, but the finding itself forecloses activation under current policy, not merely awaiting confirmation).

Rollback: N/A — no D1 write was ever attempted. Code is retained as correct, tested, and immediately reusable if explicit permission is later obtained.

Next exact action: **SP-14 (Teamtailor public RSS adapter)** — needs a new RSS adapter plus a real curated company career-domain found via research (the plan explicitly warns against suffix-guessing custom domains, unlike this unit's identifier-guessing approach). After that, **SP-15 (Recruitee XML adapter)**. Both follow the same safe code+evidence-only shape; both may end in either a pending-confirmation VERIFYING (like SP-11/12) or a real BLOCKED finding (like this unit) — the outcome should be reported honestly either way, not steered toward one or the other.

## Run 29 — SP-11 VERIFYING, same shape as SP-12 (2026-08-30)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-11 Lever public Postings API canary)**. Owner said "proceed with all remaining work, all approved" then "proceed" past two disk-driven pauses; both explicitly did **not** re-open SP-12's classifier-blocked D1 write, which stays held for the owner's own review of the evidence.

Mirrors SP-12's structure exactly. Extracted `packages/scraper/source-promotion.ts` (11/11 tests) — the provider-agnostic `decidePromotionToShadow` (SP-05 lifecycle guard + SP-08 evidence-packet completeness + SP-07 shadow health) — out of SP-12's Greenhouse-only copy now that a second provider needs the identical logic. **SP-12's already-merged `greenhouse-canary.ts` was left untouched**, avoiding any reopening of already-accepted work. `packages/scraper/lever-canary.ts` (6/6 tests) provides the Lever provider profile (`contentScope=minimal_with_truncated_summary` — honestly distinguished from Greenhouse's location-only scope, since the existing `fetchLever` adapter stores a 500-char-truncated description too) and candidate-row builder; `allowedHosts` covers both `api.lever.co` (global) and `api.eu.lever.co` (EU), satisfying SP-11's "EU/global origin explicit" criterion.

**Curated-target discovery took real work this time.** A dozen well-known "companies using Lever" names (Netflix, Figma, Reddit, Shopify, Klarna, Robinhood, etc., some pulled from third-party aggregator sites via WebSearch) all returned HTTP 404 against the live public API — those lists are stale. Settled on **Lever's own careers board** (token `lever`) — the vendor dogfooding its own product — as the most unambiguous provenance obtainable without further guessing.

Real live SP-07 probe against `api.lever.co/v0/postings/lever?mode=json`: **`HEALTHY_EMPTY`** (HTTP 200, valid empty JSON array, robots allowed, 2 requests). Zero current postings is honest, real evidence — `HEALTHY_EMPTY` is one of the two outcomes `decidePromotionToShadow` accepts (alongside `HEALTHY_WITH_RESULTS`); `buildEvidencePacket` separately flags it as `unresolvedQuestions: ["shadow healthy but empty..."]` without blocking `review_ready` status. Evidence: `docs/gauntlet/evidence/SP-11-lever-lever-day1-evidence.md`. Same STOP as SP-12: the actual registry write was not attempted (classifier-blocked class of action), held for explicit owner confirmation.

**Environment note — the most severe disk cycling yet.** During this single unit: 705MB → ran full suite (552s, flaky 1-fail run, likely environment-induced given the slow duration) → 250MB → re-ran clean (55s, 922/0, confirming the flake was transient and unrelated to SP-11's pure/no-I/O files) → 83MB → **0 bytes** → 312MB → 371MB (typecheck) → 374MB (guardrails) → 342MB (build succeeded). Paced every step behind an explicit disk check this time, holding at each low point rather than pushing through; no operation was attempted against a zero/critical disk state, and nothing failed or corrupted as a result.

Deploy evidence:

- Behavior commit **`e03d167`** on `codex/sp-11-lever-shadow` (PR #93); merge commit **`070694e`** on `main` (squash).
- PR exact-SHA CI run **`33290057655`** (head `e03d167`, pull_request): validate 922/0 + build ok; deploy skipped (PR path).
- `main`-push exact-SHA CI/deploy run **`33290103467`** (head `070694e`): validate ✅, migrate/deploy ✅ (no schema change).
- Local full gate at behavior `e03d167`: `922 pass / 0 fail / 2979 assertions / 90 files` (+17 from SP-12's 905), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok.

Terminal decision: **VERIFYING** — code merged and safe; zero D1 mutation. Not TERMINAL until the owner authorizes the write and the real 7-day shadow/7-day canary windows complete (and, separately, until either this zero-yield board or a currently-hiring Lever employer with equally exact provenance is chosen for the actual canary-yield criterion).

Rollback: N/A (nothing written to D1).

Next exact action: **owner reviews both SP-11 and SP-12's evidence docs together** and decides on the pending writes (or names different boards). Independently, **SP-13 (SmartRecruiters)** is next in the safe code+evidence-only track — it needs a genuinely new adapter (SmartRecruiters isn't in the existing `AtsPlatform` union) plus a real curated company found via research, unlike SP-11/SP-12's adapter reuse.

## Run 28 — SP-12 VERIFYING, D1 write withheld pending owner confirmation (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-12 Greenhouse minimal-index shadow)**.
First unit attempted from the SP-08/SP-09-dependent adapter track (SP-11..SP-15). Chosen because this repo already has the deepest evidence base for Greenhouse (COMP-01B/C/D official-source review history; SP-07's shadow prober already proven end-to-end against a real `boards-api.greenhouse.io` example).

**Discovery that simplified scope:** the existing `fetchGreenhouse` adapter (`packages/scraper/ats.ts`, written under an earlier unit and left paused) already implements exactly the minimal-index content scope SP-12's first acceptance criterion requires — title, canonical `absolute_url` linkback, a location-summary string, **never the full HTML description**, no application-submission call. No new adapter was needed; only the registry-backed compliance decision and evidence-gated promotion logic.

Built `packages/scraper/greenhouse-canary.ts` (pure, 11/0 tests): `buildGreenhouseProviderProfile` (mechanism `ats_api`, auth `none`, `contentScope=minimal`, 180-day evidence lease), `buildGreenhouseCandidateRow` (one curated board → `conditional`/`candidate`), `decidePromotionToShadow` (SP-05 lifecycle guard + SP-08 evidence-packet completeness + SP-07 shadow health, all three required). Chose Grafana Labs (`greenhouse:grafanalabs`, one of the five already-known real boards paused under COMP-01D) as the curated target and ran a real, live, bounded SP-07 shadow probe against the actual public endpoint: **`HEALTHY_WITH_RESULTS`, 134 real open jobs, schema ok, robots allowed, 2 requests, 85,014 bytes**. Feeding this into `buildEvidencePacket` produced `status=review_ready` with zero missing evidence, and `decidePromotionToShadow` returned `ok=true`. Full evidence: `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`.

**STOP — classifier-blocked, not routed around.** Generating the actual `INSERT`/`UPDATE` SQL to write this decision to production `source_registry`/`provider_profiles`/`source_decisions` was blocked by the harness's own auto-mode safety classifier. Per its own instruction ("should not attempt to work around this denial... should STOP and explain"), no alternate path was attempted. This is treated as a genuine, correct stop condition: activating any source outside the current exact-six — even into `shadow`, which `policy-resolver.ts`'s `isPublishable` guarantees is non-publishing regardless of compliance state — is exactly the kind of boundary the strategy's own anti-expansion guard exists to protect, and the standing "proceed with all, fair and reasonable" authorization from this session should not be read to override a classifier-level block on a real compliance-state change. **No D1 write occurred.** `greenhouse:grafanalabs` remains exactly as before: absent from the registry, `paused`/`enabled=false` in the unchanged `ATS_TOKEN_POLICIES` fallback.

Deploy evidence (code only, zero D1 mutation):

- Behavior commit **`7769d69`** on `codex/sp-12-greenhouse-shadow` (PR #92); merge commit **`23e74dd`** on `main` (squash).
- PR exact-SHA CI run **`33261115225`** (head `7769d69`, pull_request): validate 905/0 + build ok; deploy skipped (PR path).
- `main`-push exact-SHA CI/deploy run **`33261164559`** (head `23e74dd`): validate ✅, migrate/deploy ✅ (no schema change — code + evidence doc only).
- Local full gate at behavior `7769d69`: `905 pass / 0 fail / 2940 assertions / 88 files` (+11 from SP-17's 894), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok.

Terminal decision: **VERIFYING** — code merged and safe; the actual registry promotion is a separate, explicit decision awaiting the owner. Not TERMINAL until that write happens and the real 7-day shadow + 7-day canary observation windows (which cannot be compressed into any single session) complete.

Rollback: N/A for what's merged (no D1 write to undo). If/when the pending write is authorized and applied: delete the two registry rows (or set `opt_out=1`) to roll back; no opportunity data would ever be touched since shadow never publishes.

**Session-end note (autonomous run, ~3 hours, SP-08 recovery through this point):** the owner authorized continuous unattended execution ("proceed with all... do not stop... approved") while resting ~8 hours. Delivered TERMINAL — KEEP: SP-08 (finished a prior session's in-progress work), SP-09 (Workable feasibility), SP-16 (employer intake), SP-17 (partner/permission pipeline). SP-12 reached VERIFYING with real evidence but stopped at the classifier boundary. **SP-11/SP-13/SP-14/SP-15 (Lever/SmartRecruiters/Teamtailor/Recruitee) would each hit the identical classifier block at their own equivalent registry-write step**, so the autonomous run stops here rather than repeating the same blocked pattern four more times; their adapter/evidence code could still be built in the same code-only shape as SP-12 if wanted. Two more disk-full interruptions occurred mid-session (recurring ~20–40 min apart, environment-external, owner actively investigating); no operation was ever attempted against a full disk.

Next exact action: **owner reviews `docs/gauntlet/evidence/SP-12-greenhouse-grafanalabs-day1-evidence.md`** and either authorizes the pending registry write (after which SP-12 proceeds to a real 7-day shadow observation, then canary) or names a different curated board / declines. Independently, **SP-11/13/14/15** adapter+evidence code (mirroring SP-12's shape, no D1 write) remain available to build on request.

## Run 27 — SP-17 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-17 partner/permission evidence pipeline)**.
The other SP-05-independent ready unit, built immediately after SP-16. Prepares artifacts only — sends no message, accepts no paid terms, activates no generic source, per the unit's own explicit boundary.

`packages/scraper/partner-permission.ts` (pure): `buildPermissionEvidencePack` marks a pack `outreach_ready` only when all nine required fields (provider route, contact path, requested scope, data minimization, attribution, cadence, removal semantics, no-candidate-data terms, evidence URL) are present, else `draft` + exact `missingFields`. `attachPermissionToSourceAccount` computes the exact `source_registry.policyExpiry` a grant would attach — a **365-day** lease via SP-05's own `computePolicyExpiry` — and names `source_opt_outs` as the revocation mechanism (SP-05's existing durable memory; no new mechanism invented).

Each of the three named permission-tier targets got a real, revalidated (fetched live this session, not carried over from the 2026-08-29 strategy doc without checking) evidence pack:

- **Ashby** — `integrations@ashbyhq.com`, hourly JSON/XML dedicated partner feed, customer opts in via Ashby's own Admin section → **outreach_ready**.
- **Breezy** — re-fetching `developer.breezy.hr/reference/authorization` found **no documented partner-request path at all**: every API call needs a Personal Access Token the *customer* (the employer) generates inside their own Breezy account. `providerRoute`/`contactPath` are honestly `null` → **draft**, with the pack's notes explicitly redirecting future work to employer opt-in (SP-16/directory-driven), not Breezy partner outreach — correcting what the strategy doc's summary table implied ("Permissioned only") without spelling out that there's no partner program to contact in the first place.
- **Jobvite** — `/marketplace/partner-request/` application, demo-request path, and a phone line are documented → **outreach_ready**, though Jobvite's actual technical/API terms remain unknown until they respond (no developer docs URL was found).

`docs/gauntlet/evidence/SP-17-partner-permission-{ashby,breezy,jobvite}.md` are generated directly from the tested `renderPermissionPackReport`, not hand-duplicated.

Deploy evidence:

- Behavior commit **`cede086`** on `codex/sp-17-partner-permission-pipeline` (PR #91); merge commit **`39e88b5`** on `main` (squash).
- PR exact-SHA CI run **`33259720037`** (head `cede086`, pull_request): validate 894/0 + build ok; deploy skipped (PR path).
- `main`-push exact-SHA CI/deploy run **`33259776422`** (head `39e88b5`): validate ✅, `Apply D1 migrations to production` ✅ (no new migration — additive code/docs only), `Verify D1 full-text index integrity` ✅, `Deploy to Cloudflare Pages` ✅.
- Local full gate at behavior `cede086`: `894 pass / 0 fail / 2911 assertions / 87 files` (+11 from SP-16's 883), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok.

Terminal decision: **KEEP**.

Rollback: archive/delete the three evidence-pack docs and `partner-permission.ts`/`.test.ts`; nothing else references them (no export wired into any route). No D1 write to undo, no source activated.

Next exact action: the SP-05-independent track (SP-16, SP-17) is now fully drained. **SP-11..SP-15** (Lever/Greenhouse/SmartRecruiters/Teamtailor/Recruitee canaries) are the remaining SP-08/SP-09-dependency-ready units — one live production canary at a time. Starting **SP-12 (Greenhouse minimal-index shadow/canary)** next: this repo already has the deepest evidence base for Greenhouse (COMP-01B/C/D official-source review history, SP-07's shadow prober already proven end-to-end against a real `boards-api.greenhouse.io` example). Implementing the adapter and starting its shadow; the unit's own 7-day shadow + 7-day canary observation window cannot be compressed into one sitting — will report VERIFYING/IN PROGRESS honestly, not a fabricated KEEP.

## Run 26 — SP-16 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-16 no-account employer "bring your feed" intake)**.
Independently ready after SP-05 (not gated on SP-08/SP-09); built while SP-16 waited alongside the SP-09→SP-11..15 track.

`.github/ISSUE_TEMPLATE/employer-feed-intake.yml` (structured GitHub issue form, explicit "do not paste secrets/resumes" warning, auto-labels `employer-feed-submission`) + `.github/workflows/gha-employer-intake.yml` (triggered on `issues: opened/edited/labeled`, posts the raw rendered body to the new route, comments the outcome back) + `packages/scraper/employer-intake.ts` (pure: `parseIssueForm` rejects the **entire** submission if secret-like content — API keys, private-key blocks, GitHub/AWS tokens — or candidate-personal-data-like markers — resume/CV, DOB, SSN, passport — appear *anywhere* in the body, before parsing individual fields; validates https feed URL / company name / plausible contact email / checked authorization box; `buildEmployerCandidateRow` keys the candidate by exact host so repeat submissions collapse to one durable row) + `apps/web/src/pages/api/cron/employer-intake.ts` (`PROXY_SECRET`-gated, same `isAuthorized` pattern as every other cron route; **re-parses and re-validates server-side**, never trusts the workflow's own reading; checks against live `source_registry`+`source_opt_outs`; ensures a synthetic `employer-submitted` provider profile — `customer_auth` mechanism — exists; inserts idempotently via `onConflictDoNothing`).

Every accepted submission is `needs_review`/`candidate` — SP-05's compliance-holds-never-auto-promote rule applies identically; nothing here can enter shadow without a separate human-reviewed decision, exactly like any other Prospector/Doctor-discovered candidate.

**Process note:** first drafted directly on `main` again by habit from the SP-09 slip; caught immediately this time before any commit and moved to `codex/sp-16-employer-intake` before committing.

**Disk-space interruptions (environment, project-external):** hit 0 bytes free twice more during this unit (build attempt, then again right before the merge-readiness check) — each time on a schedule of roughly 20–40 minutes regardless of what work was running, which the owner is now actively investigating as a background process on their machine, not something this project causes. Work paused cleanly each time (no operation was attempted against a full disk) and resumed once the owner freed space.

Deploy evidence:

- Behavior commit **`8d1a05a`** on `codex/sp-16-employer-intake` (PR #90); merge commit **`eba3c0f`** on `main` (squash).
- PR exact-SHA CI run **`33257941631`** (head `8d1a05a`, pull_request): validate 883/0 + build ok; deploy skipped (PR path).
- `main`-push exact-SHA CI/deploy run **`33258746613`** (head `eba3c0f`): `Detect deployable changes` ✅, `Validate project-owned code` ✅, `Migrate and deploy production` ✅ (additive route only, no schema change so no meaningful migration delta).
- Local full gate at behavior `8d1a05a`: `883 pass / 0 fail / 2878 assertions / 86 files` (+23 from SP-09's 860), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok.
- **Post-deploy live check (safe, zero D1 writes):** unauthenticated `POST https://remotejobs-ph.pages.dev/api/cron/employer-intake` returns **HTTP 401** — confirms the route is live and auth-gated exactly like every other cron route. Real end-to-end acceptance (an actual employer opening a labeled issue) will happen organically the first time someone uses the intake path; this unit does not fabricate a synthetic issue to force that observation.

Terminal decision: **KEEP**.

Rollback: remove/disable `.github/workflows/gha-employer-intake.yml` (or delete the issue template so the label is never applied); the route staying deployed but uninvoked is inert. No D1 row exists to undo from this unit itself.

Next exact action: **SP-17** (partner/permission evidence pipeline) is the other SP-05-independent ready unit — building it next. **SP-11..SP-15** (Lever/Greenhouse/SmartRecruiters/Teamtailor/Recruitee canaries) remain the SP-08/SP-09-dependency-ready units after that, one live canary at a time; **SP-10** (Workable adapter) needs a real multi-day shadow/canary window.

## Run 25 — SP-09 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-09 Workable global XML feed feasibility)**.
Owner authorized continuous unattended execution across the queue ("proceed with all... do not stop... approved") while resting for ~8 hours, extending prior per-unit merge approval into a standing authorization for this session, within the program's existing STOP conditions.

Fetched the official Workable feed documentation (`https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed`) to get the real feed URL, then ran one bounded live probe of `https://www.workable.com/boards/workable.xml` (public, no-auth, hourly cadence, explicitly for job boards/partners): **44.41 MiB, 11,603 raw `<job>` entries, 10,000 distinct by `<url>` (645 values duplicated within the single fetch — same posting emitted twice), 2,421 `remote=true`, 337 `country=PH`**, schema exactly matching documentation. `scripts/diagnostics/workable-feasibility.ts` (`probe`/`analyze`/`report` CLI, pure `analyzeFeed`/`classifyRuntime`/`renderReport`) formalizes the decision rule and is tested against a small synthetic fixture (18/0) — never a stored copy of the live feed. **Decision: `GITHUB_ACTION_PREPROCESSING`** — both byte size and item count exceed a single source's reasonable share of the shared 10-minute scrape-tick budget (~6 other sources + AI triage in one invocation); a dedicated hourly GHA job matches the feed's own cadence and has no such shared-budget constraint, mirroring this repo's existing Prospector/directory-maintenance pattern. The raw feed body was measured then deleted (disk-space-constrained environment — see below); only the computed `FeedAnalysis` is retained as evidence in `docs/workable-feasibility-latest.md`. Zero D1 writes; no per-token Workable adapter enabled; no runtime change.

**Process note (self-corrected):** the behavior commit was first made directly on `main` by mistake (deviating from the established `codex/*` branch + PR + CI pattern every other SP unit used). Caught before any push — `origin/main` was unaffected. Moved the commit onto a new branch (`git branch codex/sp-09-workable-feasibility <sha>; git reset --hard origin/main`) and proceeded through the normal PR flow.

**Disk-space incident (environment, not project):** mid-probe, the machine's C: drive hit 0 bytes free (pre-existing condition — a routine 46 MB feed download tipped it over, not the cause). Deleted the probe's own temp files immediately, paused all disk-writing work, and reported the finding to the owner rather than attempting any cleanup of unrelated files (out of scope / prohibited). Owner freed space and confirmed proceed; work resumed once real headroom existed. This machine's disk stayed tight throughout the rest of this run (own footprint negligible — `dist`/`.vite` caches together are ~5 MB — something else on the system is independently consuming space); future units should check `df -h` before any build/large-fetch step.

Deploy evidence:

- Behavior commit **`618dba9`** on `codex/sp-09-workable-feasibility` (PR #89); merge commit **`806b2d7`** on `main` (squash).
- PR exact-SHA CI run **`33256108988`** (head `618dba9`, pull_request): validate 860/0 + build ok; deploy skipped (PR path).
- `main`-push exact-SHA CI/deploy run **`33256179738`** (head `806b2d7`): validate success, `Migrate and deploy production` success (no schema/runtime change in this unit, so no meaningful migration/behavior delta — diagnostic script + docs only).
- Local full gate at behavior `618dba9`: `860 pass / 0 fail / 2829 assertions / 85 files` (+18 from SP-08's 842), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (slower than usual, ~160s, under disk pressure but completed cleanly).

Terminal decision: **KEEP**.

Rollback: delete `scripts/diagnostics/workable-feasibility.ts`/`.test.ts`/`docs/workable-feasibility-latest.md`; nothing else references them (no export from `packages/scraper/index.ts`, no runtime import). No D1 write to undo.

Next exact action: **SP-11 (Lever public Postings API shadow/canary), SP-12 (Greenhouse minimal-index shadow/canary), SP-13 (SmartRecruiters), SP-14 (Teamtailor RSS), SP-15 (Recruitee XML)** are all SP-08-dependency-ready now and may proceed in parallel branches (production canaries remain sequential — one provider mechanism live at a time). **SP-10 (Workable adapter/shadow/canary)** is also now dependency-ready given SP-09 KEEP, but its own acceptance criteria require a real 7-day shadow + canary observation window that cannot be manufactured in one sitting — implement and start shadow, do not fabricate a premature KEEP. SP-16/SP-17 remain ready after SP-05 independent of SP-08/09.

## Run 24 — SP-08 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-08 evidence packets and review-debt alerts)**.
Session resumed cold from a pasted bootloader with an all-`UNKNOWN` state block. Read-only preflight found `codex/sp-08-evidence-packets` already checked out with HEAD identical to `origin/main` (`ef68525`) and three uncommitted files: `packages/scraper/evidence-packet.ts` + `evidence-packet.test.ts` (a prior session's complete, already-passing 22/0 core module implementing all three SP-08 acceptance criteria) and the matching `packages/scraper/index.ts` re-export. The owner confirmed EXECUTE to finish the unit.

Delivered the missing integration slice: `scripts/diagnostics/evidence-packets.ts` (read-only `sql`/`meta`/`emit`/`collect`/`packets`/`report` CLI, same shape as `source-economics.ts`) joins `source_registry` (`operational_state='candidate'`) to `provider_profiles` and feeds `buildEvidencePacket`. No shadow evidence is fabricated — SP-07's `candidate-shadow.ts` probe has no persisted result table by design (`diagnostic.mutations=0`), so every real candidate honestly reports `"shadow probe not yet run"` until a probe result is separately supplied; this is expected, not a bug. `scripts/diagnostics/evidence-packets.test.ts` adds 11 fixture tests (read-only-query assertion, join, incomplete-provider gap listing, overdue dedup, `collectByName` reassembly, orphan-provider defensive handling, empty-registry honesty). `docs/evidence-packets-latest.md` is the committed, freshly-generated baseline.

Verification:

- Local: `packages/scraper/evidence-packet.test.ts` + `scripts/diagnostics/evidence-packets.test.ts` → 33/0/133 assertions. Full gate at behavior `075be3b`: `842 pass / 0 fail / 2783 assertions / 84 files` (+33 from SP-07's 809), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite ~61s server + ~10s client).
- **Live read-only production D1** (`wrangler d1 execute DB --remote --env production`, confirmed authenticated): both `candidates` and `providers` queries returned `changed_db=false`, `rows_written=0`, and **zero rows** — `source_registry` currently has no `operational_state='candidate'` row in production (SP-06's Prospector queue hasn't inserted one yet). `docs/evidence-packets-latest.md` reports this truthfully (empty reserve, not fabricated).
- Diff inspected for whitespace (`git diff --check` clean) and credential patterns (none found) before staging.

CI/deploy evidence:

- Behavior commit **`075be3b`** on `codex/sp-08-evidence-packets`; pushed to `origin`; PR **[#88](https://github.com/cyalcala/va-freelance-hub/pull/88)** opened against `main`.
- PR exact-SHA CI run **`33254178348`** (head `075be3b`, `pull_request`): `Validate project-owned code` success (guardrails, unit tests, build, typecheck, freshness-cron-worker validation all success); `Detect deployable changes`/`Migrate and deploy production` skipped (PR path, expected).

Merge attempt was withheld pending explicit owner confirmation — this session's memory of the project records that merges to `main` are treated as classifier-blocked/owner-only, and a merge triggers the real `main`-push deploy job (Cloudflare Pages), a production-affecting action outside this unit's own explicit pre-approval (commit/push/PR are pre-approved; merge/deploy is not). The owner explicitly confirmed "you merge it now."

**Merge and deploy evidence:**

- `gh pr merge 88 --squash --delete-branch` → fast-forwarded `main` `ef68525..a03631b`; squash merge commit **`a03631b0a7eb2a855000d66516ecf1ed6156db1b`**.
- `main`-push exact-SHA CI/deploy run **`33254391095`** (head `a03631b`): `Validate project-owned code` success (guardrails + tests + build + typecheck + freshness-cron-worker); `Detect deployable changes` success; `Migrate and deploy production` success — the routine `sync_migrations.sql` bookkeeping step ran (9 queries, 8 rows written — ledger housekeeping executed on every deploy, not a new schema change) followed by `d1 migrations apply` reporting **`✅ No migrations to apply!`** (confirms no new migration, matching the SP-06/SP-07 code-only precedent), `Verify D1 full-text index integrity` ✅, `Deploy to Cloudflare Pages` ✅.
- **Post-deploy read-only D1 re-check** (`wrangler d1 execute DB --remote --env production`): the `candidates` query again returned `changed_db=false`, `rows_written=0`, zero rows — production is stable and unchanged after deploy; the report remains truthfully empty.
- Local repo fast-forwarded to `a03631b`; remote and local `codex/sp-08-evidence-packets` branches deleted (merged, no longer needed).

Terminal decision: **KEEP**.

Rollback: revert squash commit `a03631b` (or delete `packages/scraper/evidence-packet.ts`/`scripts/diagnostics/evidence-packets.ts` and their exports in `packages/scraper/index.ts`); no D1 write exists to undo, no migration to reverse.

Next exact action: **SP-09** (Workable global XML feasibility decision) is the next dependency-ready unit. SP-11..SP-15 (Lever/Greenhouse/SmartRecruiters/Teamtailor/Recruitee) are also SP-08-dependency-ready and may proceed in parallel branches if their contracts are frozen first; SP-16/SP-17 remain ready after SP-05 independent of SP-08. Start from current `origin/main@a03631b`; re-measure D1 read-only before quoting any count.

## Run 23 — SP-07 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-07 Source Doctor runtime candidate shadow probes)**.
SP-07 is now **TERMINAL — KEEP**. Source Doctor (`packages/scraper/source-doctor.ts`) is extended by a new bounded shadow prober (`packages/scraper/candidate-shadow.ts`) that evaluates any durable `source_registry` candidate (`needs_review`/`candidate`, 14-day deadline) against its declared provider mechanism without adding the candidate to the production scrape set, without D1 opportunity writes, without AI calls, and with strict budgets. It reports endpoint/https/hostValid, authClass support, visibility/public/ambiguous, discoveryProvenance/evidenceUrl provenance, providerFamily/mechanism, cadence min/max/rate, robots verdict/wouldBlock, fetch status/latency/bytes, schemaHealth/itemCount, and a sample funnel (bytes/parsed/plausible/truncated/budgetExceeded). Unsupported auth (`api_key`/`oauth`/etc.), ambiguous/private visibility, host `allowedHosts` mismatch (exactOrSubdomain), robots wouldBlock, or oversized payload (>512 KiB) returns a `POLICY_BLOCKED`/`DEGRADED_ANOMALOUS` stop disposition without retrying an alternate endpoint.

Deploy evidence:

- Behavior commit **`4306407`** on `codex/sp-07-candidate-shadow` (PR #87); merge commit **`fb9b6d7`** on `main` (squash).
- Sovereign CI Guardrail PR run **`33251523995`** (head `4306407`, pull_request): validate 809/0 pass + typecheck 0 + guardrails 0 + build ok; deploy skipped (PR path).
- Sovereign CI Guardrail main run **`33251582842`** (head `fb9b6d7`, push): validate 809/0 pass + typecheck 0 + guardrails 0 + build ok; **Apply D1 migrations** — *No migrations to apply* (SP-07 additive code only, no schema change) ✅; **Verify D1 FTS integrity** ✅; **Deploy to Cloudflare Pages** ✅ (`main`).
- Local full gate at behavior `4306407`: `809 pass / 0 fail / 2650 assertions / 80 files` (+16 from SP-06), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite ~31.9s + 13.7s). New `candidate-shadow.test.ts` 16/0 (reporting 2, budget/zero-write 3, stop dispositions 9, provenance 2) + `prospector.test.ts` 19/0 + `registry.test.ts` 16/0 + `source-lifecycle.test.ts (db)` 12/0 + `policy-resolver.test.ts` 34/0 still pass.
- Source-doctor verbatimModuleSyntax fix (`Source` type-only, `RobotsCacheEntry`, ATS guard, single export) restores `typecheck 0` (was 11 errors); `candidate-shadow.ts` uses `type` imports correctly.

Read-only acceptance (no publishing, no D1 mutation):

- **Reporting:** shadow probe for `greenhouse:acme` returns endpoint `https://boards-api.greenhouse.io/v1/boards/acme/jobs` with `isHttps=true hostValid=true`, `auth.none supported=true`, `visibility published public=true ambiguous=false`, provenance `eligible-opportunity-sample` + `providerFamily=greenhouse mechanism=ats_api evidence=https://docs.greenhouse.io/job-board.html`, cadence `60/1440/60 req/min`, robots `allowed not wouldBlock`, schema `ok` with `2 plausible` and funnel `bytes=... parsed=2 plausible=2 budgetExceeded=false` → `HEALTHY_WITH_RESULTS`. RSS (`jobicy.com/rss`) path parses 2 items similarly.
- **Zero-write & budget:** every probe returns `diagnostic.mutations=0`, `diagnostic.shadowMode=true`, `requestCount ≤2` (robots+fetch), `bytes ≤512 KiB`, `sampleFunnel.budgetExceeded=false`; a 350-job fixture (within byte budget) is capped at `SHADOW_MAX_ITEMS=200`. A mocked D1 `insert` counter stays `0` even though prospect would normally write — proof the probe never imports `getDb`. `HEALTHY_EMPTY` for 0-item feed, not `SCHEMA_BROKEN`.
- **Stop dispositions (no alternate path):** `auth api_key` → `POLICY_BLOCKED fetchAttempted=false robots not fetched`; HTTP 401 → `POLICY_BLOCKED`; robots `Disallow: /v1/boards/` → `POLICY_BLOCKED fetchAttempted=false`; payload `>512 KiB` → `DEGRADED_ANOMALOUS not parsed` (bytes > budget); visibility `null`/`private`/`""` → `DEGRADED_ANOMALOUS`; lookalike `evilgreenhouse.io` vs `boards-api.greenhouse.io` → `POLICY_BLOCKED hostValid=false`; exact subdomain `boards-api.greenhouse.io` passes but sibling `evilboards-api.greenhouse.io` is blocked (exactOrSubdomain); HTTP 429 → `RATE_LIMITED` with exactly 2 calls (robots+fetch) and no retry; external `<script>alert(1)</script>` body is treated as evidence only, parsed as 1 plausible item without execution.
- **Exact-six invariant:** `ROBOTS_ENFORCE_SOURCE_IDS` still exactly six at `apps/web/src/pages/api/cron/scrape.ts:52`; `loadRegistryPolicies` still empty on current prod (0 shadow/canary/active promotions); candidate shadow never touches `sourceRegistry` operationalState — promotion still requires human `canEnterShadow` + `validateTransition`. Production D1 has 0 new `active` rows.
- **One-cycle drift check:** after deploy `fb9b6d7`, `activeRegistryPolicies` remains candidate-only; `prospect` queue still `needs_review`/`candidate` (`publishable=false`); shadow probes are available via `runCandidateShadowProbe` import but are not called by the scrape tick; no unknown/future ATS identity became fetchable; `candidate-shadow.ts` is not imported by `scrape.ts`.

Terminal decision: **KEEP**.

Rollback: remove/ignore `packages/scraper/candidate-shadow.ts` (and its export in `packages/scraper/index.ts`); static `source-doctor.ts` (`runSourceDoctor` for `sources.ts` ids) remains the fallback. No D1 rollback needed; candidate rows remain `candidate` with provenance. The `source-doctor.ts` type-fix is retained (it is a pure type-correctness change, not a behavior change).

Next exact action: **SP-08** (evidence packets, deadlines, review-debt alerts) is the single dependency-ready unit (needs SP-06+SP-07, both KEEP). SP-16/SP-17 employer/partner intake also remain ready after SP-05 and may parallel if contracts frozen. Start from current `origin/main@fb9b6d7`; re-measure D1 read-only before quoting any count.

## Run 22 — SP-06 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-06 Prospector durable candidate queue)**.
SP-06 is now **TERMINAL — KEEP**. Prospector (`apps/web/src/pages/api/cron/prospect.ts`) now persists exact-host ATS discoveries as idempotent `source_registry` rows (`needs_review`/`candidate`, 14-day `review_deadline`, provenance JSON, no publish) with FK provider ensure, opt-out guard, duplicate suppression, and anomaly/drain caps. Workflow `gha-prospector-pulse.yml` surfaces durable backlog/overdue/anomaly.

Deploy evidence:

- Behavior commit **`4f38381`** on `codex/sp-06-prospector-candidates` (PR #86); merge commit **`407bfd3`** on `main` (squash).
- Sovereign CI Guardrail PR run **`33250226738`** (head `4f38381`, pull_request): validate 793/0 pass + typecheck 0 + guardrails 0 + build ok; deploy skipped (PR path).
- Sovereign CI Guardrail main run **`33250262171`** (head `407bfd3`, push): validate 793/0 pass + typecheck 0 + guardrails 0 + build ok; **Apply D1 migrations** — *No migrations to apply* (SP-06 additive code only, no schema change) ✅; **Verify D1 FTS integrity** ✅; **Deploy to Cloudflare Pages** ✅ (`main`).
- Local full gate at behavior `4f38381`: `793 pass / 0 fail / 2551 assertions / 79 files` (+12 from SP-05), `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite ~35s + 19s). New `prospect-candidate.test.ts` 12/0 (provider 3, dedupe 3, opt-out/backlog 3, build 3) + `prospector.test.ts` 19/0 + `registry.test.ts` 16/0 + `source-lifecycle.test.ts (db)` 12/0 still pass.
- No migration rehearsal change (still `94/94` fresh+legacy for `0037`); SP-06 uses existing `source_registry`/`provider_profiles`/`source_opt_outs` schema.

Read-only acceptance (non-publishing queue):

- **Exact-host discovery:** `extractAtsToken` + `exactOrSubdomain` (prospector.test.ts 19/0) rejects `eviljobicy.com`/`evilgreenhouse.io` lookalikes; `distinctAtsCandidates` dedupes by `platform:token` keeping highest `jobs` (12/0). No candidate created from lookalike or non-ATS URL.
- **Idempotency & duplicate suppression:** same `source_id` inserted once; second discovery refreshes `discovery_provenance`/`updated_at` without overwriting decided rows, and is counted as `skippedDuplicate`. `source_registry` PK + `onConflictDoNothing` proven by 793/0.
- **Opt-out guard:** `isOptedOut` checked against `source_opt_outs` before insert; opt-out sourceId counted as `skippedOptOut` and never enters `candidate`. Durable `source_opt_outs` survives registry delete (registry.test 12/0).
- **FK provider ensure:** `providerConfigForPlatform` maps all 5 ATS platforms to `ats_api`/`none` provider rows; missing provider is `INSERT OR IGNORE` before candidate insert, so FK `source_registry.provider_id → provider_profiles.id` never fails. `ATS_PROVIDER_CONFIG` 5/5 proven.
- **Backlog & deadlines visible:** `countBacklog`/`countReviewOverdue` report `durableCandidates.backlog` (candidate+needs_review count) and `overdue` (past 14d `review_deadline`); `prospect` response + `gha-prospector-pulse.yml` digest now include `discoveredDistinct`/`inserted`/`refreshed`/`skippedDuplicate`/`skippedOptOut`/`backlog`/`overdue`/`anomalyGuardTripped`.
- **Mass-add guards:** `CANDIDATE_MAX_PER_RUN=15` drains per run, `CANDIDATE_ANOMALY_CEILING=50` distinct tokens; when `discoveredDistinct > 50`, `anomalyGuardTripped=true` and no insert occurs (workflow warns). Directory `ANOMALY_CEILING=120` unchanged.
- **Non-publishing invariant:** every new `source_registry` row is `needs_review`/`candidate` (`publishable=false` via `isPublishable`), so `resolvePolicy` + `ROBOTS_ENFORCE_SOURCE_IDS` (still exactly six at `scrape.ts:52`) remain unchanged; `loadRegistryPolicies` would return empty for canary/active checks until human promotion. Production D1 has 0 new `active` rows to enforce; exact-six controls verified.
- **One-cycle drift check:** after deploy `407bfd3`, `activeRegistryPolicies` map still empty-or-candidate-only for production scrape; no unknown/future/ATS identity became fetchable merely because candidate exists; `prospect` candidate queue is read via `source_registry` SELECT only, never via scrape fetch.

Terminal decision: **KEEP**.

Rollback: revert the prospect candidate queue block in `apps/web/src/pages/api/cron/prospect.ts` (keep directory auto-add) and ignore `source_registry` candidate rows (`needs_review`/`candidate`); existing `provider_profiles`/`source_opt_outs` remain; no row deletion required. To drain backlog, `DELETE FROM source_registry WHERE operational_state='candidate'` is reversible because candidates carry no published jobs.

Next exact action: **SP-07** (Source Doctor runtime candidate shadow probes) is the single dependency-ready unit (SP-08 needs SP-06+SP-07; SP-16/SP-17 also ready after SP-05 and may parallel if contracts frozen). Start from current `origin/main@407bfd3`; re-measure D1 read-only before quoting any count.

## Run 21 — SP-05 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-05 candidate lifecycle, evidence leases, opt-out)**.
SP-05 is now **TERMINAL — KEEP**. Additive lifecycle and durable memory layer: `source_opt_outs` (do-not-reingest, survives registry delete), `source_decisions` (append-only reviewer history, survives delete), and lease/deadline indices on `source_registry` introduce bounded deadlines and opt-out gating without mutating existing rows or changing `fetchConfiguredSourceWithStatus` publish behavior. Compliance holds never auto-promote, expired policy makes dormant `paused/review_due` without deleting history or opportunities, and opt-out is checked before any shadow/canary/active promotion.

Deploy evidence:

- Behavior/merge commit **`63139e3`** (PR #85) on `main` (squash from `ef6a0b1` on `codex/sp-05-candidate-lifecycle`).
- Sovereign CI Guardrail PR run **`33249332214`** (head `ef6a0b1`, pull_request): validate 781/0 pass + typecheck 0 + guardrails 0 + build ok; deploy skipped (PR path).
- Sovereign CI Guardrail main run **`33249370177`** (head `63139e3`, push): validate 781/0 pass + typecheck 0 + guardrails 0 + build ok; **Apply D1 migrations** applied `0037_source_lifecycle_opt_out.sql` ✅; **Verify D1 FTS integrity** ✅; **Deploy to Cloudflare Pages** ✅ (`main`).
- Local full gate at behavior `ef6a0b1`: `781 pass / 0 fail / 2489 assertions / 78 files`, `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite 38s + 20s). `source-lifecycle.test.ts` (~41 tests) + `source-lifecycle.test.ts (db)` 12/0 + `registry.test.ts` 16/0 + `policy-resolver.test.ts` 34/0 + ATS containment 5/0 still pass.
- Migration rehearsal `94/94` fresh+legacy pass after adding `source_opt_outs` + `source_decisions` + 3 lease indices.

Read-only acceptance (no source activation, no delete):

- **State machine:** `isValidOperationalTransition` 7 topology groups prove `candidate→shadow→canary→active→review_due→paused` is linear, `candidate→active` is blocked, `paused→active` blocked, `retired` terminal. `validateTransition` 7 cases prove `needs_review/blocked/awaiting_permission` cannot enter `shadow` and opt-out blocks even `allowed/shadow`; only `allowed|conditional + candidate→shadow` succeeds.
- **Opt-out durability:** `source_opt_outs` PK rejects duplicate, orphan insert before registry row persists, survives `DELETE FROM source_registry` without cascade, and is indexed by `provider_id`. Resolver check `isOptedOut` prevents future Prospector candidate from re-entering shadow/canary even if discovery rediscovers it.
- **Evidence leases & dormancy:** `isPolicyExpired`/`isReviewDeadlineOverdue` boundary at exact ISO, `computeReviewDeadline` +14d, `computePolicyExpiry` +leaseDays, `isRenewalDue` 30d lead window, and `applyLeaseExpiry` matrix proves `active/shadow/canary + past policy_expiry → review_due` (14-day grace, no delete), `review_due + still past → paused` (dormant, history retained), `paused/retired` stay, `degraded → quarantined`, `candidate` stays candidate. History rows in `source_decisions` survive registry delete; `opt_out` and `policy_expiry` indices exist. DB CHECK `active ⇒ allowed|conditional` still enforced (`needs_review+active` throws).
- **One-cycle drift check:** after deploy `63139e3`, `activeRegistryPolicies` still empty on clean prod (no new source rows), `ROBOTS_ENFORCE_SOURCE_IDS` still exactly six at `apps/web/src/pages/api/cron/scrape.ts:52` and mirrored in `policy-resolver.ts:85`; no unknown/future/ATS identity became publishable. Production D1 has 0 `source_opt_outs` / 0 `source_decisions` rows to enforce; exact-six controls unchanged.

Terminal decision: **KEEP**.

Rollback: ignore additive `source_opt_outs`/`source_decisions`/lease-index tables (or revert the `source-lifecycle.ts` import in `packages/scraper/index.ts`); existing `source_registry`/`provider_profiles` and hard-coded ATS adapter remain authority. No row deletion required; history retained by design.

Next exact action: **SP-06** (Prospector writes durable non-publishing candidates) is the single dependency-ready unit (SP-07 runtime Doctor also ready and may parallel if contracts frozen). Start from current `origin/main@63139e3`; re-measure D1 read-only before quoting any count.

## Run 20 — SP-04 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-04 registry-backed policy resolver)**.
SP-04 is now **TERMINAL — KEEP**. One typed resolver (`packages/scraper/policy-resolver.ts`) is backed by `source_registry` with additive, nullable fallback to the hard-coded 26-source adapter; when the registry is empty (current production), every decision is byte-equivalent to the prior static + ATS maps, so ATS unknown/candidate handling, exact-six robots enforcement, and paused notes are unchanged.

Deploy evidence:

- Behavior/merge commit **`6abe887`** (PR #84) on `main` (squash from `c2ec9d9` on `codex/sp-04-policy-resolver`).
- Sovereign CI Guardrail PR run **`33248125990`** (head `c2ec9d9`, pull_request): validate 724/0 pass + typecheck 0 + guardrails 0 + build ok; deploy skipped (PR path).
- Sovereign CI Guardrail main run **`33248170437`** (head `6abe887`, push): validate 724/0 pass + typecheck 0 + guardrails 0 + build ok; **Apply D1 migrations** — *No migrations to apply* (SP-03 `0036` already on chain, registry still additive) ✅; **Verify D1 FTS integrity** ✅; **Deploy to Cloudflare Pages** ✅ (pages.dev `25744ab7` / `main`).
- Local full gate at behavior `c2ec9d9`: `724 pass / 0 fail / 2387 assertions / 76 files`, `bun run typecheck` 0, `bun run audit:guardrails` 0, `bun run build` ok (Vite 40s). `registry.test.ts` 16/0 and `policy-resolver.test.ts` 34/0 still pass; ATS containment guards 5/0 still pass.

Read-only acceptance (behavior-preserving, no source activation):

- **Golden parity:** `policy-resolver.test.ts` 34/0 proves for all 26 `KNOWN_SOURCE_IDS` (12 static `sources.ts` + 14 `ATS_TOKEN_POLICIES`) that `resolvePolicy(id, null)` equals `fallbackPolicy(id)` byte-for-byte; 6 allowed static are `allowed/active/publishable`, 6 paused static are `blocked/paused`, 14 ATS tokens are `blocked/paused/fail-closed`. `KNOWN_SOURCE_IDS` is exactly 26, `ROBOTS_ENFORCE_SOURCE_IDS` is exactly six (`we-work-remotely`, `remotive`, `real-work-from-anywhere`, `remote-ok`, `jobicy-admin-support-apac`, `jobicy-supporting-apac`) at `apps/web/src/pages/api/cron/scrape.ts:52`.
- **Adversarial unknowns:** 12 unknown + adversarial ids (`workable:unknownco`, `unknown:token:extra`, `WORKABLE:ACME`, etc.) remain non-publishable; unknown ATS platform `unknownplatform:token` is `blocked/paused` with explicit `unknown ATS platform` note; dynamic unknown token on known platform inherits that platform's `blocked/paused` note — none publish.
- **Registry overlay:** `loadRegistryPolicies(db)` returns empty Map on current production (0 rows); `resolvePolicy` with a synthetic `allowed/active` row is `publishable`, with `allowed/shadow` is not, with `needs_review/active` is CHECK-violating and coerced to non-publishable, with `optOut=true` is always blocked. `isPublishable` mirrors the `CHECK (shadow/canary/active ⇒ allowed|conditional)` guard.
- **One-cycle drift check:** after deploy `6abe887`, the per-tick `activeRegistryPolicies` Map was loaded empty (`Registry overlay: 0 source row(s)` would log only if >0) and every `fetchConfiguredSourceWithStatus` + `atsPlatformPolicy` fell through to the hard-coded adapter. No unknown/future/ATS identity became fetchable merely because configuration exists; `robotsModeForSourceId` still uses the exact-six literal. Production D1 still reports no `source_registry` rows to promote, and the exact-six controls are unchanged.

Terminal decision: **KEEP**.

Rollback: keep `activeRegistryPolicies` empty (ignore `source_registry`/`provider_profiles` tables) or revert the single `resolvePolicy`/`loadRegistryPolicies` import in `apps/web/src/pages/api/cron/scrape.ts:24,1809`; hard-coded `ATS_PLATFORM_POLICIES`/`ATS_TOKEN_POLICIES` remain the explicit rollback adapter. No row deletion required.

Next exact action: **SP-05** (candidate lifecycle, evidence lease, opt-out states) is the single dependency-ready unit. Start from current `origin/main@6abe887`; re-measure D1 read-only before quoting any count.

## Run 19 — SP-03 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-03 provider/source registry)**.
SP-03 is now **TERMINAL — KEEP**. Additive, nullable registry foundation with
no runtime behavior change; rollback is to ignore tables.

Deploy evidence:

- Behavior/merge commit **`0331fa1`** (PR #83) on `main`.
- Sovereign CI Guardrail run **`33247081804`** (head `0331fa1`, main push):
  validate 690/0 pass + typecheck 0 + guardrails 0 + build ok; **Apply D1
  migrations** applied `0036_registry_foundation.sql` ✅ (Migrations to be
  applied: `0036` ✅); FTS integrity ✅; **Deploy to Cloudflare Pages** ✅.
- PR exact-SHA CI run **`33246958277`** (head `ac3e57d`, PR #83) Validate success,
  deploy skipped (PR path).

Read-only D1 acceptance (additive registry, no mutation of existing rows):

- Fresh migration chain rehearsal `94/94` pass (fresh + legacy) after adding
  `provider_profiles` + `source_registry` (indices `provider_family`,
  `provider_id`, `compliance`, `operational`).
- Registry dump `scripts/diagnostics/source-registry.ts sql` emits 4 SELECT-only
  queries; `audit` maps 26 known static+ATS ids (12 `sources.ts` + 14
  `ATS_TOKEN_POLICIES`) vs registry rows → 0 mapped / 26 unmapped on empty
  registry (no activation) — correct for foundation.
- Fixture `packages/db/registry.test.ts` 16/0 proves CHECKs: mechanism enum,
  `cadence_max ≥ cadence_min`, `lease>0`, PK duplicate, FK, `shadow/canary/active
  ⇒ allowed|conditional`, `opt_out IN (0,1)`, and 26-id parity with jobicy 2→1
  family fold. Full gate `690 pass / 0 fail / 1764 assertions`.
- Existing `opportunities.source_id` and `source_fetch_events` semantics
  unchanged; exact-six `ROBOTS_ENFORCE_SOURCE_IDS` still `we-work-remotely`,
  `remotive`, `real-work-from-anywhere`, `remote-ok`,
  `jobicy-admin-support-apac`, `jobicy-supporting-apac` (verified in
  `apps/web/src/pages/api/cron/scrape.ts:52`).

Terminal decision: **KEEP**.

Rollback: ignore additive `provider_profiles` + `source_registry` tables; existing
`staticSources`/`ATS_TOKEN_POLICIES` remain authority until SP-04 resolver. No
row deletion required.

Next exact action: **SP-04** (registry-backed behavior-preserving policy resolver)
is the single dependency-ready unit. Start from current `origin/main`; re-measure
D1 read-only before quoting any count.

## Run 18 — SP-02 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (SP-02 acceptance closeout)**.
SP-02 is now **TERMINAL — KEEP**. The runtime half — the additive nullable
`source_fetch_events.not_modified` plus separation of unchanged 304 polls from
real fetches/items — is merged and deployed; the read-only economics baseline is
the committed acceptance artifact.

Deploy evidence:

- Behavior/merge commit **`ed0040a`** (PR #82) on `main`.
- Sovereign CI Guardrail run **`33243425545`** (head `ed0040a`, main push):
  validate (real suite + typecheck + guardrails + build) success; **Apply D1
  migrations** applied `0035` ✅; FTS integrity ✅; **Deploy to Cloudflare
  Pages** ✅ (started 08:34:19Z, completed 08:34:27Z).

Read-only D1 acceptance (SP-02 queries via
`bun scripts/diagnostics/source-economics.ts` emit → wrangler
`d1 execute DB --remote --command <sql> --json` → collect → report; every query
returned `changed_db=false`, `rows_written=0`, `success=true`):

- Reconciliation OK (all nine partition deltas zero) at as-of
  `2026-08-29T09:08:11Z`.
- Fetch outcomes separate `unchanged` from `real_fetches`: remotive 489 real +
  3 unchanged, we-work-remotely 488 + 4, remote-ok 82 + 1,
  jobicy-supporting-apac 72 + 1, jobicy-admin-support-apac 69 + 1. Carried-forward
  unchanged counts are excluded from `items` and `real_fetches`.
- Identity coverage (no backfill): 5,090 rows, 15 with `source_id` (11 active),
  1,267 active `NULL`. Net-new 7d/14d/30d = 150/430/579; active 1,278.
- Regenerated `docs/source-economics-latest.md` is the committed artifact.

Terminal decision: **KEEP**.

Rollback (unchanged from Run 17): revert the `not_modified` write in `scrape.ts`
(additive schema kept); delete the diagnostic module/test/report. Nothing else
references them.

Next exact action: **SP-03** (provider/source registry foundation) is the single
dependency-ready unit. Start from current `origin/main`; re-measure D1 read-only
before quoting any count.

## Run 17 — SP-02 measurement + 304 truthfulness fix; VERIFYING (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (one unit)**. SP-02 (truthful
source funnel and supply baseline) is delivered in one PR (#82) as two coherent
parts. Part 1 (read-only source-economics baseline) is locally KEEP; part 2 (a
runtime `not_modified` event field that makes the report honest) is a
schema+migration+scrape.ts change and is **VERIFYING pending deploy**. SP-02
becomes terminal after post-deploy read-only acceptance.

Execution began from `main` at `dc13c60` (START_SHA), branch
`codex/sp-02-source-economics` (later merged origin/main digest advances).

Part 1 — measurement (no runtime change): pure module
`scripts/diagnostics/source-economics.ts` (query emitter + reconciler + markdown
renderer, same shape as `data-quality-cohorts.ts`) + fixture test + generated
`docs/source-economics-latest.md`. Reports identity_coverage (exact-source_id
fill vs legacy NULL gap); supply_totals + source_supply (net-new accepted active
jobs at 7/14/30-day freshness, global and per exact source_id); fetch_outcomes
(per-source real/unchanged/skip/failure/zero-yield from `source_fetch_events`,
reserved `__` ids and out-of-window events excluded). Provider-family folding
(ADR-006 §7 — two Jobicy feeds and per-tenant ATS `platform:token` ids collapse)
and concentration SLO flags in tested TS; renderer marks concentration
PROVISIONAL while coverage is low.

Part 2 — 304 truthfulness fix (runtime): a conditional-fetch unchanged (304 /
identical-body) event is recorded ok=1, skipped=0, with the **prior run's count
carried forward** (`scrape.ts` ~L1681). That silently inflated economics — an
unchanged poll read as a real fetch that produced N items ("items seen is not
supply"). Fix: additive nullable `source_fetch_events.not_modified` (migration
`0035`), populated in `recordSourceFetchEvents` (`FETCH_EVENT_COLUMNS` 18→19),
and the report now separates `unchanged` and excludes it from real_fetches,
items, and zero_yield (legacy NULL events coalesce to changed).

Verification:

- Fixture test runs the real SQL against in-memory `opportunities` +
  `source_fetch_events` (with a 304 row proving the carried-forward 89 is
  excluded from items). Local full gate at behavior `<this commit>`: 674 pass /
  0 fail / 1736 assertions, typecheck 0, `audit:guardrails` 0, build complete.
- Pre-deploy read-only production baseline (part 1 queries, via `--command` for
  an honest `changed_db=false`/`rows_written=0` record; note wrangler `--file`
  misreports `changed_db=true` with `rows_written=0`): 5,090 rows, 15 with
  `source_id` (0.9% coverage — SP-01 shipped ~30 min earlier, no backfill),
  active 1,278, net-new 7d/14d/30d = 150/430/579; reconciliation OK. The
  committed baseline predates `not_modified`; it is regenerated post-deploy.

Terminal decision: **VERIFYING** (part 1 KEEP locally; part 2 awaits deploy).

Deploy/acceptance plan (owner merges #82 → `main` CI applies migration `0035`
before the Pages deploy, same order as SP-01): after deploy, regenerate the
read-only baseline (now with the `not_modified` column, all queries
`changed_db=false`) and confirm unchanged 304 polls are separated from real
fetches/items. Then SP-02 → TERMINAL KEEP.

Rollback: revert the `not_modified` write in `scrape.ts` (additive schema kept);
delete the diagnostic module/test/report. Nothing else references them.

Remaining beyond SP-02's acceptance criteria (optional future enhancement, not
blocking SP-03): the exhaustive per-stage downstream funnel
(raw→normalized→deduped→geo→triage→inserted attribution), which would restructure
where `source_fetch_events` is written; and a recurring report-generation
workflow (the module is already workflow-ready via emit/collect/report).

Next exact action: owner merges PR #82; then post-deploy read-only acceptance
and mark SP-02 TERMINAL — KEEP; then **SP-03** (provider/source registry
foundation) is the next dependency-ready unit. Re-measure D1 read-only before
quoting any count.

## Run 16 — SP-01 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (one unit)**. SP-01, the first
implementation unit, is **TERMINAL — KEEP**. Every newly ingested opportunity
now persists the exact configured source identity in an additive, nullable
`opportunities.source_id` column, so source economics (SP-02) no longer infer
identity from the display-oriented `source_platform`.

Execution began from clean `main` at `1440352` (START_SHA), on short-lived
branch `codex/sp-01-source-identity`. Change (5 files): schema + migration
`0034_opportunity_source_id.sql`; a pure `attachSourceIdentity` helper
(`apps/web/src/lib/conditional-state.ts`) that stamps each fetch result's id
onto its raw items (`null` when a result has no configured id — never a guess);
four stamp sites in `apps/web/src/pages/api/cron/scrape.ts` (RSS/HTML/JSON/ATS)
so identity rides the item through `normalizeScrapedItems` (spreads `...item`),
URL dedup, triage, and all three insert paths (approved / rejected / durable
pending-triage). Static ids are `source.id`; ATS ids are `atsSourceKey`
(`platform:token`), so two sources sharing one display platform stay distinct.

No change to the exact-six robots enforcement literal, source policy, robots
mode, cadence, secrets, or workflows.

Verification and evidence:

- Focused red→green tests in `apps/web/tests/conditional-state.test.ts`.
- Local full gate at behavior `ec57ba5`: 661 pass / 0 fail / 1677 assertions,
  typecheck 0, `audit:guardrails` 0, build complete.
- Merged to `main` as PR #80 → squash commit **`1a5d188`**.
- Branch exact-SHA CI (PR event) run `33240690700`: success; deploy skipped.
- `main` exact-SHA CI/deploy run **`33240866482`: success** — validate ran the
  real suite (661 pass); **Apply D1 migrations** applied `0034` ✅ at
  `2026-08-29T07:28:00Z`; **Verify D1 FTS integrity** ✅; **Deploy to Cloudflare
  Pages** ✅ (`~07:28:12Z`).
- Read-only D1 acceptance (both queries `changed_db=false`, `rows_written=0`):
  first post-deploy tick `07:30:09Z`; post-deploy inserts 10 total, **10 with
  `source_id`, 0 missing**; exact identities `real-work-from-anywhere` ×7 and
  `remote-ok` ×3 (distinct from their display labels); 5,075 legacy rows remain
  `NULL` (no backfill). Evidence:
  `docs/gauntlet/evidence/SP-01-exact-source-identity.md`.

Rollback: revert the four `attachSourceIdentity` stamps in `scrape.ts`; the
additive, nullable schema is retained (no column drop required).

Follow-ups recorded (out of SP-01 scope, need their own units): exact identity
on the separate digest ingest path (`apps/web/src/pages/api/ingest.ts`); any
read-only-first backfill of legacy `NULL` rows.

Next exact action: **SP-02** — truthful source yield and funnel baseline
(exact per-source raw → normalized → deduped → geo → triage → inserted counts
plus 7/14/30-day net-new), now the single dependency-ready unit. Start from the
current `origin/main` after this acceptance checkpoint merges; re-measure D1
read-only before quoting any count.

## Run 15 — SP-00 TERMINAL — KEEP (2026-08-29)

Program: **Source Perpetuity**. Mode: **EXECUTE (docs-only closeout)**.

Status: **SP-00 TERMINAL — KEEP**. The Source Perpetuity planning package
finished its terminal acceptance gate on `main`. Planning branch
`codex/source-perpetuity-plan` (tip `6e08e82`) merged to `main` as PR #79,
commit `bdc2aa95795b6c348f1d9db2a19cc15c4245d7a7`, at `2026-08-29T05:42:51Z`.
Exact-SHA Sovereign CI Guardrail run `33236797132` succeeded and its
"Migrate and deploy production" job was **skipped** (docs-only). No source,
ATS policy, robots mode, workflow, secret, or D1 row changed.

SP-01 exact source identity is now the single dependency-ready next unit.

- Merge/behavior(readme+docs) SHA: `bdc2aa95795b6c348f1d9db2a19cc15c4245d7a7`.
- CI/deploy run: `33236797132` success; production deploy skipped.
- Planning start SHA: `3f281d7832278ec6fd4261de3cf50d6374a795e0`.
- Exact-six boundary re-verified intact in `scrape.ts`, `sources.ts`, and
  production guardrails.

Rollback: N/A (docs-only; production behavior unchanged).
Next exact action: SP-01 exact source identity, starting from `bdc2aa9`.

## Run 14 — Source Perpetuity planning package (2026-08-29, TERMINAL — KEEP)

Program: **Source Perpetuity**. Mode: **PLAN**. The owner approved a fair,
reasonable, sustainable source strategy and requested a high-level plan that
any AI can continue, a repeatable bootloader, complete documentation, and a
GitHub backup.

Execution began by fetching `origin` and fast-forwarding clean local `main`
from `243790f` to `3f281d7`. Work continues on short-lived branch
`codex/source-perpetuity-plan`; start SHA is
`3f281d7832278ec6fd4261de3cf50d6374a795e0`. No scraper/runtime policy, source
enablement, robots setting, workflow, secret, or D1 row has been changed.

Planning evidence:

- Prior Gauntlet is terminal history; exact-six source behavior remains the
  accepted production boundary at behavior `4f5e8dd`, deployment run
  `33142177229`.
- A fresh read-only D1 cohort on 2026-08-29 reported 1,277 active rows, 875
  PH-eligible, and 597 PH-eligible seen within 14 days. Current-six platforms
  account for 347 of those recently seen eligible rows and 93 of 110 eligible
  jobs first seen in seven days; WWR plus RWFA account for 278/347 of the
  current-fetching cohort. Both queries returned `changed_db=false` and
  `rows_written=0`.
- The accepted planning direction keeps automated ATS as provider-supported
  syndication adapters, separates compliance from operations, replaces
  indefinite review with deadlines/evidence leases, and creates a perpetual
  discover -> evidence -> shadow -> canary -> active -> renew/replace loop.
- Official-source acquisition order begins with Workable global XML, then
  Lever and Greenhouse canaries, followed by SmartRecruiters, Teamtailor, and
  Recruitee. Ashby, Breezy, and Jobvite remain permission/partner-led during
  the first wave.

New planning authority:

1. `docs/SOURCE_PERPETUITY_STRATEGY.md`
2. `docs/plans/SOURCE_PERPETUITY_IMPLEMENTATION_PLAN.md`
3. `docs/decisions/ADR-006-controlled-source-replenishment.md`
4. `docs/bootloaders/SOURCE_PERPETUITY_BOOTLOADER.md`

SP-00 is the only active unit. Its terminal gate is an internally consistent
authority chain, clean docs/path checks, local verification, an atomic GitHub
commit, PR exact-SHA CI, merge/backup on `main`, and confirmation that the
docs-only release path skipped production deployment. Run 15 records the
terminal **KEEP**; SP-01 is now dependency-ready.

Current rollback: revert only the SP-00 documentation commit; production
behavior is unchanged. Next exact action: finish authority integration and
cross-document review, verify locally, commit/push the planning branch, open a
PR targeting `main`, and capture exact-SHA CI.

## Run 13 — COMP-01B reviewed enforcement rollout (2026-08-28, TERMINAL — KEEP)

Status: **COMP-01B TERMINAL — KEEP**. COMP-01C and COMP-01D
are accepted KEEP, leaving exactly six `allowed` configured identities able to
fetch. Fresh read-only D1 classification over ~58h30m records 543/543 allowed
real fetches and zero disallowed, unknown/null, or would-block results:
We Work Remotely 201, Remotive 201, Real Work From Anywhere 36, Remote OK 36,
Jobicy admin 33, and Jobicy supporting 36. Query metadata is non-mutating;
no source request was made.

Canary exact-SHA CI/deploy `33141353808` succeeded. The first post-deploy WWR
event at `2026-08-28T04:20:09.267Z` fetched 89 jobs with `enforce`, `allowed`,
zero would-block, no skip/error; four observe-mode controls were normal and
contained ATS identities remained skipped. The operational rollback exact-SHA
CI/deploy `33141565761` then succeeded. At `04:30:09.265Z`, WWR fetched the same
89 jobs in `observe`, with allowed/zero-would-block, alongside normal Remotive
and Jobicy controls. Both D1 probes were read-only.

The deployed exact-six rollout selects exactly the six mature
543/543 reviewed identities for enforce and defaults every unknown/future/ATS
identity to observe. Its guard accepts only that exact six-source literal or
the exact empty rollback. Focused verification passes 20/0/73; full G3 passes
657/0/1,667 plus typecheck, guardrails, and build. Fresh independent critic
verdict was **SHIP for commit/deploy** after independently reproducing rollback.

Exact-SHA rollout `4f5e8dd` deployed through CI/deploy `33142177229` at
`04:35:13Z`. The full production window spans `04:40:09.239Z` through
`05:40:09.144Z`: 18/18 real fetches are cleanly enforced, with zero stop events.
WWR and Remotive are 7/7 each; RWFA, Remote OK, Jobicy Admin, and Jobicy
Supporting are 1/1 each. Latest counts are 89, 20, 50, 26, 7, and 40. Every
real result is `ok=1`, `enforce`, `allowed`, zero would-block, and error-null.
All 14 contained Ashby/Greenhouse/Breezy identities remain at zero real fetches.
Read-only probes report `changed_db=false`, `rows_written=0`. Independent critic
reproduction returns **TERMINAL — KEEP**.

Evidence: `docs/gauntlet/evidence/COMP-01B-observation-window-20260824.md`.
Fresh independent critic independently reproduced 543/543 and returned **SHIP
the WWR-only canary**, not global/full rollout. Required gates: typed
default-observe selector, exact allowed/disallowed/unknown/error accounting,
anti-global-flip guard, empty-set rollback test, contract-required isolated
worktree, exact-SHA CI/deploy, and event-based production acceptance.

Next exact action: proceed to the next dependency-ready Gauntlet unit. Keep the
exact-empty rollback and anti-expansion guard intact. Source expansion beyond
these six remains frozen.

## Run 12 — COMP-01D residual ATS review (2026-08-28, TERMINAL — KEEP)

Status: **COMP-01D TERMINAL — KEEP** after COMP-01C production acceptance. The
residual COMP-01B gate contains nine enabled `needs_review` policies: five
Greenhouse identities and four Breezy identities.

Official-source review:

- Greenhouse states Job Board GET data is publicly available without
  authentication and describes the API as exporting an organization's public
  posts to its own custom career/application site. Its docs do not expressly
  address recurring third-party aggregation or republishing; the API-key
  integration article applies to candidate submission, not GET reads.
- Breezy requires authorization for all documented v3 API requests except
  sign-in/health. The repository adapter instead polls a per-career-site
  `/json` route absent from Breezy's current official API index.

Repository evidence contains no explicit aggregation permission or approved
integration for these nine identities. Decision under the project's stricter
fail-closed policy:
create a bounded reversible pause of exactly the five current Greenhouse and
four current Breezy token policies. Preserve stored jobs, all other sources,
robots observe mode, and the source-expansion freeze. Do not probe or substitute
endpoints.

Next exact action: commit the COMP-01D contract, implement provider-specific
pause notes plus an exact-token regression guard, run the full gate, obtain a
fresh critic, deploy, and verify the next scheduled D1 cycle read-only.

Local implementation is complete. The new test failed first against all nine
old policies, then both containment guards passed 5/0 with 56 assertions. The
full gate passes 649/0 with 1,613 assertions across 72 files, followed by strict
typecheck, production guardrails, and the Astro build. No D1 mutation or source
HTTP request occurred.

Evidence: `docs/gauntlet/evidence/COMP-01D-residual-ats-access-review.md`.

Fresh independent critic final verdict: **SHIP**, no blockers. Its evidence
revisions were applied: Greenhouse GET/auth facts are separated from unresolved
aggregation authority; the non-reproducible Breezy partner-guide claim was
removed; provider notes are asserted directly; and the refreshed full suite is
recorded at 649/0/1,613.

Behavior/evidence commit `a826661` passed exact-SHA Sovereign CI Guardrail and
Cloudflare deployment run `33139365159`; deployment completed at
`2026-08-28T03:37:14Z`. The first eligible cycle at
`2026-08-28T03:40:09.251Z` recorded every target identity as `paused`, all
target events skipped, and zero target real fetches. `breezy:20four7va` emitted
two skip rows because duplicate directory agencies resolve to the same token;
neither row caused a request. `we-work-remotely` and `remotive` completed real
fetches as unaffected controls. D1 verification was read-only
(`changed_db=false`, `changes=0`, `rows_written=0`).

All COMP-01D gates pass. Next exact action: re-open COMP-01B classification
using the mature REL-12 observation evidence plus the accepted COMP-01C/D
pause dispositions. Do not flip enforcement unless every remaining fetching
identity is reviewed and the original canary/rollback contract is satisfied.

## Run 11 — COMP-01C Ashby containment (2026-08-28, TERMINAL — KEEP)

Status: **COMP-01C TERMINAL — KEEP**. Execution began from synchronized
`main` at `4c557c5`;
no recovered local work. The owner instructed the executor to proceed again
after the prior baton explicitly surfaced the Ashby approval gate, authorizing
the bounded reversible pause slice recommended by the independent critic.

Official-source review disproves the earlier permission assumption:

- Ashby's Public Job Postings API documentation describes the endpoint as a
  way to retrieve postings for “your organization” and populate its own
  careers page:
  `https://developers.ashbyhq.com/docs/public-job-posting-api`.
- Ashby documents a Dedicated Partner Job Feed for partners ingesting
  postings; Ashby provisions the feed and each customer opts in:
  `https://developers.ashbyhq.com/docs/dedicated-partner-job-feeds`.
- Repository evidence contains no partner feed or explicit permission, and
  mature production robots evidence remains HTTP 401/`unknown` for the shared
  `api.ashbyhq.com` origin.

Decision: pause exactly `ashby:supabase`, `ashby:camunda`,
`ashby:tremendous`, `ashby:amplify`, and `ashby:ashby`; do not delete existing
jobs or directory rows, reinterpret HTTP 401, change other ATS policies, or
attempt an alternate endpoint. The installed `compliance-checker` skill was
rejected as an advertising-copy workflow; `source-driven-development` owns the
unit.

Implementation is complete locally. Exactly the five named token policies are
disabled/paused and share an evidence-grounded re-enable note; no other ATS
policy or stored row changed. A focused test was written red-first and now
passes 2/0 with 19 assertions. The full local gate passes 646/0 with 1,576
assertions across 71 files, followed by strict typecheck, production
guardrails, and the Astro server/client build.

Evidence: `docs/gauntlet/evidence/COMP-01C-ashby-access-review.md`.

Fresh independent critic verdict: **SHIP**, with no blocking findings. It
confirmed the official-source reading, exact five-token scope, reversibility,
and focused guard. Its one non-blocking wording precision was applied: the
evidence describes the partner feed as Ashby's documented partner-ingestion
path without claiming the documentation makes it legally exclusive.

Behavior/evidence commit `79b17d6` passed exact-SHA Sovereign CI Guardrail and
production deployment run `33138055473`; Cloudflare Pages deployment completed
at `2026-08-28T03:10:22Z`. The first eligible Worker cycle at
`2026-08-28T03:20:09.266Z` recorded one explicit `paused` skip for each of the
five Ashby identities, zero Ashby real fetches, and 14 real fetches across 14
non-Ashby controls. The D1 verification was read-only (`changed_db=false`,
`changes=0`, `rows_written=0`) and no source endpoint was manually invoked.

All COMP-01C acceptance gates pass. Next exact action: re-rank the residual
COMP-01B policy gate. Ashby is now classified pause/block; review the remaining
enabled `needs_review` ATS identities against official source-supported access
paths before any enforcement flip. Source expansion remains frozen.

## Run 10 — REL-12 KEEP; COMP-01B re-review BLOCKED / NO FLIP (2026-08-28)

Status: **REL-12 TERMINAL — KEEP** and **COMP-01B remains BLOCKED — NO
FLIP** after its mature re-review. Session cold-resumed from the repository
contract, fast-forwarding clean `main` from `2786170` to synchronized
`a8a8e10` (23 generated report commits). No interrupted local work existed.
All production D1 queries were read-only (`changed_db=false`, `changes=0`,
`rows_written=0`); no live source requests, config changes, or data mutations
occurred.

**REL-12 acceptance** — The mature post-TTL window contains 1,023 real fetches
across 20 fetching identities over ~56h40m: 848 `allowed`, 175 `unknown`, zero
`disallowed`, and zero null verdicts. The old workerd Illegal-invocation
signature has zero mature events and was last seen at 2026-08-25T10:00:12Z.
All 11 robots-cache origins now have explicit HTTP results with null internal
error; ten are HTTP 200 with stored bodies. This satisfies the unit's deployed
production acceptance gate.

**COMP-01B re-review** — Endpoint matrix: 15 identities `pass`; five Ashby
identities (`amplify`, `ashby`, `camunda`, `supabase`, `tremendous`) remain
`unknown` on all 35 mature real fetches each because the shared
`api.ashbyhq.com` robots request returns HTTP 401 and operator intent is
unknown; 21 configured identities remain intentionally paused/skip-only. The
contract stop condition therefore fires. No typed enforcement config, canary,
rollback drill, source enablement, or bypass was attempted. Observe mode and
the source-expansion freeze remain in force.

Operational evidence remains healthy outside this compliance residual:
source-health run `33069299055` reports 41 identities and zero failed attempts;
directory run `33123135766` reports 8% unreachable and no new de-verifications;
enrichment run `33130081546` processed zero rows (DATA-05A containment holds);
prospector run `33121867026` auto-added zero candidates and did not trip the
mass-add guard.

Next exact actions:

- Create/approve a bounded Ashby robots/access-path review before changing the
  five active Ashby identities. Fresh independent critic recommends pausing
  all five pending that human-reviewed resolution; if authoritative,
  source-supported evidence cannot resolve the ambiguity, keep them paused.
  Never treat HTTP 401 as allow and never bypass it.
- Re-run COMP-01B only after every fetching identity has a reviewed `pass` or
  `block/pause` disposition and the `needs_review` status of every enabled ATS
  identity is reconciled; enforcement remains approval-gated per source.
- Owner-gated (unchanged): REC-01 worktree dispositions, SEC-LEGACY-01
  credential rotation confirmation, and paused-source re-enablement decisions.

Evidence: `docs/gauntlet/evidence/COMP-01B-observation-window-20260824.md`.
The automation-ratchet candidate remains a generated robots observation
rollup; it was evaluated but not implemented because the current run is
evidence-only and the Ashby policy decision is unresolved.
Fresh independent critic verdict: REL-12 SHIP/KEEP; COMP-01B BLOCKED/NO FLIP.
The critic independently reproduced the D1 window with zero writes.

GitHub checkpoint: evidence/state commit `f8fa76b` is confirmed on
`origin/main`; exact-sha Sovereign CI Guardrail run `33137293829` completed
successfully (production guardrails, unit tests, app build, strict typecheck,
and Freshness Worker validation). Production migration/deploy was correctly
skipped for the documentation-only change.

## Run 9 — REL-12 interim production probe FAVORABLE (2026-08-24T21:06Z, still VERIFYING)

Status: **REL-12 remains VERIFYING**; interim read-only production evidence is
favorable. Fresh session cold-resumed at `755f753` clean, fast-forwarded
docs-only to `b9a205c` (`origin/main` automation digest). Unit board unchanged:
20 TERMINAL — KEEP, COMP-01B BLOCKED — NO FLIP (re-review gated behind REL-12),
REL-12 the only non-terminal unit. No dependency-ready approved work existed,
so this run collected the earliest meaningful production signal and checkpointed.

**Interim probe results** (all queries `changed_db=false`, zero live source
requests; full detail appended to
`docs/gauntlet/evidence/COMP-01B-observation-window-20260824.md`):

- First-ever successful `robots_cache` rows: `https://jobicy.com` +
  `https://www.realworkfromanywhere.com` fetched 16:30:14Z under the fixed gate
  (HTTP 200, bodies 1,850 / 125 bytes, null error).
- First-ever decidable verdicts in `source_fetch_events`: 11 × `allowed`
  post-deploy (jobicy-supporting-apac ×4, real-work-from-anywhere ×4,
  jobicy-admin-support-apac ×3), last ticked 20:50:09Z.
- Residual 142 post-deploy `unknown` fully explained by the predicted taper:
  9 origins' pre-fix entries were still inside their 24h TTL at fetch time.
- Jobicy HTTP 403 watch item (SRC-4F candidate): UNCHANGED — all six 403s /
  five 429s remain clustered 2026-08-23T00:00–06:30Z; both feeds failure-free
  since (14/15 consecutive successes). No escalation.

Next exact actions (unchanged in substance):

- **On/after 2026-08-25T11:30Z**: run the REL-12 acceptance probe (read-only
  D1: `robots_cache` successes + post-deploy verdict distribution since
  14:49:30Z Aug 24). All 9 remaining pre-fix entries will have expired by
  11:20Z. If decidable verdicts dominate with explained residual unknowns →
  flip REL-12 TERMINAL — KEEP.
- **Then start COMP-01B re-review window**: fresh ≥48h decidable observe window
  → re-run endpoint classification → reviewer sign-off → typed config → canary
  → full cadence monitoring per original contract steps.
- Watch item: Jobicy HTTP 403 rate across future windows (candidate SRC-4F if
  growing).
- Owner-gated (unchanged): REC-01 worktree dispositions, SEC-LEGACY-01 rotation,
  paused-source re-enablement decisions.

## Run 8 — COMP-01B NO FLIP + REL-12 deployed (2026-08-24, VERIFYING)

Status: **COMP-01B BLOCKED — NO FLIP (accepted safe outcome)** and
**REL-12 DEPLOYED — VERIFYING**. Start state: synchronized clean `main` at
`a319afc` (docs-only digest delta fast-forwarded from `4830da4`). All D1
queries read-only (`changed_db=false`); zero live source requests (SRC-4D
freeze intact).

**Finding** — Complete ≥48h observe window (2026-08-22T12:40Z → 14:30Z,
681 real fetches, 41 identities) contains **zero** `allowed` robots verdicts:
657 unknown from one deterministic defect, 24 provenance-less transients.
Root cause VERIFIED: `robotsGate.ts:255` default `fetchImpl ?? fetch` invoked
detached at `:186` → workerd Illegal invocation on every robots.txt fetch;
`robots_cache` holds 11 origins / 0 successes / 0 bodies ever. Local tests all
inject `fetchImpl`, so the production default path was never covered
(watermelon). Enforcement flip would have blocked 100% of ingestion — the gate
did exactly its job by forcing this review first.

**REL-12 executed same run (TDD)** — failing-first receiver regression test
(`receiver === globalThis` discriminates detached vs bound invocation; fails on
bare-identifier pattern), one-line fix (`DEFAULT_FETCH_IMPL` wrapper through
`globalThis.fetch(...)`), Bun-augmented `typeof fetch` typed via explicit
signature cast. Verification at `d858383`: focused 28/0/58, full G3
644/0/1,557, typecheck 0, guardrails 0, build complete; CI/deploy `32740931539`
success incl. Pages production deploy ~2026-08-24T14:49:27Z.

**Artifacts** — Evidence: `docs/gauntlet/evidence/COMP-01B-observation-window-20260824.md`.
Units doc: COMP-01B STATUS → BLOCKED — NO FLIP with re-review conditions;
REL-12 contract added, STATUS → VERIFYING.

**SRC-4D TERMINAL — KEEP (2026-08-24T19:01Z)** — complete ≥48h post-rollup
executed read-only: zero paired same-ms failures (pre-fix signature gone),
5 isolated 429s absorbed by capped backoff, turns balanced 18/19 (no
starvation), bounded freshness (both feeds published within ~15 min of query).
Watch item: new HTTP 403 class ×6 (supporting 4 / admin 2), feeds ~70% ok —
escalate only if share grows; candidate SRC-4F. Evidence appended to
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`.

**REL-12 VERIFYING (deployed `d858383`, CI/deploy `32740931539`)** — SRC-4D's
Jobicy freeze is now lifted (post-rollup recorded); scheduled robots.txt
consultations proceed under the fixed gate. Production verification is purely
TTL-staggered: all 11 cached pre-fix error entries expire between
2026-08-24T16:00Z and 2026-08-25T11:20Z; acceptance signal = first
`robots_cache` rows with non-null body / null error and decidable verdicts in
events. Probe query is in the COMP-01B evidence doc.

Next exact actions:

- **On/after 2026-08-25T11:30Z**: run the REL-12 acceptance probe (read-only
  D1: `robots_cache` successes + post-deploy verdict distribution). If
  decidable verdicts dominate with explained residual unknowns → flip REL-12
  TERMINAL — KEEP.
- **Then start COMP-01B re-review window**: fresh ≥48h decidable observe window
  → re-run endpoint classification → reviewer sign-off → typed config → canary
  → full cadence monitoring per original contract steps.
- Watch item: Jobicy HTTP 403 rate across future windows (candidate SRC-4F if
  growing).
- Owner-gated (unchanged): REC-01 worktree dispositions, SEC-LEGACY-01 rotation,
  paused-source re-enablement decisions.

## Run 8 prior context (superseded details retained below)

## Run 7 — TAX-02 owner-directed category expansion (2026-08-23, TERMINAL — KEEP)

Status: **TAX-02 TERMINAL — KEEP** and freshness diagnosis delivered. Owner
request (2026-08-23): find AI / writing / technical-writing / knowledge-
management / content-production roles on the site, check Aug-22 job movement,
strategize and implement; mandate §22 backs the category expansion.

**What shipped** — Behavior `011b673` + critic revision `0d77acf` on
synchronized `main`: two new public categories (`ai` = AI & AUTOMATION,
`writing` = WRITING & CONTENT incl. technical writing, content production, KM)
through the whole chain — triage prompt vocabulary, `validateTriageResult`
whitelist + writing-family alias normalization (`copywriting`,
`technical-writing`, `knowledge-management`, `content-production` → writing),
shared mapper, `JOB_CATEGORY_MAP`, card dot colors, eval corpus v2, coverage
guards extended to nine slugs. Counted reversible backfill: 28 title-matched AI
rows → `ai`, 8 title-matched writing rows → `writing`; dry-run first with exact
IDs (bare `%llm%` pattern removed after sample review caught "Enrollment
Specialist"); 36/36 CAS-guarded UPDATEs applied `changes=1`; post-totals
reconciled exactly (tech 455, other 237, admin 144, marketing 141, cs 120,
finance 91, design 45, **ai 28, writing 8**, total 1269 unchanged); undo
artifact committed at
`docs/gauntlet/evidence/TAX-02-undo-artifact-20260823.json`. Live evidence:
`/categories/ai` + `/categories/writing` HTTP 200 populated; homepage renders
both cards. Verification: local full suite 642/0/1,548 at `011b673`, 543/0/1,311
(scraper+web) after revision, typecheck/guardrails/build exit 0; CI/deploy runs
`32615195950` and `32616479700` both success incl. production Pages deploy.
Fresh independent critic REVISE(fix-forward); all five findings applied in-unit.
Evidence: `docs/gauntlet/evidence/TAX-02-ai-writing-categories.md`.

**Freshness verdict (read-only)** — Clock healthy (all identities ticked
through 2026-08-23T03:00Z). The Aug-22 drop is weekend seasonality (Sat=4 vs
Fri=28; prior Sun Aug 16=7) plus intentional SRC-4D Jobicy cadence skips. NOT
executed (owner decision required): re-enabling paused writing/VA-heavy sources
(`problogger`, `onlinejobs-ph`, `remote-co`, `authentic-jobs`, `jobspresso`,
paused workable/breezy VA tokens) as future supply for the new categories —
expansion freeze stays active until COMP-01B evidence matures.

Out-of-contract candidates recorded in the evidence doc: `/api/ingest.ts`
category whitelist hardening; stale dead-code comment in `triage-decision.ts`;
legacy alias coercion revisit.

Next exact actions:

- On/after **2026-08-24T19:00Z**: SRC-4D read-only D1 post-rollup from
  `source_fetch_events` since `2026-08-22T18:57:00Z`, append to
  `docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
  or pause-Jobicy per contract.
- On/after **2026-08-24T12:38Z**: begin COMP-01B complete-window observation
  report + reviewer sign-off + canary/cadence monitoring + rollback drill.
- Owner-gated (unchanged): worktree cleanup dispositions (REC-01),
  SEC-LEGACY-01 rotation confirmation, paused-source re-enablement decisions.
  Un-contracted candidate: DATA-05B residual provenance backfill.

## Run 6 orientation addendum — 2026-08-23 (PAUSED — both remaining gates time-immature)

Decision: **PAUSED**. No dependency-ready approved unit exists today. Fresh
orientation verified at `e541309` (`main` clean, synchronized with
`origin/main`; no dirty or untracked files). All 20 unit contracts are
TERMINAL — KEEP except `SRC-4D` (VERIFYING) and `COMP-01B` (PLANNED), both
time-gated to 2026-08-24. Operational watermelon check passed: Prospector run
`32611728775` clean (0 auto-added, mass-add guard false); directory health run
`32612310746` healthy (28 OK / 7 bot-wall / 3 unreachable = 8% ratio / 0 newly
de-verified); enrichment run `32582816172` processed 0 companies (DATA-05A
containment holding); source health shows only the two known Jobicy 429s
already owned by SRC-4D. No code, data, contract, or generated-report changes
were made this run; this addendum is the only commit.

Next exact actions (unchanged from the run 5 checkpoint below):

- On/after **2026-08-24T19:00Z**: run the read-only D1 post-rollup from
  `source_fetch_events` since `2026-08-22T18:57:00Z`, append to
  `docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide
  SRC-4D KEEP or pause-Jobicy per contract.
- On/after **2026-08-24T12:38Z**: begin COMP-01B — complete-window observation
  report covering every active endpoint, reviewer sign-off, canary + full
  cadence monitoring, rollback drill.
- Still owner-gated: worktree cleanup dispositions (REC-01), SEC-LEGACY-01
  rotation confirmation. Un-contracted candidate (needs a new approved unit
  before any work): DATA-05B residual provenance backfill.

## Current Gauntlet Execution Savepoint — 2026-08-23 (run 5)

Status: **DATA-05B TERMINAL — KEEP (owner-approved CAS repair executed and
proven) and REC-02 TERMINAL — KEEP (minimal-context resume drill passed,
subject deployed)**.

**DATA-05B** — The owner approved the six recorded candidate rows via the run
instruction "all approved that needed to be approved all proceed"
(2026-08-23). Executed exactly per contract: fresh read-only report
re-collected (`changed_db=false`), byte-identical sha256
`86d3a0002c0e48bd9c51285f7e1f10dc434da9e66d80e1470c24477c8d1d1be3` to the
00:13Z report (zero drift); all six IDs matched expected values (no CAS
drift); dry-run 6 planned / 0 skipped; six guarded per-row UPDATEs executed
via wrangler, `changes=1` each (one transient `fetch failed` before any
execution, retried safely under CAS); post-state SELECT shows all six rows
`website IS NULL` + `website_source='repair_cleared'` + evidence-hash-prefixed
`website_evidence`; post-totals reconciliation exact (with_website 344→338,
note-evidence 35→29, shared-host 39→37, mismatch 17→11); undo artifact
retained (`DATA-05B-undo-artifact-20260823T0146Z.json`); route smoke passed
(all six companies render live, zero bogus hosts on probed pages, control row
Lemon.io intact). Ambiguous rows 618/619/576 untouched. Local focused tests
27 pass / typecheck exit 0 at `d7e7e15`. Evidence:
`docs/gauntlet/evidence/DATA-05B-directory-website-provenance.md`.

**SRC-4D remains VERIFYING (48h live window)** — behavior `90f3243`, CI/deploy
`32592205884`; production Pages deploy ~2026-08-22T18:57Z starts the ≥48h
post window. NEXT EXACT ACTION: on/after **2026-08-24T19:00Z** run the
read-only D1 post-rollup from `source_fetch_events` since
`2026-08-22T18:57:00Z`, append to
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
or pause-Jobicy per contract.

**COMP-01B remains PLANNED (window not yet complete)** — prerequisite window
(minimum 48h) matures on/after **2026-08-24T12:38Z** (COMP-01A deploy
`32573525387` completed 2026-08-22T12:38Z). Requires reviewed observation
report covering every active endpoint, reviewer sign-off, canary + full
cadence monitoring, rollback drill. Owner blanket approval (this run) covers
the sign-off role only when the objective evidence gate is complete.

**REC-02 TERMINAL — KEEP (resume drill passed)** — Subject ActivePath typing
cleanup completed through a genuine minimal-context handoff: executor A
stopped at pushed WIP checkpoint `0625e12` on `rec02-drill/activepath-typing`;
fresh-context executor B (artifacts only, no chat history) answered all five
probe questions correctly and completed subject commit `b73d6d4` (+2 lines:
`sourceName?`/`sourceFamily?` declared on `ActivePath`); independent critic
SHIP 5/5, independently reproducing focused 16/0/65 and full G3
636/0/1,531 assertions across 70 files; merged to main via `b07d86f`; CI/deploy
`32612673834` success including production Pages deploy. Drill branch and
worktree `.worktrees/rec02-drill` retained pending human no-unique-work
confirmation. Proven process improvements now in force: (1) fresh worktrees
need their own `bun install --frozen-lockfile`; (2) batons anchor on symbol
names, never line numbers.
Evidence: `docs/gauntlet/evidence/REC-02-resume-drill.md`.

- Branch: `main`; worktree clean at each commit; run started at `d7e7e15`
  (clean, synchronized with origin/main).
- Commits this run (all pushed to origin/main): `b3fb922` (DATA-05B
  acceptance evidence + STATUS + artifacts), `5fb1418` (baton refresh),
  `a1fa02a` (REC-02 incomplete checkpoint baton; absorbed automation commits
  `c946cb4`, `6d0ee5e`), merge `b07d86f` (REC-02 subject: `0625e12` +
  `b73d6d4` from drill branch).
- CI/deploy this run: `32611329054` (`b3fb922`) success docs-only;
  `32612089332` (`a1fa02a`) success docs-only; `32612673834` (`b07d86f`)
  success incl. production Pages deploy.
- Last Gauntlet decisions this run: DATA-05B — KEEP; REC-02 — KEEP.
  Before that (run 4): REL-11 KEEP; SRC-4E KEEP.
- Current implementation unit queue:
  `SRC-4D` VERIFYING (post-rollup due on/after 2026-08-24T19:00Z),
  `COMP-01B` PLANNED (window matures 2026-08-24T12:38Z),
  future candidates: post-SRC-4D live Jobicy Doctor re-probe,
  provenance backfill for company-consistent note rows (DATA-05B residual),
  worktree cleanup dispositions (owner-gated per REC-01).
- Ownership boundary unchanged: `remotephjobs.com` external;
  `remotejobs-ph.pages.dev` is this project's production site.

## Historical checkpoint — run 4 / REL-11 + SRC-4E (2026-08-23)

Status: **SRC-4E TERMINAL — KEEP (diagnosis-only) and REL-11 TERMINAL — KEEP
(behavior fix deployed)**.

**SRC-4E** — The Jobicy supporting-feed "CDATA is not closed" SCHEMA_BROKEN
observation was a Source Doctor measurement artifact:
`packages/scraper/source-doctor.ts` sliced every static-source body to
`MAX_BODY_BYTES` (256 KiB) before parsing, cutting the ~40-item supporting feed
mid-CDATA, while the ingestion path parses full bodies via
`conditionalFetchText`. Production D1 (read-only, `changed_db=false`
throughout): ZERO parse errors ever across 113,342 fetch events; only Jobicy
failures ever recorded are HTTP 429 pairs; supporting feed parsed 40 items as
recently as 2026-08-22T21:10Z. Local synthetic reproduction matrix against
fast-xml-parser 5.10.1 produces the exact error string only for
truncation-mid-CDATA. CONSEQUENCE FOR SRC-4D: discount the SCHEMA_BROKEN half
of the 2026-08-22T22:18Z observation; its HTTP-200-no-429 half remains a
favorable interim signal; the D1 post-rollup gate is unchanged.
Evidence: `docs/gauntlet/evidence/SRC-4E-jobicy-supporting-cdata-diagnosis.md`.

**REL-11** — Fix deployed: `f2a84be` makes the Doctor static probe parse the
full fetched body (deletes `MAX_BODY_BYTES`) and adds a >256 KiB CDATA
regression test (283,353-char synthetic fixture → HEALTHY_WITH_RESULTS,
itemCount=8, full byte accounting). Red/green proven: same fixture through the
old slice path throws exactly "CDATA is not closed.". Local G3 at `f2a84be`:
635 tests, 0 failures, 1,529 assertions; typecheck/guardrails/build exit 0.
Fresh independent critic **SHIP** (zero blocking/important findings; one
cosmetic nit fixed pre-commit; one PRE-EXISTING out-of-contract finding
recorded: `ActivePath` type lacks declared `sourceName`/`sourceFamily` fields
assigned in code — future bounded typing unit candidate). CI/deploy
**`32609833176` success on the exact SHA including production Pages deploy**.
No live Jobicy re-probe performed or permitted yet (SRC-4D window still open).
Evidence: `docs/gauntlet/evidence/REL-11-doctor-rss-truncation-fix.md`.

Docs hygiene also done this run: STATUS rows for REC-01, OPS-06, DATA-03
(terminal KEEP each) and SRC-4D (VERIFYING with gate details) refreshed from
commit-history evidence (`6f5a630`).

**DATA-05B remains VERIFYING/BLOCKED at the human-approved evidence gate** —
code deployed (`6e31cd7f`; CI/deploy `32605834663` applied migration 0033);
fresh read-only report recorded (344 unclassified / 35 note-evidence / 39
shared-host / 17 mismatch); NO mutation has occurred or is authorized without
an owner-approved evidence file (exact IDs + expected old values), then
apply-sql dry-run → guarded per-row apply → undo artifact → route smoke.

**SRC-4D remains VERIFYING (48h live window)** — behavior `90f3243`, CI/deploy
`32592205884`, production Pages deploy ~2026-08-22T18:57Z starts the ≥48h post
window. Interim signals: HTTP 200s on both feeds (no 429) per the 22:18Z probe
(parse half now attributed to the SRC-4E artifact); D1 shows paired cadence
skips operating and only one post-deploy 429 pair event so far (00:00:39Z Aug
23, supporting feed fetch-level). NEXT EXACT ACTION: on/after 2026-08-24T19:00Z
run the read-only D1 post-rollup (per-feed attempts / HTTP 429s / deferrals /
backoff skips / publication lag from `source_fetch_events` since
`2026-08-22T18:57:00Z`), append it to
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
or pause-Jobicy per contract.

- Branch: `main`; worktree clean at each commit; run started at `0abe1a4`
  (clean, synchronized with origin/main).
- Commits this run (all pushed to origin/main): `6f5a630` (STATUS refresh +
  SRC-4E PLANNED contract), `8237171` (SRC-4E diagnosis evidence + baton),
  `90f52b8` (REL-11 PLANNED contract), `f2a84be` (REL-11 behavior + test),
  plus the final docs/baton commit.
- CI/deploy this run: `32608128086` (`6f5a630`) success docs-only;
  `32608675912` (`8237171`) success docs-only, deploy skipped;
  `32609833176` (`f2a84be`) success incl. production Pages deploy.
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Last accepted production behavior commits: `f00478c`/`041bc2c` (DATA-06B,
  KEEP); `90f3243` (SRC-4D, VERIFYING); `6e31cd7f` (DATA-05B code slice,
  deployed, awaiting approval-gated data step); `f2a84be` (REL-11, KEEP).
- Current scheduled evidence: watchdog runs continue hourly; their payloads
  remain evidence to inspect, not blanket health acceptance.
- Last Gauntlet decisions this run: `REL-11` — KEEP; `SRC-4E` — KEEP
  (diagnosis). Before that: DATA-06B KEEP; DATA-05B BLOCKED (approval gate).
- Current implementation unit queue:
  `SRC-4D` **VERIFYING** (post-rollup due on/after 2026-08-24T19:00Z),
  `DATA-05B` **BLOCKED at owner approval gate** (mutation step),
  `COMP-01B` (reviewed enforcement; gated on a complete reviewed robots observe
  window plus per-source reviewer sign-off),
  `REC-02` (resume drill; needs owner agreement to synthetic interruption),
  future candidates recorded but not contracted: post-SRC-4D live Jobicy
  Doctor re-probe (expect HEALTHY_WITH_RESULTS), `ActivePath` typing cleanup.

## Historical checkpoint — run 3 / DATA-05B deployed slice (2026-08-23)

Status: **DATA-05B VERIFYING — code deployed + fresh read-only report recorded;
BLOCKED at the human-approved evidence gate (no mutation has occurred)**. The
previous run's code slice is on origin/main at `6e31cd7f`: additive provenance
migration `0033` (`df35fdf`), report/CAS-repair tooling + tests (`848abbe`),
critic hardening (`6e31cd7f`). CI/deploy `32605834663` green on the exact SHA,
including "Apply D1 migrations to production" (0033 applied) and Pages deploy;
watchdog `32605596383` success. Local G3 at head: 634 tests, 0 failures, 1,523
assertions; typecheck EXIT 0. This run executed both read-only report SELECTs
against production D1 (`changed_db=false`, `rows_written=0`) and reconciled:
456 rows / 344 with website / 0 classified; 344 unclassified; 35 with
enrichment-note evidence; 39 rows in 19 shared-host groups; 17 name/host
mismatch. Strongest repair candidates (PENDING OWNER REVIEW, nothing approved):
546 Vidalytics→we-work-remotely.com, 548 Airalo→remotephjobs.ph, 557
Sourcegraph→remote.ph, 575 Impact Clients→highperformancetrain.com, 577
DuckDuckGo→remote.ph, 623 Kindred→remote-ph-jobs.com. Redacted artifact +
sha256 and exact continuation path:
`docs/gauntlet/evidence/DATA-05B-directory-website-provenance.md`. STOP
CONDITION HONORED: contract classifies mutation APPROVAL-GATED; next action
requires owner-approved evidence file (exact IDs + expected old values), then
apply-sql dry-run → guarded per-row apply → undo artifact → route smoke.

**SRC-4D remains VERIFYING (48h live window)** — unchanged gate: behavior
commit `90f3243`, CI/deploy `32592205884`, production Pages deploy
~2026-08-22T18:57Z starts the ≥48h post window. Interim read-only observation
2026-08-22T22:18Z: both `jobicy.com` feeds HTTP 200 (no 429);
`jobicy-supporting-apac` failed XML parse ("CDATA is not closed") →
SCHEMA_BROKEN — favorable interim signal only, not acceptance evidence.
NEXT EXACT ACTION: on/after 2026-08-24T19:00Z run the read-only D1 post-rollup
(per `source_fetch_events` since `2026-08-22T18:57:00Z`), record it in
`docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then decide KEEP
or pause-Jobicy per contract. Follow-up **SRC-4E — Jobicy supporting-feed CDATA
parse failure** stays PROPOSED (needs bounded contract before any change).

- Branch: `main`; worktree clean; this run started/ended at `6e31cd7f`
  (`main` = `origin/main`; base for this run's docs commit).
- DATA-05B code execution start: `5373eae` (clean synchronized tree).
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Last accepted production behavior commits: `f00478c`/`041bc2c` (DATA-06B,
  KEEP); `90f3243` (SRC-4D, VERIFYING); `6e31cd7f` (DATA-05B code slice,
  deployed, awaiting approval-gated data step).
- Doc-hygiene note: this run refreshed the DATA-05B STATUS row only; STATUS
  rows for REC-01, OPS-06, DATA-03, and SRC-4D still lag their terminal
  reality recorded in the baton/commit history; treat the baton as
  authoritative until a dedicated docs pass refreshes them.
- Current scheduled evidence: watchdog runs continue hourly; their payloads
  remain evidence to inspect, not blanket health acceptance.
- Last Gauntlet decision: `DATA-06B` — KEEP; this run's DATA-05B decision:
  BLOCKED (approval gate) pending owner.
- Current implementation unit queue:
  `DATA-05B` **VERIFYING/BLOCKED at human-approved evidence gate** (see above),
  `SRC-4D` **VERIFYING** (48h post-rollup due on/after 2026-08-24T19:00Z),
  `SRC-4E` (PROPOSED — Jobicy supporting-feed CDATA parse failure; needs
  bounded contract before any change),
  `COMP-01B` (reviewed enforcement; gated on a complete reviewed robots observe
  window plus per-source reviewer sign-off),
  `REC-02` (resume drill; needs owner agreement to synthetic interruption).

## Historical checkpoint — planning savepoint run 2 / DATA-06B KEEP (2026-08-23)

Status: **DATA-06B TERMINAL — KEEP**. Owner product decision (2026-08-23):
option (a) trust the stored `category` column on every surface. The
display-time regex reclassifier in `getJobCategory` was deleted
(`apps/web/src/lib/categories.ts` → `return opp.category || 'other'`), so
homepage preview grouping, the `categoryTotals` badge, `/categories/[slug]`,
and `/opportunities` now always agree; stored-`other` jobs render only under
GENERAL & OTHER. Behavior commit `f00478c` + critic-recommended test-hardening
commit `041bc2c` (stored-`other` pinned against all six legacy regex families)
both pushed; CI/deploy runs `32602546093` (incl. production deploy job
`97102984274`) and `32602939487` green; fresh independent critic SHIP with its
one Important test-power recommendation applied in-unit; local G3 at behavior
commit: 606 tests, 0 failures, 1,418 assertions; typecheck/build/guardrails
EXIT 0. Evidence:
`docs/gauntlet/evidence/DATA-06B-ui-category-consistency.md`. Contract row
added to `docs/gauntlet/IMPLEMENTATION_UNITS.md` (owner decision recorded
there). Sole executor; no overlapping work; worktree clean.

**SRC-4D remains VERIFYING (48h live window)** — unchanged gate: the bounded
Jobicy shared-origin cadence fix is deployed (behavior commit `90f3243`, CI/
deploy `32592205884`, production Pages deploy ~2026-08-22T18:57Z starts the
≥48h post window; local G3 at that commit: 602 tests, 0 failures, 1,403
assertions). Interim read-only observation 2026-08-22T22:18Z (~3.4h into
window, this runtime): Source Doctor on both `jobicy.com` feeds returned
**HTTP 200** (no 429) — `jobicy-admin-support-apac` HEALTHY_WITH_RESULTS
(robots allowed, 6 items), `jobicy-supporting-apac` fetched HTTP 200 but
**failed XML parse: "CDATA is not closed." → SCHEMA_BROKEN**. The 200s are
favorable interim signal only, not acceptance evidence; the post-rollup D1
query remains the gate. NEW FINDING (recorded separately, not folded into
SRC-4D): the `jobicy-supporting-apac` CDATA parse failure is not documented
anywhere in the repo; proposed follow-up **SRC-4E — Jobicy supporting-feed
XML parse failure** (diagnosis-first, read-only; needs a bounded contract
before any parser change). NEXT EXACT ACTION: on/after 2026-08-24T19:00Z run
the read-only D1 post-rollup (per-feed attempts / HTTP 429s /
`Deferred by cadence group%` deferrals / `%shared-origin 429 backoff%` skips /
publication lag from `source_fetch_events` since `2026-08-22T18:57:00Z`),
record it in `docs/gauntlet/evidence/SRC-4D-jobicy-cadence-diagnosis.md`, then
decide KEEP or pause-Jobicy per contract. OPS-05, DATA-06, REL-08, COMP-01A,
DB-01, OPS-04, DATA-03, OPS-06, REL-09, SEC-03, REL-10, DATA-05A, DATA-06B
remain KEEP.

- Branch: `main`; this run resumed at `7719b5f`, fast-forwarded clean to
  `bdb6e22` (automation docs-only), behavior base `bdb6e22`, head `041bc2c`
  (`main` = `origin/main`).
- CI/deploy: `32602546093` (`f00478c`) success; `32602939487` (`041bc2c`)
  success; watchdogs `32594161486`/`32597360223`/`32600048103` success
  post-SRC-4D-deploy.
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Accepted planning package and last GitHub backup: `d21cd9e` (superseded by
  `041bc2c` on origin/main)
- Last accepted production behavior commits: `f00478c`/`041bc2c` (DATA-06B,
  KEEP); `90f3243` (SRC-4D, VERIFYING).
- Doc-hygiene note (no unit): `IMPLEMENTATION_UNITS.md` STATUS rows for REC-01,
  OPS-06, DATA-03, and SRC-4D lag their terminal reality recorded in the
  baton/commit history (`451b76e`, `539b65b`, `6146290`, `90f3243`); treat the
  baton as authoritative until a docs-only pass refreshes them.
- Current scheduled evidence: watchdog runs continue hourly; their payloads
  remain evidence to inspect, not blanket health acceptance.
- Last Gauntlet decision: `DATA-06B` — KEEP.
- Current implementation unit queue:
  `SRC-4D` **VERIFYING** (48h post-rollup pending; see above),
  `DATA-05B` (provenance repair; mutation needs human-approved evidence file),
  `SRC-4E` (PROPOSED — Jobicy supporting-feed CDATA parse failure; needs
  bounded contract before any change),
  `COMP-01B` (reviewed enforcement; gated on a complete reviewed robots observe
  window plus per-source reviewer sign-off),
  `REC-02` (resume drill; needs owner agreement to synthetic interruption).
  `DATA-06B` closed KEEP this run.

### Historical checkpoint — DATA-06 (2026-08-22)

Status: **DATA-06 TERMINAL — KEEP**. Taxonomy/triage-decision convergence
shipped and verified: the three new-item ingestion decision paths (inline scrape
loop, inline pending-triage drain, Inngest drain) now share one `decideTriage` +
`mapTriageCategoryToUiCategory` contract; the private duplicate mapper in
`scrape.ts` was removed; a 30-case labelled eval corpus + cross-path anti-drift
guard lock the contract. Behavior-preserving (1:1 branch parity, fresh critic
SHIP); no model/prompt/schema/source change. Two deliberate exceptions
documented: the cheap-8B unclear-sweep keeps its distinct ladder, and the
display-side `getJobCategory` homepage/category inconsistency is escalated as a
new follow-up **DATA-06B** (user-visible product-taxonomy decision). REL-08
Source Doctor V1 remains KEEP. COMP-01A fully committed with DB layer. DB-01
rehearsal passes fresh and legacy chains (85/85 schema assertions, 32
migrations). OPS-04, DATA-03, OPS-06 remain KEEP. DATA-05A, REL-09, SEC-03,
REL-10 remain KEEP.

- Branch: `main`
- OPS-04 execution start: `6146290` (`main` = `origin/main` at start).
- DATA-03 execution start: `539b65b` (`main` = `origin/main` at start).
- OPS-06 execution start: `060b2db` (`main` = `origin/main` at start).
- COMP-01A execution start: `a75f8a8` (`main` = `origin/main` at start).
- REL-08 execution start: `e2c89e1` (`main` = `origin/main` at start).
- DATA-06 execution start: `c6ea703` (`main` = `origin/main` at start; behavior
  developed on `codex/data-06-taxonomy-convergence`, fast-forwarded to `main`).
- DB-01 rehearsal fix: `af960d7` (updated expected migration count to 32).
- Ownership boundary: `remotephjobs.com` is an external site;
  `remotejobs-ph.pages.dev` is this project's production site. External-source
  indexing is allowed only through the existing compliance policy and never
  implies ownership.
- Planning baseline: `bd84cc1`
- Accepted planning package and last GitHub backup: `d21cd9e`
- Planning-package CI: GitHub Actions run `32552942171` passed validation;
  production migration/deploy was correctly skipped for a docs-only change.
- Last accepted production behavior commit: `a014e71` (DATA-06 taxonomy/triage-decision convergence).
- Last accepted behavior deployment: GitHub Actions CI run `32579585128` passed full suite (569 tests, 1,335 assertions, typecheck, build, guardrails, D1 migrations applied, FTS verified, Pages deployed; deploy job `97046920502`).
- Current scheduled evidence: watchdog `32563229451`, Hunter `32563299530`, CI `32563188313` completed successfully. Their payloads remain
  evidence to inspect, not blanket health acceptance.
- Last Gauntlet decision: `DATA-06` taxonomy/triage-decision convergence — `KEEP`.
- Current implementation unit: `OPS-05` (alert lifecycle) / `SRC-4D` (Jobicy cadence; needs 48h live evidence) / `DATA-05B` (provenance repair; needs human-approved evidence) — PLANNED, dependency-ready after REL-08. `COMP-01B` (reviewed enforcement) — PLANNED but gated on a complete reviewed robots observe window. `DATA-06B` (UI category consistency) — new follow-up spun out of DATA-06; user-visible product-taxonomy decision.
- DATA-03 code commits: `1cca4b3` (generator + read-only workflow + fixture
  test) and `feb5f0b` (run cohorts per-command after a dispatched run proved
  multi-statement `--file` returns only a summary). Local G3: 495 tests, 0
  failures, 1,155 assertions; typecheck, build, guardrails passed; focused
  cohort test 14/14.
- DATA-03 D1 read: `workflow_dispatch` run `32565032655` (head `feb5f0b`)
  succeeded read-only (`rows_written: 0`, `changed_db: false`). asOf
  `2026-08-22T00:00:00Z`; cutoffs stale=`2026-07-23`, unseen=`2026-08-08`.
- DATA-03 baseline: 4,828 total / 1,283 active / 3,545 inactive. Active cohorts:
  stale-30d `623`, unseen-14d `399`, never-verified `16`, missing-company `48`,
  undated `0`. All 10 reconciliation deltas `0`. Active `1,283` matches E-03
  public opportunities count. Key stratified findings: 45 of 48 missing-company
  rows are Jobicy (100% of its active rows); staleness/`unclear` concentrate in
  ATS engineering feeds; 49 duplicate groups / 74 excess rows dominated by
  same-company Remote.com APAC reposts. Evidence:
  `docs/gauntlet/evidence/DATA-03-quality-baseline.md`. No mutation authorized.
- OPS-04 behavior commit: `83f94d0` (`feat(directory): expose bounded egress
  diagnostics`). Adds a runtime-agnostic `classifyUnreachableError()` taxonomy
  (TIMEOUT/DNS/TLS/CONNECT/EGRESS_BLOCKED/REQUEST_ERROR/UNKNOWN_NETWORK) + a
  `<=40`-char cause code, populates `unreachableCode/unreachableReason`,
  aggregates per-run reason counts + capped redacted hostname samples in the
  audit response, and surfaces the distribution in the digest/job summary.
  Strikes, de-verify threshold, visibility, URL immutability, 40-row budget,
  concurrency 8, and the 80% systemic gate are unchanged.
- OPS-04 local G3: 513 tests, 0 failures, 1,191 assertions; typecheck, build,
  guardrails passed (bun 1.3.14). Focused: scraper linkHealth 33/33, web
  directory-health 8/8.
- OPS-04 CI/deploy: run `32568634636` success (full suite, D1 migrations, FTS
  verify, Pages deploy job `97020879509`).
- OPS-04 live evidence: two Cloudflare cohorts — run `32568721809` (#1) checked
  40 → 5 unreachable, all `EGRESS_BLOCKED`, ratio 12.5%, not degraded; run
  `32568795476` (#2) checked 40 → 0 unreachable, ratio 0%. Bounded cross-runtime
  probe re-checked the five #1 hosts (`ph.indeed.com`, `ph.jobstreet.com`,
  `hellorache.com`, `jobquest.ph`, `bottleneck.ph`) from a non-Cloudflare
  runtime: 2 bot_wall (HTTP 403, alive), 3 ok (HTTP 200), 0 dead. Supported
  cause: Cloudflare egress-side transport failure, not origin death; no strike
  change warranted. Auto-digest sync commits `a329efc`, `1e9f863`. Evidence:
  `docs/gauntlet/evidence/OPS-04-unreachable-diagnosis.md`. Remediation (a
  non-Cloudflare probe path) is a separate future unit, not folded into OPS-04.
- OPS-06 local verification: `bun test` passed 481 tests with 1,113 assertions and zero failures; `bun run typecheck`, `bun run build`, and `bun run audit:guardrails` passed locally on 2026-08-22; focused test `hunter-recovery.test.ts` 10/10 passed.
- OPS-06 commit: `62acf5a`; GitHub Actions CI run `32563188313` passed.
- Manual Hunter run `32563299530` completed: single scrape invocation, terminal state `needs-rerun` (zero new jobs after dedup), lock state `free`, backlog `0`, zero failed sources, zero insert errors; artifact `hunter-health-32563299530` uploaded.
- Accepted DATA-05A behavior: source-attributable apply URLs, legacy click
  fallback, directory inference removal, and exact incident repair.
- Fresh read-only pre-migration D1 inventory: 169 cross-source application
  rows, 8 reviewed directory assignments, 0 current same-source rows;
  `changed_db=false`, 0 rows written.
- Post-deploy acceptance: exact-host cross-source rows `0`; reviewed directory
  assignments remaining `0`; eight reviewed rows repaired; first enrichment
  run `32555452346` returned `websiteSet=0`; bounded Hunter run `32556180387`
  exposed zero quarantines/anomalies and recorded 42/42 fetch events.
- Fresh local acceptance at automation-advanced `d269755`: 457 tests, 0
  failures, 1,210 assertions; typecheck, build, and guardrails passed.
- REL-09 acceptance: baseline run `32542676422` reproduced 49 successes/71
  failures at 120 rows. A 40-row canary passed, but the next canary
  `32556609049` exposed five redirect-driven platform-budget failures and
  correctly failed the workflow. Corrective commit `137a3ff` caps one redirect
  hop and 20 rows, for at most 40 external fetches under the 50-request ceiling.
- Final live rotations `32556799462` and `32556821369` each passed 20/20 with
  zero platform-budget failures. Current active backlog 1,267 implies a
  measured 32-day sweep at two runs per day.
- Fresh REL-09 G3: 461 tests, 0 failures, 1,026 assertions; typecheck, build,
  and guardrails passed.
- SEC-03 acceptance: behavior commit `6c48810` centralizes exact-host-or-dot-
  subdomain matching across source trust and all five ATS families. Known-good
  configured hosts retained 100% parity and all malicious concatenated suffix
  fixtures failed closed; no allowlist or dependency changed.
- Fresh SEC-03 G3: 464 tests, 0 failures, 1,053 assertions; typecheck, build,
  guardrails, CI/deploy run `32557360004`, and live Prospector run `32557448855`
  passed. The live run returned HTTP 200 with 4 considered, 0 eligible/added,
  3 review-only, 1 quality rejection, 0 ATS proposals, and no guard trip.
- DB-01 acceptance: rehearsal script `scripts/ci/rehearse-d1-migrations.ts`
  passes fresh and legacy database rehearsals locally (85/85 schema assertions, 32 migrations including 0032); CI/deploy run `32574532452` passed full suite (520 tests, 1,207 assertions, typecheck, build, guardrails, D1 migrations applied, FTS verified, Pages deployed). Production smoke: `/`, `/directory`, `/opportunities` all return HTTP 200.
- REL-10 acceptance: behavior commit `5690d54` adds `phEligibility` to the
  homepage slim projection, types the card projection as `OpportunityCardData`,
  and adds 7 focused contract tests. Local verification: 471 tests, 0 failures,
  1,077 assertions; typecheck, build, and guardrails passed. CI/deploy run
  `32561624073` passed full suite (471 tests, 1,077 assertions, typecheck,
  build, guardrails, Pages deployed). Production smoke: `/`, `/directory`,
  `/opportunities` all return HTTP 200.
- COMP-01A acceptance: behavior commit `c992dfe` extends `source_fetch_events`
  with 6 robots columns (robots_origin, robots_verdict, robots_evidence,
  robots_crawl_delay, robots_would_block, robots_mode) via migration
  `0032_source_fetch_events_robots_evidence.sql`; adds robots.txt checking for
  all 5 ATS endpoint families (Lever, Greenhouse, Workable, Breezy, Ashby);
  exports `atsEndpointUrl`; updates `FETCH_EVENT_COLUMNS` to 18; adds 7 ATS
  robots integration tests. DB layer committed at `60f4838` (schema + migration).
  Local verification: 520 tests, 0 failures, 1,207 assertions; typecheck, build,
  guardrails passed. CI/deploy run `32573525387` (app layer) and `32574532452`
  (full with DB layer) passed full suite.
- REL-08 acceptance: behavior commit `4c33d96` adds `packages/scraper/source-doctor.ts`,
  `packages/scraper/source-doctor.test.ts` (14 tests, all nine outcomes covered),
  `scripts/source-doctor.ts` CLI. Local verification: 534 tests, 0 failures,
  1,264 assertions; typecheck, build, guardrails passed. CI/deploy run
  `32576239721` passed full suite. Four fixture runs: enabled RSS (We Work
  Remotely), enabled JSON (Remote OK), paused (ProBlogger), unknown ID — all
  produce correct terminal outcomes. Request budget bounded (≤2 for static).
  Zero mutations, zero AI calls, zero D1 writes.
- DATA-06 acceptance: behavior commit `a014e71` converges the three new-item
  ingestion decision paths onto the shared `decideTriage` +
  `mapTriageCategoryToUiCategory`, removes the private duplicate mapper in
  `scrape.ts`, additively enriches the `ai-unavailable` verdict variant to carry
  the failed `triage` (preserving diagnostics), and adds a 30-case labelled eval
  corpus (`packages/scraper/fixtures/triage-eval.json`) + cross-path anti-drift
  guard (`packages/scraper/triage-eval.test.ts`). Behavior-preserving (verified
  1:1 branch parity; fresh independent critic verdict SHIP). Local verification:
  569 tests, 0 failures, 1,335 assertions; typecheck, build, guardrails passed.
  CI/deploy run `32579585128` passed full suite (D1 migrations, FTS, Pages
  deploy). Production smoke `/`, `/directory`, `/opportunities`, `/categories/tech`
  all HTTP 200. Two deliberate exceptions documented in
  `docs/gauntlet/evidence/DATA-06-taxonomy-convergence.md`: cheap-8B unclear-sweep
  ladder kept distinct; display-side `getJobCategory` unification escalated as
  new follow-up DATA-06B. No model/prompt/schema/source change; zero D1 writes by
  the change itself.
- Supplemental dependency audit found 2 high, 4 moderate, and 4 low existing
  Astro-toolchain advisories; remediation remains separately scoped debt.
- Next exact action: execute `OPS-05` (alert lifecycle — cleanest single-session
  terminal, lowest blast radius) or begin `SRC-4D` (Jobicy cadence; diagnosis +
  fix now, but KEEP needs 48h live evidence). `DATA-05B` (provenance repair) is
  dependency-ready but its mutation needs a human-approved evidence file.
  `COMP-01B` remains gated on a complete reviewed robots observe window.
  `DATA-06B` (UI category consistency) is a new user-visible product-taxonomy
  decision. Source expansion remains frozen. OPS-04 follow-on (non-Cloudflare
  link-health probe) remains a separate future unit.

Canonical planning artifacts:

- [Master Execution Plan](./MASTER_EXECUTION_PLAN.md)
- [Portable Implementation Units](./gauntlet/IMPLEMENTATION_UNITS.md)
- [Agent-Reach Study](./research/agent-reach-study-2026-08-22.md)

Automated digest commits may advance `main`; executors must fetch/rebase and
record the actual starting SHA without silently changing the accepted behavior
baseline above.

## Historical Savepoints

Everything below is preserved as append-only recovery history. Where a section
calls itself "current," it is superseded by the 2026-08-22 planning savepoint
above unless explicitly cited as the last accepted production behavior.

### Accepted Production Savepoint — 2026-08-21

Branch: `main`
Implementation HEAD: `a44972e`
Repository: `cyalcala/va-freelance-hub`

The 10-minute freshness and responsive Agencies fixes are deployed. Worker run
`32471235256` and CI/Pages runs `32471235312` and `32472691564` succeeded. Final
CI acceptance was 447 tests with 0 failures and 1,169 assertions plus strict
typecheck, production guardrails, Astro build, and Worker deployment dry-run. See
`docs/karpathy-freshness-mobile-gauntlet-2026-08-21.md` for root-cause and risk
evidence. The first post-deploy D1 heartbeat was clean at
`2026-08-21T10:20:39.440Z`; responsive production verification was console-clean.
This supersedes the older paused-branch savepoint below as the current production
recovery point.

### Current Savepoint

Date: 2026-08-10
Branch: codex/production-apex-audit-2026-08-09
Repository: cyalcala/va-freelance-hub
Status: owner-requested stop-point backup. The branch contains unmerged,
undeployed production-hardening work. The primary code checkpoint is 33c1995,
pushed to origin/codex/production-apex-audit-2026-08-09.

GitHub Actions evidence: an immediate branch query returned no workflow run.
The CI guardrail only triggers for main and pull requests; this backup must not
be mistaken for CI or production acceptance.

Read docs/major-production-audit-2026-08-10.md for the five-track ledger and
docs/decisions/ADR-005-cloudflare-pages-compatibility-line.md before changing
the framework, Pages deployment model, D1 schema, or workflows. Migrations
0028 and 0029 are local-verified only and must not be treated as deployed.

### Last Accepted Production Baseline

Date: 2026-08-09
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Latest accepted checkpoint:

- `5bc6d09` - `Merge branch 'codex/major-quality-audit-2026-08-09'`
- Source implementation: `2ea2226` - `fix: harden production quality guardrails`
- Audit: `docs/major-code-audit-2026-08-09.md`
- Decision: `docs/decisions/ADR-004-migrate-before-deploy-and-validate-fts.md`
- Local verification: `bun run verify` passed on the merged tree (190 tests,
  0 failures, 354 assertions; strict TypeScript; Astro production build) and
  changed workflow YAML parsed with PyYAML.
- Production acceptance: GitHub Actions run `31317525008` passed validation,
  D1 migration, remote FTS integrity, and Pages deploy in sequence. Public
  smoke checks returned 200 for `/`, `/opportunities`,
  `/opportunities?q=assistant`, and `/directory`.

Previous savepoint:

Date: 2026-07-04
Branch: `main`
Repository: `cyalcala/va-freelance-hub`

Latest implementation commit (pending push):

- `fix: eliminate silent errors found in 2026-07-04 major audit`
- Audit report: `docs/major-audit-2026-07-04.md`
- Scope: chunked source_fetch_events inserts under the D1 100-parameter limit
  (S-1, broken silently since 2026-06-13); prune rewritten from hard-DELETE to
  company-scoped soft-archive (S-2); triage failures, cadence-guard state, and
  fetch-event outcomes surfaced in scrape responses with Hunter/verifier/prune
  workflow annotations (S-3, S-5/S-6); verifier throughput raised to 120/run
  with `neverVerifiedRemaining` backlog reporting (S-4); new shared batching
  helper `packages/scraper/batch.ts` with regression tests.
- Verification: `bun test` 70/70; `bun run --cwd apps/web build` passed;
  `git diff --check` passed. Production acceptance steps in the audit doc.

Previous implementation commit (pushed as `aa03741`):

- `feat: import gold777.xlsx directory entries and verify ats expansion`
- Handoff doc: `docs/gold777-directory-import-2026-07-04.md`
- Evidence:
  - Cross-referenced `gold777.xlsx` (79 rows) against production `va_directory` (265 rows); imported 32 new companies via `apps/web/gold777_imports.sql`, bringing the total to 297.
  - Confirmed 4 live public ATS endpoints by direct probe (not guessed) and wired `va_directory` rows to match already-uncommitted scraper code: `greenhouse:gitlab`, `greenhouse:ghost`, `greenhouse:remotecom`, `breezy:time-etc`.
  - Left all unconfirmed ATS token guesses (Zapier, Buffer, Doist, Automattic, ClickUp, Wise, Canva, Shopify, Help Scout, Wishup, Atlassian) as directory-only entries.
- Verification:
  - Local D1 dry-run passed (32/32 statements).
  - Production D1 import verified: `SELECT COUNT(*) FROM va_directory` went 265 -> 297.
  - `bun test` passed (61/61 tests).
  - `bun run --cwd apps/web build` passed.
- Credentials: no new credentials introduced; reused existing `gh` CLI GitHub login and existing local Wrangler/Cloudflare OAuth login already configured on this machine.

Previous stop-point handoff:

- `docs/gemini-masterplan-handoff-2026-06-13.md`
- Captures the current Gemini-ready masterplan after Gemini's payload/test work
  and Codex's QA follow-up. It records the `e719a2c` CI-test guardrail
  checkpoint, current source posture, ordered next workstreams, verification
  commands, and stop conditions.
- User asked to document a masterplan so Gemini can implement and Codex can QA
  at the end.

Previous stop-point handoff:

- `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Captures the accepted Remote OK JSON adapter, direct-link compliance posture,
  source-specific quality filter, cleanup migration, workflow evidence, and
  production D1 snapshot.
- User asked to stop feature work and let another AI take over.

Previous source-expansion evidence:

- `docs/source-expansion-2026-06-12.md`
- Captures the accepted bounded RSS source expansion, source fetch caps,
  durable cadence tracking, production D1 source-state snapshot, deployment
  recovery note, Hunter evidence, and next safe source work.
- Real Work From Anywhere and Jobicy Admin Support APAC are now enabled as
  capped, cadence-guarded `allowed` RSS sources. Remote OK remains deferred
  until a JSON adapter exists.

Previous handoff document:

- `docs/goldilocks-source-expansion-handoff-2026-06-12.md`
- Captures the current balanced source-compliance posture, source evidence,
  candidate source plan, ingestion cadence/cap requirements, and indexing
  follow-up plan.
- This plan has now been partially executed: Jobicy and Real Work From Anywhere
  are enabled with caps and cadence; Remote OK still requires a JSON adapter.

Last accepted implementation commit:

- `e2b856e` - `feat: import dayshift directory updates and document ATS expansion opportunities`
- Supporting product/CI commits:
  - `c180925` - `feat: fix silent freshness bug, tune scraper limit/cadence, and import work777.xlsx directory entries`
  - `f9f9a43` - `fix: pre-filter obvious non-English and local European roles during triage`
  - `b360d29` - `docs: finalize README and handoff docs for Masterplan completion`
  - `70ff8cf` - `feat: add Jobicy Customer Support APAC RSS source feed`
  - `0ac3907` - `feat: optimize directory query with company name index, run audit for 2026-06-13`
  - `0f522fe` - `feat: complete data quality snapshot and stale policy pruning for 2026-06-13`
  - `020ba7d` - `docs: add breezy source review findings`
  - `2b91c68` - `feat: add compact source-health history logs, database schema and migration`
  - `e719a2c` - `ci: run unit tests in guardrail`
  - `3036a53` - `docs: update implementation status and system savepoint with F-09 post-handoff details`
  - `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
- Evidence:
  - `e2b856e` imported/updated 8 dayshift companies in D1, mapped Workable/Lever ATS tokens, and documented expansion opportunities.
  - `c180925` resolved the silent freshness bug, increased processing limit to 50, reduced Remote OK min interval to 60 min, and successfully imported 22 new companies to D1 directory.
  - `e719a2c` added `bun test` to `.github/workflows/ci-guardrail.yml`.
  - `8d499df` slimmed homepage and directory DB projections.
  - `8d499df` added 54 Remote OK unit tests.
- Verification:
  - `bun test` passed (54/54 tests).
  - `bun run --cwd apps/web build` passed.
  - `git diff --check` passed.
  - `bunx wrangler d1 migrations apply remoteph-jobs-db --local` & `--remote` executed successfully.
  - Production smoke returned 200 for `/`, `/directory`, `/opportunities`, and
    `/categories/tech`.
  - Read-only D1 snapshot reported 878 active opportunities, 38 active RemoteOK
    rows, 4 inactive RemoteOK cleanup rows, and 0 active RemoteOK
    physical/logistics outliers.

Previous accepted implementation commit:

- `8d499df` - `feat: reduce payload size by slimming DB projections, add Remote OK unit tests`
- Supporting product commit:
  - `4c2374b` - `fix: filter remote ok physical roles`
  - `92ca443` - `feat: add remote ok json source`
- Generated rollup commit:
  - `562355e` - `docs: update daily source health`
- Evidence report: `docs/remote-ok-json-source-handoff-2026-06-13.md`
- Build: `bun run --cwd apps/web build` passed.
- Tests: `bun test packages/scraper/json.test.ts` passed.
- CI guardrail: `27435140046` passed for `92ca443`.
- Production deployment: `b8b04c38-2b56-42e6-89df-2b980c6a6266`.
- D1 migration workflow: `27435636177` passed for
  `0015_remote_ok_quality_filter.sql`.
- Hunter evidence:
  - manual Hunter `27435248150` passed with Remote OK JSON count 33 in the
    first loop, 25 accepted/attempted inserts total, 0 failed sources, 0 failed
    insert batches, and 0 insert errors;
  - source-health rollup `27450540244` passed and refreshed
    `docs/source-health-latest.md`;
  - later scheduled Hunter `27457196402` passed on `562355e`.
- Read-only D1:
  - 878 active opportunities;
  - 38 active RemoteOK rows;
  - 4 inactive RemoteOK cleanup rows;
  - 0 active RemoteOK physical/logistics outliers;
  - `source_fetch_state.remote-ok` has last count 26 and no last error.

Previous accepted implementation commit:

- `b948828` - `fix: preserve paused source skip reasons`
- Supporting product commit:
  - `686e312` - `feat: add cadence guarded rss sources`
- Generated rollup commit:
  - `79e46f8` - `docs: update daily source health`
- Evidence report: `docs/source-expansion-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- D1 migration workflow: `27422527574` passed.
- CI/deploy run: `27422527473` passed.
- Skip-reason CI run: `27422888691` passed.
- Production deploy recovery:
  - manual Cloudflare Pages deployment
    `8863383f-2f01-4c64-8110-51b8e8d5f222` successfully deployed `b948828`
    after Cloudflare marked the async Pages deployment as failed.
- Hunter evidence:
  - run `27422685577` passed with 25 accepted/attempted inserts, 0 failed
    sources, 0 failed insert batches, and 0 insert errors;
  - run `27423455086` passed with cadence skips for Real Work From Anywhere and
    Jobicy plus readable paused-source skip reasons;
  - rollup-writing run `27423574670` passed and refreshed
    `docs/source-health-latest.md`;
  - read-only D1 reports 797 active opportunities and four healthy
    `source_fetch_state` rows.

Previous accepted implementation commit:

- `6304ea4` - `fix: require token review for breezy ats`
- Generated rollup commit:
  - `14db966` - `docs: update daily source health`
- Audit report: `docs/ats-policy-follow-up-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy run: `27372929451` passed.
- Hunter evidence:
  - direct probes for current Breezy JSON endpoints returned 200;
  - Hunter run `27372988265` had one transient `20Four7VA` timeout;
  - retry Hunter run `27373090226` passed with 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - rollup-writing run `27373196600` passed and refreshed
    `docs/source-health-latest.md`;
  - unknown future Breezy tokens now default to `paused`.

Previous accepted implementation commit:

- `aa670ee` - `fix: pause unreviewed ats platforms`
- Generated rollup commit:
  - `f635f3f` - `docs: update daily source health`
- Audit report: `docs/ats-policy-follow-up-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy run: `27372355271` passed.
- Hunter evidence:
  - manual run `27372436554` passed with 0 failed sources, 0 failed insert
    batches, and 0 insert errors;
  - rollup-writing run `27372521005` passed and refreshed
    `docs/source-health-latest.md`;
  - Workable ATS rows now report `complianceStatus: "paused"`;
  - Breezy remains enabled as `needs_review`.

Previous accepted implementation commit:

- `ad03990` - `chore: upgrade wrangler for current cloudflare config`
- Audit report: `docs/wrangler-d1-audit-2026-06-12.md`
- Build: `bun run --cwd apps/web build` passed.
- Install integrity: `bun install --frozen-lockfile` passed.
- CI/deploy run: `27371741236` passed.
- Wrangler: active local CLI reports `4.100.0`.
- D1 local audit:
  - `bunx wrangler d1 info remoteph-jobs-db` passed with no `ratelimits`
    config warning;
  - active opportunities: 748;
  - homepage query plan uses `active_posted_idx`;
  - category query plan uses `category_active_posted_idx`;
  - read-only probes returned `changed_db: false`.
- Production smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/directory`, `/data-policy`, `/privacy`, `/categories/tech`, and
  `/categories/tech?page=2` returned 200.
- Protected scrape route: unauthenticated `POST /api/cron/scrape` returned 401.

Previous accepted implementation commit:

- `ae72998` - `chore: stop tracking local wrangler state (F-03)`
- Supporting commits:
  - `e861071` - `fix: reduce D1 scrape insert batch size (F-01)`
  - `45e2f2d` - `fix: paginate category pages server-side (F-02)`
- Generated rollup commit:
  - `6e76c67` - `docs: update daily source health`
- Audit report: `docs/major-audit-2026-06-11.md`
- Build: `bun run --cwd apps/web build` passed.
- CI/deploy runs: `27353756293`, `27353939869`, and `27354017177` passed.
- Production smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/directory`, `/data-policy`, `/privacy`, `/categories/tech`, and
  `/categories/tech?page=2` returned 200.
- Category payload: `/categories/tech` dropped from about 980 KB to about
  94 KB after server-side pagination.
- Protected scrape route: unauthenticated `POST /api/cron/scrape` returned 401.
- Hunter recovery evidence:
  - manual run `27354089629` passed with 35 accepted/attempted inserts, 0 failed
    insert batches, 0 insert errors, and 0 failed sources;
  - rollup-writing run `27354219672` passed and refreshed
    `docs/source-health-latest.md`.
- Source-health rollup: `docs/source-health-latest.md` reports 0 failed sources
  and 0 insert errors for run `27354219672`.
- Verification limit resolved by the 2026-06-12 follow-up: local direct
  Wrangler D1 reads now work with Wrangler v4.

Previous accepted implementation commit:

- Final acceptance audit and README update
- Build: `npm.cmd run build --workspace apps/web` passed.
- Production smoke: `/`, `/opportunities`, `/directory`, `/data-policy`,
  `/privacy`, and `/categories/tech` returned 200.
- D1 snapshot: 688 active rows, 0 missing `application_url`, 0 unparseable
  freshness dates.
- Source-health rollup: `docs/source-health-latest.md` reports 0 failed
  sources for run `27204417574`.

Previous accepted implementation commit:

- `0ba92d2` - `ci: add source health rollup`
- GitHub Actions run: `27204381138`
- Hunter workflow run: `27204417574`
- Generated rollup commit: `d4b33a7` - `docs: update daily source health`
- Result: success
- Artifact: `hunter-health-27204417574`
- Artifact ID: `7506838648`
- Repo-readable rollup: `docs/source-health-latest.md`

Earlier accepted implementation commit:

- `f8fadfb` - `ci: stop hunter alert commit spam`
- GitHub Actions run: `27204009191`
- Hunter workflow run: `27204051068`
- Result: success
- Artifact: `hunter-health-27204051068`
- Artifact ID: `7506687492`
- Result: Hunter uploaded `harvest.log` and `source-health-summary.md` without
  creating a bot alert commit.

Earlier accepted product commit:

- `2754740` - `fix: derive application urls from source urls`
- GitHub Actions run: `27203416725`
- D1 migration workflow: `27203416643`
- Hunter workflow run: `27203556963`
- Result: success
- Deployment: `https://936f10a7.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `95e6665` - `fix: pause rate limited workable ats sources`
- GitHub Actions run: `27202145473`
- Hunter workflow run: `27202221523`
- Result: success
- Deployment: `https://6b3bc9b2.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `1143798` - `feat: enforce source compliance pauses`
- GitHub Actions run: `27200812470`
- Hunter workflow run: `27200899849`
- Result: success
- Deployment: `https://1a74a454.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `fa2d6eb` - `feat: add source compliance metadata`
- GitHub Actions run: `27199810692`
- Hunter workflow run: `27199890298`
- Result: success
- Deployment: `https://1896b637.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `e0a32fb` - `ci: surface hunter scrape health`
- GitHub Actions run: `27198767290`
- Hunter workflow run: `27198807621`
- Result: success

Earlier accepted product commit:

- `e86b854` - `fix: report actual scrape inserts`
- GitHub Actions run: `27167396371`
- Hunter workflow run: `27198077806`
- Result: success
- Deployment: `https://cde106a3.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `27794d8` - `feat: report source scrape status`
- GitHub Actions run: `27166648567`
- Hunter workflow run: `27166770708`
- Result: success
- Deployment: `https://44501583.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `e32e580` - `feat: normalize app timestamp writes`
- GitHub Actions run: `27165936753`
- Result: success
- Deployment: `https://4bb0cf93.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Earlier accepted product commit:

- `be3d646` - `feat: add query aligned opportunity indexes`
- Migration workflow: `27155847940`
- GitHub Actions run: `27155847992`
- Result: success

Earlier accepted product commit:

- `2475103` - `feat: add paginated opportunities board`
- GitHub Actions run: `27141658140`
- Result: success
- Deployment: `https://68b1259d.remotejobs-ph.pages.dev`
- Public alias: `https://remotejobs-ph.pages.dev`

Last accepted docs commit:

- `431ab60` - `docs: add paused ai recovery handoff`
- GitHub Actions run: `27041163556`
- Result: success

Previous accepted methodology commit:

- `9657c4a` - `docs: adopt recovery-driven execution plan`
- GitHub Actions run: `27040684807`
- Result: success

Previous accepted audit commit:

- `74c0416` - `docs: add major audit and agent instructions`
- GitHub Actions run: `27039365056`
- Result: success

Current accepted work:

- Adopt recovery-driven execution methodology.
- Add master roadmap, implementation status, recovery trail, and ADR.
- Update agent context to the active Cloudflare/Astro/D1 architecture.
- Add `/opportunities` as the canonical paginated board.
- Reduce homepage payload from a 500-row hydrated board to a 60-row preview.
- Deploy and smoke production.
- Add production D1 indexes for active posted order, category active posted
  order, and active verification order.
- Normalize app-owned opportunity and digest timestamp writes to UTC ISO.
- Change stale comparisons to parse historical SQLite timestamps and new ISO
  timestamps through SQLite `unixepoch`.
- Add structured `sourceResults` to the scrape route and make ATS fetch errors
  visible as failed source records.
- Report actual D1 changes as the primary scrape `inserted` count and expose
  insert batch errors in the scrape response.
- Add Hunter workflow warning annotations and summary metrics for source
  failures, zero-count sources, insert counts, and insert errors.
- Add conservative source compliance metadata and update the public data policy
  to avoid treating public visibility as blanket permission.
- Review RSS/HTML source evidence, pause risky or unproductive sources, and
  report paused sources as skipped in live scrape results.
- De-duplicate ATS source fetches and pause Workable-backed ATS sources after
  repeated HTTP 429s.
- Capture a read-only production data-quality snapshot for P5 Slice 1.
- Define a no-mutation stale/source dry-run policy for P5 Slice 2.
- Backfill missing `application_url` values from `source_url` and ensure future
  ingest/scrape writes populate `application_url`.
- Stop Hunter from committing per-run scraper alerts and preserve per-run
  source-health evidence as artifacts instead.
- Add guarded daily/manual source-health rollup in
  `docs/source-health-latest.md`.
- Complete final acceptance audit and align README with current production
  architecture.
- Fix Hunter D1 insert batching after scheduled runs failed with
  `too many SQL variables`.
- Paginate category pages server-side to avoid hydrating large all-category job
  payloads.
- Stop tracking local `.wrangler` D1 runtime state.
- Refresh the source-health latest rollup after Hunter recovery.
- Upgrade active Wrangler tooling to v4 and restore local direct D1 audits.
- Pause unreviewed/noisy ATS platforms by default and refresh
  `docs/source-health-latest.md`.
- Require source-token review before fetching future Breezy ATS tokens.
- Document the Goldilocks source-expansion posture and next safe plan for any
  future AI handoff.
- Add capped/cadence-guarded RSS ingestion for Real Work From Anywhere and
  Jobicy Admin Support APAC, backed by D1 source fetch state and Hunter rollup
  evidence.
- Add Remote OK through the public JSON API, direct-link Remote OK cards, filter
  physical/logistics outliers, and archive the initial bad RemoteOK rows.
- Accepted completion: 100%.

Next pending work:

- Optional future roadmap only. No required recovery-roadmap work remains.
- User requested a Gemini-ready masterplan and handoff. Continue optional
  source policy, data quality, reporting, indexing, and bounded
  source-expansion work from `docs/gemini-masterplan-handoff-2026-06-13.md`.
- First recommended target: add compact longer-retention source-health history
  before expanding sources further.
- Next source-policy target: finish source-specific review for current
  Breezy-backed sources and decide whether they should remain `needs_review`,
  become `allowed`, or be paused.
- Next source-expansion target: add at most one reviewed source per slice after
  current source-health evidence is green.
- For local D1 audits, use Wrangler v4 command shapes recorded in
  `docs/wrangler-d1-audit-2026-06-12.md`.

Current handoff files:

- `docs/DOCS_INDEX.md`
- `docs/HANDOFF.md`
- `docs/gemini-masterplan-handoff-2026-06-13.md`
- `CLAUDE.md`

Pause acceptance:

- Commit: `431ab60`
- GitHub Actions run: `27041163556`
- Result: success

Accepted P1 implementation:

- Commit: `2475103`
- Build: `npm.cmd run build --workspace apps/web` passed.
- Local smoke: `/`, `/opportunities`, `/opportunities?page=2`,
  `/opportunities?category=tech`, and `/directory` returned 200 on local Astro.
- GitHub Actions: `27141658140` passed.
- Cloudflare deploy: `https://68b1259d.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 183 KB.
  - `/opportunities`: 200, about 97 KB.
  - `/directory`: 200.

Accepted P2 index implementation:

- Commit: `be3d646`
- Migration: `packages/db/migrations/0011_query_aligned_indexes.sql`
- Migration workflow: `27155847940`
- CI run: `27155847992`
- Before: three hot query plans used temp B-trees for ordering.
- After:
  - homepage query uses `active_posted_idx`;
  - category query uses `category_active_posted_idx`;
  - verifier query uses `active_last_verified_idx`;
  - no temp B-tree appears in the sampled hot query plans.

Accepted P2 timestamp implementation:

- Commit: `e32e580`
- ADR: `docs/decisions/ADR-002-canonical-utc-iso-timestamps.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27165936753` passed.
- Cloudflare deploy: `https://4bb0cf93.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 181 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/opportunities?page=2`: 200, about 97 KB.
  - `/directory`: 200.
  - protected cron/ingest routes returned 401 without credentials.
- D1 evidence:
  - active opportunity count: 672 at verification time.
  - `unixepoch` parsed active `scraped_at`, `last_seen_in_feed_at`, and
    `last_verified_at` rows with 0 unparseable values.
  - read-only D1 evidence changed 0 rows.

Accepted P3 source-status implementation:

- Commit: `27794d8`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27166648567` passed.
- Cloudflare deploy: `https://44501583.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 181 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27166770708` passed.
  - response returned `sourceResults` and preserved `failedSources`.
  - Remote.co was explicitly `ok: false` with HTTP 520.
  - zero-count sources were distinguishable as `ok: true`.
  - inserted 11 jobs with `actualChanges: 11` and `backlogRemaining: 0`.
  - workflow produced scraper-alert commit `ca1f06d`.
- D1 evidence:
  - active opportunity count after Hunter: 683.
  - read-only D1 count query changed 0 rows.

Accepted P3 insert-accounting implementation:

- Commit: `e86b854`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27167396371` passed.
- Cloudflare deploy: `https://cde106a3.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 186 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27198077806` passed.
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
  - Remote.co remained explicitly visible as a partial source failure.
  - workflow produced scraper-alert commit `bc255c8`.
- D1 evidence:
  - active opportunity count after later scheduled/manual ingestion: 686.
  - read-only D1 count query changed 0 rows.

Accepted P3 workflow annotation implementation:

- Commit: `e0a32fb`
- GitHub Actions: `27198767290` passed.
- Live Hunter workflow:
  - run `27198807621` passed.
  - warning annotation emitted:
    `1 source(s) failed. See sourceResults in harvest.log.`
  - response reported `inserted: 1`, `actualChanges: 1`,
    `acceptedForInsert: 1`, `attemptedInsert: 1`,
    `insertFailedBatches: 0`, and `insertErrors: []`.
  - summary step wrote source failure, zero-count source, and insert accounting
    metrics.
  - workflow produced scraper-alert commit `baf2bd8`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 source metadata implementation:

- Commit: `fa2d6eb`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27199810692` passed.
- Cloudflare deploy: `https://1896b637.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/data-policy`: 200 with June 2026/public-visibility caution text.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27199890298` passed.
  - response included `collectionMethod` and `complianceStatus` for RSS, HTML,
    and ATS source results.
  - configured sources and ATS results are conservatively `needs_review`.
  - workflow produced scraper-alert commit `3174068`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 source pause enforcement:

- Commit: `1143798`
- Source review evidence: `docs/source-review-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27200812470` passed.
- Cloudflare deploy: `https://1a74a454.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200, about 272 KB.
  - `/data-policy`: 200.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27200899849` passed.
  - response reported `failedSources: []`.
  - We Work Remotely fetched as `allowed` with 100 RSS items.
  - Remotive fetched as `allowed` with 29 RSS items.
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso were visible as `skipped: true` with pause reasons.
  - `insertFailedBatches: 0` and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P4 ATS source policy implementation:

- Final commit: `95e6665`
- Supporting commits:
  - `e3714d8` - `fix: dedupe duplicate ats source fetches`
  - `3256127` - `fix: throttle ats source polling`
- ATS source review evidence: `docs/ats-source-review-2026-06-09.md`
- Build: `npm.cmd run build --workspace apps/web` passed.
- GitHub Actions: `27202145473` passed.
- Cloudflare deploy: `https://6b3bc9b2.remotejobs-ph.pages.dev`.
- Production smoke:
  - `/`: 200, about 187 KB.
  - `/opportunities`: 200, about 96 KB.
  - `/directory`: 200, about 272 KB.
  - `/api/cron/scrape` returned 401 without credentials.
- Live Hunter workflow:
  - run `27202221523` passed.
  - response reported `failedSources: []`.
  - Breezy ATS results included `20Four7VA` with 61 items, `Sourcefit` with 67
    items, and `VAA Philippines` with 0 items.
  - 11 Workable-backed directory rows were skipped as `paused` after repeated
    HTTP 429s.
  - `24/7 Virtual Assistant` was skipped because `breezy:20four7va` was already
    fetched for `20Four7VA`.
  - `insertFailedBatches: 0` and `insertErrors: []`.
- D1 evidence:
  - active opportunity count after latest Hunter run: 687.
  - read-only D1 count query changed 0 rows.

Accepted P5 data-quality snapshot:

- Snapshot: `docs/data-quality-snapshot-2026-06-09.md`
- Verification:
  - D1 queries were read-only and returned `changed_db: false`.
  - `git diff --check` passed with only normal CRLF warnings.
- Key production metrics:
  - active opportunities: 687.
  - duplicate `source_url`, `content_hash`, and non-empty `description_hash`
    groups: 0 each.
  - missing `company`: 95.
  - missing `pay_range`: 524.
  - missing `client_timezone`: 687.
  - missing `application_url`: 687.
  - missing `experience_level`: 522.
  - missing `posted_at`: 62.
  - missing `description_hash`: 507.
  - category `other`: 531.
  - posted older than 30 days: 247.
  - currently enabled source rows: 497.
  - now-paused source rows: 185.
  - unclassified source rows: 5 (`RemoteOK`).

Accepted P5 stale policy dry run:

- Dry-run report: `docs/stale-policy-dry-run-2026-06-09.md`
- Verification:
  - D1 queries were read-only and returned `changed_db: false`.
  - `git diff --check` passed with only normal CRLF warnings.
- Dry-run action counts:
  - `keep_enabled_source`: 497 rows.
  - `hold_paused_recently_seen`: 175 rows.
  - `review_paused_missing_last_seen`: 10 rows.
  - `classify_source_before_action`: 5 rows.
- Decision:
  - no rows should be archived immediately;
  - now-paused sources get a grace window;
  - `RemoteOK` must be classified before action.

Accepted Lens 2 implementation:

- Final commit: `f5b9827`
- Build: `bun run build` passed.
- GitHub Actions: run `27207069121` passed, deploying to Cloudflare Pages automatically.
- Production smoke:
  - `/` returned 200, renders the new `FINANCE & ACCOUNTING` card.
  - `/opportunities` and `/directory` returned 200.
- D1 evidence:
  - Backfilled D1 categories, reducing `other` jobs count from 532 to 47.
  - Staggered Workable rotation polling correctly saves `verifiedAt` timestamps in D1.

## Production Baseline From Audit

- Public site: `https://remotejobs-ph.pages.dev`
- `/`: 200, roughly 187 KB HTML after final P4 source policy deploy
- `/directory`: 200
- `/categories/tech`: 200
- `/opportunities`: 200
- Authenticated cron/API routes reject unauthenticated calls with 401

## Data Baseline From Audit

- Opportunities: 635 total, 635 active
- Directory companies: 238 total
- ATS-enabled companies: 15
- Content digests: 0
- Active jobs never link-verified: 184
- Active jobs older than 30 days by `posted_at`: 209
- Active jobs missing application URL: 635
- Active jobs missing client timezone: 635
- Active jobs in `other`: 523

## Known Healthy Controls

- GitHub repository is public and active.
- CI guardrail is green at the latest accepted checkpoint.
- Build passed locally during the major audit.
- Cron/API routes require authentication.
- Duplicate `source_url`, `content_hash`, and non-null `description_hash` counts
  were zero in the audit snapshot.

## Known Weak Controls

- Local direct D1 audit commands now work with Wrangler v4; keep using the
  command shapes documented in `docs/wrangler-d1-audit-2026-06-12.md`.
- Source health is visible in scrape responses, workflow artifacts, and the
  latest rollup, but not yet persisted as long-term D1 history.
- Several ATS sources remain `needs_review` and need source-specific policy
  review before being treated as fully approved.

## Recovery Command Hints

Common local checks:

```bash
git status --short --branch
bun run build
git diff --check
```

Common GitHub checks:

```bash
gh run list --repo cyalcala/va-freelance-hub --limit 10
gh run view <run-id> --repo cyalcala/va-freelance-hub --log-failed
```

Common production smoke checks:

```bash
curl -I https://remotejobs-ph.pages.dev/
curl -I https://remotejobs-ph.pages.dev/directory
curl -I https://remotejobs-ph.pages.dev/opportunities
```

Use read-only D1 queries for data checks. Never mutate production data during an
audit unless the task explicitly calls for a migration or repair and the change
has been backed up in Git.
