#!/usr/bin/env bash
# Wave 1 verification — run from any cwd after: source /workspace/vfh-toolchain/env.sh
set -euo pipefail
source /workspace/vfh-toolchain/env.sh
cd /workspace/vfh-math-work

echo "== Bun characterization (MATH-02/10/13 on TypeScript main) =="
bun test --no-env-file --preload ./scripts/ci/test-environment.ts \
  ./scripts/lake/math-wave2-characterization.test.ts

echo "== Bun D1 / budget tests =="
bun test --no-env-file --preload ./scripts/ci/test-environment.ts \
  ./apps/web/tests/adversarial-d1-binding-budget.test.ts \
  ./apps/web/tests/native-direct-ingest-binding-budget.test.ts \
  ./apps/web/tests/ai-subrequest-budget.test.ts \
  ./apps/web/tests/directory-audit-budget.test.ts \
  ./apps/web/tests/verify-links-budget.test.ts

echo "== cargo test vfh-math-core =="
(cd crates/vfh-math-core && cargo test)

echo "== charon cargo --preset=aeneas =="
(cd crates/vfh-math-core && charon cargo --preset=aeneas)

echo "== aeneas -backend lean =="
DEST=/workspace/vfh-math-work/proofs/vfh-math-lean
# Keep hand-written files; regenerate Types/Funs/template only into a scratch
# folder if you need a fresh translation, then merge carefully.
# Default: translate in place is destructive to FunsExternal.lean — do not
# run this step unless you intend to re-apply FunsExternal fills.
# aeneas -backend lean -dest "$DEST" -namespace VfhMathCore \
#   -use-lean-modules false -split-files \
#   crates/vfh-math-core/vfh_math_core.llbc

echo "== lake build (Wave 1 Lean) =="
(cd proofs/vfh-math-lean && lake build)

echo "== sorry / axiom check (hand-written theorems must be sorry-free) =="
if rg -n --glob '!VfhMathCore/Funs.lean' --glob '!VfhMathCore/Types.lean' \
    '^\s*(sorry|axiom)\b' proofs/vfh-math-lean; then
  echo "FOUND sorry/axiom in hand-written Lean" >&2
  exit 1
fi
echo "hand-written Lean is sorry/axiom free"
echo "WAVE1 VERIFY OK"
