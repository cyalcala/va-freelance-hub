# Partner/permission evidence pack — Jobvite (partner marketplace) (SP-17)

- **Target:** `jobvite`
- **Status:** **outreach_ready**
- **Generated:** 2026-08-29T14:00:00.000Z
- **Evidence URL:** <https://www.jobvite.com/partners/>

| Field | Value |
| --- | --- |
| Provider route | https://www.jobvite.com/marketplace/partner-request/ |
| Contact path | Partner application: https://www.jobvite.com/marketplace/partner-request/ ; demo request: https://www.jobvite.com/lp/request-a-demo/ ; phone (888) 885-5299 |
| Requested scope | Partner/marketplace integration access for read-only job-posting syndication (exact API scope not publicly documented — to be confirmed during partner application) |
| Data minimization | Minimal facts only |
| Attribution | Canonical linkback to the original Jobvite posting |
| Cadence | To be confirmed with Jobvite during partner onboarding — no public rate guidance found |
| Removal semantics | Deactivate within one successful reconciliation cycle |
| No-candidate-data terms | We do not collect, store, or process candidate/applicant data |

## Notes

No developer/API documentation URL was found on Jobvite's public partner marketplace page; the partner application process itself will presumably surface the actual technical/legal terms. This pack is outreach-ready in the sense that a partner-application path exists to submit our request — the partner's own terms remain genuinely unknown until Jobvite responds. No generic Jobvite source is activated by this evidence pack.

## Lease and revocation

If granted, permission attaches to the relevant `source_registry` row as a **365-day** `policyExpiry` lease (SP-05's `computePolicyExpiry`), with renewal beginning 30 days before expiry per the strategy's evidence-lease schedule. Revocation reuses SP-05's durable `source_opt_outs`/`source_decisions` — no new mechanism.

This pack is a prepared artifact only. No message has been sent and no source has been activated by generating it.
