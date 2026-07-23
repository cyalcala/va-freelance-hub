# Labor Engine Masterplan — 2026-07

**Status:** DIRECTIVE (planning complete, execution not started)
**Revised:** 2026-07-21 — Phase 4 replaced: semantic search → **Sovereign Crawler** (user direction), grounded by live probes of our own sources; Phase 5 slimmed accordingly; semantic search preserved in §9 Backlog
**Authored:** 2026-07-21 by Fable 5 (planning model), grounded by a 4-agent verification workflow (repo inventory + free-tier research, sources cited inline)
**Executor:** Opus 4.8 works phase by phase; this document is the standing instruction set
**Relationship to other docs:** extends `MASTER_EXECUTION_PLAN.md`; supersedes nothing; the geo system it builds on is recorded in `geo-eligibility-masterplan-2026-07.md`; indexed in `DOCS_INDEX.md`

---

## §0 How to use this document (executor protocol)

1. Work **one phase at a time, in order**, unless the user redirects. Do not start a phase marked **DECISION GATE** without an explicit user go-ahead *in chat* for that specific gate.
2. Every phase ships the full bundle before moving on: code + tests (`bun test packages/scraper` and any new suites green) + idempotent migration if schema changes (applied to prod D1 **before** the code deploy, then verified) + docs update + commit + push + **live verification** with proof (curl/D1 query/GHA run), reported honestly.
3. Push cadence: commit per meaningful milestone, not one monolith. Bot digest commits land on `main` continuously — always `git fetch && git rebase origin/main` before pushing; retry up to 5 times (see the prospector pulse workflow for the pattern).
4. Update the **§7 status table** in this file as phases start/complete, and add a dated line to `IMPLEMENTATION_STATUS.md`.
5. When a free-tier limit cited here matters to your implementation, **re-verify it against Cloudflare docs first** — these numbers were checked 2026-07-21 and Cloudflare adjusts them (precedents: MailChannels 2024 termination, SES 2023 free-tier rework, DO SQLite billing Jan 2026).

---

## §1 Ground truth (verified inventory, 2026-07-21)

The DeepSeek conversation that seeded this plan invented file paths (`packages/scraper/src/hunter/`, a "Digester" module). The **real** map, verified by direct read:

| Conceptual role | Actual implementation |
| --- | --- |
| Hunter (ingest) | `apps/web/src/pages/api/cron/scrape.ts` orchestrating `packages/scraper/{rss,json,html,ats}.ts`, conditional fetching in `conditional.ts`, sources in `sources.ts` |
| Normalization ("Digester") | inline in the fetchers + `text.ts` (entities, mojibake), `urls.ts`, `contentHash.ts`, `batch.ts` |
| Geo gate (deterministic) | `packages/scraper/geoGate.ts` (+ 28-fixture golden test set) |
| AI triage + skeptic consensus | `packages/scraper/triage.ts` (model ladder: llama-3.3-70b → 3.1-8b → 3-8b → mistral-7b, fail-closed) |
| Verifier | `apps/web/src/pages/api/cron/verify-links.ts` (3-strike links, 15-page/run geo page-scan via `geoGate.scanLandingPageForGeoLock`) |
| Directory link health | `apps/web/src/pages/api/cron/directory-audit.ts` + `packages/scraper/linkHealth.ts` (bot-wall-aware classifier, 3-strike, never deletes) |
| Prospector | `apps/web/src/pages/api/cron/prospect.ts` + `packages/scraper/prospector.ts` (quality gates, fail-closed ATS, mass-add guard) |
| Prune/dedup | `apps/web/src/pages/api/cron/prune.ts` |
| Scheduling | Cloudflare cron Worker (`workers/freshness-cron`, ~15-min cadence) + 11 GHA workflows (hunter, verifier, prospector, sentinel, medic, chef, prune, directory, ci-guardrail, deploy-migrations, deploy-cron-worker) |
| Frontend | Astro on Cloudflare Pages: `index.astro`, `opportunities.astro`, `directory.astro`, geo badges in `opportunity-card.tsx` |
| Database | D1 `remoteph-jobs-db`, Drizzle schema `packages/db/schema.ts`, migrations 0000–0024 (0004 intentionally absent from the sequence — harmless, do not "fix") |

