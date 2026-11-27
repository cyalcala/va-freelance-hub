import Lake
open Lake DSL

/-- Wave 1 Lean package for `vfh-math-core`.

This lakefile is written for the isolated box toolchain at
`/workspace/vfh-toolchain`. Aeneas's own Lakefile already requires Mathlib
v4.36.0 (rev recorded in its `lake-manifest.json`) and ships a release
build archive, so we depend on that package by path rather than re-fetching
Mathlib. See `docs/plans/MATH_RUST_LEAN_HANDOFF.md`.
-/
package «vfh-math-lean» where
  -- Keep packages under this folder's `.lake` (gitignored, rebuildable).

require aeneas from "/workspace/vfh-toolchain/aeneas/backends/lean"

@[default_target]
lean_lib «VfhMathCore»

@[default_target]
lean_lib «VfhMathTheorems»
