# VA.INDEX AI Session Guardrails
## Version: 1.0
## Last Updated: 2026-03-20
## Reason: Learned from Vercel hell incident

These rules exist because an AI agent caused 4 hours of production downtime by violating them on 2026-03-20. They are non-negotiable.

---

## RULE 1 — READ BEFORE ACTING
Before any file edit or terminal command that modifies the system, read the relevant files first. Never assume project structure.

ALWAYS run before any Vercel command:
- `cat apps/frontend/vercel.json`
- `cat apps/frontend/package.json`
- `cat apps/frontend/astro.config.mjs`

ALWAYS run before any deployment:
- `git log --oneline -5`
- `git status`

**VIOLATION EXAMPLE**: Running `vercel link` from monorepo root without checking where frontend lives. This caused 4 hours of downtime.

---

## RULE 2 — MAXIMUM 5 STEPS BEFORE STOPPING
If a task is not resolved after 5 attempts, **STOP immediately**. Do not try a 6th approach. Output a structured blocker report and wait for human instruction.

**BLOCKER REPORT FORMAT**:
- **ATTEMPTS MADE**: [list each with result]
- **CURRENT STATE**: [exactly what is broken]
- **WHAT I TRIED**: [list approaches]
- **WHAT I NEED**: [specific information needed]
- **WHAT I WILL NOT DO**: [approaches ruled out]

**VIOLATION EXAMPLE**: 29 consecutive attempts to fix Vercel deployment by trying increasingly complex solutions. Should have stopped at 5.

---

## RULE 3 — NEVER SUGGEST NUCLEAR SOLUTIONS
These approaches are permanently forbidden without explicit human approval:
- Flattening monorepo architecture
- Rewriting `package.json` dependencies
- Changing framework or build tool versions without first checking current versions
- Deleting or restructuring source directories
- Modifying workspace configuration
- Changing output directory structure

If you believe a nuclear solution is needed, output WHY in detail and wait for explicit human approval before proceeding.

**VIOLATION EXAMPLE**: Suggesting to flatten `@va-hub/db` into `apps/frontend` to resolve workspace dependency issues.

---

## RULE 4 — NEVER DECLARE SUCCESS WITHOUT PROOF
**MISSION COMPLETE** is only valid when:

For site deployments:
- `curl` returns 200 **AND**
- `curl /api/health` returns `HEALTHY` **AND**
- A real browser loads the page successfully

For Trigger.dev fixes:
- Run status shows `COMPLETED` not `FAILED` **AND**
- `totalActiveListings` is growing in Turso

For database fixes:
- Direct Turso connection test returns `OK` **AND**
- Row count is as expected

**VIOLATION EXAMPLE**: Reporting MISSION COMPLETE when HTTP CODE was 200 but browser showed 404. `curl 200` does not mean the site works.

---

## RULE 5 — PROTECT THE PIPELINE ABOVE ALL
The Trigger.dev pipeline is the most valuable part of VA.INDEX. It must never be touched unless explicitly instructed.

These files are **READ ONLY** unless explicitly told otherwise:
- `trigger/*.ts` — all task files
- `src/lib/db.ts` — database client factory
- `src/lib/dedup-fallback.ts` — TS fallback
- `drizzle.config.ts` — schema config

If a fix requires modifying these files, stop and ask for human confirmation first.

---

## RULE 6 — ALWAYS CHECK WORKING STATE FIRST
Before attempting any fix, ask: **What was the last working state?**

Run: `git log --oneline -10`
Find the last commit before things broke. Read what existed in that commit. Restore that state rather than inventing a new solution.

**LESSON LEARNED**: The entire Vercel fix was found by reading commit `fd10cd1` and finding `apps/frontend/vercel.json`. We spent 4 hours trying new solutions when the answer was in the last working commit.

---

## RULE 7 — WINDOWS VS LINUX AWARENESS
This project runs on Windows locally but deploys to Linux on Vercel and Trigger.dev.

Local build failures caused by:
- Symlink errors
- Path separator differences
- Binary compatibility

Are **NOT** blockers for cloud deployment. Push to GitHub and let Vercel build on Linux. Do not attempt to fix Windows-specific errors by changing build configuration.

---

## RULE 8 — VERCEL CONFIGURATION IS SACRED
`apps/frontend/vercel.json` is the source of truth for Vercel deployment configuration.

- **NEVER** modify via Vercel dashboard API without first reading the current `vercel.json` contents.
- **NEVER** change `rootDirectory` without checking where the frontend actually lives.
- **NEVER** change `outputDirectory` without checking what Astro actually outputs.

**Current working configuration**:
- `rootDirectory`: `apps/frontend`
- `buildCommand`: `bun run build`
- `outputDirectory`: `dist/`
- `framework`: `astro`

These values work. Do not change them without explicit human instruction and a clear reason.

---

## RULE 9 — THE FOUR TIMESTAMP AXES
Never conflate processing time with data freshness.
- **INGESTION_TIME (`created_at`)**: The only true measure of pipeline throughput.
- **EVENT_TIME (`posted_at`)**: The only true measure of job age.
- **PROCESSING_TIME (`scraped_at`)**: A heartbeat signal only.

**VIOLATION EXAMPLE**: Reporting "Staleness: 0.25h" because the scraper touched an old record. If `newCount = 0`, the system is functionally STALE regardless of the heartbeat.

---

## RULE 10 — FINGERPRINT SATURATION AWARENESS
The pipeline operates in a finite fingerprint space (title|company).
- Always check `saturation` (active/unique) before declaring a harvest "Healthy" if it produced 0 new records.
- If saturation is 1.0, and `newCount` is 0, you **MUST** purge staleness (Inactive > 60d, Tier 4 > 7d) as the first remediation step.

---

## RULE 11 — ZOMBIE PREVENTION (EVENT HORIZON)
Listings with `posted_at > 21 days ago` are dead signal.
- They must be deactivated (`is_active = 0`) to prevent "Just Now" badge deception on the UI.
- Never resurface a record by updating `scraped_at` if its `posted_at` is beyond the 14-day event horizon.

---

## EMERGENCY RECOVERY PROCEDURE
If the site goes down, follow this exact order:

1. **Step 1**: `git log --oneline -20`. Find last known good commit.
2. **Step 2**: Read `vercel.json` in that commit: `git show [COMMIT]:apps/frontend/vercel.json`.
3. **Step 3**: Restore that exact configuration. Do not invent new solutions.
4. **Step 4**: `git push origin main`. Let Vercel auto deploy.
5. **Step 5**: Wait 120 seconds then check: `curl va-freelance-hub-web.vercel.app`. Must return 200 **AND** load in browser.

This procedure was validated on 2026-03-20 and restored the site after 4 hours of failed attempts.
