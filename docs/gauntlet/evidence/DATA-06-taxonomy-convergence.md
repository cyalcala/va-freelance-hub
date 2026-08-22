# DATA-06 Taxonomy / Triage-Decision Convergence

## Decision

`DATA-06` is **TERMINAL — KEEP**. The three **new-item ingestion decision
paths** now share exactly one verdict + category contract, so the same listing
can no longer be published, rejected, quarantined, deferred, or categorized
differently depending on which path processes it:

1. the inline scrape main loop (`apps/web/src/pages/api/cron/scrape.ts`);
2. the inline pending-triage drain (same file, `DRAIN_PENDING_TRIAGE`); and
3. the Inngest durable drain (`apps/web/src/lib/inngest/functions/triage-drain.ts`).

All three call the single `decideTriage` verdict and the single
`mapTriageCategoryToUiCategory` mapper exported from `@va-hub/scraper`
(`packages/scraper/triage-decision.ts`). The private duplicate mapper that used
to live in the scrape route was removed. A 30-case labelled eval corpus plus an
anti-drift guard lock the contract so a future edit cannot silently re-fork the
paths.

No model, provider, prompt, geo gate, fail-closed rule, schema, migration, or
source-list changed. The convergence is behavior-preserving: every branch of the
former inline main loop maps 1:1 onto a `decideTriage` verdict kind, and every
persisted field / stat / log is unchanged.

## What changed

| Area | Change | Behavior impact |
| --- | --- | --- |
| `packages/scraper/triage-decision.ts` | `ai-unavailable` verdict variant enriched from `{ kind }` to `{ kind; triage: TriageResult }` (additive) | None. Lets the main loop keep recording `triage.reason` / `triage.providerFailures` diagnostics after routing through `decideTriage`. Existing consumers only branch on `kind`. |
| `apps/web/.../cron/scrape.ts` | Removed private `mapTriageCategoryToUiCategory`; imported the shared one | None. The private copy was behaviorally identical (same cases → same returns; formatting only). |
| `apps/web/.../cron/scrape.ts` | Main new-item loop now calls `decideTriage(...)` and switches on `decision.kind` in the write phase | None. 1:1 branch mapping (see parity table). `aiEnv` (subrequest-budget-wrapped) is forwarded unchanged, so per-run AI budget accounting is identical. |
| `packages/scraper/fixtures/triage-eval.json` | New 30-case labelled corpus | Test-only. |
| `packages/scraper/triage-eval.test.ts` | New eval + cross-path anti-drift guard | Test-only. |

### Main-loop parity table (former inline behavior → converged kind)

| Former inline condition | Converged verdict kind | Outcome (unchanged) |
| --- | --- | --- |
| `triageJob`/skeptic threw (`!triage`) | `error` | `triageFailures += 1`; push pending "triage threw before a verdict" |
| `triage.aiUnavailable` | `ai-unavailable` | `triageAiUnavailable += 1`; collect `providerFailures`; push pending with `triage.reason` |
| `!triage.eligibleForFilipinos` | `ineligible` | push `rejectedItems` (phEligibility `ineligible`) |
| `skeptic && !skeptic.aiUnavailable && !skeptic.eligible` (only when gate `geoScope==="unknown"`) | `consensus-split` | `consensusQuarantined += 1`; push `rejectedItems` (phEligibility `unclear`) |
| otherwise | `eligible` | push `triagedItems` (publish) |

`triageFailures` is still incremented only on a true throw (a `triageJob` throw
is caught inside `decideTriage` and returned as `error`; a skeptic throw
propagates and is normalized to `error` in the phase-1 catch). A normal
`aiUnavailable` result never counts as a failure — same as before.

## Labelled eval corpus

`fixtures/triage-eval.json` — 30 minimal synthetic listings (no copyrighted
text) run END-TO-END through `decideTriage` with a mocked AI provider, so each
expected label reflects the real pipeline (`triageJob` validation +
`mapTriageCategoryToUiCategory`).

- Verdict coverage: `eligible` 21, `ineligible` 4, `consensus-split` 3,
  `ai-unavailable` 2.
- Board-category coverage (eligible): all seven public slugs
  (`admin`, `design`, `tech`, `marketing`, `customer-service`, `finance`,
  `other`) appear.
- **Leakage protection is asserted, not assumed.** Six off-taxonomy AI
  categories (`healthcare`, `teaching`, `sales`, `nursing`, `legal`, `writing`)
  and the mapper's own aliases (`creative`, `social-media`, `customer-support`)
  all resolve to `other`, because `validateTriageResult` coerces any non-slug
  category to `other` before the mapper runs. This directly guards the
  Section-K "category leakage" silent-failure (e.g. healthcare/teaching/sales
  never leak into `tech`).

