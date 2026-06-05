# ADR-001: Adopt Recovery-Driven Public Job Index Methodology

## Status

Accepted

## Date

2026-06-06

## Context

The project has grown from an initial scaffold into an active Cloudflare/Astro/D1
portfolio system with GitHub Actions ingestion. A major audit found that the
system is useful but has several preventable risks:

- project context drift between old Next.js/Vercel/Turso plans and current
  Cloudflare/Astro/D1 production reality;
- green GitHub Actions runs that can still contain source-level failures;
- stale or incomplete job metadata;
- silent ATS and write-path failure modes;
- source compliance uncertainty;
- noisy alert commits;
- a missing `/opportunities` route and large homepage payload.

The owner wants a process similar to `cyalcala/techwriter-bot`: fully documented,
backed up in GitHub, and tracked with percentages along the way.

## Decision

Adopt a recovery-driven execution methodology for VA Freelance Hub.

The methodology has four parts:

1. GitHub is the source of truth for code, docs, evidence, and handoff state.
2. Work ships in small vertical slices with targeted verification.
3. Progress is tracked by weighted phase percentages, only awarded after
   acceptance evidence exists.
4. The project is framed as a public job index with conservative source
   compliance rules, not as unrestricted scraping.

The canonical recovery files are:

- `AGENTS.md`
- `docs/MASTER_EXECUTION_PLAN.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/AI_RECOVERY_TRAIL.md`
- `docs/SYSTEM_SAVEPOINT.md`
- `docs/major-audit-2026-06-06.md`

## Alternatives Considered

### Keep informal chat-based planning

Pros:

- Fast in the moment.
- Less documentation overhead.

Cons:

- Future agents cannot recover decisions without chat history.
- Percent progress becomes subjective.
- Audit evidence and next tasks drift.

Rejected because this repo is a public portfolio artifact and needs recoverable
engineering history.

### Build a heavier operations platform first

Pros:

- Could eventually provide dashboards, source status history, and richer
  observability.

Cons:

- Delays user-visible fixes like `/opportunities` and homepage payload.
- Risks overengineering before source compliance and ingestion semantics are
  clean.
- Adds maintenance cost to a free-tier personal project.

Rejected for now. The roadmap allows simple source-health storage and daily
rollups first.

### Treat all public pages as automatically collectible

Pros:

- Maximizes source count quickly.

Cons:

- Public visibility is not the same as permission to automate, store, and
  republish.
- Some sources explicitly restrict scraping or copying.
- This creates unnecessary legal, ethical, and portfolio risk.

Rejected. The project will prefer APIs/RSS/source-supported access, store
minimal factual metadata, attribute/link back, honor opt-outs, and pause unclear
or hostile sources.

## Consequences

- Future work must update status docs after meaningful checkpoints.
- Percentages must be backed by evidence, not vibes.
- CI success alone is insufficient when workflow payloads show source-level
  failures.
- Source compliance status becomes part of ingestion strategy.
- The immediate roadmap prioritizes visible product repairs and silent-failure
  removal over new features.
