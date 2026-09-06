# SP-23B current-evidence admission

Status: **VERIFYING** (local G3 passed; not deployed). This is an implementation
slice of SP-23, not a source activation or autonomy-cutover decision.

## Bounded work contract

| Field | Contract |
| --- | --- |
| unit_id | SP-23B, current-evidence admission |
| objective | Make source admission depend on immutable current evidence and a server-owned recurrent-observation policy. |
| problem_statement | The deployed foundation accepts a caller-selected evidence token and threshold, and counts all historical healthy observations. Those values do not prove current source permission, configuration, or recurrent health. |
| evidence | Run 43; independent transition/gateway/dispatcher inspection at the start SHA. Production registry, profile, evidence reserve, and shadow history were empty at the recorded 13:27:59.704Z measurement. |
| start_sha | `3c70efe6a18a1c2ab3f4500c3dbcdbcd82c63f7c` (fetched origin/main matched) |
| branch | `codex/sp-23b-current-evidence` |
| dependencies | SP-23A deployed and read-only verified; SP-03/05/07/08/22 contracts. |
| allowed_surface | Additive migration 0040, existing transition/evidence/observation modules and shadow route, focused tests, read-only release verification, recovery documentation. |
| forbidden_surface | Source activation, fabricated source permission, a new schedule, public canary dispatch, general autonomous admission, schema-history rewriting, unrelated cleanup. |
| primary_lifecycle | Incremental data-integrity implementation with independent adversarial criticism. |
| required_skills | Existing quality-hardening routing and code-review-and-quality guidance; use the repository contracts as authority. |
| acceptance_criteria | Immutable current source/provider/evidence binding; server-selected policy and observations; SQL rejects stale or bypassed admission; restrictive transitions remain available; exact-six behavior preserved; full G3 gates and normal reviewed release with fixed read-only D1 evidence. |
| verification_commands | Focused evidence, gateway, observation and migration tests; installed Wrangler LF/CRLF splitting; full migration rehearsal; `bun run test`, `bun run typecheck`, `bun run build`, `bun run audit:guardrails`; exact-SHA PR/main CI and bounded production smoke. |
| rollback | Keep admission and canary publication disabled, retain additive evidence/history and opt-outs, and deploy only code compatible with the stricter schema. Never restore the evidence-token-only promotion path. |
| critic_requirements | Challenge fabricated/wrong-source evidence, profile/source A-to-B-to-A edits, identity replacement, old shadow epochs, duplicate observations, later failures, revocation and opt-out races, historical replay, and rollback with invalid evidence. |

## Implementation decisions

The new source evidence record is immutable and bound to monotonically advancing
source and provider governance revisions. Material configuration edits invalidate
old evidence even if the old field values are later restored. An evidence record
preserves the actual reviewed inputs and primary evidence references; the old
report's completeness flag or noncryptographic packet hash is not an admission
authority. Recording evidence does not grant compliance or activate a source.

New observations bind to the same evidence record and the current shadow-entry
transition hash. A rollback to shadow therefore starts a new observation period.
The probe result must agree with the stored identity, endpoint, timing and
diagnostics. Distinct dispatches may legitimately see unchanged response bodies;
deduplication uses dispatch identity, not response hash. A later failed dispatch
must remain recordable and invalidate promotion, even when it occurs on a day
with an earlier healthy observation.

The bootstrap policy `sp23-shadow-7d-v1` requires at least eight healthy
observations on distinct UTC days spanning at least seven days, drawn from a
fourteen-day lookback. The latest must be at most forty-eight hours old, at least
one must contain plausible opportunities, and no nonhealthy observation may be
present in the selected current window. This implements the existing real-source
seven-day shadow requirement; it does not assert that a healthy empty probe
provides job supply. The gateway chooses the policy and exact observation set,
and the database rechecks their bindings in the atomic transition write.

New admissions use the versioned replay packet. Existing v1 history remains
replayable and restrictive v1 transitions remain available, while v1 admissions
cannot bypass the new evidence gate. Promotion to unrestricted active operation
remains held for SP-23C's actual canary publication/exposure contract.

The dispatcher remains unscheduled. Its existing authenticated route will require
the same current evidence before it fetches, overlay durable opt-out memory, and
store revision-scoped observations. The complete masterplan Autonomy Cutover
Predicate remains unmet.

## Verification and criticism

Local G3 for this branch at 2026-09-06:

- `bun run test`: **1152 pass / 0 fail / 3665 assertions / 107 files**
- `bun run typecheck`: pass
- `bun run audit:guardrails`: pass
- `bun run build`: pass
- `bun run scripts/ci/rehearse-d1-migrations.ts`: fresh and legacy **94/94**, including migration 0040

Independent criticism covered during implementation: fabricated/wrong-source
evidence, ABA configuration edits, rollback-to-shadow starting a new observation
epoch, duplicate dispatch keys, later failed observations, parser failures
reported as `SCHEMA_BROKEN` rather than `HEALTHY_EMPTY`, caller-selected
thresholds, and v1 admission bypass. SQL cannot insert an eight-day observation
history under the five-minute recency guard; that window is proven in TypeScript
and rechecked on the atomic transition write.

This is **not** production acceptance, source activation, or a measured supply
increase. Remaining before SP-23B can be called deployed: exact-SHA PR/main CI,
migration 0040 application, and read-only D1 evidence. SP-23C and real
source-scoped observation remain after that. The Autonomy Cutover Predicate
remains unmet.
