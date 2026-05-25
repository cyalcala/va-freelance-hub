# VA Freelance Hub

A self-updating aggregator of remote freelance and VA job opportunities for Filipino freelancers. Built as a portfolio project demonstrating agentic engineering skills.

- Curated VA-friendly company directory
- Automated job scraping from RSS feeds and job boards
- Every-2-hour cron refresh via Trigger.dev
- Built with Next.js 14 App Router, Turso, Drizzle ORM, and Bun

## Live Site

[remote-ph.vercel.app](https://remote-ph.vercel.app)

## Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Frontend | Next.js 14 App Router, Tailwind CSS, shadcn/ui |
| Database | [Turso](https://turso.tech) (LibSQL/SQLite) + Drizzle ORM |
| Scheduled jobs | [Trigger.dev](https://trigger.dev) v3 (cron every 2 hours) |
| HTML parsing | Zig binary called as Bun subprocess |
| Hosting | Vercel (Hobby) |

## Architecture

```
GitHub → Vercel auto-deploys Next.js app

Trigger.dev Cloud (cron: every 2 hours)
  └─ Bun TS scraper fetches RSS + HTML sources
      └─ Zig binary parses raw HTML → clean JSON
  └─ Deduplicates + writes to Turso via Drizzle
  └─ Calls Vercel revalidation webhook → ISR pages refresh

Next.js App (Vercel)
  └─ Server Components → Turso (Drizzle ORM)
  └─ ISR: revalidates on webhook trigger (revalidate = 3600)
```

## Project Structure

```
apps/web           → Next.js 14 App Router
packages/db        → Drizzle schema + migrations (shared)
packages/scraper   → Bun TS scrapers (RSS + HTML)
packages/zig-parser → Zig HTML parser binary
jobs/              → Trigger.dev v3 job definitions
```

## Pages

| Path | Description |
|---|---|
| `/` | Hero, live stats, latest 9 opportunities |
| `/opportunities` | Full paginated freelance feed |
| `/directory` | VA-friendly company directory |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.x
- A [Turso](https://turso.tech) database
- A [Trigger.dev](https://trigger.dev) project (free tier)

### Setup

```bash
# Clone the repo
git clone https://github.com/cyalcala/va-freelance-hub.git
cd va-freelance-hub

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Fill in your Turso credentials, Trigger.dev key, and ISR secret
```

### Environment Variables

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | Turso LibSQL connection URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `TRIGGER_SECRET_KEY` | Trigger.dev API key |
| `TRIGGER_PROJECT_ID` | Trigger.dev project ID |
| `ISR_SECRET` | Random string for revalidation webhook auth |
| `NEXT_PUBLIC_APP_URL` | App URL (localhost for dev, Vercel URL for prod) |

### Push Schema & Seed

```bash
# Push database schema
bun run packages/db/push.ts

# Seed VA directory
bun run packages/db/seed.ts
```

### Development

```bash
# Start Next.js dev server
bun run dev

# Run Trigger.dev jobs locally
bun run trigger:dev
```

### Build Zig Parser (optional — for HTML scraping)

```bash
cd packages/zig-parser
zig build
```

## Data Sources

- **RSS**: We Work Remotely, Remotive, ProBlogger, Remote.co, Authentic Jobs, Dribbble
- **HTML**: OnlineJobs.ph (via Zig parser)

## Credits

Built by [cyalcala](https://github.com/cyalcala) — Filipino freelance technical writer and agentic engineer.

## License

MIT