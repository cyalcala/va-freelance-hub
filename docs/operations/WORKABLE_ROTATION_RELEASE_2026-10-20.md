> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Workable rotation release — October 20, 2026

Pages production deployment `347d95ae-c9f2-45d5-9cc9-73fb42eafdd2`, created
2026-10-20T11:28:54.036139Z, successfully promotes source
`f34965b0c7bbfb76395259ccce0b60ad4533eee0`. The isolated release is based on
the actual preceding live source `34e3bd1e`; it does not deploy the combined
checkpoint checkout or later database migrations. Source is backed on the
SSM, GitHub and GitLab branch `codex/workable-rotation-release-2026-10-20`.

## Behavior and verification

The release restores two Workable collection slots using current source policy,
the existing full admission validator and durable hourly attempt timing. Intake
is round-robin across selected sources. It accepts actual Workable date-only
`published_on`, preserves original posting dates, and checks the existing
30-day freshness boundary before new exposure. It does not use `created_at` as
posting evidence. Existing-row activation, pending recovery and inline draining
share current-opening, admission and conditional-mutation checks. The separate
Inngest Workable writer defers until its concurrency behavior is accepted.

The unchanged schema-0054 release passed 3,156 tests, zero failures and 320,090
assertions, plus typecheck, build, guardrail, parameter and constitution checks.
Independent review covered current authority, stale/future dates, missing or
ambiguous current openings, onsite/US restrictions, mutation races and caps.
Failed earlier proofs are retained in the release summary; they are not acceptance.

Before upload, 19 reviewed source hashes, all 81 built files, both retained
archives and the dist manifest matched. The final fresh preflight passed all
eight checks with zero D1 writes. An earlier direct GET received 401 because
cached OAuth was stale; the supported D1 CLI refreshed existing credentials and
the subsequent fresh control-plane GET succeeded. No new grant or secret was used.

After upload, canonical source/production-stage checks passed. The compatibility
date, flags, DB/AI bindings and exact five secret name/type pairs matched the
fresh preflight. This does not attest secret values or their functionality.
Schema remains `0054_public_serving_snapshot.sql`; no migration ran. Home,
opportunities, directory, data policy and sitemap each returned 200.

## Coverage and limits

The retained permitted Hunt/Crew observation contains 295 location records,
representing 204 unique opening URLs. Grouped metadata identifies 93 plausible
fresh PH openings, 76 active exact-source/URL matches and 17 misses. These are
candidate facts, not an independently adjudicated recall denominator. Scheduled
collection and each actual recovered D1 ID/public detail require separate receipts.

Offline complete-array tests preserve original and reversed green cases and a
non-PH-first adversarial red case. Synthetic always-positive primary/skeptic AI
can admit uncertain foreign-location metadata through the pre-existing model
lane. This does not establish real AI behavior or a new regression. Repeated
location variants also consume intake/model resources; consolidating authoritative
evidence per opening requires a separate bounded change.

Native Bun 1.3.14 reports trigger-amplified changes; the synthetic D1 adapter
copies those counts. Actual Cloudflare D1 FTS change-count semantics remain
unverified. Existing insert ledger ID arrays remain empty. Query physical job IDs
and public visibility; do not certify new publications by summing those counts.
Cross-writer caps, GCP containment, lifetime first-publication identity,
100–150 verified new jobs/day and MATH-01–13 completion remain unproven.

## Receipts and rollback

Retained proof directory: `docs/evidence/workable-release-2026-10-20/`.
`integrity.json` hashes each retained file. The source TAR SHA256 is
`31bbdfeb708d7cd112b3b9d6d9c5328e35672c40058c6c1cd05731153e4e1d7d`;
the dist ZIP SHA256 is
`a5004a6484299e8d9ee2025734f02224bc85f3879ae798092a2b1e8b0a476165`.
Archives remain in the local isolated proof directory; these hashes and Git
provenance are not a database restoration receipt.

The verified previous production deployment is
`8c649da0-93ef-4458-89ad-715f1367a2ca`, source `34e3bd1e`. Its supported Pages
rollback endpoint remains the documented recovery path if a new regression is
demonstrated. Code rollback does not restore D1 data. No rollback was performed.

Next acceptance: observe the ordinary ten-minute clock, verify six current
admissions and Pineapple's hold, trace all 17 retained misses through actual
fetch/parse/qualification/publication outcomes, and confirm recovered IDs on
public detail pages. Preserve source cadence; no manual duplicate collection.
