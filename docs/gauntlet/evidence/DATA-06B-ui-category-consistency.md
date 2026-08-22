# DATA-06B UI Category Consistency — Acceptance Evidence

Date: 2026-08-23
Base: `bdb6e22` (`main` = `origin/main`, clean tree)
Behavior commit: `f00478c` — `fix(ui): trust stored job category on every surface (DATA-06B)`
Test-hardening commit: `041bc2c` — `test(ui): pin stored-other against every legacy reclassification family`

## Owner product decision (the unit's prerequisite gate)

DATA-06 recorded the display-side inconsistency as a follow-up requiring "an
explicit product decision" between two safe options. On 2026-08-23 the owner
selected **option (a): trust the stored category everywhere** — delete the
display-time regex reclassification so homepage preview grouping, the
`categoryTotals` badge, `/categories/[slug]`, and `/opportunities` all reflect
the stored D1 `category` column. Stored-`other` jobs render only under
GENERAL & OTHER; title-derived miscategorization becomes an upstream ingestion
concern, consistent with DATA-06's single-decision-path convergence.

## Surface audit (pre-change)

| Surface | Behavior before | After |
| --- | --- | --- |
| Homepage preview groups (`OpportunitySearch`) | regex-reclassified stored-`other` rows at render time | stored category via one-line `getJobCategory` |
| Homepage `categoryTotals` badge | stored-category SQL count | unchanged (now always agrees with membership) |
| `/categories/[category]` | filters stored `category` column | unchanged |
| `/opportunities` category filter | filters stored `category` column | unchanged |
| Cards | no category label | unchanged |

`getJobCategory` had exactly one consumer (`OpportunitySearch.tsx:86`,
grep-verified). The projection type/payload is unchanged.

## Diff scope

- `apps/web/src/lib/categories.ts`: −13 lines (six regex families +
  early-return branch) → `return opp.category || 'other'`.
- `apps/web/tests/ui-category-contract.test.ts`: new focused contract test.
- No schema/migration/D1 write/ingestion/triage/source/dependency changes.

## Verification record

| Gate | Command | Result |
| --- | --- | --- |
| Red proof | `bun test apps/web/tests/ui-category-contract.test.ts` (pre-fix) | 3 pass / 1 fail — stored-`other` + "Senior React Developer" returned `tech`, reproducing the defect |
| Focused (post-fix) | same | 4 pass / 0 fail / 15 assertions |
| Full G3 at behavior commit | `bun test` | 606 tests, 0 failures, 1,418 assertions |
| Typecheck | `bun run typecheck` | EXIT 0 |
| Build | `bun run build` | EXIT 0 (server built, complete) |
| Guardrails | `bun run audit:guardrails` | EXIT 0 |
| Critic hardening | extend stored-`other` coverage to every legacy family | focused 5/5 / 21 assertions; web suite 181 files, 0 failures |
| CI/deploy (behavior) | GitHub Actions run `32602546093` (`f00478c`) | success — Detect deployable `97102923052`, Validate `97102923106`, Migrate+deploy production `97102984274` |
| CI/deploy (hardening) | GitHub Actions run `32602939487` (`041bc2c`) | success |

## Fresh independent critic

Independent reviewer (no authorship role) verdict: **SHIP**, no material
blocking issues. Verified: diff contains only intended changes; unknown
non-slug stored values behave byte-equivalently before/after (returned early
both ways; ad-hoc group key never rendered because rendering iterates
`JOB_CATEGORY_MAP` keys only); no remaining disagreement path between preview
membership and totals (badge guard at `OpportunitySearch.tsx:29` absorbs query
races); search-active badge falls back to filtered-subset length correctly;
strictly positive perf (six fewer regexes per job per keystroke); no new
security surface. Its one Important recommendation — regression power rested
on a single tech-family case — was applied in-unit as commit `041bc2c`
(stored-`other` pinned against marketing/design/customer-service/admin/
finance/tech titles).

## Revert plan

`git revert f00478c 041bc2c` restores the prior display behavior. Display-only;
no data, schema, or ingestion state to restore.

## Follow-ups observed (not acted on)

None new from this unit beyond the critic item closed above. Pre-existing
observations recorded by the critic remain documented in its report: search-
active "See all N" navigates to the unfiltered category page, and
`groups[category]` prototype-key collision is theoretically possible but
controlled by ingestion today.
