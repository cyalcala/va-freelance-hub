# Ingestion Orchestrator Source Exceptions (C16)

Under the **VA Freelance Hub Operating Constitution v5.2 §8.1 (C16)** and **OPERATIONS.md §8.2**, adding a conventional source **must not** require modifying central orchestration logic (`apps/web/src/pages/api/cron/scrape.ts`). Conventional sources are added via capability adapters, registry entries, and contract tests.

## When to File an Exception

If an extraordinary source genuinely cannot be expressed through existing capability adapters and requires modifying `apps/web/src/pages/api/cron/scrape.ts`, you must create an exception document in this directory:

`docs/exceptions/<source_id>.md`

## Required Template

Every exception document must contain the following fields:

```markdown
# Source Exception: <source_id>

- source_id: "<provider>:<slug>"
- exception_reason: "<Why conventional adapter cannot represent this source>"
- missing_capability: "<Capability to be added to future registry>"
- blast_radius: "<Files touched outside source adapter>"
- tests_added: "<Unit test references verifying this exception>"
- fallback_path: "<Rollback procedure if this source fails>"
- owner_or_ADR_reference: "<Commit, ADR, or owner approval reference>"
```

CI will validate that these fields are present and non-empty whenever `apps/web/src/pages/api/cron/scrape.ts` is modified.