**Current state highlights (as of 2026-07-20):** 5-layer geo-eligibility defense live (L0 capture → L1 deterministic gate → L2 AI consensus → L4 landing-page scan → L5 badges); unclear-backlog convergence running at 12 rows/run; directory audited (391 assessed, 12 URLs repaired, 40 marketplaces flagged, 25 soft-hidden — all reversible), daily Directory Pulse live; 164 scraper tests green.

**Existing documentation ecosystem** (real, keep updated): `MASTER_EXECUTION_PLAN.md`, `IMPLEMENTATION_STATUS.md`, `DOCS_INDEX.md`, `error-catalog.md`, `AI_RECOVERY_TRAIL.md`, `SYSTEM_SAVEPOINT.md`, `HANDOFF.md`, per-initiative masterplans, auto-committed digests (`health-digest-latest.md`, `source-health-latest.md`, `prospector-latest.md`, `directory-health-latest.md`).

---

## §2 Non-negotiable invariants (the constitution)

These override any upgrade idea, including ideas in this document.

1. **$0 infrastructure.** Free tiers only. The $5/mo Workers Paid upgrade is a *user decision*, never an implementation assumption. Every phase carries a quota budget (§3).
2. **Compliance posture.** robots.txt respected; conditional fetching (ETag/Last-Modified + body-hash) everywhere; public-source policy with opt-out honored. **Explicitly forbidden:** IP/proxy rotation, CAPTCHA bypass, fingerprint evasion, scraping sources that have blocked us, and any "anti-detection" work. A normal browser UA string on plain GETs is the ceiling.
3. **Human gates.** Enabling a new scrape source or ATS token, sending email to end users, publishing outward-facing announcements, and anything spending money are user-approved actions. Automation may *propose* (issues, digests, paused rows) but never *enable*.
4. **Secrets protocol.** Never read, print, or type actual secret values through tool calls. When a secret must be set (VAPID keys, email API keys), generate a **script the user runs themselves** (PowerShell, per user preference). `.env*` stays gitignored. Never search other applications' folders for credentials; use only the user's authorized `gh` CLI and Wrangler OAuth sessions.
5. **Reversibility over deletion.** Soft-hide flags, 3-strike thresholds, idempotent migrations, evidence trails in `notes`/`geo_evidence`. AI verdicts fail closed; malformed model output never publishes a job.
6. **Data honesty.** Every job links to its source; no fabricated listings, salaries, or company facts; verdicts carry evidence strings a human can audit.
7. **Definition of done** = code + tests + migration verified in prod + docs + push + live proof (§0.2).

---

## §3 The verified $0 capacity ledger (2026-07-21)

Sources: developers.cloudflare.com platform/pricing + limits pages; github.blog pricing changelog. Re-verify before load-bearing use (§0.5).

