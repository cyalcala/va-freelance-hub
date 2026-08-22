# SEC-03 Hostname Trust Evidence

## Decision

`SEC-03` is **TERMINAL — KEEP**. Prospector source trust and ATS recognition
now accept a host only when it is the exact trusted host or a dot-delimited DNS
subdomain. No trusted host, source, dependency, redirect behavior, DNS lookup,
or stored row was added or changed.

## Execution record

| Field | Evidence |
| --- | --- |
| Unit | `SEC-03` |
| Start | synchronized clean `main` / `origin/main` at `252bd61` |
| Behavior commit | `6c48810` (`fix: enforce DNS-label hostname trust`) |
| Branch/worktree | `main`; primary worktree |
| Behavior files | `packages/scraper/prospector.ts`, `packages/scraper/prospector.test.ts` |
| CI/deploy | GitHub Actions run `32557360004`, success |
| Live smoke | Prospector run `32557448855` on `6c48810`, success |
| Post-smoke sync | expected Prospector digest commit `80f6d7d`; clean synchronized `main` |
| Decision | `KEEP` |

## Boundary implementation

The pure `exactOrSubdomain(host, trusted)` predicate normalizes case and a
single trailing DNS root dot, rejects empty inputs, and permits only:

```text
host === trusted
host.endsWith("." + trusted)
```

It replaced all six permissive trust branches:

1. the `TRUSTED_HOSTS` source auto-add check;
2. Greenhouse ATS recognition;
3. Ashby ATS recognition;
4. Lever ATS recognition;
5. Breezy ATS recognition; and
6. Workable ATS recognition.

The old plain textual suffix forms are absent from the active Prospector file.

## Fixture matrix

Known-good parity was 100% for the configured host set:

| Family | Accepted forms exercised |
| --- | --- |
| Curated feeds | `weworkremotely.com`, `www.realworkfromanywhere.com`, `jobicy.com`, `remotive.com` |
| Greenhouse | `boards.greenhouse.io`, `boards-api.greenhouse.io` |
| Ashby | `jobs.ashbyhq.com`, `api.ashbyhq.com` |
| Lever | `jobs.lever.co`, `api.lever.co` |
| Breezy | `acme.breezy.hr` |
| Workable | `apply.workable.com` |
| Normalization | uppercase URL/host, `www`, trailing root dot, one and multiple subdomains |

Malicious/unknown rejection was 100% for the adversarial corpus:

| Boundary | Rejected forms exercised |
| --- | --- |
| Curated trust | `eviljobicy.com`, `jobicy.com.evil.test` |
| Specific trusted ATS hosts | `evilboards.greenhouse.io`, `eviljobs.ashbyhq.com`, `eviljobs.lever.co`, `evilbreezy.hr`, `evilapply.workable.com` |
| ATS base recognition | `evilgreenhouse.io`, `evilashbyhq.com`, `evillever.co`, `evilbreezy.hr`, `evilworkable.com` |
| Parse boundary | invalid URL, null input, empty host |

## Verification

- Focused: `bun test packages/scraper/prospector.test.ts` — 19 passed, 0
  failed, 84 assertions.
- Full G3: `bun run test` — 464 passed, 0 failed, 1,053 assertions.
- `bun run typecheck` — passed.
- `bun run build` — passed.
- `bun run audit:guardrails` — passed.
- `git diff --check` and residual unsafe-suffix scans — passed.
- CI/deploy run `32557360004` passed guardrails, tests, build, strict
  typecheck, Freshness Worker validation, D1 migration/integrity checks, and
  Cloudflare Pages deployment.

A supplemental `bun audit` reported 10 existing dependency advisories: 2 high,
4 moderate, and 4 low, centered on the current Astro toolchain. Dependency
changes are outside SEC-03's explicit commit boundary and remain separate
security debt; no advisory was introduced by this dependency-free change.

## Bounded production proof

Authenticated Prospector workflow `32557448855` exercised the deployed caller
and returned HTTP 200 on behavior SHA `6c48810`:

- candidates considered: 4;
- auto-add eligible: 0;
- added: 0;
- review-only: 3;
- rejected for quality: 1;
- ATS proposals: 0;
- mass-add guard tripped: false.

The smoke produced no directory mutation and confirms the deployed classifier
continued to hold untrusted candidates for review. Exploitation in historical
stored data remains **UNKNOWN** because SEC-03 forbids row repair or a broadened
data investigation.

## Handoff and rollback

- Evidence status: acceptance complete; no remaining SEC-03 items.
- Assumption: URL parsing remains the normalization boundary; registrable-domain
  equivalence, redirects, and DNS resolution are intentionally out of scope.
- Blocker/stop condition: none reached.
- Rollback: revert `6c48810` only if a documented legitimate configured host is
  rejected; repair the fixture/predicate rather than restoring plain suffix
  checks.
- Next exact action: execute `DB-01`, the fresh/legacy D1 migration rehearsal,
  from synchronized clean `main`.
- Recommended capability: Cloudflare D1/SQLite migration executor with careful
  disposable-database and ledger verification.
