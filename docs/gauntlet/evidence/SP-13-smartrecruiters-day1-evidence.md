# SP-13 — SmartRecruiters public Posting API adapter: day-1 evidence (NO-GO)

**Status: code complete and tested — but the real evidence gathered this session is a genuine NO-GO, not a pending-confirmation hold.** Unlike SP-11 and SP-12, this is not "evidence-ready, awaiting owner authorization" — the evidence itself, produced by this project's own robots-respecting candidate-evaluation gate working exactly as designed, says this endpoint should not be promoted. There is no pending write to authorize.

## What this unit built

A genuinely new adapter (SmartRecruiters was not previously supported anywhere in this project): `packages/scraper/smartrecruiters.ts` (19/19 tests combined with its canary module) — `parseSmartRecruitersListResponse` (filters to `visibility === "PUBLIC"`, normalizes to minimal fields, tested against two real live-captured postings including a trailing-space title edge case), `hasMoreSmartRecruitersPages` (deterministic offset/limit/totalFound pagination), `deriveSmartRecruitersPostingUrl` (canonical apply URL constructed from `id` + a slugified title — verified to exactly reproduce two real observed URLs, since the list endpoint doesn't include a direct link and fetching it per-posting would be an N+1 pattern this project avoids). `packages/scraper/smartrecruiters-canary.ts` provides the provider profile and candidate-row builder, reusing SP-12's shared `decidePromotionToShadow`.

This is intentionally self-contained: it does not extend the `AtsPlatform` union in `packages/scraper/ats.ts` or touch `scrape.ts`'s existing ATS fetch loop, keeping the same non-invasive, no-D1-write shape as SP-11/SP-12.

## Real evidence gathered this session

The public list endpoint itself works exactly as documented — verified live against the vendor's own dogfooded account (`companyIdentifier=smartrecruiters`, chosen the same way SP-11 chose Lever's own board, after several guessed real-company slugs like `visa`/`mcdonalds`/`bosch`/`ikea` all returned `HTTP 200` with `totalFound:0`, which turned out to be the API's lenient behavior for non-existent or feed-disabled identifiers rather than genuine zero-postings — SmartRecruiters' own account was the first with real, verifiable content: 2 real open postings, `visibility: "PUBLIC"`, correct pagination fields).

**But `api.smartrecruiters.com`'s own `robots.txt` disallows this entirely:**

```
User-agent: LinkedInBot
Allow: /v1/companies/
User-agent: *
Disallow: /
```

Confirmed by direct fetch (`curl https://api.smartrecruiters.com/robots.txt`), not just the probe's own read. SmartRecruiters has deliberately blocked the public Posting API from general crawling and carved out an explicit exception for LinkedIn's bot specifically. This is host-wide — every SmartRecruiters customer's postings are served from this same `api.smartrecruiters.com` origin, so this finding applies universally regardless of which company is chosen; there is no point trying a different `companyIdentifier`.

The real, live SP-07 shadow probe against `https://api.smartrecruiters.com/v1/companies/smartrecruiters/postings?offset=0&limit=100` correctly refused to fetch:

```json
{
  "outcome": "POLICY_BLOCKED",
  "requestCount": 1,
  "robotsVerdict": "disallowed",
  "robotsWouldBlock": true,
  "stopReason": "robots wouldBlock verdict=disallowed evidence=Disallow: / matched /v1/companies/smartrecruiters/postings?offset=0&limit=100"
}
```

`buildEvidencePacket` correctly marks this `status: candidate` (not `review_ready`) with `missingEvidence` naming the robots block explicitly, and `decidePromotionToShadow` correctly returns `ok: false` — **this is the evidence-gating machinery working exactly as designed**, refusing to promote a source its own robots.txt disallows, matching this project's long-standing "public readability is not aggregation authority" posture already applied to Greenhouse and Breezy.

## Conclusion: NO-GO, not pending

Unlike SP-11 (Lever) and SP-12 (Greenhouse), this unit does not end with a write pending owner confirmation — there is no write to withhold, because the evidence itself is negative. SmartRecruiters' public Posting API cannot be used by this project under its current robots-respecting policy. This would only become viable if SmartRecruiters (or a specific represented customer) provided explicit written permission or a documented partner path that overrides the blanket `Disallow: /` — matching the same evidence bar this project has applied to every other permission-tier decision (see SP-17). No such permission is recorded, and none was sought or fabricated by this unit.

## What was NOT done

No `provider_profiles`, `source_registry`, or `source_decisions` row was written — none was ever going to be, given the negative finding. No opportunity was written or could have been. The adapter code is retained because it is correct, real, tested, and immediately reusable if a future unit obtains explicit permission (e.g. via a partner path analogous to SP-17's evidence-pack pattern).
