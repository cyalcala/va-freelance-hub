# Funnel Measurement — 2026-09-26 (Manila-day qualified publication)

**Mode:** MEASURE (read-only). **Start SHA:** `d36069b` (clean, == origin/main).
**Method:** repo-pinned wrangler, `DB --remote --env production`, SELECT-only.
Every query returned `changed_db=false`, `rows_written=0`.
**Limitation:** first-stored proxy (`scraped_at`) over currently-active rows only —
pruned/deactivated history is invisible (survivorship bias understates past days).
Reactivations/backlog unlocks are NOT separated by this proxy (see 09-24 note).

## 1. Qualified new per complete Manila day (proxy)

| Manila day | qualified_new | note |
| --- | ---: | --- |
| 2026-09-11 | 12 | |
| 2026-09-12 | 13 | |
| 2026-09-13 | 6 | |
| 2026-09-14 | 4 | |
| 2026-09-15 | 25 | |
| 2026-09-16 | 15 | |
| 2026-09-17 | 18 | |
| 2026-09-18 | 14 | |
| 2026-09-19 | 15 | |
| 2026-09-20 | 5 | |
| 2026-09-21 | 7 | |
| 2026-09-22 | 13 | |
| 2026-09-23 | 2 | |
| 2026-09-24 | 152 | BACKLOG: 121/152 from the 5 Breezy graduation bulk (Sourcefit 45, 20Four7VA 42, Remote-Craft 14, Yokly 11, VVA 9) — import, not recurring flow |
| 2026-09-25 | 27 | |
| 2026-09-26 | 14 | PARTIAL day (measured ~01:55Z = 09:55 Manila) |

Ex-spike complete days: 14 days, 176 total, **mean 12.6/day, min 2, max 27, 0 days ≥ 100, 0 missing days**.
Rolling 7d qualified new: 233 incl. graduation bulk → recurring ≈ 16/day.

## 2. Stock and board

Active eligible **901** (681 `eligible_likely` + 220 `eligible_verified`), **0 active unclear**,
0 active ineligible. Public board `https://remotejobs-ph.pages.dev/` HTTP 200.

## 3. Per-source 7d qualified new (concentration)

WWR 51, Sourcefit 48, 20Four7VA 45, RWFA 33, RemoteOK 16, Remote-Craft 14,
Yokly 11, VVA 9, Jobicy-S 4, Himalayas 2, Remotive/Jobicy-A/Ghost/Time-Etc 0.
Top-3 share 144/233 = **62%**. Zero 7d yield from 2 exact-six feeds.

## 4. Fetch layer (7d, `source_fetch_events`)

680 ticks/source (≈10-min cadence, healthy), near-zero failed ticks.
Items→qualified conversion is tiny everywhere (WWR 56,307→51; Remotive 13,104→0;
RWFA 5,450→33) — low turnover + strict gates, NOT a fetch outage.

## 5. Remotive diagnostic (bounded, read-only, 1 polite fetch of allowed feed)

Live fetch 18 items → geoGate: 10/18 eligible (6 worldwide/likely + 4 APAC/verified),
8 ineligible (US/EU/region locks, 1 non-English). D1 holds 100 Remotive rows ever;
`MAX(last_seen_in_feed_at)` = 2026-09-25 (yesterday) → dedup re-sighting works,
feed is stable ~19 items/tick, eligible items already captured.
**Finding: MARKET (no turnover), not pipeline loss. No fix action.**

## 6. Shadow pipeline readiness

- `greenhouse:remotecom`: 15 qualifying dates, 14d span, but the 2026-09-12T18:20:56Z
  `UNREACHABLE` singleton is STILL inside the rolling 14d window at 01:55Z.
  Re-evaluable only after ~2026-09-26T18:20Z. **NOT promotable this session — stopped at the gate.**
- `greenhouse:wikimedia`: re-evaluable ~2026-09-29.
- Workable x7: fresh all-agency `RATE_LIMITED` bursts 2026-09-25T13Z + 18Z (16 obs)
  PLUS 2 on 09-24T20Z — AFTER the 20:15Z pacing fix. This contradicts the
  "100% HEALTHY_WITH_RESULTS since 2026-09-24T20:15Z" claim in prior batons;
  the 7-day error-free window keeps sliding. Needs a bounded pacing diagnosis,
  not a promotion.
- Canary governance healthy: GitLab/Grafana/Nearform hold 0 active rows
  (caps + dedup working, zero leakage).

## 7. Impossible-target report (§10)

```text
TARGET: 100/day floor
MEASURED SUSTAINABLE RATE: ~13/day (12.6/d ex-spike Manila mean; ~16/d ex-bulk rolling)
GAP: ~87/day
CONFIDENCE: medium (first-stored active-only proxy; survivorship bias; one 15-day window)
EVIDENCE WINDOW: 2026-09-11 to 2026-09-26 (Manila days; 09-26 partial)
LARGEST RECOVERABLE LOSS: none demonstrated today — Remotive falsified as market; unclear-7d backlog only 99 rows (mostly legacy shadow-source hygiene)
LARGEST PERMISSIBLE EXPANSION: shadow maturation pipeline (10 shadows; remotecom due ~18:20Z today, wikimedia ~Sept 29, workable blocked) + reserve/canary yield
HONEST CEILING FROM CURRENT SOURCES: ~15-30/day recurring (exact-six + 5 Breezy actives at current turnover)
RECOMMENDATION: re-evaluate remotecom after 2026-09-26T18:20Z; open a bounded Workable-pacing diagnostic
```

## 8. Autonomy

L1 ADVISE both domains, unchanged. No promotion predicate evidence gathered.
No autonomous decisions taken this unit (all reads human-directed; Jev not invoked).
