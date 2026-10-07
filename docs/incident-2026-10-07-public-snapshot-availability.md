# Public snapshot availability incident — 2026-10-07

Status: **TERMINAL — KEEP**, bounded public-serving acceptance, observed through
2026-10-07 17:44 Manila. This follows the earlier 16:40 recovery receipt; it does
not rewrite that receipt or certify ingestion, source autonomy or supply freshness.

## Root cause and trigger

The earlier investigation found production Pages deployment `53fe5e7b` at git
`8875e2328443c82e71c0fe1473b1edd4da03c615`, still using per-request D1 queries,
while the snapshot implementation `221650a4` was on Git main. Migration 0054
was absent. The dated quota incident (D1 7500) therefore reached public handlers.
Even the snapshot implementation could throw from `loadCold` when memory, edge
cache and D1 all failed. Ephemeral memory and edge storage provided no durable
recovery across a cold start. See [ADR-010](decisions/ADR-010-public-serving-snapshot-architecture.md)
and the earlier savepoint for the original forensic receipts. A current production
quota outage was not induced or observed in this follow-up: initial smoke was 200.

Failure chain: visitor -> Pages/Astro route -> board initialization -> unavailable
D1 with no usable ephemeral copy -> thrown load -> public 503. Backend failure may
reduce freshness; it must preserve public availability while a verified board exists.

## Fix and additional reproduced gaps

The initial LKG fix `019333f72261e8d182567163239f23e663c8d43f` bundled the real
production export and retained stale state. Five new regression tests failed before
the follow-up correction: malformed renderer fields, a cold empty jobs array with
nonempty directory, failed durable writes promoting a replacement, older edge copies
rolling back memory, and a throwing background-context hook escaping the loader.

Follow-up behavior `a31d999b`:

- Validate tags, nullable render fields, enums, timestamps, directory flags and unique
  positive IDs. Reject empty job boards and severe job/directory count collapse.
  Unparseable job dates remain tolerated as unknown; they are never changed to now.
- Validate and compress before writing; persist before promoting a rebuilt candidate.
  Packing/write failure keeps memory, edge and the previous durable row intact.
- Reject older in-memory promotions. Conditional D1 upserts prevent a late writer from
  an expired lease overwriting a newer stored snapshot.
- Serve usable stale data while refresh runs. Bound memory-miss cache/database and
  background waits. Each dependency boundary has a 2-second deadline; this is not an
  end-to-end availability SLO or a change to source budgets/cadence.
- Contain cache binding/read/write and `waitUntil` failures, including the outer HTML
  middleware before the route. An unavailable HTML cache falls through to rendering.
- Expose board source, age, generation time and job/company counts in response headers.
  Refresh telemetry records result, duration and fixed error classifications.

The bundled fallback remains the production export captured `2026-10-07T08:15:58.968Z`:
1,518 jobs and 735 directory rows, descriptions omitted. No source admission, quality
threshold, publication rule, production clock, GCP job or provider was changed.

Implementation files: `apps/web/src/lib/public-serving-snapshot.ts`,
`apps/web/src/lib/public-edge-cache.ts` and `apps/web/src/middleware.ts`.
Regression coverage: `public-snapshot.test.ts`, `public-edge-cache-failure.test.ts`,
`sitemap-read-cache.test.ts` and `sitemap-failure-honesty.test.ts` in `apps/web/tests`.
Acceptance tooling: `.gitleaks.toml`, `bunfig.toml`, `package.json`,
`scripts/ci/test-environment.ts`, and the held-tenant/timeout receipt fixture tests
in `scripts/lake`. Initial bundle/helper and route migration files remain in `019333f7`.

## Verification and hypotheses

| Failure class | Evidence |
| --- | --- |
| H1 / H5 cold start and ephemeral cache loss | D1-unavailable tests B/H; built Pages worker without D1 restored real bundled inventory |
| H2 refresh/persistence failure | Tests C/F/I, failed-write and oversized-candidate regressions retain the active board |
| H3 quota exhaustion | D1 7500 classification and quota injection in loader/sitemap tests; no destructive live quota injection |
| H4 malformed/partial/empty snapshot | Schema/render-field, empty/count-collapse and directory-loss regressions |
| H6 unhandled cache/binding/context errors | Middleware binding/read/write tests, hung dependencies and throwing `waitUntil` |
| H7 runtime/configuration mismatch | Real production deployment/SHA confirmed; local Pages runtime used production `2024-11-01` plus `nodejs_compat`, with no D1 binding |
| H8 payload/runtime bounds | Bundled JSON 1,149,699 bytes; packed ASCII 166,347 bytes; local clone/validate/compress 101 ms and approximately 10 MB heap delta; oversized promotion rejected |
| Concurrent and deployment transitions | Shared inflight load, SQL lease, conditional late-writer upsert, older-edge rejection and fresh worker restoration |

