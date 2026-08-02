# ADR-003: Job Detail Page Content & Compliance Policy

## Status

Accepted — 2026-08-02

## Context

The project needs individual job detail pages (`/jobs/[id]`) to become
indexable by Google for Jobs via JobPosting JSON-LD. Without them, the site
has zero organic search visibility.

The `description` field is currently stored (up to 1500 chars) but published
**nowhere** — no render path references it. A detail page would be its
first-ever public display.

AGENTS.md states:
- "Store minimal factual metadata needed for discovery."
- "Link users back to the original source to apply."
- "Avoid copying full descriptions unless the source license or terms allow
  it."
- "Pause or mark sources as `needs_review` when terms are unclear or hostile
  to automated collection."
- "Public visibility alone does not make automated collection, storage, and
  republishing automatically compliant."

## Decision

### 1. Source-Aware Display Policy

Each source's `complianceNotes` already records whether its terms permit
redistribution. Detail pages will display description content **only** for
sources whose notes confirm redistribution is allowed with attribution and
linkback. Sources without explicit permission get metadata-only pages.

| Source | complianceStatus | Description Display | Rationale |
| --- | --- | --- | --- |
| We Work Remotely | allowed | Yes — excerpt | RSS page says anyone can use the feed with attribution and linkback |
| Remotive | allowed | Yes — excerpt | Documents public API/RSS use with source mention and linkback |
| Real Work From Anywhere | allowed | Yes — excerpt | Official public RSS, robots allows all, hourly TTL |
| Jobicy (both feeds) | allowed | Yes — excerpt | Feed intended for wider distribution with source credit |
| Remote OK | allowed | Yes — excerpt | Public API legal header requires follow links back + source mention |
| Breezy ATS tokens | needs_review | No — metadata only | Source-specific review not complete |
| Greenhouse ATS tokens | needs_review | No — metadata only | Source-specific review not complete |
| Ashby ATS tokens | needs_review | No — metadata only | Source-specific review not complete |
| All paused sources | paused | No — not displayed | Historical rows from paused sources are not eligible for detail pages |

### 2. Excerpt Length — Source-Aware, Not Flat

The current flat `.slice(0, 1500)` truncation is applied at ingestion time
and cannot be changed for already-stored rows. For detail page display:

- **If description length < 300 chars**: display the full stored text (it is
  already minimal metadata, not a full posting).
- **If description length >= 300 chars**: display up to 500 chars with a
  "..." truncation and a "Read full listing on [source]" link.
- **This is a display-time policy**, not a schema change. The stored data
  remains as-is.

This avoids the council-identified problem: a flat 1500-char slice republishes
short postings whole. The display cap ensures we always show an excerpt, never
the complete posting.

### 3. Mandatory Attribution

Every detail page MUST include:
- Source platform name displayed prominently (e.g., "Listed on We Work
  Remotely").
- A primary CTA button: "Apply on [source platform]" linking to `source_url`
  (already populated, NOT NULL, unique).
- A `rel="nofollow"` on the outbound apply link is NOT used — sources that
  permit redistribution explicitly require follow links (Remote OK, WWR).
- A canonical `<link>` pointing to our own page (we are the canonical for our
  aggregated view; the source is credited, not canonicalized to).

### 4. Geo-Eligibility Scope

Detail pages are only generated for opportunities where:
- `is_active = 1`
- `ph_eligibility IN ('eligible_verified', 'eligible_likely')`

This excludes the 1,137 `unclear` rows (per the 2026-07-31 audit) that are
still being resolved by the geo-eligibility sweep. Those rows are not shown
on the board today and should not be indexed.

If an opportunity's `ph_eligibility` changes to `unclear` or `ineligible`
after a detail page exists, the page returns 404 and is excluded from the
sitemap on the next generation.

### 5. JobPosting JSON-LD Requirements

Google requires these fields for Google for Jobs:
- `title` — from `opportunities.title`
- `description` — the source-aware excerpt (HTML allowed)
- `datePosted` — from `coalesce(posted_at, scraped_at)`
- `hiringOrganization` — from `opportunities.company` (may be null; omit
  field if null, page still works)
- `jobLocation` with `applicantLocationRequirements` — use `TELECOMMUTE` for
  `location_type = 'remote'`, include `"Philippines"` in
  `applicantLocationRequirements` when `ph_eligibility = 'eligible_verified'`

Recommended but not required:
- `employmentType` — map from `opportunities.type`
- `baseSalary` — parse from `pay_range` if structured enough
- `validThrough` — omit rather than guess; let Google infer from crawl
  freshness

### 6. `needs_review` Sources — Path to Display

ATS sources currently marked `needs_review` can be upgraded to display
descriptions after a per-token review following the same pattern used for RSS
sources:
1. Check the ATS platform's public API terms / robots.txt.
2. Verify the endpoint is a documented public career page API (not a
   private/internal endpoint).
3. Record the review in `complianceNotes`.
4. Change `complianceStatus` to `allowed` (or `paused` if terms prohibit).

Until upgraded, `needs_review` sources get metadata-only detail pages: title,
company, category, location, pay range, geo-eligibility badge, and the "Apply
on [source]" button. No description text.

## Consequences

- Detail pages will have varying content richness depending on source
  compliance status. This is intentional and correct.
- The display-time excerpt policy means no schema migration is needed.
- Historical rows from paused sources (Dribbble, OnlineJobs.ph, etc.) will
  not receive detail pages, reducing the indexable surface but keeping it
  compliant.
- The geo-eligibility scope reduces the initial indexable set to ~891 pages
  (not 2,028) but ensures every indexed page is stable content.
- Future source additions automatically inherit this policy: `allowed` gets
  descriptions, `needs_review` gets metadata-only, `paused` gets nothing.
