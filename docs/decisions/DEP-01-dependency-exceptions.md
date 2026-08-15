# Dependency Exceptions and Reporting Policy

Date: 2026-08-15
Owner: Cyrus Alcala
Status: Accepted — tracks path-verified dependency exceptions from `bun audit --production`.

## Policy

1. **`bun audit --production` runs on every PR** and on a monthly schedule. A
   non-zero exit does not block CI because the known exceptions are documented
   below and verified to be inactive or non-exploitable in this deployment.
2. **New advisories** without a documented exception must be reviewed within
   7 days of the audit run. If no exploitable path is found, add a new entry
   below. If a real risk exists, file an issue and evaluate mitigation or a
   targeted upgrade.
3. **Deprecation of an exception** happens automatically on the review date.
   If the advisory has not been fixed, superseded, or confirmed inactive, the
   exception must be renewed.
4. **Major upgrades** (Pages-to-Workers adapter, framework architecture
   changes) are architecture decisions governed by ADR-005, never routine
   dependency patching.

## Exceptions

| Advisory | Package | Severity | Path analysis | Inactive in this deployment? | Review date |
| --- | --- | --- | --- | --- | --- |
| `GHSA-xr5h-phrj-8vxv` Server island replay | astro | low | Requires `define:vars` in a server island with encrypted params; this app has no server islands using `define:vars`. | Yes | 2026-09-15 |
| `GHSA-j687-52p2-xcff` XSS in define:vars | astro | moderate | Requires user-controlled `</script>` injection in a `define:vars` expression; no such path in any `.astro` file. | Yes | 2026-09-15 |
| `GHSA-jrpj-wcv7-9fh9` Spread props XSS | astro | moderate | Requires unescaped attribute names on a React island spread; no dynamic spread-prop name source found. | Yes | 2026-09-15 |
| `GHSA-f48w-9m4c-m7f5` Spread props incomplete fix | astro | moderate | Same surface as GHSA-jrpj-wcv7-9fh9; no dynamic attribute-name source in this codebase. | Yes | 2026-09-15 |
| `GHSA-7pw4-f3q4-r2p2` Transition XSS | astro | low | Requires unescaped `transition:*` values on a hydrated island; no transition directive uses untrusted input. | Yes | 2026-09-15 |
| `GHSA-4g3v-8h47-v7g6` View transition animation XSS | astro | moderate | Requires unescaped animation property in View Transition API; no user-controlled animation values exist. | Yes | 2026-09-15 |
| `GHSA-2pvr-wf23-7pc7` Host header SSRF | astro | **high** | Advisory explicitly excludes `@astrojs/cloudflare` — Cloudflare handles the Host header upstream. | Yes | 2026-09-15 |
| `GHSA-8hv8-536x-4wqp` Slot name XSS | astro | **high** | Requires user-controlled slot names in a hydrated island; no dynamic slot-name source found. | Yes | 2026-09-15 |
| `GHSA-g7r4-m6w7-qqqr` esbuild Windows dev server read | esbuild | low | Windows dev-server file-read issue; this project does not expose its dev server to untrusted parties. | Yes | 2026-09-15 |
| `GHSA-88gm-j2wx-58h6` Cloudflare SSRF via image binding | @astrojs/cloudflare | low | Requires the Cloudflare image transform binding; this app uses passthrough with no `getImage` or image-service path to the binding. | Yes | 2026-09-15 |

## Reporting Cadence

- **PR gate:** `bun audit --production` runs alongside CI guardrails. New
  advisories without an exception entry trigger a PR annotation (not a failure).
- **Monthly review:** the first Monday of each month, review all active
  exceptions. Remove or renew each one. Record the review date and outcome in
  the table above or in a digest commit.
- **Quarterly scan:** a full `bun audit` (not only production) checks
  dev/test dependencies. Review and update the exception table.

## Rejected Upgrade Routes

> See ADR-005 for the Pages-compatibility policy.

- Upgrading `@astrojs/cloudflare` beyond the current pinned version (which
  removed Pages support) is an architecture migration, not a dependency patch.
- Upgrading `astro` to 6.x requires verifying the new adapter supports the
  Pages Functions runtime contract, D1 bindings, and deployment path.
- Upgrading `wrangler` major versions: test against the Pages deploy pipeline
  before committing.

## Rollback

If a dependency change breaks the Pages deploy contract or introduces a
runtime regression, revert the change immediately and update this document
with the observed failure evidence. Do not leave a broken deploy path while
investigating a fix.