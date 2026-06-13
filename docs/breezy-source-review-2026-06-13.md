# Breezy Source Review — 2026-06-13

This document records the fresh compliance and operational review of the active Breezy ATS tokens configured in the `va_directory` database table.

## Probing and Verification Results

Probes were conducted on 2026-06-13 with standard browser User-Agents.

### 1. 20Four7VA
- **JSON Endpoint**: `https://20four7va.breezy.hr/json`
- **Result**: HTTP 200 OK, returning **60 active jobs**.
- **Robots.txt**: Checked `https://20four7va.breezy.hr/robots.txt`. Standard rules allow the `/json` path and only exclude static assets (`/css`, `/fonts`, etc.).
- **Decision**: Keep `needs_review`. The endpoint is public and robots-allowed. We collect minimal metadata and link users directly back to the Breezy-hosted application forms.

### 2. Sourcefit
- **JSON Endpoint**: `https://sourcefit.breezy.hr/json`
- **Result**: HTTP 200 OK, returning **65 active jobs**.
- **Robots.txt**: Checked `https://sourcefit.breezy.hr/robots.txt`. Same standard rules; `/json` is allowed.
- **Decision**: Keep `needs_review`. Public, robots-allowed. We collect minimal metadata and link directly back to the original posting.

### 3. VAA Philippines
- **JSON Endpoint**: `https://vaaphilippines-recruitment.breezy.hr/json`
- **Result**: HTTP 200 OK, returning **0 jobs** (empty array `[]`).
- **Robots.txt**: Checked `https://vaaphilippines-recruitment.breezy.hr/robots.txt`. `/json` is allowed.
- **Decision**: Keep `needs_review`. This is currently our "1 zero-count successful source" in the rollup. Probing confirms that the connection succeeds and returns an empty array, which is correct and normal behavior when the company has no open roles listed on Breezy.

### 4. 24/7 Virtual Assistant
- **Breezy Token**: `20four7va` (shares the same token as `20Four7VA`).
- **Audit**: The ingestion scraper correctly identifies this as a duplicate token during parsing and skips executing it, recording it as a skipped duplicate source. This prevents redundant requests and duplicate postings.

---

## Compliance Posture Summary

We will maintain these three tokens under `needs_review` status rather than upgrading them to `allowed`. Because company-level terms of service are generalized and subject to change without explicit public syndication agreements (unlike public job boards like We Work Remotely), keeping them as `needs_review` enforces the strict "Goldilocks" constraints:
- Minimal metadata storage only.
- Direct links to original apply pages.
- Immediate pause on objection or clarified hostile terms.
