# SP-15 — Recruitee company XML feed adapter: day-1 evidence (My Jewellery)

**Status: code complete, evidence gathered and healthy — the actual `source_registry` compliance/operational write is PENDING explicit owner confirmation**, same shape as SP-11, SP-12, and SP-14: the harness's own auto-mode safety classifier blocks real production compliance-state writes on sources outside the current exact-six, and that block is respected rather than routed around.

## What this unit built

A genuinely new adapter (Recruitee was not previously supported anywhere in this project): `packages/scraper/recruitee.ts` (8/8 tests) targets the **XML feed** (`/api/feeds/offers.xml`), not Recruitee's separate token-gated Careers Site API, per the plan's explicit direction. `parseRecruiteeXml` normalizes each `<offer>` to minimal fields (title, canonical `careers_url`, posted date, remote/hybrid/on-site flags, a joined multi-location summary, department, employment type) and **actively excludes** `<description>`/`<requirements>`/`<highlight>` (verified live: all three carry full HTML content) and `<mailbox_email>` (a job-specific application-routing address, out of scope). `packages/scraper/recruitee-canary.ts` (7/7 tests, including two explicit opt-out demonstrations per the plan's specific emphasis for this unit) provides the per-company provider profile and candidate-row builder, reusing SP-12's shared `decidePromotionToShadow`.

Self-contained, matching every adapter built this session: does not touch `ats.ts`'s `AtsPlatform` union or `scrape.ts`'s existing ATS fetch loop.

**A real HTML-entity-decoding bug was caught by testing against genuine captured data**: this project's shared XML-parsing convention (`fast-xml-parser` with `processEntities:false`, the same config `fetchRSSFeed` already uses) leaves numeric character references like `&#39;` undecoded. The initial adapter didn't apply `decodeHtmlEntities` (from `packages/scraper/text.ts`, this project's existing helper) to extracted text, and a real captured city name (`&#39;s-Hertogenbosch`) exposed it immediately as a failing test. Fixed by applying `decodeHtmlEntities` to every text field the adapter extracts.

## A second, more consequential finding: a real gap in the shared shadow prober

The curated target (`myjewellery`, a real named Recruitee customer verified via TheirStack's public customer list, then confirmed live with 91 real open postings) initially produced `HEALTHY_EMPTY` (0 items) from the live SP-07 shadow probe — **despite the feed genuinely containing 91 real, well-formed postings**, independently confirmed via direct `curl` and this unit's own tested `parseRecruiteeXml`. Root cause: SP-07's generic shadow prober (`packages/scraper/candidate-shadow.ts`, `parseRssBodyCount`) only recognized the standard RSS (`<rss><channel><item>`) and Atom (`<feed><entry>`) root shapes — Recruitee's proprietary `<offers><offer>...</offer></offers>` schema fell outside what it recognized, and it silently reported zero items rather than erroring.

This was **not** a real zero-yield finding (unlike SP-11's genuine `HEALTHY_EMPTY` for Lever's own board) and **not** a robots-driven NO-GO (unlike SP-13's SmartRecruiters finding) — it was a gap in shared, provider-agnostic tooling. Fixed with a small, additive change to `parseRssBodyCount`: it now also recognizes `parsed?.offers?.offer` as a valid items array, alongside the existing RSS/Atom shapes, and accepts `careers_url` as a valid identifying-link field (alongside `link`/`id`/`guid`). This is purely additive — every existing RSS/Atom-shaped source continues to parse identically (confirmed: the full 959-test suite plus a new dedicated test in `candidate-shadow.test.ts` covering this exact shape, all pass with zero regressions). Re-running the live probe after the fix produced the correct result below.

## Curated target and its provenance

**Company subdomain `myjewellery`** (My Jewellery, a real Dutch fashion/e-commerce retailer). Identified via TheirStack's public "Companies Using Recruitee" listing (a real named customer, not a guessed slug), then independently confirmed live: the subdomain resolves, returns real XML with real job postings, and `<company_name>My Jewellery</company_name>` appears throughout the feed itself. Several other real named companies from the same listing (`duravermeer`, `cordaan`, `dckgroup`, `reinaerde`) also resolved live with real postings, confirming the discovery method (not this one company being a fluke); `myjewellery` was chosen as the smallest/most manageable real example. The vendor's own account (`tellent.recruitee.com`) was checked first, per this session's established dogfooding pattern, but currently has zero open postings — real, valid `HEALTHY_EMPTY` evidence, just less useful than a positive-yield example for this unit's fixtures.

## Real evidence gathered this session (not fabricated)

`myjewellery.recruitee.com/robots.txt` was checked directly first: only `/v/` is disallowed — `/api/feeds/offers.xml` is not.

A single bounded live SP-07 shadow probe (`runCandidateShadowProbe`, 2 requests: robots.txt + fetch, zero D1 writes) against:

```
GET https://myjewellery.recruitee.com/api/feeds/offers.xml
```

Result (after the prober fix above): **`HEALTHY_WITH_RESULTS`** — HTTP 200, 515,711 bytes, **91 real open postings** (91 plausible), schema `ok`, robots `allowed`/`wouldBlock=false`.

Feeding this into `buildEvidencePacket` (SP-08) with the Recruitee provider profile (mechanism `xml_feed`, auth `none`, visibility `published`, contentScope `minimal`, evidence URL `docs.recruitee.com/docs/feed`, 180-day evidence lease, `allowedHosts` scoped to exactly `myjewellery.recruitee.com`) produces:

- **`status: review_ready`, `missingEvidence: []`** — every required field present.
- `decidePromotionToShadow`: **`{ ok: true, reason: "lifecycle guard passed, evidence packet complete (review_ready), shadow probe healthy, robots allowed" }`**.
- `packetHash`: `bdd7becb5e570f93`.

## Opt-out/do-not-reingest (SP-15's specific plan emphasis)

The shared `decidePromotionToShadow` (`packages/scraper/source-promotion.ts`) already gates every promotion on `optOut` — this was implicitly exercised by every adapter built this session, but `recruitee-canary.test.ts` adds two explicit tests demonstrating it for this unit: an opted-out source is refused promotion even with an otherwise-perfect `review_ready` packet and healthy shadow, and this holds regardless of compliance state (`allowed` or `conditional`). No new opt-out mechanism was built — this satisfies the criterion by using and demonstrating the existing one.

## What was NOT done

No `provider_profiles`, `source_registry`, or `source_decisions` row was written. `recruitee:myjewellery` remains absent from the registry. No opportunity was written or could have been — shadow is non-publishing by design.

## Exact write pending confirmation

If explicitly authorized: insert one `provider_profiles` row (`recruitee`, as built by `buildRecruiteeProviderProfile`, noting `allowedHosts` is per-company like Teamtailor's per-career-domain pattern), insert one `source_registry` row (`recruitee:myjewellery`, `compliance_state=conditional`, `operational_state=candidate`), record a `source_decisions` entry for `needs_review→conditional`/`(none)→candidate`, then promote `operational_state` `candidate→shadow` and record a second `source_decisions` entry — both carrying `evidence_hash = bdd7becb5e570f93` for traceability. Fully reversible: delete the two registry rows (or set `opt_out=1`); no opportunity data is ever touched.

**Next step:** owner reviews this evidence (alongside SP-11, SP-12, and SP-14's) and either authorizes the write or names a different curated Recruitee company.
