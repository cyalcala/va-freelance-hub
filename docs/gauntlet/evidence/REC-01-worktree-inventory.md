# REC-01 Worktree Inventory — 2026-08-22

**Base commit:** `353c8bd` (main = origin/main)
**Inventory timestamp:** 2026-08-22T00:00:00Z
**Command:** `git worktree list --porcelain` + directory enumeration + per-worktree status/log

---

## Summary

| Category | Count | Details |
| --- | --- | --- |
| Main worktree | 1 | Clean, synchronized at `353c8bd` |
| Registered auxiliary worktrees | 6 | All have `.git` pointers via `.git/worktrees/` |
| Orphan-looking directories (no `.git`) | 4 | File copies of old project states |
| **Total auxiliary entries** | **10** | |

---

## 1. Main Worktree

| Field | Value |
| --- | --- |
| Path | `C:/Users/admin/Desktop/va-freelance-hub` |
| HEAD | `353c8bd` (docs: record gauntlet planning acceptance) |
| Branch | `main` |
| Upstream | `origin/main` |
| Dirty status | Clean (no modified/untracked files) |
| Remote reachability | `main` = `origin/main` at `353c8bd` |
| Classification | **retain** — active production baseline |

---

## 2. Registered Auxiliary Worktrees (6)

### 2.1 `apex-ai-revert` → `codex/revert-unaccepted-ai`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-ai-revert` |
| HEAD | `619c023` (fix: prevent branch rollups from promoting code) |
| Branch | `codex/revert-unaccepted-ai` |
| Upstream | `origin/codex/revert-unaccepted-ai` |
| Dirty status | Clean |
| Unique commits vs main | 2 commits: `619c023`, `489b027` (Revert "fix: replace retired Workers AI ladders") |
| Remote reachability | Branch exists on origin |
| Classification | **candidate for archive** — revert work completed; unique commits are revert-only; PR #61 merged |