| Resource | Free limit | Design consequence |
| --- | --- | --- |
| Workers requests | 100k/day (shared with Pages **Functions**; static assets unmetered) | Keep pages static-first; dynamic API calls budgeted. Spikes → Error 1027 until 00:00 UTC |
| Workers CPU | **10 ms/invocation** (fetch wall-clock excluded) | I/O-heavy is fine; CPU-heavy parsing must stay light or move to GHA |
| Cron triggers | 5/account (we use 1) | Room for 4 more Workers crons if ever needed |
| D1 | 5 GB; 5M rows read/day; **100k rows written/day** | Generous for reads; batch writes, dedupe before writing |
| Workers KV | 100k reads/day; **1k writes/day** | Too write-tight for caching — prefer D1 tables for caches |
| Workers AI | **10k neurons/day**, account-level, no overage | 70B triage calls burn fast; ladder degrades to 8B; keep unclear-retriage budget ≤12/run; embeddings are near-free (bge-small ≈ negligible) |
| Vectorize | **Free plan: yes.** 5M stored dims; 30M queried dims/mo; queried = (queries + stored vectors) × dims | 768-dim is too expensive. **384-dim (bge-small-en-v1.5) + prune vectors of deactivated jobs** → ~3k stored vectors ≈ 1.2M dims stored, ~2,500 searches/day inside free |
| Durable Objects | Free tier exists (SQLite-backed, 100k req/day) | Available if ever needed; not currently used |
| Queues | 10k ops/day ≈ 3.3k msgs/day | Marginal; avoid building on it |
| R2 | 10 GB, 1M/10M ops | Available for artifacts if needed |
| Rate Limiting binding | Free (per-colo, approximate) | Already in use; fine as a loose gate |
| Pages builds | 500/mo | Current push cadence is safe; avoid pathological auto-commit loops |
| GitHub Actions | **Unlimited minutes for public repos** (confirmed post-2026 pricing change) | The compute escape valve: heavy/long work belongs in GHA pulses, not Workers |
| Email — MailChannels Workers hack | **DEAD** (terminated Aug 2024) | Never reference it again |
| Email — Cloudflare Email Service | Free plan sends **only to your own verified addresses**; arbitrary recipients require Workers Paid | Perfect for admin alerts to the user; not for end-user email |
| Email — Resend / Brevo | 3k/mo (100/day cap) / 300/day (branded footer) | End-user email is possible but gated: needs user-created API key (§2.4) |
| Web Push (VAPID) | **$0 forever** — browser push services charge nothing | The primary end-user notification channel. Node `web-push` lib does NOT run on Workers; use WebCrypto-native `pushforge` or `@block65/webcrypto-web-push` |

**Architecture doctrine that falls out of this ledger:** static assets serve the traffic; Workers serve budgeted dynamic APIs; D1 holds state; GHA (public repo, unlimited minutes) does the heavy lifting; Workers AI is a rationed 10k-neuron daily budget shared across triage, retriage, and future embeddings.

---

## §4 Triage of the DeepSeek proposal

The DeepSeek conversation produced ~30 upgrade ideas. Verdict on each family:

**ADOPT (high value, $0-fits):** trust/transparency surface; source & company trust badges; PWA; saved jobs; Web Push alerts; JSON-LD structured extraction; adaptive per-source cadence; fuzzy dedup; scam gate; salary extraction; prospector auto-validation scoring; predictive source-health trends; RSS/JSON output feeds.

**DEFERRED to §9 Backlog (2026-07-21 revision):** semantic search — sound and
$0-feasible at 384-dim, but displaced by the Sovereign Crawler work, which is
higher-leverage for this project's identity and *improves data correctness at the
source* rather than improving retrieval over data of uncertain quality.

**ADAPT (right idea, wrong mechanism):**
- "User accounts first" → **inverted**: privacy-first retention (localStorage + PWA + push) delivers most of the retention value with zero PII liability; server-side accounts become a later decision gate.
- "Email alerts" → Web Push primary; email only behind a decision gate with user-held keys.
- "AI scam classifier" → deterministic red-flag gate first (free, testable, explainable), AI clause second.
- "Self-healing ML parsers" → JSON-LD/structured-data fallback + auto-pause tightening. A full ML parser-inference loop is over-engineering at this scale.

**REJECT (violates invariants or bad ROI):**
- **Proxy rotation / anti-detection / fingerprint avoidance** — violates §2.2 outright. The project's differentiation *is* its ethics; this would poison it.
- **Blockchain credentials** — no user value at this stage; pure complexity.
- **Community forum / user reviews** — unbounded moderation liability for a solo maintainer; revisit only with real demand.
- **Native mobile app** — PWA covers it at $0.
- **Amazon SES** — free tier is 12-months-only now; it's a cheap-scale exit ramp, not a $0 plan.
- **Full ATS pipeline-management UI** — premature; digests + issues already provide oversight.

---

## §5 The phased roadmap

Effort scale: S (≤1 session), M (1–2 sessions), L (several sessions).

