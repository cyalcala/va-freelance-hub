# Data Lake Operations Guide

**Canonical Reference:** `docs/DATA_LAKE_OPERATIONS.md`
**Last Updated:** 2026-09-26 (Asia/Manila)
**Status:** Live Operational Reference

---

## 1. Architecture

```text
Harvest Wide -> Preserve Permitted Intelligence -> Refine Deep
  -> Replay Continuously -> Publish Pristine
```

| Layer | Turso Table | Purpose |
| :--- | :--- | :--- |
| Raw preserve | `lake_raw_observations` | Immutable fetch evidence (payload sample + SHA-256 `content_hash`, `processed` flag) |
| Refined mart | `lake_candidate_jobs` | Deduped candidates with `fingerprint_hash`, `status` (`RAW`/`QUALIFIED_READY`/`AMBIGUOUS`/`EXCLUDED`/`SYNCED_TO_D1`), `ph_eligibility`, `sighting_count`, `synced_to_d1_at` |
| Provenance | `lake_sightings` | One row per duplicate observation (cross-source re-sightings) |
| Audit | `lake_replay_events` | Immutable record of every historical replay transition |
| Admission | `lake_ats_discovery` | Autonomous ATS tenant probes + `review_status` (`auto_approved`/`shadow_monitor`/`auto_rejected`) |
| Observability | `lake_runs` | One row per CLI run (reserved for scheduled-run bookkeeping) |

## 2. Scripts (`scripts/lake/`)

| Script | `bun run` | What it does |
| :--- | :--- | :--- |
| `init-lake.ts` | (one-time bootstrap) | `ensureLakeSchema()` — creates all 6 tables + hot-path indexes idempotently |
| `ingest-to-lake.ts` | `lake:ingest` | Federated pipeline: Himalayas API, WWR/Remotive/RWFA/Jobicy RSS, RemoteOK API, 5 Breezy agencies — geoGate-refined |
| `remotive-full.ts` | `lake:remotive` / `lake:remotive:priority` | Full Remotive JSON API per-category ingestion with retry backoff |
| `himalayas-sweep.ts` | `lake:himalayas-sweep` | 18 VA-category paginated Himalayas sweep (polite delays, safety caps) |
| `domain-ats-discovery.ts` | `lake:ats-discovery` | Domain → ATS tenant probing (Breezy/Greenhouse/Workable/Lever) + Jev-assisted admission |
| `replay-refinery.ts` | `lake:replay` | Re-evaluates `AMBIGUOUS`/`EXCLUDED` rows through current geoGate (batched, default 2,000) |
| `sync-to-d1.ts` | `lake:sync` | Governed bridge: authorized `QUALIFIED_READY` → D1 `opportunities` upserts (`--dry-run` supported) |
| `lake-state-check.ts` | `lake:state [--json]` | Read-only snapshot: qualified/synced/raw/replay/discovery counts + per-source breakdown |
| `lake-shared.ts` | (library) | Shared fingerprinting, raw-observation storage, sighting bookkeeping |
| `lake.test.ts` | `bun test scripts/lake` | 15 pure unit tests (hash, geoGate, fingerprint, SQL builder, admission, replay) |

## 3. Key Contracts

- **Dedup:** `computeFingerprint(company, title, apply-domain)` — 32-hex, case/punctuation-insensitive. Duplicates append to `lake_sightings` and bump `sighting_count`; they never create a second candidate row (`source_url` is UNIQUE).
- **Junk guard:** `isStorableCandidate` / `isSyncableCandidate` drop rows missing title or URL before any write.
- **Sync authorization:** static base set (exact-six + Himalayas + 5 Breezy agencies) gates the SELECT itself (`source_id IN (...)` before `LIMIT`, so unauthorized head rows can never starve authorized rows). Lake-local `auto_approved` ATS tenants are HELD by default — lake admission is not D1 authority until the ADR-007 Autonomy Cutover Predicate is met; `--allow-auto-approved` includes them explicitly for a reviewed run. Held-row backlog is logged each run (`[Queue]`).
- **Sync safety:** `--dry-run` previews SQL (robust arg parsing: `bun run lake:sync -- --dry-run` defaults to limit 50, never NaN); live runs write one `BEGIN;…COMMIT;` batch file to the OS temp dir (never the repo) via the repo-pinned wrangler, then mark rows `SYNCED_TO_D1` only after success. Live runs log an explicit bypass notice: this bridge does NOT pass through the D1 publication gateway (no registry/lease/ledger/canary-cap/opt-out enforcement) — live runs are for explicitly reviewed cohorts only.
- **Sync honesty:** unknown `posted_at` stays SQL NULL (never `now()` — a sync event is not a posting event; ordering falls back via `coalesce(posted_at, scraped_at)`); `buildSyncSql` throws on non-eligible `ph_eligibility` instead of defaulting to `eligible_verified`; unknown `geo_scope` stays `'unknown'`, never `'worldwide'`.
- **Admission:** Jev 1.13 via the repo-portable `judgeViaJev` client (OpenRouter System One, advisory only). Thresholds: ADMIT ≥ 20% PH + ≥ 3 jobs; REJECT < 5% PH or < 3 jobs; else SHADOW. Jev-offline always falls back to deterministic thresholds — admission never blocks on model availability.
- **Replay:** pure `resolveReplay()` per row; only changed rows get a `lake_replay_events` entry + update.

## 4. Routine Runbook

```bash
bun run scripts/lake/init-lake.ts          # first time / after schema upgrades
bun run lake:state                          # read-only health snapshot
bun run lake:ingest                         # federated harvest + refine
bun run lake:remotive:priority              # VA-priority Remotive categories
bun run lake:himalayas-sweep -- --dry-run   # preview sweep (live without flag)
bun run lake:ats-discovery -- --dry-run --limit=20
bun run lake:replay                         # historical recovery
bun run lake:sync -- --dry-run              # preview D1 batch (live: bun run scripts/lake/sync-to-d1.ts 50 [--allow-auto-approved])
```

## 5. 2026-09-26 Hardening Notes

- `lake-shared.ts` centralizes fingerprint/raw/sighting logic previously copy-pasted across 4 scripts; `ingestRssSource()` collapses 5 near-identical RSS blocks.
- `init-lake.ts` now bootstraps `lake_ats_discovery` (portable plain-column `source_id`), `lake_runs`, and 4 missing hot-path indexes.
- `domain-ats-discovery.ts` no longer shells out to a hardcoded Windows analyst-plugin path; Jev goes through `packages/scraper/jev-client.ts`.
- `sync-to-d1.ts` uses OS temp files, repo-pinned wrangler, transactional batches, NUL-safe escaping, and skips unsyncable rows.
- `replay-refinery.ts` pages with `LIMIT` (default 2,000) instead of loading the whole ambiguous set.
- `lake-state-check.ts` is now a tracked, tested-shape module (`checkLakeState()` / `renderLakeState()`, `--json`) wired as `lake:state`.

## 6. Compliance

Public APIs / RSS / documented endpoints only; minimal discovery metadata; canonical linkback preserved; no auth bypass, paywall, CAPTCHA, robots, or rate-limit circumvention. ATS probing is limited to unauthenticated public JSON endpoints with polite delays.
