# ADR-005: Preserve the Cloudflare Pages Compatibility Line Until a Workers Migration Is Approved

## Status

Accepted as the 2026-08-10 hardening pause decision. Revisit only through an
explicit architecture migration decision.

## Date

2026-08-10

## Context

VA Freelance Hub is deployed as an Astro application on Cloudflare Pages with
Cloudflare D1 and GitHub Actions pulse workflows. The active adapter/version
line supports that Pages deployment model. Newer Astro Cloudflare adapter
releases remove Pages support and require a Cloudflare Workers deployment
model.

The dependency audit still reports framework advisories associated with the
older compatibility line. An automatic major upgrade would appear to reduce
scanner noise while actually changing hosting, deployment, binding, routing,
and rollback behavior. That would be an uncontrolled architecture migration,
not a dependency patch.

## Decision

Keep the active Astro and Cloudflare adapter on the last Pages-compatible
line, exact-pin the active packages and lockfile, use isolated Bun linking, and
mitigate the known advisory paths through source/configuration controls.

Do not upgrade to a Pages-incompatible adapter as part of routine dependency
maintenance. A Pages-to-Workers migration must be proposed, tested in an
isolated branch, documented with a new ADR, and accepted with staged deployment
and rollback evidence before it can replace this decision.

## Alternatives Considered

### Upgrade the adapter in place

- Benefit: may remove some scanner findings.
- Cost: changes the supported Cloudflare deployment model and runtime contract.
- Rejected: this is an architecture migration disguised as a package upgrade.

### Ignore all dependency findings

- Benefit: no upgrade or migration work.
- Cost: leaves avoidable supply-chain risk and weakens audit accountability.
- Rejected: the active dependency graph was reduced and mitigations were added;
  residual findings remain visible and tracked.

### Migrate deliberately to Cloudflare Workers

- Benefit: aligns with current adapter direction and can clear the obsolete
  compatibility line.
- Cost: requires binding, routing, CI/CD, preview, monitoring, rollback, and
  production acceptance design.
- Deferred: worthwhile only as a separately approved architecture project.

## Consequences

- Residual upstream Astro/esbuild advisories remain visible in dependency scans.
- The active project preserves the proven Pages/D1 operational path rather than
  silently changing production infrastructure.
- Dependency maintenance must verify Pages compatibility before any framework
  major-version upgrade.
- Future agents must not classify a scanner-only upgrade as a safe patch when
  it would alter the deployment model.
