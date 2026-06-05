# Master Execution Plan

## Objective

Turn VA Freelance Hub into a fast, trustworthy, legally cautious public job
index for Filipino freelancers, while keeping it a strong portfolio artifact for
agentic engineering and technical writing.

The plan fixes the current audit findings without overengineering the product.
The apex version is not a complex SaaS platform; it is a lean public index with
excellent data freshness, clear source policy, observable ingestion, and a
recoverable engineering trail.

## Product Boundary

VA Freelance Hub should do these things well:

- help Filipino freelancers discover relevant remote and VA-friendly work;
- show clear factual metadata, source attribution, freshness, and apply links;
- maintain a practical company directory;
- document how the autonomous ingestion system works;
- make operational health visible enough that silent failures do not linger.

It should not become a general applicant tracking system, paid marketplace,
resume database, or full browser-scraping platform.

## Current Baseline

Accepted audit checkpoint:

- Commit: `74c0416` (`docs: add major audit and agent instructions`)
- GitHub Actions run: `27039365056`
- Local build at audit time: `bun run build` passed
- Production data snapshot: 635 active opportunities, 238 companies, 0 content
  digests
- Known product gap: `/opportunities` returns 404
- Known performance gap: homepage HTML roughly 1.75 MB
- Known data gaps: pay, timezone, application URL, experience, company, posted
  date, and description hash coverage
- Known operations gap: green workflows can still hide source failures

## Execution Rules

1. Ship vertical slices that leave production deployable.
2. Prefer simple fixes before new infrastructure.
3. Document percentage progress after every accepted slice.
4. Keep behavior commits and acceptance-doc commits separate when practical.
5. Treat source-level failures as first-class signals, not console noise.
6. Pause unclear or hostile sources instead of forcing brittle collection.
7. Do not add paid services, auth, payments, accounts, resumes, or auto-apply.
8. Keep all meaningful work backed up in GitHub.

## Compliance And Ethics Strategy

The compliant posture is public job indexing, not unrestricted scraping.

Source rules:

- Use official APIs, RSS feeds, documented feeds, and source-supported public
  endpoints first.
- Respect robots.txt, rate limits, terms of service, and explicit anti-scraping
  language.
- Do not bypass login gates, paywalls, CAPTCHAs, or access controls.
- Do not copy full job descriptions when factual metadata plus a source link is
  enough.
- Attribute every listing and route applications back to the original source.
- Keep opt-out/correction contact paths visible in the data policy.
- Add a source status model: `allowed`, `needs_review`, `paused`,
  `permission_required`, or `deprecated`.

Important principle: public visibility is not the same thing as permission to
automate collection, store records, and republish them. That does not make the
project unethical; it means source policy must be explicit and conservative.

## Roadmap

| Phase | Weight | Status | Goal |
| --- | ---: | --- | --- |
| P0 Recovery docs and methodology | 5% | Accepted | Adopt recovery docs, percent roadmap, ADR, and agent context |
| P1 Product surface and payload | 15% | Not started | Add `/opportunities` and reduce homepage payload |
| P2 Indexing and datetime foundation | 15% | Not started | Add hot-query indexes and normalize dates |
| P3 Ingestion observability | 20% | Not started | Remove silent ATS/write/source failures |
| P4 Source compliance and portfolio | 15% | Not started | Classify sources and pause risky/unproductive ones |
| P5 Data quality and triage | 15% | Not started | Improve missing fields, categories, freshness, and stale policy |
| P6 Reporting and backup hygiene | 10% | Not started | Replace noisy alert commits with rollups and status reports |
| P7 Final acceptance and polish | 5% | Not started | Re-audit, verify production, and align portfolio docs |

## Phase Details

### P0 - Recovery Docs And Methodology (5%)

Acceptance:

- `AGENTS.md` reflects the active Cloudflare/Astro/D1 architecture.
- Recovery docs exist and explain the backup loop.
- Progress percentage rules exist.
- ADR records the methodology and public-job-index compliance decision.
- Documentation is committed, pushed, and accepted by GitHub Actions.

