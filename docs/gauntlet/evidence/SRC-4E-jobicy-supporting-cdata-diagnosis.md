# SRC-4E — Jobicy Supporting-Feed "CDATA is not closed" Diagnosis

Date: 2026-08-23 (run 4)
Executor: repository executor
Unit contract: `docs/gauntlet/IMPLEMENTATION_UNITS.md` § SRC-4E (committed
PLANNED at `6f5a630` before execution)
Scope honored: read-only D1 queries only; zero network requests to jobicy.com;
zero parser/code changes; reproduction used synthetic content only.

## Verdict

**ROOT CAUSE CONFIRMED — diagnostic-tool artifact, not a feed defect.**

The Source Doctor's static-source probe truncates every fetched RSS body to
`MAX_BODY_BYTES = 256 * 1024` characters before parsing
(`packages/scraper/source-doctor.ts:97`, `:230`:

```ts
const MAX_BODY_BYTES = 256 * 1024;
...
body = text.slice(0, MAX_BODY_BYTES);
```

). Any feed larger than 256 KiB is cut mid-document; when the cut lands inside a
`<description><![CDATA[ … ]]>` section the document ends with an open CDATA and
`fast-xml-parser` 5.10.1 throws exactly `"CDATA is not closed."`, which the
Doctor maps to `SCHEMA_BROKEN`.

The ingestion path has no truncation: `rss.ts` parses the full
`res.text()` delivered by `conditionalFetchText` (`packages/scraper/
conditional.ts:80`). The two Jobicy feeds differ only in size — admin-support
yields ~6 items, supporting yields 40 items with full HTML descriptions — so
only the larger supporting feed crossed the cap in the Doctor probe.

Consequence for prior records: the 2026-08-22T22:18Z interim observation
("jobicy-supporting-apac failed XML parse → SCHEMA_BROKEN") must be read as a
measurement artifact of the Doctor probe. It remains valid only as evidence
that the origin returned HTTP 200 (no 429) at that moment. The feed itself was
and is healthy on the ingestion path.

## Evidence 1 — durable event history (production D1, read-only)

Command shape (established Medic/DATA-03 pattern):
`bunx wrangler d1 execute DB --remote --env production --json --command "<SQL>`
from `apps/web`. Every query returned `changed_db=false`, `rows_written=0`.

Q1 — distinct error strings, all Jobicy events ever (113,342 rows scanned):

| source_id | error | n | first | last |
| --- | --- | --- | --- | --- |
| jobicy-admin-support-apac | `[rss] Failed to fetch Jobicy Admin Support APAC: HTTP 429` | 8 | 2026-08-09T16:00:41Z | 2026-08-22T20:00:40Z |
| jobicy-supporting-apac | `[rss] Failed to fetch Jobicy Customer Support APAC: HTTP 429` | 8 | 2026-08-19T06:31:00Z | 2026-08-23T00:00:39Z |

**Zero parse errors of any kind have ever been recorded by the ingestion path**
(`SELECT COUNT(*) FROM source_fetch_events WHERE error LIKE '%CDATA%'` → 0,
full-table scan).

Q2 — daily attempt/skip/failure split since 2026-08-16: failures are exclusively
HTTP 429 pairs hitting both feeds at identical timestamps; no day shows any
parse-class failure for either feed.

Q3 — recent successful ingest attempts (skipped=0, ok=1):

| timestamp | source | items | duration_ms |
| --- | --- | --- | --- |
| 2026-08-22T23:50:39Z | admin-support | 6 | 406 |
| 2026-08-22T22:40:39Z | admin-support | 6 | 30 |
| 2026-08-22T21:40:39Z | admin-support | 6 | 426 |
| 2026-08-22T21:10:39Z | supporting | 40 | 39 |
| 2026-08-22T20:10:39Z | supporting | 40 | 907 |
| 2026-08-22T18:50:39Z | both | 40 / 6 | — |

The supporting feed parsed 40 real items at 21:10:39Z — 68 minutes BEFORE the
Doctor probe failed at ~22:18Z. After 21:10Z its only non-skip event was an
HTTP 429 at 00:00:39Z (fetch-level failure, no parse attempted). The ingestion
path therefore never observed the CDATA failure, before or since.

## Evidence 2 — code-path localization