The size/timing/heap measurements are local Bun measurements, not production Worker
CPU or memory profiles. D1's pre-release row contained 598,055 compressed ASCII
characters because it also retained descriptions. A diagnostic SELECT read one row,
wrote zero rows and left the database unchanged: [D1 receipt](audits/2026-10-07-public-serving-d1-read.json).

Final local verification: `bun run test` **3,003 pass / 0 fail** across 220 files;
`bun run typecheck`, normal `bun run build`, all four governance audits, 15 Python
analytics tests, worker typecheck and worker deployment dry-run passed. Required
GitHub CI repeated 3,003 passing tests on the actual release SHA.

Acceptance tooling corrections: `71ab5b92` adopts the narrow match-scoped
`sourcePlatform` JSON scanner exception; LinkedIn and GitHub synthetic credentials
remain detected, including a credential on the same JSON line. `dd9e5e11` prevents
fixture tests selecting live Turso/Jev clients from inherited credentials, retains a
real abort signal in the fake timeout transport, and lets Node CLIs use Node.
Forcing Astro through Bun had reproduced Windows `EEXIST`; the normal build now passes.
Jev's optional acceptance consultation returned HTTP 401; direct review and tests
governed the decision. Missing `.ai/manifest.yaml` and `scripts/skill-router.py` were
recorded; the installed Addy debugging skill was available and used.

## Production and backup receipts

PR [#215](https://github.com/cyalcala/va-freelance-hub/pull/215) merged at
`2026-10-07T09:38:33Z` to **`6297335ac3bbeb84f4f094a916d2155b8ac83adb`**.
The pushed branch head `e4c5e6ba24947f250b0676e0496c57de4c141717` matched its remote.
PR validation [37601727644](https://github.com/cyalcala/va-freelance-hub/actions/runs/37601727644)
passed. Main validation and production release
[37602023203](https://github.com/cyalcala/va-freelance-hub/actions/runs/37602023203)
passed, including migration checks, source-transition evidence and FTS integrity.
No new migrations were required. The legacy Vercel integration still reports a
blocked account; it is outside the active Cloudflare release path and was not revived.

Pages production deployment **`c6d071c1-3c10-4d4e-b3c0-5d607b688170`** maps to that
main SHA and was published at approximately `2026-10-07T09:40:04Z`:
[immutable deployment](https://c6d071c1.remotejobs-ph.pages.dev),
[production alias](https://remotejobs-ph.pages.dev).
GitHub code/history and Pages artifacts are backed by these receipts; this is not a
database restoration backup or a GCP deployment receipt. Existing GCP jobs were not
deployed or independently certified by this incident.

Live checks bypassed HTML cache using a synthetic cookie, then also checked normal
visitor traffic. All ten routes returned HTTP 200: home, filtered opportunities,
directory, admin/customer-service/writing/tech categories, jobs 7/251 and sitemap.
Initial requests served a stale edge board with 1,518 jobs; later responses and normal
home traffic served **fresh 1,519 jobs / 735 companies**, generation
`2026-10-07T09:35:53.265Z`. Two subsequent normal home requests were edge HITs.
See [production smoke](audits/2026-10-07-public-serving-production-smoke.json).

With D1 absent, the built worker returned 200 on eight routes, including filtered
opportunities and job pages, with 1,518 jobs / 735 companies. HTML reported the
bundled LKG; the sitemap could restore that same dated board from edge cache and
report stale. See [offline smoke](audits/2026-10-07-public-serving-offline-smoke.json).
Cached response headers describe the board's origin and age, not per-request SQL
counters. Warm zero-D1 behavior is verified with counted driver tests; the live
edge HIT checks support the HTML cache path. Fleet-wide read/CPU measurements remain
unverified. Cold reconstruction can scan source tables if the stored row is missing;
the global hourly lease claim applies when the snapshot row already exists.

## Remaining limits and recovery

- The bundled export ages until replaced by a reviewed production export/build.
  Freshness, expiry/link quality, withdrawals/opt-outs and supply acceptance still
  require the existing governed pipeline and independent measurement. The dated
  bundle does not grant admission or new publication authority.
- Apply-click redirects retain their current live-D1 eligibility check and can fail
  closed during a DB incident; public board rendering does not call that endpoint.
- Live quota exhaustion was not induced. Failure injection and the D1-free Worker
  prove the boundary locally; healthy production routing/release is separately observed.

Rollback target is the previously working LKG Pages artifact `62a5be85` / `019333f7`,
which preserves board availability but lacks the additional promotion/cache hardening.
Never roll back to the pre-LKG build merely to reduce freshness.

Next action: recover the latest owner-reported PH/VA lead's durable intake and stage
hold under the existing source queue, as a separately scoped task. This availability
incident is complete; no recurring monitor or source expansion was dispatched.
