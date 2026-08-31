# ADR-007: Adopt Autonomous Constitutional Source Governance

## Status

Accepted

This is a planning and governance decision. It authorizes no immediate source
activation, D1 write, schedule, deployment, external contact, purchase, or
credential grant.

**Governing masterplan:**
[`SOURCE_REPLENISHMENT_MASTERPLAN.md`](../SOURCE_REPLENISHMENT_MASTERPLAN.md),
especially its canonical **Autonomy Cutover Predicate**. The predicate governs
the system-level cutover; shorter lists in this ADR are non-exhaustive.

## Date

2026-08-31

## Context

ADR-006 established the correct controlled-replenishment foundation: exact
source identities, independent compliance and operational state, evidence
leases, source-specific constraints, shadow/canary progression, opt-outs,
quarantine, and reversibility.

It also assumed that every source activation would remain a separately
reviewed implementation/deployment unit, required reviewer acceptance before
canary, and prohibited automatic technical promotion. That assumption is safe
for bootstrap but cannot be the permanent operating model. It makes the
founder or another named reviewer a source-admission clerk forever and leaves
the public utility dependent on one person's availability.

The opposite extreme—one AI with general database/cloud authority deciding and
mutating production—is also unsuitable. It concentrates errors, prompt
injection, model drift, and credentials in one opaque actor.

## Decision

VA Freelance Hub adopts **constitutional, evidence-bound autonomous source
governance** as the target steady state.

After the masterplan's complete Autonomy Cutover Predicate is separately
implemented and accepted, ordinary exact source identities that use an established provider
mechanism may progress through evidence collection, recurrent shadow, bounded
canary, activation, renewal, quarantine, replacement, and retirement without
affirmative human source-by-source approval.

After cutover, each individual autonomous decision must additionally satisfy
all of the following; this per-decision list does not replace the system-level
predicate:

1. deterministic hard stops and current opt-outs pass;
2. the exact source identity and provider mechanism are unambiguous;
3. required primary evidence is current and hashed;
4. independent risk-weighted AI adjudication is reproducible;
5. a durable shadow runner has produced stored observations;
6. marginal unique Filipino-accessible yield and quality are measured;
7. public canary volume is mechanically source-scoped and also bounded by
   provider/origin/risk-domain and global publication, request/byte,
   promotion-rate, and concurrency budgets with exposure accounting;
8. an isolated kill switch and automatic rollback are proven;
9. the requested transition is submitted through a capability-limited typed
   gateway and revalidated against current schema and policy; and
10. the decision, dissent, versions, expiry, and outcome enter an append-only
    ledger.

Models do not receive arbitrary SQL or unrestricted cloud credentials. They
produce typed decisions; deterministic code enforces the encoded
policy/lifecycle state machine, field constraints, evidence leases,
blast-radius limits, and rollback.

Technical health alone still never promotes a source. Robots allowance, a
public URL, an HTTP success, adapter compatibility, raw job count, or model
confidence is insufficient on its own.

## Human and organizational boundary

The founder is the initial constitutional steward and may remain an active
maintainer, but is not required to approve ordinary source identities.

Human or organizational authority remains necessary for:

- constitutional and mission amendments;
- contracts, payments, paid commitments, and material funding obligations;
- privileged account and credential custody;
- external permission or authorization that only a provider/employer can
  grant;
- genuine unresolved legal disputes;
- contested appeals and conflicts of interest; and
- irreversible institutional commitments.

A verified opt-out or restrictive external change may cause an immediate
narrow automated pause. Emergency authority may reduce access or publication;
it cannot expand the constitution.

## Bootstrap compatibility

This ADR distinguishes target governance from present capability.

Until the governing masterplan's complete named Autonomy Cutover Predicate has
accepted implementation and production evidence, the current exact-six
boundary and source-specific SP bootstrap gates remain in force. No partial
summary is independently sufficient.

During bootstrap, a source activation remains an auditable implementation unit.
After the control plane is accepted, a routine exact identity under an
established mechanism becomes an auditable registry decision event. A new
provider mechanism, constitutional amendment, contract, purchase, permission
agreement, or credential grant remains a separately governed change.

## Relationship to ADR-006

This ADR partially supersedes only these ADR-006 governance requirements:

- mandatory human/reviewer acceptance for every routine canary or activation;
- the requirement that every exact identity activation forever be a distinct
  code deployment; and
- the blanket prohibition on automatic promotion when that promotion is
  constitutional, evidence-backed, observed, capped, replayable, and
  reversible.

ADR-006 remains authoritative for its registry foundation, exact identities,
independent state axes, evidence leases, public-index content posture,
source-specific constraints, opt-outs, staged observation, quarantine,
rollback, and fail-closed treatment of ambiguity.

## Consequences

Positive consequences:

- routine replenishment no longer depends on the founder being present;
- source decisions become more reproducible than informal human approval;
- repeated tenants can reuse a proven mechanism without wildcard publication;
- reversals, dissent, and evidence expiry become first-class data;
- community participation can scale through evidence and appeals; and
- institutional succession no longer changes the admission standard.

Costs and risks:

- the transition gateway, shadow store, real canary limiter, decision ledger,
  contract linter, and rollback evaluator must be built and tested;
- independent adjudication consumes compute and may still share blind spots;
- web evidence must be treated as prompt-injecting untrusted input;
- model/provider diversity and institutional custody add operational cost; and
- the current SP unit contracts require explicit reconciliation rather than a
  silent reinterpretation.

## Rejected alternatives

### Founder or committee approves every source

Rejected as the permanent model because it creates a queue, inconsistent
availability, and a single point of institutional failure. Human review remains
available for exceptional external-authority cases and appeals.

### One sovereign AI with general production access

Rejected because speed does not compensate for correlated judgment errors,
prompt injection, excessive privilege, poor replayability, and weak separation
of powers.

### HTTP-health automatic promotion

Rejected because technical reachability cannot establish authority, relevance,
unique supply, content scope, or portfolio value.

## Revisit triggers

Revisit this decision if:

- law or a material source/provider agreement requires named human approval;
- decision replay cannot reproduce autonomous outcomes reliably;
- autonomous admissions create unacceptable correction, opt-out, or harm rates;
- independent adjudication proves materially correlated or vulnerable to
  evidence poisoning;
- the typed gateway cannot constrain production mutations as designed; or
- community/organizational governance adopts a stronger compatible
  constitutional mechanism.
