# EX-06 — Lever Postings API Qualification and Target Re-probe

**Unit ID:** EX-06  
**Phase:** QUALIFY  
**Status:** TERMINAL — KEEP (Qualification complete, mechanism validated, candidate retarget classified)  
**G9 Decision:** KEEP  
**Identity:** `lever:lever` (probe-only, no publication, no D1 admission)  
**As-of:** 2026-09-07T12:50:00Z  

---

## 1. Objective and Scope

EX-06 executes the qualification and re-probing of the Lever Postings API under the Apex Expansion Gauntlet (`docs/gauntlet/EXPANSION_LOOP.md` row 42: *“Retarget Lever to a currently-hiring public board; re-probe | Lever mechanism usable”*).

Mode is **QUALIFY only**.
- Exact-six public fetch/publish invariant is strictly preserved.
- Zero mutations to `source_registry`, `provider_profiles`, or `opportunities`.
- Zero Canary promotion.
- Non-publishing validation of mechanism, compliance boundaries, robots directives, and candidate target viability.

---

## 2. Mechanism & Platform Compliance

| Dimension | Specification | Verification Result |
| --- | --- | --- |
| **API Provider** | Lever Postings API | `github.com/lever/postings-api` |
| **Allowed Hosts** | `api.lever.co`, `api.eu.lever.co` | Compliant with SP-11 EU/global explicit origin criterion |
| **Authentication** | None (public GET) | HTTP 200 unauthenticated GET verified |
| **Robots Directives** | `https://api.lever.co/robots.txt` | `User-agent: *`, `Allow: /`, `Crawl-delay: 1` — **Allowed** |
| **Content Scope** | `minimal` | Stores title, canonical `hostedUrl` linkback, `location`/`workplaceType`, and 500-char truncated snippet. Conforms to DB CHECK constraint. |
| **Rate Guidance** | No documented limit | Governed by project 60-minute ATS cadence guard |
| **Adapter** | `packages/scraper/ats.ts` (`fetchLever`) | Verified parser and mapping schema |

---

## 3. Candidate Target Probes & Empirical Findings

### Probe 1: `lever:lever` (Lever's Own Career Board)
- **Endpoint:** `https://api.lever.co/v0/postings/lever?mode=json`
- **HTTP Status:** 200 OK
- **Response Shape:** Valid JSON array (`[]`)
- **Postings Count:** 0
- **Outcome:** `HEALTHY_EMPTY`
- **Assessment:** Honest empirical evidence. Lever currently has 0 active open roles posted on its own vendor board. Schema is valid and endpoint is live, but provides zero eligible job yield.

### Probe 2: `lever:leverdemo` (Official API Documentation Demo Board)
- **Endpoint:** `https://api.lever.co/v0/postings/leverdemo?mode=json`
- **HTTP Status:** 200 OK
- **Response Shape:** Valid JSON array (12 objects)
- **Postings Count:** 12
- **Audit Findings:** Deep inspection of posting content revealed that **all 12 postings are explicitly fictional demonstration listings**:
  > *"Welcome to the Demo Job Listing for Lever! This is a fictional job created solely for demonstration purposes and is not an actual open position. We’ve crafted this listing to showcase the functionality..."*
  - Titles include: *"Approved Professional 3"*, *"Stephanie Test Posting A"*, *"Customer Success Manager AH Test"*.
  - Evaluated against `geoGate`: 9 are ineligible (hybrid/onsite or US/UK/Israel pinned), 3 are unclear.
- **Outcome:** **REJECTED**. Fictional mock jobs must never be admitted into production shadow or canary.

### Probe 3: `lever:vaultoutsourcing` (VA Directory ID 495)
- **Endpoint:** `https://api.lever.co/v0/postings/vaultoutsourcing?mode=json`
- **HTTP Status:** 404 Not Found (`{"ok":false,"error":"Document not found"}`)
- **Outcome:** **REJECTED** (defunct board).

### Probe 4: `lever:elasticpath` (VA Directory ID 277)
- **Endpoint:** `https://api.lever.co/v0/postings/elasticpath?mode=json`
- **HTTP Status:** 404 Not Found (`{"ok":false,"error":"Document not found"}`)
- **Outcome:** **REJECTED** (defunct board).

---

## 4. Qualification Verdict & Lifecycle Decision

**Verdict:** **`RETARGET_REQUIRED`**

1. **Mechanism Qualified:** The Lever Postings API mechanism (`ats_api`, `fetchLever`, robots compliance, provider profile) is fully qualified, compliant, and ready for integration.
2. **Admission Deferred:** Neither `leverdemo` (fictional mock data) nor defunct directory tokens (404) are eligible. `lever:lever` remains `HEALTHY_EMPTY`. 
3. **Guardrail Enforced:** Under AGK rules and Loop invariants, no shadow row is written without an authentic employer identity with real postings and verified provenance.
4. **Action:** Lever platform remains in QUALIFIED standby status. Candidate admission is deferred to a future cycle when an active employer board with verified remote/PH hiring provenance is discovered.

---

## 5. Artifacts and Commits

- Profile & candidate helpers: `packages/scraper/lever-canary.ts` (provider profile `contentScope` aligned to `minimal`, notes updated).
- Tests: `packages/scraper/lever-canary.test.ts` (8/8 passing).
- Evidence: `docs/gauntlet/evidence/EX-06-lever-qualification.md`.
