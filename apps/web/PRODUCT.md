# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Filipino professionals, freelancers and virtual assistants discovering remote
work and employers. The primary task is finding an appropriate listing,
understanding its available evidence and following its original application link.
Confirmed by the owner's October 7 design brief and project AGENTS.md.

## Product Purpose

A public job index and company/VA-agency directory. Help visitors search,
filter, scan, evaluate and apply with little friction. No user accounts,
payments, subscriptions, resumes, auto-apply or invented employment intelligence.

## Positioning

PH eligibility is evaluated by the existing publication system. The frontend
communicates that system's actual recorded states without turning unknown or
likely eligibility into verified hiring. The product links back to sources.

## Operating Context

Astro server-rendered public routes with React components and Tailwind. GET query
URLs retain search, supported filters and pagination. A public serving snapshot
and verified durable fallback keep listings readable during upstream outages.
Apply authority and source-aware description limits remain authoritative.
The owner's October 8 refinement keeps snapshot diagnostics in response headers
and HTML head metadata for maintainers/AI tooling, with no visitor status strip.

## Capabilities and Constraints

Existing routes: home, opportunities, categories, company directory, job details,
data policy, privacy and sitemap. Board filters currently support query, category,
type, source platform, geographic scope and arrival window. Salary, shift and
other data are displayed only when actually provided; this redesign adds no
unsupported filtering, ranking, new profile routes or backend semantics.

## Brand Commitments

VA & Freelance Hub. Owner explicitly preserves the warm neutral, charcoal and
coral/vermilion family while asking for a more premium product experience.
October 8 owner feedback supersedes the earlier restrained visual direction:
thicker watercolor texture, substantial shade and visible company identities.
Pigment & Paper keeps search practical while giving the site warmth and character.
Specific language; no fake proof, testimonials or freshness. Company marks use
recorded websites with exact directory identity matches and initials when unknown.

## Evidence on Hand

Real public records in `src/data/public-lkg.json`, used as clearly dated preview
material without a production DB binding. Accepted public recovery evidence in
`../../docs/incident-2026-10-07-snapshot-refresh-recovery.md`. Counts and source
dates come from data, never from example numbers in the design brief.

## Product Principles

1. Find useful jobs quickly; expose search and real opportunities immediately.
2. Show actual evidence and source attribution; never imply unavailable certainty.
3. Preserve familiar working discovery and application paths.
4. Keep public pages useful without JavaScript or a healthy upstream DB.
5. Frontend design does not dispatch collection, admissions or GCP work.

## Accessibility & Inclusion

WCAG AA target: readable contrast, keyboard operability, labelled controls,
visible focus, reduced motion, native semantics and intentional mobile layouts.
