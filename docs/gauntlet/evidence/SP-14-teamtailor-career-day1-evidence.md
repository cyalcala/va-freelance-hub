# SP-14 — Teamtailor public `/jobs.rss` adapter: day-1 evidence (Teamtailor's own careers page)

**Status: code complete, evidence gathered and healthy — the actual `source_registry` compliance/operational write is PENDING explicit owner confirmation**, same shape as SP-11 and SP-12: the harness's own auto-mode safety classifier blocks real production compliance-state writes on sources outside the current exact-six, and that block is respected rather than routed around.

## What this unit built

A genuinely new adapter (Teamtailor was not previously supported anywhere in this project): `packages/scraper/teamtailor.ts` (13/13 tests) — `parseTeamtailorRssXml` (uses `fast-xml-parser`, the same library and config this project's existing `fetchRSSFeed` already uses) normalizes each RSS `<item>` to minimal fields (title, canonical `<link>`, posted date, remote status, a joined location summary across possibly-multiple `<tt:location>` entries, department, role) and **actively discards the `<description>` field entirely** — verified live that it carries the full HTML job description, not a summary, matching the minimal-content precedent set by `fetchGreenhouse`. `hasMoreTeamtailorPages` implements the feed's actual pagination contract (no total-count field exists, unlike SP-13's SmartRecruiters API — the standard "keep paging while a full page comes back" heuristic applies). `packages/scraper/teamtailor-canary.ts` (5/5 tests) provides the provider profile and candidate-row builder, reusing SP-12's shared `decidePromotionToShadow`.

Self-contained, matching SP-11/12/13's shape: does not extend `AtsPlatform` (`ats.ts`) or touch `scrape.ts`'s existing ATS fetch loop.

## Curated target and its provenance

**Career domain `career.teamtailor.com`** — Teamtailor's own careers page. The plan explicitly warns that "custom career domains require durable provider/provenance association, not suffix guessing," so rather than assume any given company's careers domain is Teamtailor-powered, this targets the one domain with the strongest possible provenance: it is the **exact worked example in Teamtailor's own official support documentation** (`support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide`, "go to the main jobs page... add '.rss'. For example, `https://career.teamtailor.com/jobs.rss`") — and it is genuinely Teamtailor's own dogfooded hiring page: real live postings explicitly reference "Working at Teamtailor..." in their descriptions. Same durable-provenance pattern as SP-11 (Lever's own board) and SP-13 (SmartRecruiters' own account).

## Real evidence gathered this session (not fabricated)

Before probing, `career.teamtailor.com/robots.txt` was checked directly: it disallows `/app/`, `/messages/`, `/messenger/`, `/facebook/tab/`, and `/jobs/internal/` — **`/jobs.rss` is not disallowed**.

A single bounded live SP-07 shadow probe (`runCandidateShadowProbe`, 2 requests: robots.txt + fetch, zero D1 writes) against:

```
GET https://career.teamtailor.com/jobs.rss
```

Result: **`HEALTHY_WITH_RESULTS`** — HTTP 200, 84,177 bytes, 13 real open postings (13 plausible), schema `ok`, robots `allowed`/`wouldBlock=false`. This is genuine positive-yield evidence, stronger than SP-11's zero-postings `HEALTHY_EMPTY` result.

Feeding this into `buildEvidencePacket` (SP-08) with the Teamtailor provider profile (mechanism `rss`, auth `none`, visibility `published`, contentScope `minimal`, evidence URL `support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide`, 180-day evidence lease, `allowedHosts` scoped to exactly `career.teamtailor.com`) produces:

- **`status: review_ready`, `missingEvidence: []`** — every required field present.
- `decidePromotionToShadow`: **`{ ok: true, reason: "lifecycle guard passed, evidence packet complete (review_ready), shadow probe healthy, robots allowed" }`**.
- `packetHash`: `1466e478e3137207`.

## What was NOT done

No `provider_profiles`, `source_registry`, or `source_decisions` row was written. `teamtailor:career.teamtailor.com` remains absent from the registry. No opportunity was written or could have been — shadow is non-publishing by design.

## Exact write pending confirmation

If explicitly authorized: insert one `provider_profiles` row (`teamtailor`, as built by `buildTeamtailorProviderProfile`, noting `allowedHosts` is per-career-domain rather than a shared platform host), insert one `source_registry` row (`teamtailor:career.teamtailor.com`, `compliance_state=conditional`, `operational_state=candidate`), record a `source_decisions` entry for `needs_review→conditional`/`(none)→candidate`, then promote `operational_state` `candidate→shadow` and record a second `source_decisions` entry — both carrying `evidence_hash = 1466e478e3137207` for traceability. Fully reversible: delete the two registry rows (or set `opt_out=1`); no opportunity data is ever touched.

**Next step:** owner reviews this evidence (alongside SP-11 and SP-12's) and either authorizes the write or names a different curated Teamtailor career domain.
