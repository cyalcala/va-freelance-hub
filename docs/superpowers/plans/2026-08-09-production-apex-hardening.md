# Production Apex Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the active Cloudflare/Astro/D1 production path reproducible, observable, failure-explicit, and protected from accidental legacy use while preserving public-indexing compliance.

**Architecture:** Astro Pages reads D1 for public routes and authenticated maintenance APIs. GitHub Actions and the Freshness Worker invoke those APIs; the release workflow validates, migrates D1, checks FTS integrity, and deploys Pages. Next.js, Turso, Trigger.dev, and Zig assets remain readable historical material but cannot be selected by active automation.

**Tech Stack:** Bun 1.3.14, TypeScript, Astro 4, Cloudflare Pages/D1/Workers, SQLite FTS5, GitHub Actions, Bun test.

## Global Constraints

- Work only in this isolated codex/production-apex-audit-2026-08-09 branch.
- Preserve the Cloudflare/Astro/D1 boundary and public-source compliance rules.
- Never bulk-delete opportunities, companies, source history, or legacy directories.
- Do not add credentials, paid services, or user-owned checkout changes.
- Every change needs a focused test, documentation evidence, and git diff --check.

## File Structure

- Create: docs/major-production-audit-2026-08-09.md — full ranked finding and disposition ledger.
- Create: docs/legacy-runtime-inventory.md — active versus historical path inventory and recovery rule.
- Create: scripts/ci/check-production-guardrails.ts — executable CI/legacy-boundary checks.
- Create: scripts/ci/check-production-guardrails.test.ts — guardrail regression tests.
- Create: apps/web/src/lib/route-load.ts and route-load.test.ts — explicit, redacted public route-load failures.
- Modify: package.json, active workflows, public route loaders, affected cron APIs, recovery docs, and only confirmed D1 migrations.

---

### Task 1: Establish a complete, evidence-linked audit baseline

**Files:**
- Create: docs/major-production-audit-2026-08-09.md
- Modify: docs/IMPLEMENTATION_STATUS.md

**Interfaces:**
- Consumes: active source under apps/web, packages/db, packages/scraper, workers, scripts, and .github/workflows.
- Produces: a ledger with ID | Severity | Evidence | Production impact | Remediation | Verification | Disposition.

- [ ] **Step 1: Capture immutable repository and runtime evidence**

~~~powershell
git rev-parse HEAD
git status --short
rg --files apps/web/src packages/db packages/scraper workers scripts .github/workflows web-nextjs-backup packages/zig-parser
~~~

Expected: the report records the audited SHA and maps every tracked production and legacy path.

- [ ] **Step 2: Measure public routes without treating HTTP 200 as acceptance**

~~~powershell
$routes = @('/', '/opportunities', '/opportunities?q=virtual%20assistant', '/directory', '/sitemap.xml')
foreach ($route in $routes) {
  curl.exe --fail --silent --show-error --location --output NUL --write-out "$route %{http_code} %{size_download} %{time_total}" "https://va-freelance-hub.pages.dev$route"
}
~~~

Expected: each route has status, size, latency, and rendered-error-body disposition.

- [ ] **Step 3: Write and commit the ranked ledger**

~~~markdown
| ID | Severity | Evidence | Production impact | Remediation | Verification | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| P0-01 | Critical | path:line and observed behavior | User-visible or data-integrity effect | Exact change | Exact command | Fixed / deferred |
~~~

~~~powershell
git add docs/major-production-audit-2026-08-09.md docs/IMPLEMENTATION_STATUS.md
git commit -m "docs: record production apex audit baseline"
~~~

Expected: every P0/P1 finding maps to a task below or has a dated rationale.

### Task 2: Enforce deterministic CI and production-boundary guardrails

**Files:**
- Create: scripts/ci/check-production-guardrails.ts
- Create: scripts/ci/check-production-guardrails.test.ts
- Modify: package.json, .github/workflows/ci-guardrail.yml, and .github/workflows/deploy-migrations.yml

