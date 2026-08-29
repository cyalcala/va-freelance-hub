# SP-12 — Greenhouse minimal-index shadow: day-1 evidence (Grafana Labs)

**Status: code complete, evidence gathered and healthy — the actual `source_registry` compliance/operational write is PENDING explicit owner confirmation.** The harness's own auto-mode safety classifier blocked the write attempt (a real production compliance-state change on a source outside the current exact-six, even though `shadow` is non-publishing by design). This is treated as a genuine stop condition, not something to route around.

## What this unit is

Replaces the project's indefinite blanket Greenhouse pause with **one curated board's** evidence-gated entry into the registry lifecycle, per the Source Perpetuity strategy's already-accepted operating posture for documented public/no-auth posting APIs. The existing `fetchGreenhouse` adapter (`packages/scraper/ats.ts`) already implements the minimal-index content scope required (title, canonical `absolute_url` linkback, a location-summary string — never the full HTML description, no application-submission call). SP-12 did not need a new adapter; `packages/scraper/greenhouse-canary.ts` (this unit's contribution) encodes the compliance decision and the evidence-gated promotion logic, fully tested (11/0) against fixtures.

**The existing five-token blanket pause in `ATS_TOKEN_POLICIES` (`apps/web/src/pages/api/cron/scrape.ts`) is unchanged by this unit** and remains the exact-scoped rollback adapter, per the plan's own criterion.

## Real evidence gathered this session (not fabricated)

A single bounded live SP-07 shadow probe (`runCandidateShadowProbe`, 2 requests: robots.txt + fetch, zero D1 writes — `diagnostic.mutations: 0`) against the real, official, public, no-auth endpoint:

```
GET https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs
```

Result: **`HEALTHY_WITH_RESULTS`** — HTTP 200, 85,014 bytes, 134 items (134 plausible), schema `ok`, robots `allowed`/`wouldBlock=false`. Full raw probe result (metadata only — no job titles/descriptions/URLs, per the external-content-as-evidence-only policy):

```json
{
  "version": "1.0.0",
  "timestamp": "2026-08-29T15:24:10.413Z",
  "sourceId": "greenhouse:grafanalabs",
  "providerId": "greenhouse",
  "displayName": "Grafana Labs",
  "endpoint": { "url": "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs", "isHttps": true, "host": "boards-api.greenhouse.io", "allowedHosts": "boards-api.greenhouse.io,boards.greenhouse.io", "hostValid": true },
  "auth": { "class": "none", "supported": true },
  "visibility": { "filter": "published", "isPublic": true, "ambiguous": false },
  "provenance": { "discoveryProvenance": "{\"provenance\":\"sp-12-curated-board\"}", "evidenceUrl": "https://docs.greenhouse.io/job-board.html", "providerFamily": "greenhouse", "mechanism": "ats_api" },
  "cadence": { "minMinutes": 60, "maxMinutes": 1440, "rateGuidance": "Job Board GET is public/no-auth; no documented per-minute limit — this project's own 60-minute ATS cadence guard applies regardless." },
  "robots": { "checked": true, "verdict": "allowed", "wouldBlock": false, "evidence": "No matching rule for /v1/boards/grafanalabs/jobs; default allow", "fromCache": false },
  "fetch": { "attempted": true, "status": 200, "latencyMs": 212, "bytesReceived": 85014, "contentType": "application/json" },
  "parse": { "attempted": true, "schemaHealth": "ok", "itemCount": 134 },
  "sampleFunnel": { "bytesReceived": 85014, "parsedItems": 134, "plausibleItems": 134, "truncated": false, "budgetExceeded": false },
  "diagnostic": { "outcome": "HEALTHY_WITH_RESULTS", "requestCount": 2, "bytesReceived": 85014, "durationMs": 679, "mutations": 0, "shadowMode": true }
}
```

Feeding this into `buildEvidencePacket` (SP-08) with the Greenhouse provider profile (`buildGreenhouseProviderProfile`: mechanism `ats_api`, auth `none`, visibility `published`, contentScope `minimal`, evidence URL `docs.greenhouse.io/job-board.html`, 180-day evidence lease) produces:

- **`status: review_ready`, `missingEvidence: []`** — every required field present.
- `decidePromotionToShadow` (this unit): **`{ ok: true, reason: "lifecycle guard passed, evidence packet complete (review_ready), shadow probe healthy, robots allowed" }`**.
- `packetHash`: `0d574fddd022d944`.

## What was NOT done

No `provider_profiles`, `source_registry`, or `source_decisions` row was written. `greenhouse:grafanalabs` remains exactly as it was before this session: absent from the registry, and `paused`/`enabled=false` in the hard-coded `ATS_TOKEN_POLICIES` fallback. The exact-six `ROBOTS_ENFORCE_SOURCE_IDS` is untouched. No opportunity was written or could have been — shadow is non-publishing by design (`isPublishable` returns `false` for `operational=shadow` regardless of compliance state), so even the pending write would not have changed what's live on the site.

## Exact write pending confirmation

If explicitly authorized, the pending action is: insert one `provider_profiles` row (`greenhouse`, as built by `buildGreenhouseProviderProfile`), insert one `source_registry` row (`greenhouse:grafanalabs`, `compliance_state=conditional`, `operational_state=candidate` per `buildGreenhouseCandidateRow`), record a `source_decisions` entry for `needs_review→conditional`/`(none)→candidate`, then promote `operational_state` `candidate→shadow` and record a second `source_decisions` entry — both decision rows carrying `evidence_hash = 0d574fddd022d944` (the packet hash above) for traceability. This is fully reversible: delete the two registry rows (or set `opt_out=1`) to roll back; no opportunity data is ever touched.

**Next step:** owner reviews this evidence and either authorizes the write (after which the unit proceeds to a real 7-day shadow observation, then canary), or declines/asks for a different curated board.