### 2.2 `apex-clock` → `codex/apex-state-write-diagnostics`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-clock` |
| HEAD | `63e1898` (fix: surface invalid scraper output #68) |
| Branch | `codex/apex-state-write-diagnostics` |
| Upstream | `origin/codex/apex-state-write-diagnostics` |
| Dirty status | **Dirty** — 6 modified files, 2 untracked files |
| Modified files | `apps/web/src/lib/run-diagnostics.ts`, `apps/web/src/pages/api/cron/scrape.ts`, `apps/web/tests/invalid-url-diagnostics.test.ts`, `apps/web/tests/run-diagnostics.test.ts`, `workers/freshness-cron/src/scrape-response.test.ts`, `workers/freshness-cron/src/scrape-response.ts` |
| Untracked files | `apps/web/src/lib/state-write-tracker.ts`, `apps/web/tests/state-write-tracker.test.ts` |
| Unique commits vs main | 0 (branch HEAD is ancestor of main) |
| Remote reachability | Branch exists on origin |
| Classification | **unknown** — dirty working tree with uncommitted diagnostic work; unique commits appear merged upstream; needs owner review before disposition |

### 2.3 `apex-directory` → `codex/apex-directory`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-directory` |
| HEAD | `24a1dd1` (fix: preserve directory strikes on egress failure) |
| Branch | `codex/apex-directory` |
| Upstream | `origin/codex/apex-directory` |
| Dirty status | **Dirty** — 1 modified file (`apps/web/.astro/types.d.ts`), 1 untracked dir (`.codex-tmp/`) |
| Unique commits vs main | 1 commit: `24a1dd1` |
| Remote reachability | Branch exists on origin |
| Classification | **unknown** — single unique commit (`preserve directory strikes`); dirty with generated types; may be superseded by later work |

### 2.4 `apex-gauntlet` → `codex/apex-gauntlet`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-gauntlet` |
| HEAD | `dbeadac` (docs: defer AI rollout on exhausted neuron gate) |
| Branch | `codex/apex-gauntlet` |
| Upstream | `origin/codex/apex-gauntlet` |
| Dirty status | **Dirty** — 1 modified file (`apps/web/.astro/types.d.ts`) |
| Unique commits vs main | 9 commits (AI evaluation/Pages preview work) |
| Remote reachability | Branch exists on origin |
| Classification | **candidate for archive** — AI evaluation work deferred per `dbeadac`; 9 unique commits not on main; PR likely closed/deferred |

### 2.5 `apex-prospector` → `codex/apex-prospector`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-prospector` |
| HEAD | `ebe9786` (fix: require positive PH evidence in Prospector) |
| Branch | `codex/apex-prospector` |
| Upstream | `origin/codex/apex-prospector` |
| Dirty status | **Dirty** — 1 modified file (`apps/web/.astro/types.d.ts`) |
| Unique commits vs main | 1 commit: `ebe9786` |
| Remote reachability | Branch exists on origin |
| Classification | **unknown** — single unique commit (PH evidence requirement); dirty with generated types; may be superseded by SEC-03/DATA-05A work |

### 2.6 `apex-verifier` → `codex/apex-verifier`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-verifier` |
| HEAD | `9f402e8` (fix: rotate verifier rows after network failure) |
| Branch | `codex/apex-verifier` |
| Upstream | `origin/codex/apex-verifier` |
| Dirty status | **Dirty** — 1 modified file (`apps/web/.astro/types.d.ts`) |
| Unique commits vs main | 1 commit: `9f402e8` |
| Remote reachability | Branch exists on origin |
| Classification | **unknown** — single unique commit (verifier rotation after network failure); dirty with generated types; relates to REL-09 |

---

## 3. Orphan-Looking Directories (4) — No `.git` Pointer

These directories appear to be file copies of old project states (likely from `pnpm` era before Bun migration). They lack `.git` directories and are not registered as git worktrees.

### 3.1 `apex-sec01`

| Field | Value |
| --- | --- |
| Path | `.worktrees/apex-sec01` |
| Type | Directory copy (no `.git`) |
| Notable contents | `package.json` (pnpm), `pnpm-lock.legacy.yaml`, `trigger.config.ts`, `work777.xlsx`, `onlinejobs_test.html`, `packages/`, `workers/`, `scripts/`, `node_modules/` |
| Last modified | 2026-08-16 22:10 (directory), 2026-08-13 18:33 (most files) |
| Classification | **candidate for archive** — legacy pnpm/Trigger.dev project copy; superseded by Bun/Astro/D1 architecture; no git history |

### 3.2 `major-quality-audit`

| Field | Value |
| --- | --- |
| Path | `.worktrees/major-quality-audit` |
| Type | Directory copy (no `.git`; `node_modules` is a symlink) |
| Notable contents | `package.json` (pnpm), `pnpm-lock.yaml`, `trigger.config.ts`, `work777.xlsx`, `onlinejobs_test.html`, `packages/`, `workers/`, `scripts/`, `node_modules/` (symlink) |
| Last modified | 2026-08-09 20:01 (most files), 2026-08-09 21:59 (package.json) |
| Classification | **candidate for archive** — pre-Bun migration audit snapshot; superseded by current architecture |

### 3.3 `production-apex-audit-2026-08-09`

| Field | Value |
| --- | --- |
| Path | `.worktrees/production-apex-audit-2026-08-09` |
| Type | Directory copy (no `.git`) |
| Notable contents | `apps/`, `docs/`, `packages/`, `workers/`, `scripts/`, `bun.lock`, `bunfig.toml`, `package.json` (Bun), `pnpm-lock.legacy.yaml`, `local.db`, `work777.xlsx`, `onlinejobs_test.html` |
| Last modified | 2026-08-10 00:35 (Bun files), 2026-08-09 22:24 (apps/docs) |
| Classification | **candidate for archive** — owner-requested pause checkpoint (docs/major-production-audit-2026-08-10.md); branch `codex/major-quality-audit-2026-08-09` exists on origin; this directory is a file copy |

### 3.4 `production-release`

| Field | Value |
| --- | --- |
| Path | `.worktrees/production-release` |
| Type | Directory copy (no `.git`; `node_modules` is a symlink) |
| Notable contents | `package.json` (pnpm), `pnpm-lock.yaml`, `trigger.config.ts`, `work777.xlsx`, `onlinejobs_test.html`, `packages/`, `workers/`, `scripts/`, `node_modules/` (symlink) |
| Last modified | 2026-08-09 22:03 |
| Classification | **candidate for archive** — pre-Bun release preparation copy; superseded |

---

## 4. Remote Branch Correlation

| Local worktree branch | Remote branch | Status |
| --- | --- | --- |
| `codex/revert-unaccepted-ai` | `origin/codex/revert-unaccepted-ai` | Exists |
| `codex/apex-state-write-diagnostics` | `origin/codex/apex-state-write-diagnostics` | Exists (shown as `codex/apex-clock` in worktree list) |
| `codex/apex-directory` | `origin/codex/apex-directory` | Exists |
| `codex/apex-gauntlet` | `origin/codex/apex-gauntlet` | Exists |
| `codex/apex-prospector` | `origin/codex/apex-prospector` | Exists |
| `codex/apex-verifier` | `origin/codex/apex-verifier` | Exists |
| (orphan dirs) | `origin/codex/major-quality-audit-2026-08-09` | Exists for production-apex-audit |

---

## 5. Classification Summary

| Entry | Type | Classification | Rationale |
| --- | --- | --- | --- |
| main | Primary | **retain** | Active production baseline |
| apex-ai-revert | Registered | **candidate for archive** | Revert work complete; PR merged |
| apex-clock | Registered | **unknown** | Dirty with uncommitted diagnostics; no unique commits |
| apex-directory | Registered | **unknown** | 1 unique commit; dirty; may be superseded |
| apex-gauntlet | Registered | **candidate for archive** | AI work deferred; 9 unique commits not on main |
| apex-prospector | Registered | **unknown** | 1 unique commit (PH evidence); dirty; relates to SEC-03 |
| apex-verifier | Registered | **unknown** | 1 unique commit (verifier rotation); dirty; relates to REL-09 |
| apex-sec01 | Orphan | **candidate for archive** | Legacy pnpm/Trigger copy; no git history |
| major-quality-audit | Orphan | **candidate for archive** | Pre-Bun audit snapshot; no git history |
| production-apex-audit-2026-08-09 | Orphan | **candidate for archive** | Owner pause checkpoint; branch on origin |
| production-release | Orphan | **candidate for archive** | Pre-Bun release copy; no git history |

---

## 6. Verification Evidence

### Git Worktree List (porcelain)
```
worktree C:/Users/admin/Desktop/va-freelance-hub
HEAD 353c8bdc579846cfdc7dd5b308e95e33235cfc54
branch refs/heads/main

worktree C:/Users/admin/Desktop/va-freelance-hub/.worktrees/apex-ai-revert
HEAD 619c0232f63c606443d6bf6f0fad797694280097
branch refs/heads/codex/revert-unaccepted-ai

worktree C:/Users/admin/Desktop/va-freelance-hub/.worktrees/apex-clock
HEAD 63e18983ae6d5231d4aea37a553a8fca7b8e8d8f
branch refs/heads/codex/apex-state-write-diagnostics

worktree C:/Users/admin/Desktop/va-freelance-hub/.worktrees/apex-directory
HEAD 24a1dd111f725324f5bfe2afcd428fd129e1a059
branch refs/heads/codex/apex-directory

worktree C:/Users/admin/Desktop/va-freelance-hub/.worktrees/apex-gauntlet
HEAD dbeadacc2a63d2fde3557d3286a0a2bcf6fb47f3
branch refs/heads/codex/apex-gauntlet

worktree C:/Users/admin/Desktop/va-freelance-hub/.worktrees/apex-prospector
HEAD ebe978656fa31d15d2065e207ecba4cf999747c9
branch refs/heads/codex/apex-prospector

worktree C:/Users/admin/Desktop/va-freelance-hub/.worktrees/apex-verifier
HEAD 9f402e8bd78e05f9a60bff99fc92afc139265798
branch refs/heads/codex/apex-verifier
```

### Directory Listing (`.worktrees/`)
```
apex-ai-revert          (registered worktree)
apex-clock              (registered worktree)
apex-directory          (registered worktree)
apex-gauntlet           (registered worktree)
apex-prospector         (registered worktree)
apex-verifier           (registered worktree)
apex-sec01              (orphan — no .git)
major-quality-audit     (orphan — no .git)
production-apex-audit-2026-08-09  (orphan — no .git)
production-release      (orphan — no .git)
```

### Per-Worktree Dirty Status
- `apex-ai-revert`: Clean
- `apex-clock`: 6 modified, 2 untracked
- `apex-directory`: 1 modified, 1 untracked dir
- `apex-gauntlet`: 1 modified
- `apex-prospector`: 1 modified
- `apex-verifier`: 1 modified

### Unique Commits vs Main (per branch)
- `codex/revert-unaccepted-ai`: 2 commits
- `codex/apex-state-write-diagnostics`: 0 commits
- `codex/apex-directory`: 1 commit
- `codex/apex-gauntlet`: 9 commits
- `codex/apex-prospector`: 1 commit
- `codex/apex-verifier`: 1 commit

---

## 7. Recommendations

### Immediate (No Action Required)
- **Main worktree**: Continue as production baseline
- **No cleanup authorized** per REC-01 contract (G73: DO NOT TOUCH)

### Requires Owner/Architect Review Before Any Cleanup
1. **apex-clock** — Dirty with diagnostic work in progress; unique commits appear merged but uncommitted changes exist
2. **apex-directory** — Unique commit `24a1dd1` (directory strikes preservation) may relate to REL-09/OPS-04
3. **apex-prospector** — Unique commit `ebe9786` (PH evidence) directly relates to SEC-03
4. **apex-verifier** — Unique commit `9f402e8` (verifier rotation) directly relates to REL-09

### Safe to Archive (After Explicit Approval)
- **apex-ai-revert** — Revert complete, PR merged
- **apex-gauntlet** — AI evaluation deferred, 9 commits not on main
- **apex-sec01** — Legacy copy, no git history
- **major-quality-audit** — Legacy copy, no git history
- **production-apex-audit-2026-08-09** — Owner pause checkpoint, branch on origin
- **production-release** — Legacy copy, no git history

---

## 8. Acceptance Confirmation

- [x] Every registered worktree enumerated (6)
- [x] Every orphan-looking directory enumerated (4)
- [x] HEAD, branch, dirty status recorded for each
- [x] Unique commits vs main identified for each branch
- [x] Remote reachability confirmed for all registered branches
- [x] Classification assigned with rationale
- [x] **Zero filesystem/Git mutations performed**
- [x] Second reader can identify next safe action without chat history

---

## 9. Next Actions

1. **Owner decision** on 4 `unknown` worktrees (apex-clock, apex-directory, apex-prospector, apex-verifier) — their unique commits may be relevant to REL-09, SEC-03, DATA-05A
2. **Explicit approval** before any `git worktree remove` or directory deletion for `candidate for archive` entries
3. **REC-02** (interruption drill) will test resume from this inventory
4. **DATA-05A** implementation can proceed on clean main worktree

---

*Generated by REC-01 execution. No mutations performed. Inventory is idempotent — re-running updates only timestamps and current facts.*