# VA Freelance Hub - AI Recovery Pointer

This file is intentionally short so Claude or any other AI agent does not
recover the project from stale architecture notes.

The canonical project context is `AGENTS.md`.

Before making changes, read these files in order:

1. `docs/DOCS_INDEX.md`
2. `AGENTS.md`
3. `docs/IMPLEMENTATION_STATUS.md`
4. `docs/HANDOFF.md`
5. `docs/MASTER_EXECUTION_PLAN.md`
6. `docs/AI_RECOVERY_TRAIL.md`
7. `docs/SYSTEM_SAVEPOINT.md`
8. `docs/major-audit-2026-06-06.md`

Current active architecture:

- Astro app in `apps/web`
- Cloudflare Pages hosting
- Cloudflare D1 database
- GitHub Actions pulse workflows
- TypeScript scraper code in `packages/scraper`
- GitHub commits, pushes, docs, and workflow runs as the recovery trail

Do not assume the older Next.js, Vercel, Turso, Trigger.dev, or Zig-parser plan
is the active production path unless a newer accepted decision explicitly says
so.
