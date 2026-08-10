# Major Quality Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove confirmed release, search-index, type-safety, and operational-observability failure modes from the active Cloudflare/Astro/D1 path.

**Architecture:** The public Astro app queries D1, while GitHub Actions validates, migrates, validates FTS, and deploys it. The FTS table uses the `opportunities` table as external content; all source rows are indexed for consistency while UI queries filter active records. Scheduled workflows call authenticated maintenance routes and record truthful transport outcomes.

**Tech Stack:** Bun workspaces, Astro, TypeScript, Cloudflare Pages/D1, SQLite FTS5, GitHub Actions.

## Global Constraints

- Work only in `C:\Users\admin\Desktop\va-freelance-hub\.worktrees\major-quality-audit` on `codex/major-quality-audit-2026-08-09`.
- Preserve the user's generated and local launcher changes in the primary checkout.
- Do not introduce automatic destructive data cleanup beyond existing bounded policies.
- Keep source compliance policy unchanged.

## Tasks

- [x] **1. Establish deterministic verification commands.** Added root `test`, `typecheck`, and `verify` scripts and captured the four-error strict-type baseline.

- [x] **2. Repair the FTS external-content contract test-first.** Added the SQLite contract, observed the red missing-migration test, then added migration 0027; the contract now proves drift detection, rebuild integrity, historic coverage, and scoped triggers.

- [x] **3. Remove strict TypeScript failures.** Typed the prune bindings and JSON mapper; explicit typecheck and the complete project-owned suite pass.

- [x] **4. Serialize production release state.** The release job now follows validation and holds the shared D1 migration lock; manual migration recovery uses that lock and the same integrity check.

- [x] **5. Make scheduled job summaries evidence-based.** Hardened transport/JSON/metric validation and surfaced actual job and HTTP status in summaries.

- [ ] **6. Document, verify, and hand off.** Audit and ADR are written; final build, recovery-record update, commit, rebase, GitHub push, and workflow observation remain.