**Interfaces:**
- Produces: inspectWorkflowText(path: string, text: string): { errors: string[]; warnings: string[] }.
- Consumes: each active workflow text and the root Bun lockfile.

- [ ] **Step 1: Write the failing guardrail test**

~~~ts
import { expect, test } from "bun:test";
import { inspectWorkflowText } from "./check-production-guardrails";

test("rejects mutable release inputs", () => {
  const result = inspectWorkflowText("ci.yml", "bun-version: latest\nrun: bun install\n");
  expect(result.errors).toEqual([
    "ci.yml: Bun runtime must be pinned to 1.3.14",
    "ci.yml: dependency install must use bun install --frozen-lockfile",
  ]);
});
~~~

- [ ] **Step 2: Run the focused test and implement the minimal checker**

Run: bun test scripts/ci/check-production-guardrails.test.ts

Expected: FAIL because the exported checker is absent.

~~~ts
export function inspectWorkflowText(path: string, text: string) {
  const errors: string[] = [];
  if (/bun-version:\s*latest\b/.test(text)) errors.push(path + ": Bun runtime must be pinned to 1.3.14");
  if (/run:\s*bun install\s*(?:\r?\n|$)/m.test(text)) errors.push(path + ": dependency install must use bun install --frozen-lockfile");
  return { errors, warnings: [] as string[] };
}
~~~

- [ ] **Step 3: Wire the checker and fixed toolchain into CI**

Use this active workflow contract:

~~~yaml
uses: oven-sh/setup-bun@v2
with:
  bun-version: 1.3.14

- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Validate production guardrails
  run: bun run audit:guardrails
~~~

Add audit:guardrails to package.json. Restrict automatic Pages releases to production-path pushes while retaining pull-request validation for all paths.

- [ ] **Step 4: Verify and commit**

~~~powershell
bun test scripts/ci/check-production-guardrails.test.ts
bun run audit:guardrails
git diff --check
git add package.json scripts/ci .github/workflows
git commit -m "ci: enforce deterministic production guardrails"
~~~

Expected: real active workflows satisfy the same checks as the fixtures.

### Task 3: Prevent public routes from silently rendering a data outage as an empty success

**Files:**
- Create: apps/web/src/lib/route-load.ts
- Create: apps/web/src/lib/route-load.test.ts
- Modify: apps/web/src/pages/index.astro, opportunities.astro, directory.astro, categories/[category].astro, and jobs/[id].astro

**Interfaces:**
- Produces: loadPublicData<T>(response, load): Promise<{ ok: true; value: T } | { ok: false; value: null }>.
- Consumes: an Astro response and a D1-backed loader callback.

- [ ] **Step 1: Write a failing response-contract test**

~~~ts
import { expect, test } from "bun:test";
import { loadPublicData } from "./route-load";

test("marks an unexpected data load failure unavailable", async () => {
  const response = { status: 200 };
  const result = await loadPublicData(response, async () => { throw new Error("D1 failed"); });
  expect(result).toEqual({ ok: false, value: null });
  expect(response.status).toBe(503);
});
~~~

- [ ] **Step 2: Run the focused test and implement the helper**

Run: bun test apps/web/src/lib/route-load.test.ts

Expected: FAIL because the helper is absent.

~~~ts
type ResponseLike = { status: number };
type PublicLoadResult<T> = { ok: true; value: T } | { ok: false; value: null };

export async function loadPublicData<T>(response: ResponseLike, load: () => Promise<T>): Promise<PublicLoadResult<T>> {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    response.status = 503;
    console.error("public route data load failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, value: null };
  }
}
~~~

- [ ] **Step 3: Replace every empty-success catch block**

Call loadPublicData(Astro.response, async () => ...) around page data access. When ok is false, render a visible role=alert temporary-unavailable panel before an empty result state. Keep job IDs confirmed absent as 404; use 503 only for loader failure.

- [ ] **Step 4: Verify and commit**

