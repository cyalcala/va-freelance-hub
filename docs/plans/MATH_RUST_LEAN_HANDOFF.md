# VA Freelance Hub — Rust / Lean 4 math handoff

**Read this first if you are a new agent resuming this work.** It is written so you can continue with minimal token burn: exact paths, exact commands, current MATH status, guardrails, and the single next step.

Last verified: **7:23 PM Asia/Manila, Friday 27 Nov 2026** on branch `feat/math-wave1-foundation` (feature branch only — never `main`).

## 0. Guardrails (non-negotiable)

- NEVER push or merge to `main`.
- NEVER run `wrangler deploy`, NEVER touch Cloudflare Pages / Workers production, NEVER deploy GCP jobs.
- NEVER touch `/workspace/repos/va-freelance-hub` (stale checkout; its `origin` still points at Secure Source Manager).
- NEVER fetch, push, or recreate SSM (`*.sourcemanager.dev`). GitHub is canonical (`https://github.com/cyalcala/va-freelance-hub.git`). GitLab is the secondary mirror.
- NEVER open, read, cat, or inspect `sa-key.json` or `gcp.txt` anywhere on disk.
- NEVER touch `/workspace/video-tools/hypercore/src` or `cyalcala/hypercore`.
- NEVER use `sudo`. NEVER pipe `curl | sh`. Download installers, inspect, then run.
- Do not edit `apps/web`, `workers/freshness-cron`, or `packages/db` until a later, separately authorized slice. Wave 1 is additive.
- Commit and push only to `origin feat/math-wave1-foundation` after a verified milestone.

## 1. Workspace and toolchain paths

| What | Path |
| --- | --- |
| Fresh GitHub work clone | `/workspace/vfh-math-work` |
| Feature branch | `feat/math-wave1-foundation` (tracks work against `origin/main`; do not push `main`) |
| Isolated toolchain | `/workspace/vfh-toolchain` |
| Env helper | `source /workspace/vfh-toolchain/env.sh` |
| Rust crate | `/workspace/vfh-math-work/crates/vfh-math-core` |
| Lean 4 package | `/workspace/vfh-math-work/proofs/vfh-math-lean` |
| Cargo scratch (rebuildable) | `/workspace/vfh-toolchain/rust-scratch` (`CARGO_TARGET_DIR`) |
| Aeneas + pinned Charon | `/workspace/vfh-toolchain/aeneas` |
| Aeneas Lean + Mathlib dep | `/workspace/vfh-toolchain/aeneas/backends/lean` |
| Stale SSM checkout (DO NOT USE) | `/workspace/repos/va-freelance-hub` |

### Verified toolchain versions (this box)

After `source /workspace/vfh-toolchain/env.sh`:

- `rustup` 1.29.3 (`RUSTUP_HOME=/workspace/vfh-toolchain/rustup`, `CARGO_HOME=/workspace/vfh-toolchain/cargo`)
- `rustc` / `cargo` **1.100.0** (stable, 0ef1bc386, 2026-11-09) — default for `cargo test`
- `rustc +nightly-2026-11-25` **1.102.0-nightly** (739adecd4, 2026-11-24) — required by Charon; installed with `rustc-dev`, `llvm-tools`, `rust-src` (miri is **not** installed; Charon warns and falls back, which is fine)
- Targets: `x86_64-unknown-linux-gnu`, `wasm32-unknown-unknown` (stable and nightly)
- `wasm-bindgen` **0.2.130** (no `wasm-pack`; not needed until a Worker WASM slice)
- `elan` **4.4.0** (`ELAN_HOME=/workspace/vfh-toolchain/elan`)
- `lean` **4.36.0** (commit 611c117bfaf7b7ae1cfcf246ce6fba31e8f509e9)
- `lake` **5.0.0-src+611c117**
- `charon` **0.1.329 (`5a2a17bd531850a9134adfa285eb50e156cd6e06`)** — this is the **Aeneas-bundled** binary, which is the exact `charon-pin` for Aeneas `nightly-2026.11.27-0c19cd5`. Prefer it over `/workspace/vfh-toolchain/charon` (standalone `nightly-2026.11.26` is 4 commits behind the pin).
- `aeneas` **nightly-2026.11.27-0c19cd5**
- Mathlib: **v4.36.0**, rev `fc4f59e577feb1a4956671bc04ac18aaaf8cd842` (via Aeneas `lakefile.lean`; materialized under `proofs/vfh-math-lean/.lake/packages/mathlib`, gitignored)
- `bun` 1.4.4 (repo pins `bun@1.3.14`; 1.4.4 ran the baseline tests cleanly)
- Box disk after Mathlib cache: about **28G free** of 125G on `/workspace` (was 42G before the cache)

