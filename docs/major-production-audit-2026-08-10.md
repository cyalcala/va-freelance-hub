# Production Hardening Audit and Stop-Point Handoff

Date: 2026-08-10
Status: Paused by owner request after implementation and targeted verification. This is a GitHub backup checkpoint, not production-release acceptance.

## Read This First

The active implementation is on branch codex/production-apex-audit-2026-08-09,
based on committed checkpoint 548198b. The work in this checkpoint hardens the
active Astro, Cloudflare Pages, D1, Bun, and GitHub Actions path. It does not
deploy Pages, run remote D1 migrations, or claim production acceptance.

Primary GitHub code checkpoint: 33c1995 on
origin/codex/production-apex-audit-2026-08-09. The branch push did not trigger
a GitHub Actions run because the guardrail workflow is limited to main and pull
requests. This backup is therefore not CI or production acceptance.

The owner supplied a 2/5 marker when requesting this handoff. It is recorded
as a pause marker, not as a claim that only two audit tracks were completed.
All five audit tracks below were investigated and are included in this handoff.
No release decision is implied by the marker.

## Active Architecture and Decision Boundary

The supported production path remains:

GitHub Actions pulse workflows -> allowed public RSS/API sources -> authenticated
Astro ingestion routes -> Cloudflare D1 -> Cloudflare Pages public routes.

The repository also contains historical Next.js, Vercel, Turso, Trigger.dev,
and prototype tooling. Those assets are preserved only as quarantined recovery
references. They are not part of the active build, deployment, dependency, or
workflow path.

The current Cloudflare Pages architecture constrains framework upgrades:
Astro adapter releases after the selected compatibility line remove Pages
support. The checkpoint therefore pins the last Pages-compatible Astro adapter
line instead of silently changing the hosting architecture to Cloudflare
Workers. ADR-005 records that decision and the required migration gate.

## Five-Workstream Audit Ledger

| Track | Scope | Result at pause |
| --- | --- | --- |
| 1. Public runtime, security, and performance | Public route behavior, redirects, response headers, serialized data, and directory rendering | Implemented and targetedly verified locally; live smoke verification deferred. |
| 2. Ingestion and data integrity | Request validation, D1 batch limits, retries, locks, pruning, conditional source state, and reactivation | Implemented and targetedly verified locally; migrations 0028 and 0029 are not deployed. |
| 3. Scheduled automation and CI honesty | Hunter, Prospector, Chef, Sentinel, Worker, migration, and retry workflow success criteria | Implemented and statically guarded; a new GitHub Actions run is pending the backup push. |
| 4. Supply chain and runtime configuration | Active workspace topology, dependency versions, Bun resolution, Cloudflare bindings, environment files | Implemented and build/typecheck/frozen-install verified; residual upstream advisories are documented below. |
| 5. Legacy quarantine and operational recovery | Historical runtime isolation, deployment fail-closed behavior, masterplan, handoff, and savepoint evidence | Implemented; this document and linked recovery documents form the resume contract. |

## Ranked Findings and Disposition

| Priority | Finding | Disposition |
| --- | --- | --- |
| P0 | JobPosting structured data serialized untrusted listing text with raw HTML insertion risk. | Fixed with a context-safe JSON-LD serializer and regression tests. |
| P0 | Conditional source validators could be advanced before the durable D1 write completed. | Fixed so source state commits only after durable writes; failed or unpersisted runs report failure. |
| P0 | Pruned records could be reactivated too broadly, hiding the reason they became inactive. | Fixed with a durable inactive_reason field and narrowly scoped reactivation rules. |
| P1 | D1 read failures could become empty successful pages or misleading 404 responses. | Fixed with shared public-route loading and explicit 503/no-store failure behavior. |
| P1 | Outbound redirect paths accepted unsafe or malformed target URLs. | Fixed with bounded HTTP(S) validation for source, application, scraper, and click targets. |
| P1 | Large ingestion batches could exceed Cloudflare D1 variable limits and report misleading counts. | Fixed with bounded batches, durable outcome accounting, and tests. |
| P1 | Overlapping cron runs could proceed if lock state could not be read. | Fixed to fail closed when run-lock state is unavailable. |
| P1 | HTTP 401, 403, and 429 link checks could be treated as dead listings. | Fixed to distinguish access/rate-limit responses from confirmed unavailable links. |
| P1 | Freshness Worker and scheduled workflows could report green after a rejected downstream response. | Fixed response validation, failure propagation, retry exit behavior, and workflow guardrails. |
| P1 | Prospector queried a nonexistent created_at field, causing the candidate query to fail. | Fixed in committed checkpoint 548198b using available scrape/post timestamps. |
| P1 | Directory rendering hydrated an oversized client-side data set. | Replaced with bounded server-side pagination, reducing the category/page payload pressure. |
| P1 | Historical Next.js and Turso configuration could be auto-discovered or accidentally deployed. | Quarantined configuration names, removed active workspace membership, and made legacy scripts fail closed. |
| P2 | Active dependency resolution allowed Bun hoisting to select the wrong esbuild for Astro/Wrangler. | Fixed with isolated Bun linking and an exact lockfile; production build now uses package-local compilers. |
| P2 | Public pages lacked an explicit, shared browser security-header policy. | Added middleware and static headers for CSP-compatible baseline, frame denial, MIME protection, referrer policy, and permissions policy. |
| P2 | Query shapes lacked a category/date ordering-aligned D1 index. | Added migration 0029 and schema representation; local migration/query-plan validation passed, but remote migration remains deferred. |

## Implementation Included in the Backup

### Public runtime and security

- Shared safe loaders make D1 failures visible as service-unavailable responses
  instead of empty content or false not-found responses.