~~~powershell
bun test apps/web/src/lib/route-load.test.ts apps/web/tests/sweep.test.ts
bun run typecheck
bun run build
git diff --check
git add apps/web/src/lib apps/web/src/pages
git commit -m "fix: make public data failures explicit"
~~~

Expected: a D1 or binding failure cannot become a plausible empty 200 page.

### Task 4: Make ingestion outcomes and scheduled failures truthful

**Files:**
- Modify: apps/web/src/pages/api/cron/prospect.ts, apps/web/src/pages/api/cron/scrape.ts
- Modify: .github/workflows/gha-prospector-pulse.yml, gha-hunter-pulse.yml, and gha-medic-pulse.yml
- Test: apps/web/tests/sweep.test.ts or a new focused cron API test nearest the confirmed defect

**Interfaces:**
- Produces: JSON fields ok, outcome, attempted, skipped, accepted, written, archived, and failures.
- Outcome vocabulary: success, degraded, or failure.

- [ ] **Step 1: Retrieve the exact failed Prospector evidence**

~~~powershell
gh run view 31315380333 --repo cyalcala/va-freelance-hub --log-failed
gh run view 31315380333 --repo cyalcala/va-freelance-hub --json conclusion,jobs,url
~~~

Expected: classify the root cause as secret/configuration, transport, endpoint, or schema—not an undifferentiated red run.

- [ ] **Step 2: Add a failing outcome-schema test**

~~~ts
expect(() => assertCronMetrics({ ok: true, accepted: "1" })).toThrow("accepted must be a finite number");
~~~

- [ ] **Step 3: Implement bounded machine-readable outcomes**

~~~ts
return new Response(JSON.stringify({
  ok: failures === 0,
  outcome: failures === 0 ? "success" : written > 0 ? "degraded" : "failure",
  attempted, skipped, accepted, written, archived, failures,
}), { status: failures === 0 ? 200 : written > 0 ? 207 : 502, headers: { "content-type": "application/json" } });
~~~

Make pulse workflows capture the response body and HTTP status in the GitHub step summary. Only failure exits nonzero. Replace the permanent SOURCE_FAILURE_FAIL_THRESHOLD: "999" bypass with a documented consecutive-failure threshold and explicit source-review state.

- [ ] **Step 4: Verify and commit**

~~~powershell
bun test apps/web/tests/sweep.test.ts packages/scraper
bun run audit:guardrails
git diff --check
git add apps/web/src/pages/api/cron .github/workflows apps/web/tests
git commit -m "fix: surface ingestion outcomes and source failures"
~~~

Expected: skips, partial writes, and hard failures remain distinguishable from green workflow success.

### Task 5: Apply only measured query and payload improvements

**Files:**
- Create: apps/web/tests/public-route-budget.test.ts
- Modify: public page data loaders only after measured evidence
- Create: packages/db/migrations/0028_production_query_indexes.sql only if D1 EXPLAIN QUERY PLAN proves an index gap

**Interfaces:**
- Produces: a stable status/body/response-size budget with PUBLIC_SMOKE_BASE_URL optional for deployed smoke.
- Consumes: current response measurements and exact D1 query plans.

- [ ] **Step 1: Record before data and write a deterministic route-budget test**

~~~ts
expect(response.status).toBe(200);
expect(Number(response.headers.get("content-length") ?? 0)).toBeLessThanOrEqual(250_000);
expect(await response.text()).not.toContain("Temporarily unavailable");
~~~

When PUBLIC_SMOKE_BASE_URL is unset, the test must use a local fixture; CI unit tests must not depend on the public network.

- [ ] **Step 2: Verify exact D1 query plans before any index**

~~~powershell
git grep -n "select(\|db.all\|ORDER BY\|limit(" -- apps/web/src/pages packages/db
~~~

Record the full query-plan evidence in the audit ledger. If a directory payload breaches its budget, paginate or server-filter before React hydration; do not hide the issue with a larger budget.

- [ ] **Step 3: Verify and commit measured improvements**

