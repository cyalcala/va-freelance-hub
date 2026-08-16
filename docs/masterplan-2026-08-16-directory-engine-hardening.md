# Masterplan — 2026-08-16: Directory Growth Engine Hardening

Date: 2026-08-16
Session agent: opencode (z-ai/glm-5.2 via OpenRouter)
Working branch: `codex/apex-flash-continuation`
Scope: Rank and surgically fix the problems in the unpushed Directory Growth
Engine (`41c0336`), then back up everything to GitHub.

## Methodology

This plan applies the repo's recovery-driven methodology (smallest useful slice
→ narrowest meaningful verification → commit → push → watch CI → record
checkpoint) and combines:

- **Brainstorming skill** — design review before implementation.
- **Code-reviewer agent** — adversarial static review across correctness,
  readability, architecture, security, and performance.
- **Systematic debugging + verification-before-completion** — evidence-first
  diagnosis; no "fixed" claim without a passing test/typecheck/build.
- **Documentation-and-adrs** — every fix is recorded here and in the handoff.

## Baseline (established before any change)

| Check | Result |
| --- | --- |
| `bun run test` | 379 pass, 0 fail, 976 expectations, 47 files |
| `bun run typecheck` | exit 0 (strict) |
| `bun run build` | exit 0 (server build ~80s) |
| Working tree | clean except untracked `.claude/` and `graphify-out/` (agent-local) |
| Branch | `codex/apex-flash-continuation` ahead 1 (`41c0336`, unpushed) |

`41c0336` adds the Directory Growth Engine: an enrichment cron, a curated seed
import, and `gha-enrichment-pulse.yml`. It compiled and built clean, but it had
never been code-reviewed or tested. The review below is the first.

## Ranked Problems

### P0 — None

Verified non-issues:
- `db.all(sql)` is a valid Drizzle D1 method (used in `prospect.ts:68` and
  `verify-links.ts:69`).
- No SQL injection: the `sql` template tag parameterizes interpolated values;
  `target.companyName` originates from D1, not user input; `sql.raw` is never
  used with variable data.
- Schema columns referenced in raw SQL (`hires_filipinos`, `application_url`,
  `source_url`, `ph_eligibility`) all exist and use the correct D1 snake_case
  names.

### P1 — Fix before the branch is merged

| # | File:line | Problem | Fix |
| --- | --- | --- | --- |
| P1-1 | `directory-enrich.ts:103-108` | Silent overwrite of an existing `hiringPageUrl`. The ATS-derived hiring-page block gates on `!updates.hiringPageUrl` (the local accumulator) instead of `!target.hiringPageUrl` (the DB value), so a company whose hiring page was already set gets it overwritten with the ATS board URL. Also under-counts `hiringPageSet` and omits the action from notes. Violates the "additive only — never overwrites" guarantee in the strategy doc and workflow comment. | Delete lines 103-108. The `needsHiringPage` block at 91-98 already handles the missing-hiring-page case correctly. |
| P1-2 | `directory-enrich.ts:83-161` | One poison target aborts the whole run after partial work is committed. No per-target try/catch. A transient D1 error on any target makes `enrichDirectory` reject, the route returns 500, and the next run re-selects the same targets in `ORDER BY id` order and aborts again at the same poison row — an infinite partial-run loop. This is exactly the wedge hazard `scrape.ts:803-816` explicitly guards against. | Wrap the loop body in try/catch. Record `{ id, company, action: "error: <msg>" }`, increment `result.errors`, and `continue`. Surface `errors` in the API response. Never rethrow. |
| P1-3 | `directory-seed.ts:63-73` | Silent error on a write path. When a batch insert fails and the per-row fallback also fails, the only record is `console.warn`; the response JSON omits the failed rows and error messages. Violates AGENTS.md ("silent errors are forbidden on write paths") and repeats the 2026-08-11 audit's `triageAiUnavailable` class. | Accumulate `failedNames` and `insertErrors`; add `failed` and `insertErrors` to the response JSON. |
| P1-4 | `directory-enrich.ts` (whole file) | Zero tests for non-trivial, testable logic. The repo has 24 test files and strong test culture. `buildAtsCareerUrl` and `extractDomainFromUrl` are pure functions; `enrichDirectory` accepts `db` as a parameter (DI-ready). The P1-1 overwrite bug would have been caught by a test. | New `apps/web/tests/directory-enrich.test.ts`: ATS URL builders, domain extraction (ATS/aggregator/host blocklist + invalid URLs), and `enrichDirectory` against a mock db covering the P1-1 and P1-2 scenarios. |
| P1-5 | `curated-va-agencies-2026-08.ts:213,328` | Idempotency collisions. `normalizeCompanyName` is case/whitespace only (no punctuation handling), so `"Shepherd (formerly Support Shepherd)"` and `"Sitel (Foundever)"` do NOT collide with the existing `"Support Shepherd"` / `"Sitel"` rows and would be inserted as duplicate companies on the public directory. | Rename curated entries to their canonical current name; move the former name to `notes`. Matches how the Prospector would discover them. |
| P1-6 | `directory-enrich.ts:42-50` | `extractDomainFromUrl` filters ATS boards and remote-job aggregators but not LinkedIn/Indeed/Glassdoor/ZipRecruiter/SmartRecruiters. A company whose only `application_url` is a LinkedIn posting would get `https://linkedin.com` written as its `website` — wrong and embarrassing on the public directory. | Extend `knownAtsHosts` with `linkedin.com`, `indeed.com`, `glassdoor.com`, `glassdoor.ie`, `ziprecruiter.com`, `smartrecruiters.com`, `gohiring.com`. |

