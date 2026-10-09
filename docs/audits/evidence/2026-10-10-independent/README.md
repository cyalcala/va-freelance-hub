# Offline audit evidence — 2026-10-10

Audited source: `3ae421645e088f6e08ded9429a5790c8ecbcabfc`.

These fixtures are diagnostic evidence, not production code or a repair. They execute the real configured Remotive RSS/RemoteOK JSON parsers, actual createScrapeHandler, Drizzle, production migrations in a fresh in-memory SQLite database, FTS and the gateway. `fetch` is replaced before route execution with allowlisted synthetic responses; unexpected transport throws. AI is synthetic. No external source/provider/database request is intended or authorized.

The fixtures clear tables only inside `new Database(":memory:")`. Do not replace this binding with any production or persistent database. Use the repository's installed pinned Bun/dependencies and test environment preload. Review fixtures and preload before executing. No package install/deployment is part of reproduction.

## Files

- `audit-fresh-posting-date-native.ts`: original ten-case runner; dates are relative to invocation clock.
- `raw-date-results.json`: exact captured results for two sources × five date scenarios.
- `audit-fresh-posting-date-calendar-native.ts`: separate calendar-rollover runner preserving original evidence.
- `calendar-repair-results.json`: two captured impossible-calendar results.
- `audit-observation.json`: scope, source recovery and independent result checks.
- `SHA256SUMS.json`: local-byte and LF-normalized SHA256 fingerprints plus Git blob IDs. Git may normalize CRLF on another platform; compare the LF-normalized UTF-8 hash or filtered Git blob identity in that case. Fingerprints verify content, not truth or runtime acceptance.

## Reproduce from repository root

The archived fixtures retain their original trailing blank line as part of captured evidence; a whitespace check reports this known archive-only condition. The archived fixtures use imports relative to root `tmp/`. Copy them there exactly; this preserves their original bytes and expected import context. The earlier analysis-only sweep fixture is deliberately excluded because it never produced accepted native evidence.

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
Copy-Item docs/audits/evidence/2026-10-10-independent/audit-fresh-posting-date-native.ts tmp/audit-fresh-posting-date-native.ts
Copy-Item docs/audits/evidence/2026-10-10-independent/audit-fresh-posting-date-calendar-native.ts tmp/audit-fresh-posting-date-calendar-native.ts
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./tmp/audit-fresh-posting-date-native.ts '{"source":"remotive","date":"missing"}'
```

Sources: `remotive`, `remote-ok`. Dates: `missing`, `invalid`, `stale`, `future`, `fresh`. Run each source/date combination in its own process. Demand exactly one `AUDIT_RESULT` marker and inspect its JSON; process exit0 alone is not a test pass. In the captured failing behavior, the route returns500/UNKNOWN while the process succeeds in recording that outcome.

At the audit revision, the eight nonfresh cases have one active eligible row, canonical public query ID1, FTS1 and zero ledger rows. Two fresh controls have HTTP200 and one actual-ID ledger. These are observations of the defect, not desired repaired behavior. A regression test for the repair must invert the invalid-input public-exposure expectation.

```powershell
bun run --no-env-file --preload ./scripts/ci/test-environment.ts ./tmp/audit-fresh-posting-date-calendar-native.ts '{"source":"remotive","date":"calendar-repaired"}'
```

The calendar fixture uses fixed raw `2026-09-31T12:00:00.000Z`; during October10 audit it became October1 and got a success ledger. After the freshness window moves, this exact fixture may instead become stale. To reestablish the same defect later, use an explicitly controlled reference clock or an equivalent invalid recent calendar date in a separately identified fixture; preserve these archived original bytes/results. Do not silently claim identical conditions after changing time/input.

The `visible` field records `publicOpportunityFilters()` query output, not a browser or production observation. Parser fixture source IDs are configured legacy sources with in-memory registry cleared; this tests their existing exact-six fallback path. It does not certify live admission, raw-provider occurrence, provider permission or all configured source paths. Freshness drift in caches and runtime still requires separate acceptance.

## Observed verification limits

Initial tmp-only import setup failure was corrected before date evidence collection and is not counted as behavior RED. No production implementation/test/governance file changed for these reproductions. The audit separately inspected existing metadata-forwarding log fingerprints; full-suite results in the report belong to that prior implementation receipt, not to a new full run here.
