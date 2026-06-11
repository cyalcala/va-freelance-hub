# Source Health Latest

Date: 2026-06-11
Workflow run: https://github.com/cyalcala/va-freelance-hub/actions/runs/27314138450
Commit: 2bf0d8fedfebfa1409fee2637871faf337d14c22

### Hunter Source Health

- Timestamp: 2026-06-11T00:09:41Z
- Run ID: 27314138450
- Signals Harvested: 0
- Accepted For Insert: 250
- Attempted Inserts: 250
- Failed Insert Batches: 50
- Insert Errors: 50
- Failed Sources: 0
- Zero-Count Successful Sources: 3
- Skipped Sources: 16

#### Skipped Sources
- ProBlogger (RSS, paused): Paused 2026-06-09: current feed returns only a moved/deleting notice and produces zero useful jobs; confirm a supported current feed before re-enabling.
- Remote.co (RSS, paused): Paused 2026-06-09: repeated Hunter failures and live audit timeout/HTTP 520 behavior make this a noisy, unreliable source until reviewed.
- Authentic Jobs (RSS, paused): Paused 2026-06-09: robots.txt disallows /feed/; do not fetch until source permission or an allowed feed path is confirmed.
- Dribbble Jobs (RSS, paused): Paused 2026-06-09: Dribbble terms prohibit scraping and automated access beyond narrow search-engine indexing permission.
- OnlineJobs.ph (HTML, paused): Paused 2026-06-09: terms permit personal use without automated means unless expressly granted; public HTML jobsearch is not a supported feed/API.
- Jobspresso (RSS, paused): Paused 2026-06-09: current feed returns only a small placeholder/zero-job response, and site terms limit material use to personal transitory viewing.
- Coconut VA (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- CrewBloom (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- Global Strategic (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- Hello Rache (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- MyOutDesk (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- Outsource Access (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- Pearl Talent (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- Pineapple Staffing (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- SuperStaff (ATS, needs_review): Skipped Workable rotation slice to prevent rate limiting (scheduled for later runs).
- 24/7 Virtual Assistant (ATS, needs_review): Duplicate ATS token already fetched for 20Four7VA; skipped to avoid duplicate requests and duplicate source URLs.

#### Insert Errors
- batchStart=0, batchSize=5: D1_ERROR: too many SQL variables at offset 797: SQLITE_ERROR
- batchStart=5, batchSize=5: D1_ERROR: too many SQL variables at offset 797: SQLITE_ERROR
- batchStart=10, batchSize=5: D1_ERROR: too many SQL variables at offset 797: SQLITE_ERROR
- batchStart=15, batchSize=5: D1_ERROR: too many SQL variables at offset 797: SQLITE_ERROR
- batchStart=20, batchSize=5: D1_ERROR: too many SQL variables at offset 797: SQLITE_ERROR
