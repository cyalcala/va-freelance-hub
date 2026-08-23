# REL-11 — Source Doctor RSS Truncation False SCHEMA_BROKEN Fix

Date: 2026-08-23 (run 4)
Executor: repository executor
Unit contract: `docs/gauntlet/IMPLEMENTATION_UNITS.md` § REL-11 (committed
PLANNED at `90f52b8` before implementation)
Parent diagnosis: SRC-4E KEEP (`docs/gauntlet/evidence/
SRC-4E-jobicy-supporting-cdata-diagnosis.md`)

## Change

Behavior commit `f2a84be` — `fix(diagnostics): parse full RSS body in source
doctor static probe (REL-11)`:

- `packages/scraper/source-doctor.ts`: the static-source probe now parses the
  complete fetched body (`body = text;`) instead of slicing to the deleted
  `MAX_BODY_BYTES` (256 KiB) constant. A comment records why truncation is
  forbidden here (the body is already fully in memory; the slice only corrupted
  parse input).
- `packages/scraper/source-doctor.test.ts`: one new regression test,
  "parses a >256 KiB CDATA feed without false SCHEMA_BROKEN (REL-11)",
  building a synthetic 283,353-char CDATA feed programmatically and asserting
  HEALTHY_WITH_RESULTS, `itemCount=8`, `requestCount<=2`, `mutations=0`, and
  `bytesReceived` equal to the full body length.

Diff scope: exactly these two files (+37/−2); ingestion path untouched.

## Verification record

| Check | Command | Result |
| --- | --- | --- |
| Focused suite | `bun test packages/scraper/source-doctor.test.ts` | 15 pass / 0 fail / 63 assertions (was 14 tests pre-unit) |
| Test power (red) | Same fixture through old slice→parse path with identical parser options | THREW `"CDATA is not closed."` → pre-fix code yields SCHEMA_BROKEN on this exact fixture |
| Full suite | `bun test` | 635 pass / 0 fail / 1,529 assertions |
| Typecheck | `bun run typecheck` | exit 0 |
| Guardrails | `bun run audit:guardrails` | exit 0 |
| Build | `bun run build` | exit 0 |
| Diff hygiene | `git diff --check` | clean |

CI/deploy for `f2a84be`: GitHub Actions **Sovereign CI Guardrail run
`32609833176` — conclusion success** on the exact SHA (`f2a84bee58a8…`),
including the "Migrate and deploy production" job (D1 migrations + Pages
deploy). Acceptance complete → TERMINAL KEEP.

## Fresh independent critic

Verdict: **SHIP** (fresh-context reviewer with no role in authorship; reviewed
diff, both full files, contract row, and callers). Key adversarial checks it
performed independently: fixture geometry vs the old slice point (~14k chars
inside the final CDATA block, robust to perturbation), red/green matrix
(pre-fix source + new test fails exactly as designed; legacy 14 tests stable),
caller sweep (sole caller is the `scripts/source-doctor.ts` CLI; nothing
depends on truncation), boundary audit against the contract, must-preserve
checks (parser options byte-identical across paths; nine-outcome taxonomy;
zero mutations). Zero blocking, zero important findings; one cosmetic nit
(comment size figure) fixed before commit.

## Out-of-scope finding recorded (not acted on)

Critic flagged a PRE-EXISTING oddity outside REL-11's boundaries:
`packages/scraper/source-doctor.ts` assigns `activePath.sourceName` /
`activePath.sourceFamily` though the `ActivePath` type does not declare those
fields; typecheck passes because `packages/scraper` sits outside the `apps/web`
tsconfig surface. Recorded here for a future bounded typing unit; no action
taken in REL-11.

## Acceptance against contract

- Focused + full suites green: YES.
- Critic SHIP: YES.
- No ingestion-path file touched: YES (git status limited to the two contract files).
- CI/deploy green including production Pages deploy: YES — run `32609833176`
  success on `f2a84be`.
- Live Jobicy re-probe: explicitly OUT OF SCOPE; deferred until after the
  SRC-4D post-rollup is recorded (contract coordination constraint).

## Rollback

`git revert f2a84be` restores truncation behavior; test file may remain.
