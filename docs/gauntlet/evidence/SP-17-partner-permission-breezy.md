# Partner/permission evidence pack — Breezy HR (employer-authorized Positions API) (SP-17)

- **Target:** `breezy`
- **Status:** **draft**
- **Generated:** 2026-08-29T14:00:00.000Z
- **Evidence URL:** <https://developer.breezy.hr/reference/authorization>

| Field | Value |
| --- | --- |
| Provider route | _(not documented — see notes)_ |
| Contact path | _(not documented — see notes)_ |
| Requested scope | Not applicable via a Breezy-level partner path — access requires an already-directory-listed employer using Breezy to generate and share their own Personal Access Token (PAT) from their account's API Keys settings |
| Data minimization | Minimal facts only, same as every other public-index source |
| Attribution | Canonical linkback to the employer's own Breezy posting URL |
| Cadence | Employer-specific, respecting Breezy's own (undocumented) API rate limits |
| Removal semantics | Deactivate within one successful reconciliation cycle; stop immediately if the employer revokes the PAT |
| No-candidate-data terms | We do not collect, store, or process candidate/applicant data |

## Missing (draft — not outreach-ready)

- `providerRoute`
- `contactPath`

## Notes

Breezy has no documented partner/integration program to request access from Breezy itself — every API request (except /v3/signin and /v3/health) requires a PAT the CUSTOMER creates in their own account. The only compliant acquisition path is employer opt-in (matching this project's existing 'permissioned' tier), not partner outreach to Breezy. The generic career-site /json route used historically is explicitly not the perpetual path (strategy doc). No generic Breezy source is activated by this evidence pack.

## Lease and revocation

If granted, permission attaches to the relevant `source_registry` row as a **365-day** `policyExpiry` lease (SP-05's `computePolicyExpiry`), with renewal beginning 30 days before expiry per the strategy's evidence-lease schedule. Revocation reuses SP-05's durable `source_opt_outs`/`source_decisions` — no new mechanism.

This pack is a prepared artifact only. No message has been sent and no source has been activated by generating it.
