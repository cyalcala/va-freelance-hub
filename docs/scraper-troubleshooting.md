# Scraper Architecture & Troubleshooting Guide

This document provides a trail of the architecture, past bugs, and how to fix the scraping pipeline when job boards break. It is specifically designed to give future AIs or developers the necessary context to maintain the system.

## 1. Scraper Architecture
- **Sources (`packages/scraper/sources.ts`)**: Defines all job boards we scrape. Sources are either `html` or `rss`.
- **RSS Parser (`packages/scraper/rss.ts`)**: Uses `fast-xml-parser` to parse XML feeds.
- **HTML Parser (`packages/scraper/html.ts`)**: Uses Regex to extract job links and titles from raw HTML.
- **Scrape Job (`jobs/scrape-opportunities.ts`)**: Scheduled via Trigger.dev. Fetches all sources, filters valid items, and upserts them into the SQLite database.
- **Link Verification (`jobs/verify-links.ts`)**: Periodically checks all active jobs. If a job link returns a `404` or redirects to a generic page (indicating the job closed), it marks the job as inactive. It also auto-archives jobs not seen in 30 days.

## 2. The Great Data Staleness Bug of May 2026
In May 2026, the database suffered from severe data staleness. Jobs from May 30 and 31 were completely missing. This was caused by two compounding issues:

### Issue A: Upsert Logic Failure (The Silencer)
Originally, `jobs/scrape-opportunities.ts` used `onConflictDoNothing`. When a feed refreshed, the scraper saw the same `sourceUrl` and ignored the job completely, rather than updating its `updatedAt` or `lastSeenInFeedAt` timestamps. Thus, existing jobs were frozen in time.
**The Fix:** Changed to `onConflictDoUpdate` to actively update `lastSeenInFeedAt`, `title`, and `contentHash`.

### Issue B: Broken Upstream Sources (The Blockers)
Because the scraper fetches feeds silently, when *OnlineJobs.ph* and *Working Nomads* broke, the scraper just returned `0 items` without stopping the pipeline.
- *OnlineJobs.ph* changed their job board URL from `/jobseekers/joblist` to `/jobseekers/jobsearch` and removed the `job_title` CSS class.
- *Working Nomads* removed their RSS feed entirely (returning `404`).

## 3. How to Fix Broken Scrapers (Instructions for Future AIs)
If the site owner reports that "no new jobs are showing up", immediately suspect that an upstream job board has changed its HTML structure or URL.

**Step-by-Step Fix:**
1. **Check Source URLs:** Open `packages/scraper/sources.ts` and manually fetch the URLs (e.g., using `curl` or a Node script). If it returns a 404, the URL changed or the feed was removed.
2. **Verify HTML Structure:** For HTML sources, fetch the raw HTML and search for job links. The source might have changed its CSS classes. Update the Regex in `packages/scraper/html.ts` to match the new structure. Ensure the Regex excludes pagination/related links (like "See More").
3. **Verify Upsert Logic:** Ensure that `jobs/scrape-opportunities.ts` is correctly upserting `lastSeenInFeedAt` so the verification job (`jobs/verify-links.ts`) knows the job is still active.
4. **Test the Scraper:** Run a single source through the scraper using a scratch script to verify it returns `> 0` items before deploying.

## 4. Documentation Trail
All modifications, architectural decisions, and bug fixes are continuously committed to this repository. The source of truth for the database schema is `packages/db/schema.ts`. Always rely on the Git history for context.