### P2 — Polish (same session if cheap, else documented follow-up)

| # | Problem | Fix |
| --- | --- | --- |
| P2-1 | No D1-durable run diagnostics/heartbeat. The 2026-08-11 audit fixed an "orphaned alert" regression by parking `__ingest_diag__` on `source_fetch_state`. The enrichment route has no equivalent — a stopped clock is not detectable. | Add `__enrich_diag__` reserved row pattern + Sentinel alert. |
| P2-3 | N+1 query pattern (2 extra queries per target, up to 80/run). Acceptable on D1 free tier today (enormous headroom) but classically N+1. | Batch into one `WHERE LOWER(company) IN (...)` query if budget is ever raised to 100. |
| P2-4 | Stuck unverified rows are re-queried 2x/day forever even when they can never qualify. | Add `lastEnrichedAt` backoff in a future schema slice. |
| P2-6 | `niche: entry.niche as any` bypasses enum type-checking. | Drop `as any`; let the curated type carry the enum. |
| P2-7 | `updates: Record<string, any>` is loosely typed — a misspelled key would compile. | Type as `Partial<typeof vaDirectory.$inferInsert>`. |

### Broader system backlog (documented, NOT this session's scope)

These are the standing pending items from the audit trail. They are noted for
continuity but are owner/operational actions or larger slices outside this
session's surgical scope:

- Confirm the Inngest `triage-drain` actually drains `pending_triage: 155`
  (owner action; requires live D1 read).
- Consolidate inline scrape triage onto `decideTriage()` once Inngest is proven.
- Move `sweepUnclearBacklog` into Inngest.
- Flip `ROBOTS_MODE` to `enforce` after ~24h of clean observe evidence.
- Phase 4C (acquisition ladder) and 4D (adaptive cadence).
- OWNER ACTION: rotate the leaked `tr_dev_` / Turso / ISR secrets at providers.

## Surgical Implementation Order

Smallest-first, each slice leaves the site deployable and is verified before
the next.

1. **Slice 1 — enrichment correctness + resilience + blocklist** (P1-1, P1-2,
   P1-6): all in `directory-enrich.ts`. Delete the overwrite block, add the
   try/catch, extend the blocklist.
2. **Slice 2 — seed error surfacing** (P1-3): `directory-seed.ts`.
3. **Slice 3 — curated name canonicalization** (P1-5): `curated-va-agencies`.
4. **Slice 4 — tests** (P1-4): new test file; validates slices 1-3.
5. **Slice 5 — polish** (P2-6, P2-7, P2-1 if cheap): type safety + diagnostics.
6. **Final verification + push + handoff update**.

Each slice: edit → `bun run test` → `bun run typecheck` → `bun run build` →
commit. Final: push all, run guardrails, update handoff, backup.

## Acceptance Criteria

- All P1 findings fixed and verified by a passing test where applicable.
- `bun run verify` (test + typecheck + build) green at the end.
- `bun run audit:guardrails` green.
- Every commit pushed to `origin/codex/apex-flash-continuation`.
- `docs/HANDOFF.md` and `docs/IMPLEMENTATION_STATUS.md` updated with the new
  checkpoint, evidence, and remaining owner actions.
- This masterplan doc and the handoff are committed to GitHub as the backup.

## Stop Rule

If the user says stop, pause, or backup, stop implementation and only update
handoff/status docs plus GitHub backup evidence.