- URL parsing, redirect destinations, bounded request bodies, query limits,
  safe JSON-LD rendering, and security headers are centralized in tested
  library helpers.
- Public job, category, directory, homepage, and opportunity pages use the
  shared route protections.
- The directory uses server-side pagination rather than hydrating the entire
  company data set in the browser.

### Ingestion and data integrity

- Direct ingestion batches stay within D1 limits and report durable outcomes.
- Scrape conditional headers and source state are persisted only after durable
  writes; rejected triage and failed inserts propagate to the caller.
- Pruning records an inactive reason; reactivation only repairs stale/link
  conditions, not every historical inactive record.
- Run-lock behavior fails closed when the lock cannot be trusted.
- Digest payloads, ingestion bodies, and source URLs are schema/shape bounded.

### Automation and workflow integrity

- Prospector uses available opportunity timestamps instead of a nonexistent
  column.
- Freshness Worker checks rejected insert batches and malformed scrape responses
  before reporting success.
- Chef uses an explicit Gemini REST request helper rather than a deprecated SDK
  path or placing a key in a URL.
- Pulse workflows, migration deployment, retry logic, and CI guardrails make
  downstream failures visible instead of exiting successfully after a partial
  failure.

### Supply chain, Cloudflare configuration, and legacy isolation

- Bun is the only active workspace/package-manager topology; prior pnpm
  topology files are retained with legacy names only.
- Old Turso and Next.js configuration is preserved but no longer
  auto-discoverable, and legacy commands stop before network writes.
- The active configuration keeps Cloudflare Pages and D1 as the supported
  deployment boundary. Session configuration is explicit and does not assume
  an undeclared Pages KV binding.
- Active dependencies are exact-pinned. Removed active dependencies include
  legacy Turso, Drizzle-kit, CSV parser, and Gemini SDK paths no longer used by
  the production stack.

## Dependency and Supply-Chain Result

The initial dependency audit reported 85 findings: 1 critical, 33 high, 41
moderate, and 10 low. After active dependency cleanup, exact pins, overrides,
and removal of unused vulnerable paths, the current audit reports 10 findings:
2 high, 4 moderate, and 4 low. There are no remaining critical findings.

The remaining findings are upstream Astro or esbuild advisories. Source and
configuration review found no dynamic client-island slot assignment, no
define:vars use, no Astro transitions, no Astro server islands, and no
Cloudflare image transform binding. The development server also binds to the
local host only. These controls mitigate the reported attack paths but do not
make the dependency scanner result zero.

Do not upgrade the Astro Cloudflare adapter in place merely to chase these
scanner findings: the newer adapter family changes the deployment model away
from Cloudflare Pages. Treat a future Pages-to-Workers move as an explicit
architecture project with staging, rollback, and production acceptance.

## Verification Evidence at Pause

| Check | Result |
| --- | --- |
| Focused new tests | 13 passing, 0 failing, 19 expectations. |
| Earlier full suite before the final dependency pass | 230 passing, 0 failing, 443 expectations. |
| Frozen lockfile install | Bun frozen install completed successfully after active dependency cleanup. |
| Strict typecheck after final dependency pass | Passed. |
| Astro production build after final dependency pass | Passed. The isolated Bun linker resolved the Astro/Wrangler esbuild collision. |
| Generated output inspection | No undeclared Cloudflare session binding was emitted. |
| Local D1 migrations | All 29 local migrations applied successfully, including 0028 and 0029. |
| Dependency audit | 10 residual findings: 2 high, 4 moderate, 4 low; 0 critical. |

The full test suite was intentionally not rerun after the final dependency
pass because the owner requested an immediate stop. It is a required first
resume gate, not an accepted release result.

## Deliberately Deferred Work

1. Run the full test suite and git diff --check on this exact backup branch.
2. Push the backup branch and inspect the GitHub Actions result for that commit.
3. Apply production D1 migrations 0028 and 0029 only through the established
   migration-first release workflow.
4. Deploy Cloudflare Pages only after the prior gates are clean and the owner
   explicitly reauthorizes release work.
5. Run authenticated production smoke checks for public pages, headers,
   ingestion refusal paths, pulse response contracts, and D1 migration state.
6. Consider a separately approved Cloudflare Pages-to-Workers architecture
   migration if clearing the residual framework-advisory line is worth the
   migration risk.
7. Add a dependency-update automation policy only after confirming the active
   Pages compatibility range and CI behavior.

## Release and Rollback Rule

No production release has occurred from this checkpoint. The active production
baseline remains the previously accepted main-branch release documented in
SYSTEM_SAVEPOINT.md. A future release must start from this backup branch,
re-run all required gates, and use the existing migration-first release path.

If a future deployed release regresses, revert the specific release commit or
redeploy the last accepted main release; do not revive the quarantined runtime
as a rollback shortcut. D1 migration rollback requires a separately reviewed,
data-safe plan.

## Safe Resume Order

1. Read AGENTS.md, this document, ADR-005, HANDOFF.md, and SYSTEM_SAVEPOINT.md.
2. Confirm the working tree and branch are exactly the backed-up checkpoint.
3. Run bun run test, bun run typecheck, bun run build, and git diff --check.
4. Inspect the current dependency audit; do not treat an advisory count as a
   reason to change the Pages hosting model without an approved ADR.
5. Inspect GitHub Actions for the saved commit and repair any real failure.
6. If release authority is renewed, run the migration-first Cloudflare release
   and record remote D1 plus public smoke evidence in IMPLEMENTATION_STATUS.md.

## Secret and Historical-Artifact Note

Historical provider credentials previously reported in repository history are
not printed or copied by this handoff. They remain an owner rotation and,
separately, a consented-history-rewrite decision. The active repository ignores
environment files, local Cloudflare variables, private keys, and certificates;
only redacted example templates remain tracked.
