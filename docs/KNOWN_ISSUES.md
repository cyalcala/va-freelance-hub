# KNOWN ISSUES & RESOLUTIONS

## 1. Feed Empty / "No matching signals found" (Ref: Warden Protocol v2)
- **Status**: RESOLVED (2026-03-20)
- **Symptom**: Frontend shows "No matching signals found" while Health API reports active listings.
- **Root Causes**:
    - `ReferenceError`: `apps/frontend/src/pages/index.astro` attempted to query `opportunitiesTable` which was not defined (import was `opportunities`).
    - `ReferenceError`: Missing Drizzle imports for `not` and `asc` in `index.astro`.
- **Resolution**: Surgically corrected table reference and added missing imports. 
- **Verification**: Visual check confirmed 270+ listings live on production.

## 2. Trigger.dev Deployment - @libsql Native Binary Mismatch
- **Status**: OPEN / MITIGATED
- **Symptom**: `trigger deploy` fails on Windows due to `@libsql/linux-x64-gnu` resolution.
- **Resolution**: Use `@libsql/client/http` and alias `@libsql/client` to `@libsql/client/http` in `trigger.config.ts`.
