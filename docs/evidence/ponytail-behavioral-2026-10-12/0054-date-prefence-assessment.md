# Original-date release prerequisite at the 0054 baseline

This is read-only source analysis and an offline counterexample, not a release or source admission. The reported live source is `3065f0d709d5a1950c247d5a11df542b07721bcb`; the current source baseline is `c5521b1b1ca977e9a762413965db6df3a5dc6019` plus separately recorded working candidates.

| Boundary | Live 3065 | Current checkout | Required bounded behavior |
| --- | --- | --- | --- |
| Workable original date | `safeNormalizeDate(job.published_on || job.created_at)` | Same | Validate the raw publication field before conversion. Missing publication evidence stays unknown; a creation fallback needs proven provider semantics. |
| Greenhouse original date | `safeNormalizeDate(job.updated_at)` | `greenhousePostingDate(job.first_published)` | Use only the original publication field. Preserve supported precision until freshness assessment; the current helper's ISO conversion still truncates fractions beyond milliseconds. |
| Lever / Ashby / Breezy | `createdAt` / `publishedAt` / `published_date` through permissive conversion | Same | Retain field provenance and validate each provider's actual format. Do not replace an epoch-millisecond provider format with a generic string-only parser or claim creation semantics without evidence. |
| RSS / Remote OK | Permissive date conversion | `normalizeSourcePostingDate` validates raw calendar and preserves sub-millisecond ISO precision | Reuse the existing strict source parser, without the concurrent transport-seam change. |
| Before new-item AI / durable pending | No original-date assessment before `gatePassedItems.push` | `assessPostingFreshness(item.postedAt, observedAt)`; non-window cases stay inactive with a dedicated hold reason | Require `WITHIN_WINDOW` from the original field before AI or a publication-capable queue. No fetched/edit/observed clock substitutes. |
| Final fresh insert | No explicit date prefence | Early date gate, followed by current gateway post-write ownership/date verification | Recheck every actual candidate batch immediately before the write. A post-write check can detect drift but cannot undo publication; potential persistence still stays UNKNOWN. |
| Pending recovery / feed reactivation | Older callbacks lack current explicit date checks | Current repair includes stricter recovery/activation and gateway checks | Every enabled hidden-to-public exposure needs the same date gate. A fresh-insert-only proof does not cover these alternative paths. |

Two existing leaf files supply the date logic without a new package or schema:

- `packages/scraper/source-posting-date.ts`: strict ISO/RSS wall-calendar validation; ISO fractions beyond milliseconds survive for assessment.
- `packages/scraper/publication-freshness.ts`: UNKNOWN/INVALID/FUTURE/STALE/WITHIN_WINDOW; inclusive 30-day boundary; nanosecond-aware future comparison.

Both import `isAdmissionInstant` from `admission-evidence.ts`, already present at the live baseline. That helper checks an exact canonical UTC millisecond string against its round trip. This is a dependency-free date repair in the sense of no new package/schema; it is not justification to import the later whole publication gateway or its later DDL. Export/import only the selected leaf functions into the isolated baseline. For ATS raw dates use the proven provider field, not the normalized adapter result after information has been discarded.

The [ATS probe](ats-date-probe.ts) uses the actual current Workable/Greenhouse parsers and current freshness assessment, with the archived live normalizer. It intercepts exactly two synthetic fetch attempts; provider requests, AI calls and database writes are zero. Workable raw September 31, date-only, one-nanosecond future and missing-publication/creation-fallback examples all appear `WITHIN_WINDOW` after permissive conversion, while their original assessment is INVALID, INVALID, FUTURE and UNKNOWN. Greenhouse `first_published` September 1 remains STALE; a live `updated_at` October 12 mapping appears fresh. This is parser composition, not actual handler/D1 proof. A date-only field does not prove the exact instant required by the current accepted guard; do not invent midnight or a successful current clock to publish it.

Reproduction from the repository root:

```powershell
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./docs/evidence/ponytail-behavioral-2026-10-12/ats-date-probe.ts
bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./packages/scraper/publication-freshness.test.ts ./packages/scraper/adversarial-freshness-stress.test.ts ./packages/scraper/greenhouse-posting-evidence.test.ts
```

Observed result: probe exit 0 confirms the recorded defect signature; existing guards passed 107 tests, zero failures, 157 assertions across three files in 6.51 seconds. Logs are retained in the integrity receipt. The eventual baseline native release must additionally prove missing/malformed/stale/future cases produce no public insert or activation, exactly 30 days is accepted, timezone/precision retain meaning, mixed cohorts publish only the qualified dates, and retries/dedup/partial-write receipts preserve their invariants. These checks were not substituted with the parser probe.

The optional RocketAMS shadow read remained held at this audit checkpoint. Historical admission and the parent's current robots receipt are useful but do not alone establish a current request/cadence reservation. The current generic shadow helper defaults to 1 MiB, an eight-second timeout, manual redirects and observe-mode robots with UNKNOWN continuing; it does not itself enforce opt-out, lease or daily request controls. A direct invocation therefore does not satisfy the requested stricter 512 KiB/enforced-robots/current-authority contract. No provider attempt was made.
