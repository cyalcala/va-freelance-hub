# Partner/permission evidence pack — Ashby (dedicated partner job feed) (SP-17)

- **Target:** `ashby`
- **Status:** **outreach_ready**
- **Generated:** 2026-08-29T14:00:00.000Z
- **Evidence URL:** <https://developers.ashbyhq.com/docs/dedicated-partner-job-feeds>

| Field | Value |
| --- | --- |
| Provider route | https://developers.ashbyhq.com/docs/dedicated-partner-job-feeds |
| Contact path | integrations@ashbyhq.com |
| Requested scope | Read-only dedicated partner job feed (JSON/XML) for customers who explicitly enable our integration in Ashby's Admin section |
| Data minimization | Store only minimal factual metadata (title, company, location, work type, canonical apply link); full descriptions only if explicitly permitted |
| Attribution | Canonical linkback to the original Ashby job posting URL on every listing |
| Cadence | Hourly (matches Ashby's documented feed update cadence) |
| Removal semantics | Deactivate within one successful reconciliation cycle after a posting disappears from a complete feed pull |
| No-candidate-data terms | We do not collect, store, or process candidate/applicant data of any kind — only public job posting metadata |

## Notes

Ashby's documentation specifies no attribution/usage-restriction terms for the partner feed; the request to integrations@ashbyhq.com should explicitly confirm attribution and content-scope expectations before any customer is asked to enable the integration. Customers must individually opt in via Ashby's Admin section — this is a customer-authorized mechanism even though the technical route is an Ashby-operated partner feed.

## Lease and revocation

If granted, permission attaches to the relevant `source_registry` row as a **365-day** `policyExpiry` lease (SP-05's `computePolicyExpiry`), with renewal beginning 30 days before expiry per the strategy's evidence-lease schedule. Revocation reuses SP-05's durable `source_opt_outs`/`source_decisions` — no new mechanism.

This pack is a prepared artifact only. No message has been sent and no source has been activated by generating it.
