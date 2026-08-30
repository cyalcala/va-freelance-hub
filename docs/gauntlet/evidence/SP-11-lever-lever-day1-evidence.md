# SP-11 — Lever public Postings API canary: day-1 evidence (Lever's own careers board)

**Status: code complete, evidence gathered and healthy — the actual `source_registry` compliance/operational write is PENDING explicit owner confirmation**, following the exact same pattern established by SP-12: the harness's own auto-mode safety classifier blocks real production compliance-state writes on sources outside the current exact-six, and that block is respected rather than routed around.

## What this unit is

Uses the official public Postings API (`github.com/lever/postings-api`) for one curated employer, minimal metadata, canonical linkback, published jobs only — per SP-11's plan text. The existing `fetchLever` adapter (`packages/scraper/ats.ts`) already implements this: canonical `hostedUrl` linkback, `categories.location`/`workplaceType`, a title, and a **500-character-truncated** plain-text description snippet (not the full posting). `packages/scraper/lever-canary.ts` (this unit's contribution, 8/9 tests — see below) encodes the provider profile and candidate-row construction; the actual promotion decision now lives in a new shared, provider-agnostic module, `packages/scraper/source-promotion.ts` (11/11 tests), extracted from SP-12's original Greenhouse-only `decidePromotionToShadow` once a second provider needed the identical logic. SP-12's already-merged/deployed code was left untouched.

## Curated target and its provenance

**Token `lever`, Lever's own careers page** (`jobs.lever.co/lever` / `api.lever.co/v0/postings/lever?mode=json`). Chosen after several well-known companies frequently cited by third-party "who uses Lever" aggregators (Netflix, Figma, Reddit, Shopify, Klarna, and a dozen others) all returned HTTP 404 on the live public API — those aggregator lists are stale or use non-obvious tokens. Rather than keep guessing, the vendor's own dogfooded careers page was chosen: **the single most unambiguous, verifiable provenance possible** — Lever running its own product on itself. This satisfies SP-11's "public site/token provenance is exact" criterion better than a guessed third-party token would.

## Real evidence gathered this session (not fabricated)

A single bounded live SP-07 shadow probe (`runCandidateShadowProbe`, 2 requests: robots.txt + fetch, zero D1 writes — `diagnostic.mutations: 0`) against the real, official, public, no-auth endpoint:

```
GET https://api.lever.co/v0/postings/lever?mode=json
```

Result: **`HEALTHY_EMPTY`** — HTTP 200, a valid (empty) JSON array, robots `allowed`/`wouldBlock=false`. Lever currently has zero open postings on its own board. This is honest, real evidence, not a failure: `HEALTHY_EMPTY` is one of the two accepted outcomes in `decidePromotionToShadow` (alongside `HEALTHY_WITH_RESULTS`) — a working, reachable, correctly-parsing feed that happens to have nothing open right now is a legitimate probe result, and `buildEvidencePacket` correctly flags it separately as `unresolvedQuestions: ["shadow healthy but empty — zero eligible jobs, economics review required"]` for the later canary-yield decision, without blocking the packet's `review_ready` status.

Feeding this into `buildEvidencePacket` (SP-08) with the Lever provider profile (`buildLeverProviderProfile`: mechanism `ats_api`, auth `none`, visibility `published`, contentScope `minimal_with_truncated_summary`, evidence URL `github.com/lever/postings-api`, 180-day evidence lease, `allowedHosts` covering both the global `api.lever.co` and EU `api.eu.lever.co` origins) produces:

- **`status: review_ready`, `missingEvidence: []`** — every required field present.
- `decidePromotionToShadow`: **`{ ok: true, reason: "lifecycle guard passed, evidence packet complete (review_ready), shadow probe healthy, robots allowed" }`**.
- `packetHash`: `40d7b6cbfe658129`.

## What was NOT done

No `provider_profiles`, `source_registry`, or `source_decisions` row was written. `lever:lever` remains absent from the registry; no Lever source of any kind was ever previously configured in this project (unlike Greenhouse, which had five pre-existing paused tokens). No opportunity was written or could have been — shadow is non-publishing by design (`isPublishable` returns `false` for `operational=shadow` regardless of compliance state).

## Zero-yield caveat for the later canary step

Because the curated board currently has zero open postings, this specific board cannot itself demonstrate the "positive unique eligible yield" that SP-11's shadow acceptance criterion calls for. If/when the pending write is authorized, either (a) proceed with `lever:lever` and accept that shadow will show real request/robots/schema health but zero yield until Lever itself has open roles again, or (b) the owner may prefer a different curated Lever employer with currently-open roles once one is identified with equally exact provenance. Both are legitimate; this evidence doc does not choose between them.

## Exact write pending confirmation

If explicitly authorized: insert one `provider_profiles` row (`lever`, as built by `buildLeverProviderProfile`), insert one `source_registry` row (`lever:lever`, `compliance_state=conditional`, `operational_state=candidate` per `buildLeverCandidateRow`), record a `source_decisions` entry for `needs_review→conditional`/`(none)→candidate`, then promote `operational_state` `candidate→shadow` and record a second `source_decisions` entry — both carrying `evidence_hash = 40d7b6cbfe658129` for traceability. Fully reversible: delete the two registry rows (or set `opt_out=1`); no opportunity data is ever touched.

**Next step:** owner reviews this evidence (alongside SP-12's) and either authorizes the write or names a different curated Lever employer.