| Path | Fetch | Body handed to parser | Parser options |
| --- | --- | --- | --- |
| Ingestion (`rss.ts` → `conditional.ts`) | conditional GET, full `res.text()` | full body, no slicing | `ignoreAttributes:false, attributeNamePrefix:"@_", processEntities:false, htmlEntities:true` |
| Doctor static probe (`source-doctor.ts`) | plain GET + 10 s abort | **`text.slice(0, 262144)`** | identical options (`source-doctor.ts:327-332`) |

Parser configuration is byte-identical between the two paths — config is ruled
out. The ATS/JSON Doctor probe (`source-doctor.ts:475-477`) records bytes but
does NOT slice; the truncation defect is confined to the static-source probe.

## Evidence 3 — minimal reproduction matrix (synthetic content, local)

Scratch script (`.tmp-src4e-repro.ts`, deleted after capture, never committed;
synthetic filler text only) run with the repo's installed parser via Bun:

```text
--- 6-item doc length=202519 (limit=262144)
  full   : OK items=6
  sliced : OK items=6
--- 8-item doc length=269989 (limit=262144)
  full   : OK items=8
  sliced : THREW "CDATA is not closed."
--- 10-item doc length=337459 (limit=262144)
  full   : OK items=10
  sliced : THREW "CDATA is not closed."
--- 12-item doc length=404935 (limit=262144)
  full   : OK items=12
  sliced : THREW "CDATA is not closed."
--- error-class matrix
unclosed-at-eof:   THREW "CDATA is not closed."
bare-close-inside: OK items=1
nested-open:       OK items=1
```

Reading: with this parser version, this error string occurs only when the
document ends while a CDATA section is open. Bare `]]>` inside CDATA and nested
`<![CDATA[` openings do NOT produce it. The 6-item/202 KB case (mirroring the
admin feed) parses fine even sliced; every ≥269 KB case fails exactly as
observed once sliced.

## Hypotheses vs findings

| # | Hypothesis | Outcome |
| --- | --- | --- |
| a | bare `]]>` inside embedded HTML breaks CDATA | eliminated (parses OK in matrix; zero such errors ever recorded) |
| b | truncated response body cutting mid-CDATA | **CONFIRMED mechanism** — but truncation is self-inflicted by the Doctor's 256 KiB slice, not network truncation (probe reported HTTP 200 with full-body byte count before slicing) |
| c | parser-version-specific multiple/nested CDATA handling | eliminated for this error string (matrix) |

## Impact assessment

- Production ingestion: unaffected. The supporting APAC feed has been ingesting
  normally (40 items per successful fetch) throughout.
- Source health semantics: Doctor `SCHEMA_BROKEN` currently means "could not
  parse (possibly because we truncated it)" — misleading for large feeds.
- SRC-4D acceptance interpretation: discount the SCHEMA_BROKEN half of the
  2026-08-22T22:18Z observation; keep the HTTP-200-no-429 half as favorable
  interim signal. The D1 post-rollup gate (on/after 2026-08-24T19:00Z) is
  unchanged and unaffected.

## Bounded fix proposal (SEPARATE future unit — NOT implemented here)

Scope suggestion for a small follow-up unit (name: e.g., REL-11 Doctor RSS
truncation fix):

1. Preferred: pass the full fetched text to `parseRSSFeed`; keep the
   `bytesReceived` accounting as-is. Memory exposure is already bounded by the
   10 s abort and current feed sizes.
2. If a cap must remain for memory safety: detect `text.length >
   MAX_BODY_BYTES`, skip parsing, and emit an explicit
   `DEGRADED_ANOMALOUS`/`body-truncated` probe detail instead of parsing a
   partial document (never report SCHEMA_BROKEN from a self-truncated body).
3. Add one regression test: a >256 KiB synthetic CDATA feed must yield
   HEALTHY_WITH_RESULTS (or explicit truncated outcome), never SCHEMA_BROKEN.
4. Optional bounded re-probe of jobicy.com AFTER the SRC-4D post-rollup is
   recorded, to confirm HEALTHY_WITH_RESULTS live.

## Verification record (this unit)

- All remote queries: `changed_db=false`, `rows_written=0` (per-query meta
  captured above; Q1 scanned 113,342 rows, Q3 3,356 rows).
- Zero HTTP requests issued to jobicy.com during this unit (SRC-4D window
  respected).
- No repository code changed; scratch repro deleted after evidence capture.
- Contract scope (reproduce / localize / reduce) fully executed; fix deferred
  to its own future unit per contract.
