# VA Freelance Hub — Project Context

## What This Is
A personal portfolio project and public resource site for Filipino freelancers.
Self-updating aggregator of VA job opportunities, a curated VA-friendly company
directory, and a daily AI digest of actionable content from freelance influencers.
Built to demonstrate agentic engineering skills.

## Owner
Filipino freelance technical writer + agentic engineer (github: cyalcala).
GitHub repo is public — this is a living portfolio piece.
Footer should credit the builder and link to source.

## Core Stack
- Runtime: Bun
- Frontend: Next.js 14 App Router
- Styling: Tailwind CSS + shadcn/ui
- Database: Turso (LibSQL/SQLite) via Drizzle ORM
- Scheduled jobs: Trigger.dev v3 (Cloud, free tier)
- HTML parsing: Zig binary (called as subprocess from Bun)
- Hosting: Vercel (Hobby tier, personal/non-commercial)
- Versioning: GitHub (cyalcala/va-freelance-hub)

## Architecture
```
GitHub → Vercel auto-deploys Next.js app

Trigger.dev Cloud (cron: every 2 hours)
  └─ Bun TS scraper fetches RSS + HTML sources
      └─ Zig binary parses raw HTML → clean JSON
  └─ Deduplicates + writes to Turso via Drizzle
  └─ Calls Vercel revalidation webhook → ISR pages refresh

Next.js App (Vercel Edge)
  └─ Server Components → Turso (Drizzle ORM)
  └─ ISR: revalidates on webhook trigger (revalidate = 3600)
  └─ UI: Tailwind + shadcn/ui
```

## Monorepo Structure
```
apps/web           → Next.js 14 App Router
packages/db        → Drizzle schema + migrations (shared)
packages/scraper   → Bun TS scrapers (RSS + HTML)
packages/zig-parser → Zig HTML parser binary
jobs/              → Trigger.dev v3 job definitions
trigger.config.ts
bunfig.toml
package.json       (Bun workspaces)
```

## Database Schema

### opportunities
id, title, company, type (VA/freelance/project),
source_url, source_platform, tags (JSON array),
location_type (remote/hybrid), pay_range,
posted_at, scraped_at, is_active (bool)

### va_directory
id, company_name, website, hires_filipinos (bool),
niche (admin/creative/tech/etc), hiring_page_url,
verified_at, notes

### content_digests (Phase 2)
id, creator_name, video_id, video_title, video_url,
transcript_raw, action_plan (JSON array of steps),
published_at, processed_at, tags[]

## Site Pages
```
/               → Hero, live stats, latest 10 opportunities
/opportunities  → Full paginated freelance feed (filterable by type, platform, recency)
/directory      → VA-friendly company directory (searchable by name/niche)
/digest         → Daily action plans from Nate Herk + Nick Saraev (Phase 2)
```

## Design Direction
- Dark background: #0a0a0a
- Accent: electric blue or violet
- Monospace font for data/badges
- Clean card layouts
- Reference: Linear.app meets a job board

## Data Sources

### RSS (Phase 1)
- We Work Remotely
- Remotive.io
- ProBlogger job board
- Remote.co
- OnlineJobs.ph (HTML scrape, not RSS)

### Influencer Digest (Phase 2)
- Nate Herk (YouTube)
- Nick Saraev (YouTube)
Fetched via `youtube-transcript` npm package,
summarized via Codex API (Sonnet) into 5-7 action steps.

## Environment Variables
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
TRIGGER_SECRET_KEY=tr_dev_xxxxx
ISR_SECRET=random-string-you-generate
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Phase 2 only
```

## Self-Maintenance Jobs (Phase 4)
- `verify-links.ts` — runs daily, pings each source_url, marks is_active=false if 404
- `verify-directory.ts` — runs weekly, checks hiring_page_url, updates verified_at

## Build Phases
- **Phase 0** — Monorepo scaffold + tooling (current)
- **Phase 1** — DB schema + RSS scraper + Trigger.dev cron + basic frontend
- **Phase 2** — Influencer digest (YouTube transcript + Codex API)
- **Phase 3** — Frontend polish, filters, search
- **Phase 4** — Self-maintenance jobs (dead link detection, auto-archive)

## Key Constraints
- Vercel Hobby tier (personal/non-commercial — do not add monetization without upgrading)
- Free tier across ALL services
- Zig binary role: HTML parsing only, called via Bun.spawn, outputs newline-delimited JSON to stdout
- Trigger.dev free tier: 750 runs/month — cron set to every 2 hours (~360 runs) to leave room for retries
- No auth, no payments, no user accounts in scope
- TypeScript strict mode everywhere
