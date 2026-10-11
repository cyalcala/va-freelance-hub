# GitLab & Secure Source Manager Reconciliation & Complete Documentation Audit

**Date:** 2026-10-11 Manila  
**Branch:** `codex/verified-flow-directory-checkpoint`  
**Latest Local Commit:** `c4713ef2` (21 commits ahead of `origin/codex/verified-flow-directory-checkpoint`)  
**Remotes:**
- Canonical Git Remote: Google Cloud Secure Source Manager (`origin`)
- Secondary Mirror: GitLab (`gitlab`, repository `cyrus-group4793641/va-freelance-hub`)
- Retained Historic Remote: GitHub (`github`, repository `cyalcala/va-freelance-hub`)

---

## 1. Executive Summary & Critical Root Cause Analysis

### Why GitLab Web UI Currently Appears to Have No Documentation

When visiting `https://gitlab.com/cyrus-group4793641/va-freelance-hub` in a web browser, the GitLab interface defaults to the repository's default branch, which is currently set to `main`.

A direct inspection of the remote ref state reveals:
1. **`gitlab/main` is pinned to commit `fbeff64a2b47f32550ba426af92a2795a1507181`** ("Initial commit").
   - This commit contains only a 1-line placeholder README.
   - It contains **zero** documentation, zero code, and zero directories.
2. **All real project documentation and code reside on:**
   - `origin/main` at commit `f35bcdc3` ("docs: record ADR-010 public serving snapshot deployment and verification evidence") — containing the complete 50+ file documentation tree.
   - `codex/verified-flow-directory-checkpoint` locally at commit `c4713ef2` — containing 21 new operational evidence records and mathematical invariant locks.
   - `gitlab/codex/verified-flow-directory-checkpoint` remotely at historical commit `f6753582` ("Validate original posting dates before fresh scrape publication").
3. **Authentication Boundary:**
   - Headless background pushes to GitLab fail with `fatal: could not read Username for 'https://gitlab.com': terminal prompts disabled` because no GitLab Personal Access Token or credentials are saved in Windows Credential Manager.
   - Headless background pushes to Google Cloud Secure Source Manager fail with `No credentialed accounts. To login, run: gcloud auth login` because the gcloud credential helper requires an active user session.

As a result, visiting GitLab on `main` gives the misleading visual appearance that documentation is missing, whereas all 50+ documentation files and operational records are fully intact and tracked in the local git repository and Google Secure Source Manager history.

---

## 2. Interactive Login Guide: How to Authenticate GitLab & SSM

To enable immediate push to GitLab and Secure Source Manager, perform the following straightforward interactive logins on the host machine:

### Option A: Interactive GitLab Sign-In via Git Credential Manager (Recommended)

Open **PowerShell** or **Command Prompt** on your desktop, navigate to the project directory, and run:

```powershell
git push gitlab codex/verified-flow-directory-checkpoint
```

**What happens:**
1. Git Credential Manager (GCM) will automatically open a browser window or GUI prompt asking you to sign in to GitLab.
2. Click **Authorize** or enter your GitLab credentials.
3. Windows Credential Manager will securely save the session token.
4. From that point on, both you and the autonomous agent can push to GitLab without being blocked!

To also update GitLab's default branch `main` so that visitors immediately see all documentation upon loading the repository home page, run:

```powershell
git push gitlab main:main
```

### Option B: GitLab Personal Access Token (PAT)

