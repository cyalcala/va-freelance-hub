# Workable global XML feed feasibility (SP-09)

- **Feed:** `https://www.workable.com/boards/workable.xml`
- **Documented at:** <https://help.workable.com/hc/en-us/articles/4420464031767-Utilizing-the-XML-Job-Feed> (no auth; updated hourly; "more frequent consumption is unnecessary"; job URLs must not be altered — attribution requirement)
- **Fetched at:** 2026-08-29T13:26:00.000Z
- **Decision:** **GITHUB_ACTION_PREPROCESSING**
- **Provenance:** single bounded live probe (one HTTP GET, `curl` with an identifying User-Agent), 2026-08-29. The raw feed body was measured then deleted — this report and `scripts/diagnostics/workable-feasibility.ts`'s `FeedAnalysis` JSON are the retained evidence, never the fetched body itself. Regenerate with `bun scripts/diagnostics/workable-feasibility.ts probe`.

## Measurements

| Metric | Value |
| --- | ---: |
| Byte size | 46,571,520 (44.41 MiB) |
| Root element is `<source>` | true |
| Publisher | Workable |
| Raw `<job>` entries | 11,603 |
| Distinct by `<url>` | 10,000 |
| `<url>` values appearing more than once (within one fetch) | 645 |
| `remote=true` | 2,421 |
| `remote=false` | 9,182 |
| `country=PH` | 337 |
| Avg bytes / job (whole feed ÷ entries) | 4,014 |
| Avg `<description>` bytes | 2,715 |
| Missing documented fields (sampled job) | none |

## Top countries

| country | count |
| --- | ---: |
| US | 4038 |
| SG | 1125 |
| GR | 677 |
| PK | 353 |
| GB | 341 |
| PH | 337 |
| MY | 325 |
| ID | 315 |
| DE | 306 |
| PT | 265 |
| SA | 203 |
| MX | 194 |
| IN | 179 |
| ES | 175 |
| CA | 158 |

## Decision reasoning

- 44.4 MiB exceeds the 5 MiB single-source inline-Worker share of the shared 10-minute-tick budget (which also fetches ~6 other sources and runs AI triage in the same invocation).
- 11603 raw entries exceeds the 2000-item single-source inline-Worker share (normalize + geo-gate + dedupe + triage on this many records in one shared invocation risks CPU-time/memory pressure on the other sources in the same tick).
- A dedicated hourly GitHub Actions job (matching the feed's own hourly update cadence) has no such shared-tick budget: ample RAM/CPU/time to fetch, filter to remote/PH-relevant candidates, normalize, and hand off to D1 independently of the Worker's per-tick budget — the same pattern this repo already uses for Prospector/directory maintenance.

## Notes

- Within-fetch duplicate `<job>` blocks sharing the same `<url>`/`<referencenumber>` were observed (same posting emitted more than once in one feed pull) — a future adapter must dedupe by `url` *within* a single fetch, not only across fetches. This is handled generically by this project's existing URL-based dedup stage, not a special case.
- `<date>` values in the sample span multiple years (evergreen/long-running postings), not just recently-posted jobs — a future adapter's "first seen" must use this project's own `scraped_at` insert instant (as SP-01/SP-02 already established), never the feed's `<date>` field.
- This unit performs zero D1 writes and enables no per-token Workable adapter. It only decides the runtime shape for a future SP-10 implementation unit.
