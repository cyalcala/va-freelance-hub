# MATH Wave 1 specification — Rust core + Charon / Aeneas / Lean 4

Version 1.0 · 2026-11-27 · Branch `feat/math-wave1-foundation` · Additive, zero live-site risk

This is the architecture and contract for Wave 1 (`MATH-00`, `MATH-09`, `MATH-10`). Operational resume instructions live in [`MATH_RUST_LEAN_HANDOFF.md`](MATH_RUST_LEAN_HANDOFF.md).

## Goal

Establish a **pure**, **versioned**, **formally translatable** math core beside the live TypeScript system, without rewriting D1 rows, without deploying, and without changing `apps/web`, `workers/freshness-cron`, or `packages/db`.

The live site continues to use:

- `packages/scraper/contentHash.ts` — v1 `title::url` + cyrb53, 16 hex chars, `contentHash@v1`
- `scripts/lake/source-ranker.ts` `selectProcessingMode` — version-deps ladder; **does not** compare material digest *changes* (F-W2-1)

Wave 1 adds `crates/vfh-math-core` as the place where those rules are stated exactly, tested, and translated to Lean.

## Crate layout

```
crates/vfh-math-core/
  Cargo.toml          # no dependencies; package.metadata.charon present
  src/lib.rs          # #![forbid(unsafe_code)]
  src/types.rs        # MATH-00
  src/content_hash.rs # MATH-09
  src/processing_mode.rs # MATH-10
  vfh_math_core.llbc  # Charon output (regenerable)

proofs/vfh-math-lean/
  lean-toolchain      # leanprover/lean4:v4.36.0
  lakefile.lean       # requires Aeneas from /workspace/vfh-toolchain/aeneas/backends/lean
  lake-manifest.json  # Mathlib v4.36.0 pin
  VfhMathCore.lean
  VfhMathCore/{Types,Funs,FunsExternal,FunsExternal_Template}.lean
  VfhMathTheorems.lean
```

## MATH-00 — shared types

- `ContentHashVersion::{V1,V2}` and tags `contentHash@v1` / `contentHash@v2`
- `VersionDeps`, `MaterialDigests`, `Dependency` — names align with `scripts/lake/source-ranker.ts`
- `WAVE1_CONTRACT_VERSION = 1`
- Clocks enter the core as explicit `now_ms: u64` (and optional expiry millis). The TypeScript façade (future slice) is responsible for ISO-8601 parsing. Unparseable expiry in live TS `selectProcessingMode` does not fire (`new Date(invalid) < now` is false); map that to `None`.

## MATH-09 — content hash (F-W2-2)

**v1 (parity with live TS):** iterate UTF-16 code units (`charCodeAt`), concatenate `title`, `':'`, `':'`, `url`, mix with the same cyrb53 constants as `hashString`. Output: 16 lowercase hex chars. Confirmed fixtures include `toContentHash("Virtual Assistant — Remote", "https://example.invalid/jobs/1") = 2436a0baf741a4d9` and the F-W2-2 aliases (`A`+`B::C` and `A::B`+`C` both hash to `5e24bcea38eadbb7`).

**v2 (fix, not a silent D1 migration):** length-prefixed UTF-8 bytes `u32be(len(title)) || title || u32be(len(url)) || url`, hashed with the same cyrb53 mixer over bytes. Display: `v2:` + 16 hex (19 bytes). A stored v1 row is always 16 hex characters, so v2 cannot be confused with it. Existing D1 `content_hash` / `contentHash@v1` values stay valid until a separately authorized migration.

The encoding is injective on byte-string pairs. The 64-bit fingerprint still has a birthday bound; F-W2-2 is an *encoding* collision, which v2 closes.

## MATH-10 — processing mode (F-W2-1)

`select_processing_mode_legacy(input, current_versions, now_ms)` reproduces `selectProcessingMode`:

1. opt-out → `BoundedReplay`
2. policy expiry / lease expiry (`exp < now_ms`) → `BoundedReplay`
3. version mismatches: unknown/unversioned stored values → `Full`; a single targeted dependency (`Geo`, `Taxonomy`, `Identity`, `Policy`) → `BoundedReplay`; otherwise `Reindex` (including parser/model)
4. sufficient evidence (qualified > 0, candidates > 0, non-empty fingerprint and content hashes) → `Reuse`
5. else `Full`

Missing `description_hash` alone still allows `Reuse` (wave-2 characterization).

`select_processing_mode(..., cached_digests: Option<MaterialDigests>)` is the corrected selector. After the legacy ladder, a would-be `Reuse` becomes `BoundedReplay` ("Material digest changed") when a cached snapshot is supplied and `fingerprint_hash`, `content_hash`, `policy_hash`, or both-present `description_hash` differ. Opt-out and expiry still outrank a digest change.

The live TypeScript function has no cached-digest argument, so F-W2-1 remains true on `main` until a later shadow slice threads previous digests through.

## Formal pipeline

1. `charon cargo --preset=aeneas` (Charon 0.1.329, pin `5a2a17bd`, rustc nightly-2026-11-25) → `vfh_math_core.llbc`
2. `aeneas -backend lean -use-lean-modules false -split-files` (Aeneas nightly-2026.11.27-0c19cd5) → Lean 4
3. `lake build` against Aeneas + Mathlib v4.36.0
4. Hand-written theorems in `VfhMathTheorems.lean` (sorry-free)

Aeneas-friendly constraints learned in Wave 1 (keep these):

- No `#[derive(Debug)]` on lib types (`fmt` is unimplemented in the backend). Use `#[cfg_attr(test, derive(Debug))]`.
- No Unicode em dashes in string literals (Aeneas emitted invalid Lean escapes `\226\128\148`).
- Prefer unrolled fixed-array writes over slice loops when Aeneas reports `Unreachable`.
- Avoid second-pass loops that re-borrow struct fields Aeneas already loaned; compute flags while first walking the data.
- Keep the crate dependency-free and panic-free on library paths.

## What Wave 1 deliberately does not do

- No Cloudflare / GCP deploy, no D1 schema or row rewrite, no change to live TS selectors.
- No WASM in the Worker yet (MATH-13: measure first). `wasm32-unknown-unknown` and `wasm-bindgen` 0.2.130 are installed only as toolchain preparation.
- No claim that MATH cards 01–13 are accepted on production.
