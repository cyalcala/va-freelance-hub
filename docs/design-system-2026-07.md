# Design System & UX Refresh - July 2026

## Goal

Bring the site to a studio-grade, modern standard — coherent on desktop and
genuinely pleasurable on mobile — using Apple-style design principles
(clarity, deference, depth) over a warm editorial base. Also sharpen the
copywriting and content voice.

## What was wrong (audit)

- **Theme collision.** The Tailwind config defined a light "parchment" palette
  while `globals.css` forced a dark `#0a0a0a` body, the footer used dark
  `zinc` text (near-invisible on the light page), and a dark scrollbar leaked
  onto the light site. Half-dark, half-light — the clearest "not shipped by a
  studio" tell.
- **Double chrome.** Privacy and Data-Policy rendered their own `<Nav>` and
  `<Footer>` *inside* `Layout`, which already provides both — double header
  and double footer.
- **Typography noise.** "Everything is `font-black uppercase tracking-widest`"
  at 9–10px. That is not hierarchy; it is visual static. Overuse of gradient
  italic display text read as generic-AI-startup.
- **Over-decoration.** Competing ambient color blobs, `shadow-lg`/`shadow-xl`
  everywhere, triple-nested `rounded-3xl` with tinted borders, and busy hover
  gimmicks (a sun icon spinning 45°, every card translating on hover).
- **Mobile gaps.** A tall, cluttered stacked header (logo + two taglines + a
  "Made with ❤️ by CY ALCALA" credit), sub-44px touch targets, and no
  thumb-reachable navigation. No safe-area handling, no reduced-motion
  support.
- **Soft copy.** "Premium" claimed rather than shown; the value proposition
  wasn't crisp.

## The system

**Palette (warm editorial).** Token *names* were kept so every existing
utility class inherited the refresh; values were tuned:

- `parchment` #FBFAF7 (warm paper), `surface` #FFFFFF, `sunken` #F4F1EA
- `ink` #17140F (warm near-black), hairline borders via `ink` at 6–9% opacity
- `accent` #DC5A34 (refined terracotta), `accent-hover` #C24A28,
  `accent-soft` #FBEDE6

**Elevation.** One calm shadow scale — `shadow-card` (hairline lift),
`shadow-soft`, `shadow-lift` — replacing scattered `shadow-lg/xl`.

**Radius.** Settled on a small set (xl/2xl/3xl re-tuned) used consistently.

**Typography.** Outfit throughout, but with restraint: body line-height 1.6,
tightened display tracking, and `uppercase tracking-overline` reserved for
small overlines/labels only. Weight range narrowed (semibold/bold/extrabold).
`tabular-nums` on all counts/stats.

**Motion.** Purposeful and subtle (200–300ms `ease-out-soft`), gimmick hovers
removed, and a global `prefers-reduced-motion` guard added.

## Layout & mobile

- **Header:** slim, single-row glass header on all sizes. Clean `RemotePH`
  wordmark lockup. Desktop: Jobs / Agencies + a primary "Browse jobs" pill,
  with active-state styling from the current path. The maker credit moved to
  the footer where it belongs.
- **Mobile bottom tab bar (new):** fixed, glass, `env(safe-area-inset-bottom)`
  aware, thumb-reachable Home / Jobs / Agencies with active states — the
  Apple-style affordance the site lacked. Main content gets bottom clearance
  so nothing hides behind it.
- **Depth:** the two competing blur blobs replaced by one restrained warm
  radial.
- **Cards:** `surface` fill, hairline border, one soft shadow, a small muted
  category/niche color *dot* instead of full tinted borders, calmer job/agency
  rows with larger tap targets and reduced badge noise.
- **Accessibility:** visible `:focus-visible` ring, `viewport-fit=cover`,
  `theme-color`, decorative favicons marked `aria-hidden`.

## Copy

- Brand shown as **RemotePH** (matches the domain; crisper than the long
  "VA Freelance Hub", which remains in history/SEO continuity).
- Hero: **"Remote work that hires Filipino talent."** with a specific,
  confident subhead ("…companies that actually hire in the Philippines.
  Refreshed automatically — free, forever.").
- Section, page, empty-state, and meta copy rewritten across home,
  opportunities, directory, and category pages for a warmer, more specific
  voice; stat labels clarified ("Open roles", "Vetted companies").

## Files touched

`tailwind.config.mjs`, `src/styles/globals.css`, `src/layouts/Layout.astro`,
`src/components/footer.tsx`, `src/components/OpportunitySearch.tsx`,
`src/components/opportunity-card.tsx`, `src/components/DirectorySearch.tsx`,
`src/pages/index.astro`, `src/pages/opportunities.astro`,
`src/pages/directory.astro`, `src/pages/categories/[category].astro`,
`src/pages/privacy.astro`, `src/pages/data-policy.astro`.

## Verification

- `bun run --cwd apps/web build` passed.
- Post-deploy: live structural + copy verification via the browser tools;
  homepage confirmed rendering the new hero, all category cards, and the
  refreshed chrome.