A leftover standalone Charon tarball also exists at `/workspace/vfh-toolchain/charon` (`nightly-2026.11.26`). Do not put it first on `PATH`.

## 2. MATH-00 … MATH-13 status ledger

| Card | Focus | Rust module | Aeneas / Lean | Verified status | Remaining work |
| --- | --- | --- | --- | --- | --- |
| MATH-00 | Shared types, version tags, clocks as explicit `now_ms` | `crates/vfh-math-core/src/types.rs` | `types.*` in `proofs/vfh-math-lean/VfhMathCore/{Types,Funs}.lean`; theorems `content_hash_version_tag_v1`, `content_hash_version_tag_v2` | **VERIFIED** (cargo test + lake build) | Keep types narrow. TS façade / ISO-8601 mapping is not started. |
| MATH-01 | Dynamic source allocation | — | — | **NOT STARTED** | Pure allocation policy later; needs measured rewards. Do not implement until MATH-00 telemetry contract is used. |
| MATH-02 | Queueing / backpressure | — | — | TS characterization **VERIFIED** (28/28 wave-2 tests, including Little's law / bounded admission). No Rust port yet. | Next math slice after Wave 1: port `scripts/ci/queue-metrics.ts`. Live telemetry still unverified. |
| MATH-03 | Marginal portfolio coverage | — | — | **NOT STARTED** | Portfolio accounting exists as docs/tests on `main`; no Rust core. |
| MATH-04 | Arrival / adaptive polling, host backoff | — | — | **NOT STARTED** | Candidate: `packages/scraper/shadow-host-backoff.ts`. |
| MATH-05 | Qualification / calibration | — | — | **NOT STARTED** | Keep AI I/O in TS. |
| MATH-06 | Publication integrity | — | — | **NOT STARTED** in Rust. Related TS: publication gateway (do not grant authority from this crate). | Stay out of `packages/db` and writers. |
| MATH-07 | Freshness decay / reservoir | — | — | **NOT STARTED** | Candidate: `packages/scraper/source-posting-date.ts`. |
| MATH-08 | Diversity / concentration | — | — | **NOT STARTED** | |
| MATH-09 | Identity / content-hash encoding | `crates/vfh-math-core/src/content_hash.rs` | translated in `Funs.lean`; Lean theorems `v2_prefix_bytes`, `write_u32be_spec`, `encode_v2_bytes_loop0_spec`, `encode_v2_bytes_loop1_spec`, `encode_v2_bytes_spec`, `encode_v2_bytes_ok_some`, `encode_v2_bytes_injective`, `encode_v2_bytes_injective_eq` | **VERIFIED** in Rust & Lean 4 (sorry-free, standard axioms `[propext, Classical.choice, Quot.sound]` only): v1 matches TypeScript cyrb53 fixtures (including the F-W2-2 alias); v2 length-prefixed encoding rejects the alias and is formally proved injective (`encode_v2_bytes_injective`); v2 display is `v2:` + 16 hex so stored v1 16-hex D1 rows are not blindly invalidated. | Do not migrate D1; keep v2 additive until a separately authorized slice. |
| MATH-10 | Change detection / processing mode | `crates/vfh-math-core/src/processing_mode.rs` | translated (`select_processing_mode`, `select_processing_mode_legacy`, `material_digests_changed`) | **VERIFIED** in Rust: `select_processing_mode_legacy` preserves F-W2-1 (`Reuse` when digests change and no cached snapshot is supplied — live TS behaviour). `select_processing_mode` with `Some(cached_digests)` returns `BoundedReplay` on a material digest change (F-W2-1 fix). Opt-out still outranks. | Do not change `scripts/lake/source-ranker.ts` until a shadow/parity slice is authorized. |
| MATH-11 | AI cascade / VOI | — | — | **NOT STARTED** | Policy math only; provider I/O stays in TS. |
| MATH-12 | Source health / SPC | — | — | **NOT STARTED** | |
| MATH-13 | Profiling / Amdahl | — | — | TS characterization **VERIFIED** (synthetic profile only; no production profile). Own plan says profile before adding a runtime. | Do not ship WASM to the Worker until size/CPU is measured. |

As of `astra777.txt` on `main` (2026-10-27), **no MATH-01–13 card is certified accepted on the live site**. Wave 1 does not claim otherwise. It adds a proven-capable core beside TypeScript.

Recorded live-TS findings still true on `main` (see `docs/plans/MATH_WAVE2_CHARACTERIZATION.md`):

- **F-W2-1**: `selectProcessingMode` ignores material digest *changes*. Fixed only in the Rust `select_processing_mode` (cached snapshot argument).
- **F-W2-2**: `toContentHash("A", "B::C") == toContentHash("A::B", "C")`. Preserved as a v1 fixture; closed by v2 length-prefix encoding.

## 3. One-line verification commands and latest results

Source the env first: `source /workspace/vfh-toolchain/env.sh`

Or run the wrapper: `/workspace/vfh-math-work/scripts/verify-math-wave1.sh` (does not regenerate Aeneas output in-place; that would overwrite `FunsExternal.lean`).

| Command | Latest verified result (27 Nov 2026, 7:23 PM Asia/Manila) |
| --- | --- |
| `cd /workspace/vfh-math-work && bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./scripts/lake/math-wave2-characterization.test.ts` | **VERIFIED** — 28 pass, 0 fail, 245 expect() |
| `cd /workspace/vfh-math-work && bun test --no-env-file --preload ./scripts/ci/test-environment.ts ./apps/web/tests/adversarial-d1-binding-budget.test.ts ./apps/web/tests/native-direct-ingest-binding-budget.test.ts ./apps/web/tests/ai-subrequest-budget.test.ts ./apps/web/tests/directory-audit-budget.test.ts ./apps/web/tests/verify-links-budget.test.ts` | **VERIFIED** — 27 pass, 0 fail, 415 expect() |
| `cd /workspace/vfh-math-work/crates/vfh-math-core && cargo test` | **VERIFIED** — 15 pass, 0 fail |
| `cd /workspace/vfh-math-work/crates/vfh-math-core && charon cargo --preset=aeneas` | **VERIFIED** — exit 0, writes `vfh_math_core.llbc`. Warns that miri is missing; ignore. |
| `aeneas -backend lean -dest /tmp/vfh-lean-regen -namespace VfhMathCore -use-lean-modules false -split-files crates/vfh-math-core/vfh_math_core.llbc` | **VERIFIED** — exit 0, no translation errors (after Aeneas-friendly Rust: no `Debug` in the lib, unrolled hex writer, no em-dash in reason strings, unknown-version flags computed while pushing mismatches). Copy `Types.lean` / `Funs.lean` / template into `proofs/vfh-math-lean/VfhMathCore/`; **do not overwrite** the hand-filled `FunsExternal.lean`. |
| `cd /workspace/vfh-math-work/proofs/vfh-math-lean && lake build` | **VERIFIED** — exit 0, “Build completed successfully (3622 jobs)”. Mathlib cache already downloaded. Module-system warning on `VfhMathTheorems.lean` is non-fatal. |
| `rg -n '^\s*(sorry\|axiom)\b' proofs/vfh-math-lean/VfhMathTheorems.lean proofs/vfh-math-lean/VfhMathCore/FunsExternal.lean` | **VERIFIED** — none (hand-written Lean is sorry- and axiom-free). Generated `Funs.lean` / `Types.lean` should also be axiom-free; do not add `sorry`. |
| `cd /workspace/vfh-math-work/proofs/vfh-math-lean && printf 'import VfhMathTheorems\n#print axioms encode_v2_bytes_injective\n#print axioms encode_v2_bytes_injective_eq\n' | lake env lean --stdin` | **VERIFIED** — both depend only on `[propext, Classical.choice, Quot.sound]` (zero `sorryAx`, zero custom axioms). |
| `source /workspace/vfh-toolchain/env.sh && bash /workspace/vfh-math-work/scripts/verify-math-wave1.sh` | **VERIFIED** — exit 0 (`WAVE1 VERIFY OK`). Script `rg` globs updated to exclude Aeneas-generated `VfhMathCore/FunsExternal_Template.lean` and `.lake/**`. |

## 4. Architecture in one paragraph

TypeScript on `main` stays the live implementation. `vfh-math-core` is a zero-I/O, `#![forbid(unsafe_code)]`, no-dependency Rust crate that (a) parity-tests the live v1 hash and legacy mode selector and (b) introduces the v2 hash encoding and the digest-aware mode selector. Charon translates the crate to LLBC; Aeneas translates LLBC to Lean 4; `lake build` type-checks the model against the Aeneas standard library and Mathlib v4.36.0. Nothing is wired into Workers or D1 yet. Details: `docs/plans/MATH_WAVE1_RUST_LEAN_SPEC.md`.

## 5. Exact next concrete step

MATH-09 (`encode_v2_bytes_injective`) is now proved sorry-free and axiom-free in `proofs/vfh-math-lean/VfhMathTheorems.lean`.

Next concrete steps (stay additive on `feat/math-wave1-foundation`; do not touch `apps/web`, Workers, D1, or `main`):
1. Prove MATH-10 mode-selection invariants in `proofs/vfh-math-lean/VfhMathTheorems.lean` (e.g., opt-out dominance, expired policy/lease forcing `BoundedReplay`, and `select_processing_mode` returning `BoundedReplay` on material digest change when cached digests are present, fixing `F-W2-1`).
2. Or port MATH-02 (`scripts/ci/queue-metrics.ts`) into `crates/vfh-math-core` following the same pipeline (`cargo test` → `charon` → `aeneas` → `lake build`).

## 6. Regeneration pitfalls

- Aeneas will turn a Unicode em dash (`—`) in a Rust string into invalid Lean escapes (`\226\128\148`). Keep reason strings ASCII.
- `#[derive(Debug)]` on lib types made Aeneas fail (`fmt` unimplemented). Use `#[cfg_attr(test, derive(Debug))]` only.
- Do not `aeneas -dest proofs/vfh-math-lean` in place — it will drop files in the package root and can clobber `FunsExternal.lean`. Translate to a scratch dir, then copy `Types.lean` and `Funs.lean` into `VfhMathCore/`.
- `FunsExternal.lean` fills three Rust-std holes (`Option::eq`, `str::is_empty`, `str::eq`) with Aeneas.Std models. Re-fill from `FunsExternal_Template.lean` if the template gains new holes.
- Charon's exact pin is the Aeneas-bundled binary. `env.sh` already puts `/workspace/vfh-toolchain/aeneas` first on `PATH`.
- Local clone used `--filter=blob:none`; Git will fetch blobs on demand. Remote is GitHub, not SSM.
