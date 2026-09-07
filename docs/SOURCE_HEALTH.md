# Source Health & Diagnostic Taxonomy (Pillar E)

Operational specification for Source Doctor, Health Memory, and the Machine-Readable Failure Taxonomy.

---

## 1. Source Doctor Philosophy

A resilient ingestion system must never conflate silence with success. Source Doctor enforces an essential operational distinction:
- **`NO_JOBS` (Legitimate Zero)**: The employer or feed was reached cleanly; response schema was valid; the organization currently has zero open roles.
- **`FAILED_TO_LOOK` (Execution Failure)**: Network timeout, HTTP 5xx, DNS failure, or platform subrequest exhaustion prevented querying the source.
- **`ABNORMAL_OUTPUT` (Silent Failure / Block)**: An HTTP 200 was returned, but the body was an HTML error page instead of JSON, Cloudflare challenge block, or a broken schema.

Treating `ABNORMAL_OUTPUT` as `NO_JOBS` creates silent failures where dead sources remain listed as "healthy."

---

## 2. Machine-Readable Failure Taxonomy

Every scrape attempt emits structured operational states:

| Taxonomy Code | Category | Meaning & Remediation |
| :--- | :--- | :--- |
| `NETWORK_FAILURE` | Connectivity | DNS resolution, TCP handshake failure, or socket timeout. Retry with backoff. |
| `RATE_LIMIT` | Throttling | HTTP 429 Too Many Requests. Immediately backoff and log Retry-After header. |
| `SOURCE_UNAVAILABLE` | HTTP Status | HTTP 500/502/503/504 error from upstream host. |
| `SOURCE_EMPTY` | Zero-State | Valid HTTP 200 with legitimate empty array of postings. |
| `SOURCE_ANOMALOUS` | Drift/Evasion | Unexpected empty payload from historically high-volume source, or sudden volume collapse. |
| `SCHEMA_INVALID` | Data Structure | Payload failed Zod or type-guard validation (e.g. ATS API format updated). |
| `NORMALIZATION_FAILURE` | Field Extraction | Required fields (title, apply URL, location) could not be extracted cleanly. |
| `DEDUP_FAILURE` | Uniqueness | Conflict or corruption during content hash generation. |
| `GEO_FAILURE` | Filtering | Fatal regex or encoding crash during `geoGate` evaluation. |
| `TAXONOMY_FAILURE` | Categorization | Invalid category assigned outside allowed UI slugs. |
| `AI_PROVIDER_FAILURE` | Upstream AI | Upstream model (Workers AI, Gemini, Groq) threw an exception or timed out. |
| `AI_OUTPUT_INVALID` | AI Formatting | Model returned markdown conversational text or malformed JSON that failed parsing. |
| `DATABASE_FAILURE` | Storage | Cloudflare D1 write rejection, constraint violation, or timeout. |
| `ORCHESTRATION_FAILURE` | Platform | Worker execution time limit reached or subrequest budget exhausted. |
| `STALE_PIPELINE` | Liveness | Heartbeat stamp on `__ingest_diag__` older than 15 minutes. |
| `UNKNOWN_FAILURE` | Unhandled | Catch-all for unclassified exceptions (stamped by Issue #123 diagnostics). |

---

## 3. Health Memory & Persistence

Source health is recorded durably in Cloudflare D1:
- **`source_fetch_events` Table**: Tracks `source_id`, `status_code`, `duration_ms`, `items_count`, `error_taxonomy`, and `created_at`.
- **`shadow_observations` Table**: Dedicated ledger tracking 7-day shadow candidate performance prior to canary admission.
- **`__ingest_diag__` KV / State**: Heartbeat timestamp and active error diagnostics updated every 10-minute worker tick.
- **Reporting**: Automated nightly digest rendered to `docs/source-health-latest.md`.