### Phase 1 — Trust Surface *(S–M, zero new quota)*
The differentiating data **already exists in D1** — this phase only exposes it.
1. **`/transparency` page** (`apps/web/src/pages/transparency.astro`): crawler policy (conditional fetching, robots.txt, UA, contact), opt-out instructions, per-source compliance status from `sources.ts` metadata, geo-gate + triage aggregate stats (counts by `ph_eligibility`, jobs rejected by gate — live D1 queries), link to this masterplan and the audit trail.
2. **Directory trust badges**: surface `link_status`/`link_checked_at` (verified-alive ✓) and `is_marketplace` (already flagged for 40 rows) as badges in `DirectorySearch`/directory cards, with evidence tooltips mirroring the geo-badge pattern in `opportunity-card.tsx`.
3. **Board trust module**: small "how this board is vetted" explainer linking `/transparency` from `opportunities.astro`/`index.astro`.
- **Acceptance:** page live, stats render from D1 (not hardcoded), badges visible, build + tests green.
- **Verify:** curl the live page; screenshot badges.

### Phase 2 — Retention without accounts *(M, zero new quota, no PII)*
1. **Saved jobs + seen-state** in `localStorage`: save/unsave on cards, a `/saved` view, "new since last visit" highlight. No backend.
2. **PWA**: manifest + icons + service worker (offline shell + cache-first static assets), installability on Android/iOS (iOS 16.4+ note in UI).
3. **Per-category RSS/JSON feeds** (`/feeds/[category].xml`): users subscribe in their own readers — alerts with zero infrastructure. Cache-headers generous; static-ish output keeps Workers budget safe.
- **Acceptance:** save/restore works across reloads; Lighthouse PWA installable; feeds validate.
- **Verify:** browser-pane walkthrough + feed validator.

### Phase 3 — Web Push alerts *(M, ~zero quota)*
1. VAPID keypair: **script for the user to run** (generates keys, sets Worker secrets via `wrangler secret put` themselves — §2.4).
2. Worker push endpoint using `pushforge` (WebCrypto-native; Node `web-push` will not run on Workers). Subscriptions stored in D1 (new table, migration 0025), with category/keyword preference columns.
3. Push send piggybacked on existing pulses (e.g., after scrape inserts, budgeted batch; and/or a daily digest push). Payloads ≤4KB — link to the site, don't embed content.
4. UI: opt-in prompt on `/saved` (contextual, not nagging), unsubscribe honored server-side.
- **Acceptance:** end-to-end push received on Android + desktop; unsubscribe works; D1 table migration verified.
- **DECISION GATE inside phase:** none for push itself ($0, no third party). **Email fallback (Resend/Brevo) is a separate gate** — propose, wait for user, user creates the key.

### Phase 4 — Sovereign Crawler: world-class *because* compliant *(L)*

> **Replaces the former "Semantic search" phase** (revised 2026-07-21 at user
> direction). Semantic search moves to §9 Backlog — still a good idea, not ahead
> of this. Absorbs the JSON-LD and adaptive-cadence items formerly in Phase 5.

**Thesis.** Aggressive crawling (proxy rotation, fingerprint spoofing, CAPTCHA
solving) is not elite — it is what crawlers do when they *lack* legitimate
access, and it is permanently adversarial to the sources you depend on. Elite
crawlers win on protocol mastery, channel quality, and freshness modeling.
Googlebot is the most capable crawler alive and also the most polite; that is
causation, not coincidence. **Target state: the crawler sources would whitelist.**

#### Verified findings that motivate this phase (probed live 2026-07-21)

