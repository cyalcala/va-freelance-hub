# SP-10 — Workable global XML feed adapter: day-1 evidence

**Status: code complete — genuinely different shape from every other unit in this batch.** Not evidence-ready for a `review_ready` promotion, and not expected to be from a single session: SP-09 (TERMINAL — KEEP) already decided this source needs dedicated GitHub Action preprocessing, not the standard shadow-probe path, and today's real live evidence reconfirms exactly why. **No registry write was even attempted for this unit** — there is no complete, review-ready evidence packet to act on yet, unlike SP-11/12/14/15.

## What this unit built

`packages/scraper/workable.ts`: pure parsing of Workable's documented global XML feed schema (`help.workable.com` feed docs) into a minimal normalized shape (title, canonical `url`, company, location summary, remote flag, job type, category, posted date) — **actively excludes `<description>`** (verified live: full HTML content), matching every other adapter's minimal-content precedent. `filterPlausibleCandidates` is the actual point of this unit: a cheap, coarse remote-OR-Philippines pre-filter that does the real size reduction a preprocessing job needs — explicitly documented as **not** a substitute for this project's own `geoGate` eligibility decision, which still runs on every surviving candidate downstream, exactly as it does for every other source.

`packages/scraper/workable-canary.ts`: unlike every per-company adapter this session (Lever/Greenhouse/SmartRecruiters/Teamtailor/Recruitee), Workable's feed is **one global, multi-employer identity**, not one row per curated company — `source_id` is the single durable identity `workable:global-feed`. Mechanism `syndication_feed` (not `ats_api`), matching the DB's own CHECK constraint (verified directly against the migration SQL — see "real findings" below).

## Two real bugs found and fixed by testing against genuine data and a real live probe

**1. `allowedHosts` host-stripping mismatch.** `packages/scraper/prospector.ts`'s `hostOf()` strips a leading `www.` from a URL's host before comparing against `allowedHosts`, but the endpoint URL is `https://www.workable.com/boards/workable.xml`. Setting `allowedHosts: "www.workable.com"` (matching the URL literally) produced a false `POLICY_BLOCKED` — `"host workable.com not in allowedHosts www.workable.com"` — caught by running the real shadow prober, not just unit tests. Fixed: `allowedHosts` must be the bare apex (`"workable.com"`).

**2. `content_scope` TS/DB enum mismatch (found while avoiding a repeat of SP-11's finding).** `packages/db/migrations/0036_registry_foundation.sql`'s `provider_profiles.content_scope` CHECK only allows `('minimal','full','metadata_only')`. This unit's provider profile uses the DB-valid `'minimal'` directly, having checked the migration SQL first — this is the same class of bug SP-11's `lever-canary.ts` has today (its `contentScope: "minimal_with_truncated_summary"` is not a valid DB value; noted in `docs/SYSTEM_SAVEPOINT.md` Run 33 as an unresolved follow-up, not blocking since that write itself is also pending).

## Real live evidence gathered this session

One bounded live `GET https://www.workable.com/boards/workable.xml` (matching SP-09's own fetch pattern; no repeat fetches — the feed updates hourly and "more frequent consumption is unnecessary" per its own documentation):

- **14,657,375 bytes (14.66 MiB), 3,741 raw `<job>` entries, 3,533 distinct by URL.**
- **598 `remote=true`, 72 `country=PH`, 654 after the actual `remote OR country=PH` union filter — an 82.5% reduction** (16 postings satisfy both conditions).
- Confirms SP-09's `GITHUB_ACTION_PREPROCESSING` decision is still correct today: this fetch is still far over the `candidate-shadow.ts` shadow-probe budget (`SHADOW_MAX_BYTES = 512 KiB`) and this project's own single-source share of the shared 10-minute scrape-tick budget (`WORKER_INLINE_MAX_BYTES = 5 MiB` from `workable-feasibility.ts`).

**Ran the real standard SP-07 shadow prober against this source anyway, to get current, honest evidence rather than only citing SP-09's history:**

```
runCandidateShadowProbe({ endpointUrl: "https://www.workable.com/boards/workable.xml", ... })
→ { outcome: "UNREACHABLE", fetchAttempted: true, parseAttempted: false, bytesReceived: 0 }
```

The standard prober's `SHADOW_FETCH_TIMEOUT_MS = 8_000` (8 seconds) aborts before this 14.66 MiB feed finishes downloading — a real, current, honest confirmation (not the byte-budget check even being reached) that the standard evidence-gathering path genuinely cannot evaluate this source. Separately, even a fetch that *did* complete would still fail the evidence packet's own `missingEvidenceFor` check (`shadow payload N bytes exceeds 512 KiB budget`, `packages/scraper/evidence-packet.ts:246`) — this is structural, not a transient probe glitch, and reconfirms exactly what SP-09 already decided.

## What "GITHUB_ACTION_PREPROCESSING" was deliberately NOT built tonight

SP-09's decision names a dedicated GitHub Action as the intended runtime. This session did **not** author or deploy any new scheduled GitHub Actions workflow for Workable, and did not attempt any D1 write through one. Reasoning: **the actual registry-activation write is the same class of action already confirmed blocked live tonight by Claude Code's own auto-mode classifier** (see `docs/SYSTEM_SAVEPOINT.md` Run 33 — a real `wrangler d1 execute --remote` attempt for SP-11's pending write was explicitly denied, with an instruction not to route around it). Standing up a new autonomous, unattended, scheduled job that would eventually perform that same class of write — just executed from CI instead of directly by this session — would defeat the intent of that denial even if not blocked by its letter. A new recurring integration hitting a real third party's production feed indefinitely is also, independently, exactly the kind of standing infrastructure change that warrants the owner's explicit, specific review before being turned on — a blanket "proceed with all" authorization is not read as covering it, matching how the classifier's own denial was already found insufficient for the registry write it blocks.

What *is* real, safe, and merged: the pure parsing/filtering adapter code, tested against genuine captured data and a real live probe, ready for whatever the owner decides the actual preprocessing runtime should look like (a manually-triggered `workflow_dispatch` GHA that hands a *summarized, budget-conformant* result to the existing evidence-packet pipeline is one plausible next design — not decided or built here).

## What was NOT done

No `provider_profiles`, `source_registry`, or `source_decisions` row was written or attempted for `workable:global-feed`. No GitHub Actions workflow was added or modified. No opportunity was written or could have been.

**Next step:** owner reviews this alongside SP-11/12/14/15's evidence and decides (a) whether/how to authorize the pending per-source registry writes, and (b) what the actual Workable preprocessing runtime should look like before any of that gets built — this genuinely cannot be compressed into one more session's work regardless of authorization, since it needs both a real design decision and real multi-day shadow/canary windows once running.