The corpus lives beside the code so `bun test` runs it as a regression gate; the
test also prints a confusion-style verdict/category distribution to the log.

## Deliberate exceptions (documented, not converged)

The unit contract permits routing all paths through one contract **or**
documenting deliberate exceptions. Two exceptions are intentional:

1. **The unclear-sweep loop is NOT converged.** `sweepUnclearBacklog`
   (`scrape.ts`) re-triages already-stored rows with a deliberately different
   **cheap-8B-first model ladder** (`sweepEnv`) and an **unconditional skeptic**,
   for daily-neuron cost control (the sweep is ~95% of AI call volume). It is a
   different decision by design, not accidental drift, so forcing it through
   `decideTriage` (which uses the new-item 70B-first ladder and gates the skeptic
   on `geoScope==="unknown"`) would be a forbidden model/behavior change. It
   stays separate.

2. **The display-side `getJobCategory` reclassifier is deferred to a separate
   taxonomy decision, not changed here.** `apps/web/src/lib/categories.ts`
   `getJobCategory` reclassifies stored-`other` rows via a display-time regex on
   the homepage (`OpportunitySearch`), while `/categories/[slug]` filters by the
   stored `category` column and the homepage `categoryTotals` also count by
   stored category. These disagree (a stored-`other` job matching `/developer/`
   shows under "Engineering & IT" on the homepage but not in `/categories/tech`,
   and can mismatch a card's own "See all N" total). Unifying them is
   **user-visible product-taxonomy behavior** — it hits this unit's stop
   condition ("Label disagreement changes product taxonomy"). Per the contract's
   escalation path it is recorded here as a follow-up unit (proposed **DATA-06B —
   UI category consistency**) rather than silently changed. The safe options for
   that unit: (a) drop the display regex so every surface trusts the stored
   category, or (b) apply one shared pure fallback server-side across homepage,
   totals, and category pages. Either changes what the board shows and needs an
   explicit product decision.

## Minor observation (no change made)

Because `validateTriageResult` coerces category to the seven board slugs before
`mapTriageCategoryToUiCategory` runs, the mapper's alias arms
(`creative→design`, `social-media→marketing`, `customer-support→customer-service`)
are effectively dead for any caller that goes through `triageJob`/`decideTriage`.
They are retained (the mapper is a public export that other callers may feed raw
categories, and the existing unit test pins the aliases), and left untouched —
removing them is out of DATA-06's scope.

## Execution record

| Field | Evidence |
| --- | --- |
| Unit | `DATA-06` |
| Start | synchronized clean `main` / `origin/main` at `c6ea703` |
| Branch | `codex/data-06-taxonomy-convergence` (sole executor, clean main, no overlapping unit; branch supplies isolation + the fresh critic supplies independent scope proof) |
| Primary Addy workflow | `spec-driven-development` |
| Optional mechanism | fresh independent critic + verification-before-completion |
| Behavior files | `packages/scraper/triage-decision.ts`, `apps/web/src/pages/api/cron/scrape.ts` |
| Eval files | `packages/scraper/fixtures/triage-eval.json`, `packages/scraper/triage-eval.test.ts` |
| Behavior commit | `a014e71` (`refactor(triage): unify new-item decision/taxonomy contract (DATA-06)`) |
| Local G3 | 569 tests, 0 failures, 1,335 assertions (bun 1.3.14); typecheck EXIT 0; build EXIT 0; guardrails EXIT 0 |
| Focused | `triage-decision.test.ts` 6/6; `triage-eval.test.ts` 35/35 (30 corpus cases + coverage + 3 anti-drift + well-formed) |
| Fresh critic | Independent `code-reviewer` — verdict **SHIP**, no material issues (verified byte-level branch parity, `triageFailures`-once-per-throw, DTO safety for all 3 consumers, `aiEnv` budget parity, sweep exception preserved, all 30 corpus labels correct end-to-end) |
| CI/deploy | GitHub Actions run `32579585128`, success (full suite, D1 migrations applied, FTS verified, Pages deployed; deploy job `97046920502`) |
| Production smoke | `/`, `/directory`, `/opportunities`, `/categories/tech` → HTTP 200; protected `POST /api/cron/scrape` rejected (HTTP 403 at the Cloudflare edge; the route's own 401 guard and all auth code are untouched by DATA-06) |
| Terminal decision | KEEP |

## Rollback

`git revert` the behavior commit. The additive `ai-unavailable.triage` DTO field
is backward-compatible; reverting the scrape-route convergence restores the
former inline loop. No data or schema was touched, so no data rollback is needed.