| Finding | Evidence |
| --- | --- |
| **Compliance is documented, not enforced.** Every `robots` reference in the codebase is a human-written `complianceNotes` string in `sources.ts` (e.g. *"Current review 2026-06-09: robots allows the feed path"*). There is **zero runtime robots.txt fetching or parsing.** Compliance is a snapshot taken at source-add time, not a live contract. | `grep -rn "robots" packages/scraper apps/web/src/pages/api/cron` → only prose in `sources.ts`/`scrape.ts` |
| **User-Agent is inconsistent — the honest pattern already exists.** `json.ts` sends `va-freelance-hub/1.0 (+github.com/cyalcala/…)` and `rss.ts` sends `va-freelance-hub/1.0 (RSS aggregator)`, but `ats.ts`, `html.ts`, `linkHealth.ts` and `verify-links.ts` send a spoofed `Mozilla/5.0 … Chrome/120`. This is drift, not philosophy. | `grep -rn "User-Agent"` |
| **A source we scrape today already publishes machine-readable terms that permit us.** RemoteOK: `Content-Signal: search=yes,ai-train=no,use=reference` + `Allow: /`. Our use (index, short excerpt, link back) is the `search` lane — explicitly sanctioned. It also names-and-blocks AI crawlers (`GPTBot`, `CCBot`, `ClaudeBot`, `Google-Extended`, `Bytespider`, …). | `curl https://remoteok.com/robots.txt` |
| **We are ignoring declared `Crawl-delay` directives.** RemoteOK declares `Crawl-delay: 1`; Jobspresso declares `Crawl-delay: 3`. Neither is parsed today. | same |
| **The original geo escape was preventable from structured data the source already publishes.** RemoteOK job pages carry JSON-LD `JobPosting` with `"applicantLocationRequirements":[{"@type":"Country","name":"United States"}]`, `"jobLocationType":"TELECOMMUTE"`, and structured `baseSalary`. A *"remote"* job that is in fact US-only — the exact Casino Lugano failure class — declares its restriction in a field we never read. WeWorkRemotely publishes the same fields. Jobicy and Remotive do not. | parsed live from a real RemoteOK job page |
| **Sitemaps available** on WeWorkRemotely and RemoteOK (`Sitemap:` in robots.txt); absent on Jobicy/Remotive. | same |

**Consequence for sequencing:** Phase 1 publishes a `/transparency` page asserting
ethical crawling. Shipping that page while the code spoofs Chrome and never reads
robots.txt would convert a to-do into a false public claim. **Phase 4A+4B must land
with or before Phase 1's transparency page.**

#### 4A — `packages/scraper/robots.ts` *(~200 lines + golden tests)*
Runtime robots engine, in-house (see build-vs-depend note below):
- RFC 9309 semantics **limited to the subset we need**: user-agent group selection by
  specificity, **longest-match Allow/Disallow precedence**, `*` and `$` wildcards,
  `Crawl-delay`, `Sitemap:` collection.
- **Content Signals** parsing (`search` / `ai-input` / `ai-train` / `use`).
- Cached in D1 (new table, TTL ~24h) so one robots fetch serves many source checks.
- **Hard gate: no source fetch may occur without a robots decision on record.** Deny →
  skip + log evidence. Also honor `X-Robots-Tag` response headers.
