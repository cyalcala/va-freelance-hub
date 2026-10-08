# Core accounting repair in the scrape orchestrator

source_id: existing-publication-writers
exception_reason: Core maintenance preserves actual inserted opportunity IDs instead of trigger-amplified meta.changes; this is not source expansion.
missing_capability: The shared public insert callback accepted only a count and discarded RETURNING IDs needed for durable ledger accounting.
blast_radius: Accepted insertion callbacks in apps/web/src/pages/api/cron/scrape.ts plus shared helper/direct-ingest adapter; no new source, permission, threshold, clock or collection behavior.
tests_added: Offline SQLite/FTS/Drizzle RETURNING and conflict fixtures; gateway receipt IDs, partial writes, canary slicing, retry, public-hidden ingest counts; independent review and full verification.
fallback_path: Normal revert of the scoped receipt-ID commit; existing hidden pending/rejected loops and source/publication controls remain authoritative.
owner_or_ADR_reference: Owner-authorized lucky777 mathematical maintenance; docs/operations/PUBLICATION_RECEIPT_ACCOUNTING_2026-10-08.md and existing MATH-06A support contract.

Required normal release/runtime acceptance remains pending. This exception documents
the central-adapter edit only; it grants no source admission or production authority.