If you prefer using a Personal Access Token:
1. Open [GitLab Personal Access Tokens](https://gitlab.com/-/user_settings/personal_access_tokens) in your browser.
2. Create a token with scopes: `read_repository`, `write_repository`.
3. In PowerShell, execute:
   ```powershell
   cmdkey /generic:git:https://gitlab.com /user:<YOUR_GITLAB_USERNAME> /pass:<YOUR_PAT>
   ```

### Option C: Google Cloud Secure Source Manager Login

To authenticate Google Cloud SSM (`origin`):
1. In PowerShell, run:
   ```powershell
   & C:\Users\admin\AppData\Local\google-cloud-sdk\bin\gcloud.cmd auth login
   ```
2. Complete the OAuth login in your browser using the Google Cloud account that owns project `antigravity-494415`.
3. Verify authentication:
   ```powershell
   & C:\Users\admin\AppData\Local\google-cloud-sdk\bin\gcloud.cmd auth list
   ```
4. Push the branch to canonical SSM:
   ```powershell
   git push origin codex/verified-flow-directory-checkpoint
   ```

---

## 3. Inventory of Completed Invariants & Documentation Slices

On branch `codex/verified-flow-directory-checkpoint`, 21 commits have implemented, locked, and documented 8 sequential Manila-day flow reader invariants with zero regressions:

| Invariant Name | Code SHA | Doc SHA | Evidence Document | Status |
|---|---|---|---|---|
| `PUBLICATION_MANILA_DAY_FAMILY_OK_IS_NOT_A_COMPLETED_FLOW` | `0dae4698` | `0e8d0122` | [`docs/operations/PUBLICATION_MANILA_DAY_FAMILY_OK_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_FAMILY_OK_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_FAMILY_BREACH_IS_NOT_A_COMPLETED_FLOW` | `52fd798a` | `92b562fc` | [`docs/operations/PUBLICATION_MANILA_DAY_FAMILY_BREACH_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_FAMILY_BREACH_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW` | `69f7f700` | `86a47c3a` | [`docs/operations/PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_FRESH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW` | `30a77752` | `31c3c073` | [`docs/operations/PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_APPLY_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW` | `6fd89119` | `6094b56a` | [`docs/operations/PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_PH_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCHED_IS_NOT_A_COMPLETED_FLOW` | `7ab46b82` | `86b75446` | [`docs/operations/PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_CANONICAL_URL_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_SOURCE_MATCHED_IS_NOT_A_COMPLETED_FLOW` | `525372f5` | `8113de61` | [`docs/operations/PUBLICATION_MANILA_DAY_SOURCE_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_SOURCE_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `PUBLICATION_MANILA_DAY_ACTIVE_MATCHED_IS_NOT_A_COMPLETED_FLOW` | `5f642df1` | `301820d3` | [`docs/operations/PUBLICATION_MANILA_DAY_ACTIVE_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/operations/PUBLICATION_MANILA_DAY_ACTIVE_MATCHED_IS_NOT_A_COMPLETED_FLOW_2026-10-10.md) | Sealed |
| `RECOVERY_TRAIL_AND_STATUS_ALIGNMENT` | — | `c4713ef2` | [`docs/AI_RECOVERY_TRAIL.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/AI_RECOVERY_TRAIL.md) & [`docs/IMPLEMENTATION_STATUS.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/IMPLEMENTATION_STATUS.md) | Sealed |

All 302 unit/integration tests in `packages/scraper/publication-gateway.integration.test.ts` pass cleanly, strict TypeScript typechecking (`bun run typecheck`) reports 0 errors, and all 4 CI guardrails pass.

---

## 4. Active Milestone Specification & Contract Boundary

**Sole Active NEXT:** `PUBLICATION_UNCERTAIN_EFFECTS_WITHDRAWAL_CONTRACT`  
**Governing Mandate:** `astra777.txt` Sections E, H, and J.  
**Core Invariant:** Partial failure and later invalidation must be observable and safely repairable across serving.

### Key Requirements
1. **Durable Uncertainty Tracking:**
   - Physical rows persisted in `opportunities` without confirmed ledger acknowledgement (`source_publication_ledger`) are flagged in `publication_outcome_uncertainty` (`exposure = 'UNKNOWN'`).
   - A subsequent ledger receipt confirms publication and supersedes the uncertainty marker.
2. **Idempotent Bounded Withdrawal:**
   - Unreceipted rows are deactivated via `withdrawUnreceiptedAcknowledgements` (`inactive_reason = 'publication-unreceipted'`).
   - Post-publication drift (e.g. onsite title or stale date) is deactivated via `withdrawInvalidPublicDrift` (`inactive_reason = 'publication-drift'`).
   - Historical stock lacking uncertainty markers is explicitly protected from deactivation.
3. **Serving Safety (ADR-010 Bounds):**
   - Live outbound click redirects (`/api/click/[id]`) return HTTP 404 for deactivated opportunities.
   - Public serving snapshot candidate validation (`validateSnapshotCandidate`) rejects collapsed or empty candidate boards, preserving the Last Known Good (LKG) board to prevent site-wide blackouts.
4. **Manila-Day Reader Invariant (`packages/scraper/manila-day.ts`):**
   - `uncertainMatchedManilaStillPublicCount`: Returns the matched integer count (e.g. 5) when all still-public IDs are active and free of unconfirmed uncertainty markers, and `null` otherwise.
   - `uncertainMatchedManilaDayFlowCount`: Returns `null` for `"OPEN"`, `"CLOSED"`, 100, 150, or `null`.
   - Never writes a `CLOSED` row, never blocks the writer, and never claims MATH-08.

---

## 5. Continuity and Backup Verification

- **Durable Pointers Updated:**
  - [`docs/SYSTEM_SAVEPOINT.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/SYSTEM_SAVEPOINT.md)
  - [`docs/bootloaders/CURRENT.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/bootloaders/CURRENT.md)
  - [`docs/AI_RECOVERY_TRAIL.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/AI_RECOVERY_TRAIL.md)
  - [`docs/IMPLEMENTATION_STATUS.md`](file:///c:/Users/admin/Desktop/va-freelance-hub/docs/IMPLEMENTATION_STATUS.md)
- **Backup Status:** `BACKUP_PENDING` noted on both remotes pending completion of interactive credential login (Section 2).