- Golden test set built from RFC 9309's worked examples plus the real robots.txt of
  our live sources (RemoteOK's content-signal line is fixture #1).

**Build vs. depend (decided):** [`samclarke/robots-parser`](https://github.com/samclarke/robots-parser)
is MIT, mature and widely deployed, but its Workers compatibility is unverified;
[`robotstxt-ts-port`](https://github.com/trybyte-app/robotstxt-ts-port) is a faithful
zero-dep port of Google's C++ parser but has **8 commits / 2 stars / 0 releases** —
unacceptable for a compliance-critical path. We need a small subset (not Google's
16,664-byte truncation or "disalow" typo tolerance), RFC 9309 ships worked examples
that become fixtures directly, and in-house tightly-scoped tested modules are the
pattern that already worked twice (`geoGate.ts`, `linkHealth.ts`). **Write it.**
*Optional 5-minute smoke test first: if `robots-parser` imports cleanly in Workers,
reconsider — a battle-tested dep would be preferable.*

#### 4B — Honest identity *(~30 lines)*
- One exported constant used by **every** fetcher:
  `RemotePHJobsBot/1.0 (+https://remotejobs-ph.pages.dev/transparency)` — resolving to
  a page stating who we are, what we take, and how to opt out. Generalizes the pattern
  `json.ts` already uses.
- **DECISION GATE (user's call).** Dropping the Chrome spoof may cause some sources to
  403. Risk assessment: our RSS/JSON sources already receive honest UAs and work fine,
  and the ATS endpoints are *public distribution APIs* that do not need spoofing —
  so exposure is likely limited to `html.ts` sources and possibly Breezy. Recommended
  policy: **declare always, measure per source, and treat a block as information** — a
  source refusing a declared bot has told us something, and the compliant response is
  to pause and seek permission, not to disguise. Losing two sources beats publishing a
  transparency page that isn't true. *Note: `linkHealth`/`verify-links` are a separable
  case — there, a browser UA arguably simulates the real user click; decide explicitly
  rather than by drift.*
- Record per-source declared-UA acceptance in `source_fetch_state`.

#### 4C — Acquisition ladder *(~140 lines)* — **highest quality payoff**
Prefer the highest-fidelity legitimate channel, negotiating down only as needed:
> official API → RSS/Atom → sitemap.xml + `lastmod` → JSON-LD `JobPosting` → HTML scraping
- `packages/scraper/sitemap.ts`: `<sitemapindex>` recursion (one level) + `<lastmod>`
  filtering for incremental fetch. Reuse the existing `xmlNodeText`/`xmlTextList`
  helpers in `text.ts` — no new dependency.
- `packages/scraper/jsonld.ts`: extract `<script type="application/ld+json">`, walk
  arrays and `@graph`, select `@type: JobPosting`. **Note the value shapes:**
  `applicantLocationRequirements` is an *array of `{"@type":"Country","name":…}` objects*
  (a naive string regex misses it — this cost us a false negative during research).
- **Feed `applicantLocationRequirements` and `jobLocationType` directly into `geoGate`
  as a new highest-priority deterministic signal** (`eligible_verified` /
  `country_locked` from the employer's own declaration, above all inference). Add
  golden fixtures, including the US-only-remote case.
- Structured `baseSalary` from JSON-LD **satisfies Phase 5's salary extraction for
  these sources for free.**
- Record the channel rung used per source (provenance, 4E).

#### 4D — Adaptive cadence *(~40 lines, in `source_fetch_state`)*
Steal the **math** from [Scrapy's AutoThrottle](https://docs.scrapy.org/en/latest/topics/autothrottle.html), not the mechanism — Scrapy throttles between requests inside a long-running process; we are a stateless 15-minute cron, so the same formula applies to a **per-source `next_fetch_at`** instead:
```
target_interval = f(latency, change_rate)
new_interval    = (previous_interval + target_interval) / 2      # EWMA smoothing
clamp(new_interval, floor = max(source Crawl-delay, min cadence), ceiling = max staleness)
```
- **Adopt AutoThrottle's key asymmetry: non-200 responses may only *lengthen* the
  interval, never shorten it.** Error responses return faster than real ones, so naive
  latency logic accelerates exactly when a server is struggling.
- **Go beyond it by folding in change-rate**, which we already collect: a `304 Not
  Modified` or unchanged `last_body_hash` lengthens the interval; new jobs shorten it.
  Scrapy optimizes throughput politeness; we optimize freshness *and* politeness in one
  formula, using data already in `source_fetch_events`.
- Honor `Retry-After` on 429/503 as a hard floor. Per-host circuit breaker.
- **This reduces total fetches** — compliance and free-tier headroom are the same axis.

#### 4E — Provenance + live compliance ledger
- Columns on ingested rows / source state: channel rung used, robots decision + when,
  HTTP status, ETag, fetch time. This is what makes the crawler *defensible* rather
  than merely well-intentioned.
- **Publish it**: a per-source table on `/transparency` showing robots decision,
  crawl-delay honored, conditional-request hit rate, last fetch, channel. Essentially
  no aggregator does this. It converts "we are ethical" from a claim we *make* into a
  claim we can *prove*.

#### 4F — Prospector compliance-by-construction + real opt-out *(~80 lines)*
- Robots precheck **before a source is ever proposed**; a disallowed source never
  enters the candidate list.
- Prefer documented public ATS APIs (Greenhouse/Lever/Ashby publish these *for* job
  distribution — intended use, no spoofing required).
- **Enforced opt-out**: a blocklist table consulted pre-fetch, honored instantly, with
  an audit trail — not a promise in a policy document.
- **Content-signal-aware AI use:** if a source sets `ai-input=no`, skip AI triage for
  that source and fall back to deterministic `geoGate` only. Near-zero cost; a
  genuinely leading posture. (RemoteOK currently sets `use=reference`, which permits
  our classification use; we do not train on content.)

**Sequencing:** 4A → 4C → 4D → (4B + 4E together, since the UA switch and the public
ledger are the same credibility story) → 4F.

**Acceptance (per sub-phase):** golden tests green; no source fetched without a robots
decision; declared UA acceptance measured per source; `applicantLocationRequirements`
demonstrably rejecting a US-only "remote" job in a geoGate fixture; fetch-count
before/after showing the cadence change reduced requests; compliance ledger live.

**Explicitly out of scope (anti-overengineering, deliberate):** distributed crawl
frontier or URL queue (≈30 sources, not 30M URLs — a D1 table with `next_fetch_at`
*is* the frontier); in-process politeness connection pools (Workers is stateless with
10 ms CPU); plugin architecture for parsers (5 fetcher types — a switch is correct);
Google's typo tolerance and byte truncation; reverse-DNS verifiable identity (requires
infra we do not control); headless-browser rendering; any evasion tooling (§2.2).
**Total realistic build ≈ 600 lines of tested code across 4 small modules** — the same
order as the geo gate.

### Phase 5 — Data-quality hardening *(M–L)*
> Slimmed 2026-07-21: JSON-LD extraction and adaptive cadence moved into Phase 4,
> where they belong. Structured `baseSalary` from 4C also covers item 3 below for
> JSON-LD-publishing sources.
1. **Deterministic scam gate** — *highest mission value on the board.* Red-flag patterns
   (pay-to-apply, upfront fees, crypto-salary-only, messaging-app-only contact,
   implausible salary) as a `geoGate`-style tested module; flagged jobs quarantined
   `unclear` with evidence; triage prompt gains a scam clause. Golden tests required —
   **both** scam fixtures and legit-job non-triggers (fixtures should be written
   adversarially, not by the same pass that wrote the patterns).
2. **Fuzzy dedup**: normalization pass (title/company canonicalization — case, punctuation, "LLC/Inc", known aliases) feeding `contentHash`, plus a near-dup sweep in the prune pulse (token-set similarity on title+company within a source-day window). Log, don't silently merge, for the first cycle.
3. **Salary extraction v2**: for sources without JSON-LD (Jobicy, Remotive, HTML sources), extend the existing `payRange` triage field with deterministic currency/range regexes (₱/$/€, "per hour/month"); display on cards when present.
4. **Predictive source health**: sentinel digest gains trend deltas (error-rate/latency/yield slope over 7 days) from `source_fetch_events`, flagging "declining" sources before they die.
- **Acceptance per item:** tests green including new golden sets; before/after metrics in the relevant digest; no compliance regression.

### Phase 6 — Prospector autonomy (bounded) *(M)*
1. **Auto-validation scoring** on discovery: run `checkDirectoryLink` + `geoGate` on the company's site/job snippets; score from link-health, PH-signal, source trust. High score → auto-add to `va_directory` (already-safe additive path); low → drop; middle → review queue in digest.
2. **Source-quality scoring**: track per-origin discovery→accepted yield in a D1 table; prioritize productive origins.
3. **Invariant preserved:** ATS tokens and scrape sources stay **paused until the user promotes them** (§2.3) — autonomy applies to the directory list, never to scraping enablement.
- **Acceptance:** a full pulse cycle with zero bad auto-adds (spot-check 20); review queue renders in `prospector-latest.md`.

### Phase 7 — Directory verification recurrence *(S–M)*
1. **Quarterly PH-hiring re-verification** GHA workflow (medic-style): files an issue with the stale-cohort list (oldest `geo_checked_at`/audit dates, the ~10 medium-confidence non-PH holdovers from `audits/directory-2026-07/FINDINGS.md`) for a human-triggered deep audit.
2. **PH-exclusive stream** — **DECISION GATE**: wiring verified PH BPO ATS boards as scrape sources requires user approval per source (§2.3). Prepare the vetted candidate list from the audit; wait.

### Phase 8 — Server-side accounts & user email — **DECISION GATE, deferred by default**
Only if the user asks for cross-device sync or email digests: OAuth (Google/GitHub) on Workers, sessions + prefs in D1, minimal PII, deletion self-service; email via Resend/Brevo with user-created keys. Until then, Phases 2–3 cover retention at zero liability.

---

## §6 Explicitly rejected (do not build, do not re-propose)

| Idea | Reason |
| --- | --- |
| Proxy/IP rotation, anti-detection, CAPTCHA bypass | Violates §2.2; destroys the project's ethical differentiation |
| Blockchain credentials | No current user value; heavy complexity |
| Community forum / user reviews | Moderation liability unbounded for solo maintainer |
| Native iOS/Android apps | PWA (Phase 2) covers it at $0 |
| Amazon SES as the email plan | Free tier now 12-months-only |
| MailChannels Workers integration | Terminated Aug 2024 |
| ML-inferred self-rewriting parsers | Over-engineered; JSON-LD fallback + auto-pause captures the value |

---

## §7 Status tracker (executor updates this)

| Phase | Name | Status | Completed | Proof |
| --- | --- | --- | --- | --- |
| 1 | Trust Surface | pending | — | — |
| 2 | Retention without accounts | pending | — | — |
| 3 | Web Push alerts | pending | — | — |
| 4 | **Sovereign Crawler** (4A robots → 4C ladder → 4D cadence → 4B+4E identity/ledger → 4F prospector) | pending | — | — |
| 5 | Data-quality hardening (scam gate, dedup, salary, health trends) | pending | — | — |
| 6 | Prospector autonomy (bounded) | pending | — | — |
| 7 | Directory recurrence + PH stream gate | pending | — | — |
| 8 | Accounts/email (gated) | deferred | — | — |

---

## §9 Backlog (good ideas, not scheduled)

- **Semantic search at $0** (deferred 2026-07-21). Design remains valid: embeddings via
  `@cf/baai/bge-small-en-v1.5` at **384-dim** (768-dim blows the free Vectorize cap —
  see §3), Vectorize index with **vectors deleted when jobs deactivate** so stored count
  tracks active jobs (~2–3k ⇒ ~1M of 5M stored-dim cap), `/api/search` budgeted to
  ~2,500 queries/day with client debounce, a D1 query cache (KV's 1k writes/day is too
  tight), and graceful degradation to LIKE search as the monthly budget nears exhaustion.
  Fallback if Vectorize disappoints: brute-force cosine over ≤3k×384 floats (~4.6 MB)
  in-Worker. **Revisit after Phase 4** — better retrieval over better-verified data is
  worth more than better retrieval alone.
- Server-side accounts / cross-device sync (see Phase 8 gate).
- End-user email digests (gate; user-held API keys).
- Community features, native apps, blockchain credentials — see §6, rejected.

## §8 Standing constraints for the executor (verbatim, carry across sessions)

- Never search other applications' folders (e.g. "antigravity", "codex") for credentials to reuse for GitHub/Cloudflare — use only the user's own already-authorized `gh` CLI and Wrangler OAuth sessions.
- Never read/print/type the user's actual secret values through tool calls into any deployment — only ever provide scripts for the user to run themselves (PowerShell format preferred).
- `.env` files are gitignored and never committed.
- New scrape sources/ATS tokens: propose paused, human promotes. Nothing outward-facing (end-user email, announcements) without an explicit user yes in chat.
- Rebase before push (bot digests land continuously); never force-push `main`.
- Report failures plainly with output; never claim unverified success.
