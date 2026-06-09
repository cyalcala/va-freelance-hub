# Source Review - 2026-06-09

This review records the evidence used for P4 Slice 2 source pause/keep
decisions. It is an operational compliance review, not legal advice.

Policy used:

- Prefer source-supported RSS, API, or ATS JSON access paths.
- Respect robots.txt, terms, rate limits, and anti-automation language.
- Store minimal factual metadata and route users back to the original source.
- Pause unclear, hostile, broken, or unproductive sources instead of forcing
  brittle collection.

## Decisions

| Source | Decision | Evidence | Operational note |
| --- | --- | --- | --- |
| We Work Remotely | `allowed` | Public RSS page documents the all-jobs feed and asks for attribution/linkback. Robots allows the RSS path. | Keep enabled with source attribution and links back to WWR. |
| Remotive | `allowed` | Public API/RSS documentation supports sharing jobs with source mention and linkback. Robots does not block the feed path. | Keep enabled while listings remain ungated and link to Remotive URLs. Re-review if product scope becomes commercial or competitive. |
| ProBlogger | `paused` | Current feed returns only a small moved/deleting notice and zero useful jobs. | Re-enable only after finding a current supported job feed. |
| Remote.co | `paused` | Repeated Hunter failures plus live audit timeout/HTTP 520 behavior. | Pausing removes noisy alert commits and avoids repeated failing requests. |
| Authentic Jobs | `paused` | Robots.txt disallows `/feed/`, which is the configured feed path. | Re-enable only with permission or a confirmed allowed feed path. |
| Dribbble Jobs | `paused` | Terms prohibit scraping/automated access beyond narrow public search-engine indexing permission. | Do not fetch `jobs.rss` unless explicit permission/source-supported docs are confirmed. |
| OnlineJobs.ph | `paused` | Terms say use is personal and without automated means unless expressly granted; configured path is public HTML, not a feed/API. | Do not fetch public HTML jobsearch without express permission or supported feed/API. |
| Jobspresso | `paused` | Current feed returns a small placeholder/zero-job response; terms limit material use to personal transitory viewing. | Re-enable only with a supported feed and clearer reuse permission. |

## Evidence Links

- We Work Remotely RSS: `https://weworkremotely.com/remote-job-rss-feed`
- We Work Remotely robots: `https://weworkremotely.com/robots.txt`
- Remotive API/RSS: `https://remotive.com/remote-jobs/api`
- Remotive XML feed docs: `https://github.com/remotive-com/remote-jobs-feed`
- Remotive robots: `https://remotive.com/robots.txt`
- ProBlogger feed: `https://problogger.com/jobs/feed/`
- ProBlogger terms: `https://problogger.com/terms-and-conditions/`
- Remote.co feed: `https://remote.co/remote-jobs/feed/`
- Authentic Jobs robots: `https://authenticjobs.com/robots.txt`
- Authentic Jobs feed: `https://authenticjobs.com/feed/`
- Dribbble terms: `https://dribbble.com/terms`
- Dribbble robots: `https://dribbble.com/robots.txt`
- Dribbble jobs feed: `https://dribbble.com/jobs.rss`
- OnlineJobs.ph terms: `https://v2.onlinejobs.ph/terms`
- OnlineJobs.ph robots: `https://www.onlinejobs.ph/robots.txt`
- OnlineJobs.ph jobsearch: `https://www.onlinejobs.ph/jobseekers/jobsearch`
- Jobspresso terms: `https://jobspresso.co/terms-and-conditions/`
- Jobspresso feed: `https://jobspresso.co/feed/`

## Live Probe Snapshot

Live source probe from 2026-06-09 before enforcement:

| URL | Status | Bytes | Content type / result |
| --- | ---: | ---: | --- |
| `https://weworkremotely.com/remote-jobs.rss` | 200 | 792864 | `application/rss+xml` |
| `https://remotive.com/remote-jobs/feed` | 200 | 490831 | `application/rss+xml` |
| `https://problogger.com/jobs/feed/` | 200 | 833 | `application/rss+xml` |
| `https://remote.co/remote-jobs/feed/` | timeout | 0 | request timed out |
| `https://authenticjobs.com/feed/` | 200 | 117323 | `application/rss+xml` |
| `https://dribbble.com/jobs.rss` | 200 | 44061 | `application/rss+xml` |
| `https://www.onlinejobs.ph/jobseekers/jobsearch` | 200 | 182304 | `text/html` |
| `https://jobspresso.co/feed/` | 200 | 975 | `application/rss+xml` |

## Accepted Implementation Evidence

- Product commit: `1143798` (`feat: enforce source compliance pauses`)
- CI run: `27200812470`
- Cloudflare Pages deploy: `https://1a74a454.remotejobs-ph.pages.dev`
- Manual Hunter run: `27200899849`
- Hunter response:
  - `failedSources: []`
  - WWR fetched as `allowed` with 100 RSS items.
  - Remotive fetched as `allowed` with 29 RSS items.
  - ProBlogger, Remote.co, Authentic Jobs, Dribbble Jobs, OnlineJobs.ph, and
    Jobspresso returned `skipped: true` with pause reasons.
  - `insertFailedBatches: 0`
  - `insertErrors: []`
- D1 read-only count stayed at 687 active opportunities with `changes: 0`.