### P1 - Product Surface And Payload (15%)

Recommended slices:

1. Add `/opportunities` as the canonical paginated board.
2. Reduce homepage to a compact latest-opportunities preview.
3. Move full search/filtering behind a paginated API or route-level query.
4. Add smoke checks for `/`, `/opportunities`, `/directory`, and one category.

Acceptance targets:

- `/opportunities` returns 200 in production.
- Homepage no longer serializes hundreds of jobs into initial HTML.
- Initial homepage HTML target: below 750 KB, stretch target below 500 KB.

### P2 - Indexing And Datetime Foundation (15%)

Recommended slices:

1. Add query-aligned D1 indexes:
   - `(is_active, posted_at DESC)`
   - `(category, is_active, posted_at DESC)`
   - `(is_active, last_verified_at ASC)`
2. Normalize datetime writes and comparisons.
3. Add query-plan evidence before and after migration.

Acceptance targets:

- Hot queries avoid temp B-trees where feasible.
- Stale/freshness predicates compare normalized fields.
- Migration is backed up and CI/deploy evidence is recorded.

### P3 - Ingestion Observability (20%)

Recommended slices:

1. Return structured per-source results: `{ ok, count, durationMs, error }`.
2. Stop treating ATS exceptions as successful zero-item fetches.
3. Report actual D1 changes as the primary inserted count.
4. Track failed insert batches and expose them in workflow output.
5. Add thresholds for warning/failure annotations.

Acceptance targets:

- A green workflow cannot hide failed source status.
- Zero items is distinguishable from source failure.
- Insert accounting cannot over-report success.

### P4 - Source Compliance And Portfolio Cleanup (15%)

Recommended slices:

1. Add source config fields for compliance status and collection method.
2. Mark high-risk or unclear sources `needs_review` or `paused`.
3. Prefer RSS/API sources and ATS company pages with clear public access.
4. Document source policy in `data-policy`.
5. Time-box broken source fixes and stop repeated noisy commits.

Acceptance targets:

- Every enabled source has a documented access method and compliance state.
- Sources with explicit anti-automation terms are paused unless permission or an
  allowed API exists.
- Data policy accurately describes collection and opt-out behavior.

### P5 - Data Quality And Triage (15%)

Recommended slices:

1. Backfill or intentionally mark unknown company, pay, experience, timezone,
   application URL, and description hash fields.
2. Improve category triage so `other` is no longer the dominant bucket.
3. Separate "seen recently" from "posted recently".
4. Add source-specific old-job demotion or archive rules.

Acceptance targets:

- Missing-field counts are tracked after each ingestion run.
- Category distribution becomes useful for browsing.
- Old-but-still-seen jobs are labeled or demoted honestly.

### P6 - Reporting And Backup Hygiene (10%)

Recommended slices:

1. Replace per-run alert commits with daily source-health rollups.
2. Add a compact status report with counts, failures, and stale-data metrics.
3. Keep docs checkpoints small and evidence-rich.
4. Ensure local branch and `origin/main` stay synchronized after automation.

Acceptance targets:

- Repeated source failures do not spam Git history.
- Daily operational state can be read without opening every workflow log.

### P7 - Final Acceptance And Polish (5%)

Recommended slices:

1. Re-run the major audit.
2. Verify production routes, payload size, D1 metrics, and source status.
3. Update README and portfolio narrative to match real behavior.
4. Record final acceptance percentage and next optional phase.

Acceptance targets:

- Final audit has no high-priority preventable problems outstanding.
- Public docs, live product, and source policy tell the same story.

## Overengineering Guardrail

The plan is intentionally not "build a platform." It is a sequence of small,
observable repairs:

- first fix user-visible broken routes and payload size;
- then fix database foundations;
- then remove silent ingestion failures;
- then clean source policy and data quality.

Avoid abstractions that do not directly reduce silent errors, stale data,
latency, compliance risk, or recovery cost.