~~~powershell
bun test apps/web/tests/public-route-budget.test.ts
bun run build
git diff --check
git add apps/web/src/pages apps/web/tests packages/db/migrations docs/major-production-audit-2026-08-09.md
git commit -m "perf: enforce public route budgets"
~~~

Expected: before/after values are documented and no speculative database change is made.

### Task 6: Quarantine historical code and automate dependency/security signal

**Files:**
- Create: docs/legacy-runtime-inventory.md
- Create: .github/dependabot.yml
- Modify: .gitignore, README.md, and docs/AI_RECOVERY_TRAIL.md

**Interfaces:**
- Produces: an active/historical classification and a weekly GitHub dependency update signal.
- Consumes: tracked file inventory, active workflow references, and safe secret-pattern count.

- [ ] **Step 1: Prove references before classifying a path**

~~~powershell
git grep -n -E "web-nextjs-backup|zig-parser|trigger:|turso|libsql|vercel" -- ':!docs/**'
git log --all --format=%H -- web-nextjs-backup packages/zig-parser
~~~

- [ ] **Step 2: Scan tracked content without printing credentials**

~~~powershell
git grep -I -n -E "(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)" -- .
~~~

Expected: zero matches, or a redacted immediate-removal/rotation finding. Never copy a credential into output or documentation.

- [ ] **Step 3: Add the quarantine inventory and Dependabot policy**

~~~markdown
| Path | Classification | Active reference check | Deployment status | Retention/recovery rule |
| --- | --- | --- | --- | --- |
| web-nextjs-backup/ | Historical | git grep result | Never deployed by Cloudflare workflow | Preserve until explicit archival decision |
~~~

Add weekly updates for github-actions and npm. Ignore only local generated runtime files; never ignore source, audit evidence, or secret findings.

- [ ] **Step 4: Verify and commit**

~~~powershell
bun run audit:guardrails
git diff --check
git add docs/legacy-runtime-inventory.md .github/dependabot.yml .gitignore README.md docs/AI_RECOVERY_TRAIL.md
git commit -m "docs: quarantine historical runtime paths"
~~~

Expected: no active deployment can use legacy code and the repository has an automated dependency update signal.

### Task 7: Full verification, Cloudflare deployment, and GitHub recovery checkpoint

**Files:**
- Modify: docs/major-production-audit-2026-08-09.md, docs/IMPLEMENTATION_STATUS.md, docs/AI_RECOVERY_TRAIL.md, and docs/SYSTEM_SAVEPOINT.md

**Interfaces:**
- Produces: a savepoint containing the release SHA, commands, GitHub run ID, FTS integrity result, public smoke table, and next review date.

- [ ] **Step 1: Run full pre-push verification**

~~~powershell
bun run test
bun run typecheck
bun run build
bun run audit:guardrails
git diff --check
git status --short
~~~

- [ ] **Step 2: Run a whole-branch quality review**

~~~powershell
$mergeBase = git merge-base origin/main HEAD
git diff --check $mergeBase..HEAD
git diff --stat $mergeBase..HEAD
~~~

Expected: every file has an audit finding or recovery-document reason, and no critical/important review finding remains.

- [ ] **Step 3: Integrate, deploy, and verify**

~~~powershell
git push -u origin codex/production-apex-audit-2026-08-09
git fetch origin main
git switch main
git merge --ff-only codex/production-apex-audit-2026-08-09
git push origin main
gh run list --repo cyalcala/va-freelance-hub --branch main --limit 3
~~~

After the production run is green, probe /, /opportunities, /opportunities?q=assistant, /directory, and /sitemap.xml; record status, size, and latency in recovery documents. Commit and push that checkpoint.

## Plan Self-Review

- Spec coverage: Tasks 1–7 cover repository audit, P0 failure contracts, deterministic CI, source automation, measured performance, legacy quarantine, security/dependency automation, Cloudflare deployment, and GitHub-backed recovery.
- Placeholder scan: every task specifies files, interface, command, expected behavior, and verification.
- Type consistency: inspectWorkflowText and loadPublicData use the same names and signatures across test and implementation steps.

