# Primary-evidence renewal decision — 2026-09-08

Reference: `apex-audit-2026-09-08-primary-renewal`.
Scope: existing conditional, non-publishing shadow identities only; preserve
existing content scope, cadence, original application links, opt-outs, source
leases and authority actions. No new admission or publication is authorized by
this renewal operation. Existing full cutover predicate still applies.

The primary sources were reread on September 8:

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) documents public GET access to published job-board data without authentication; application submission is a separate authenticated operation and remains unused.
- [Recruitee feed documentation](https://docs.recruitee.com/docs/feed) documents the machine-readable job feed already used by the reviewed source adapter.
- [Teamtailor RSS guide](https://support.teamtailor.com/en/articles/11171756-rss-feed-how-to-guide) describes its supported RSS feed mechanism.

These documented access mechanisms support retaining the project's existing
conditional minimal-metadata shadow decision under ADR-007 and the owner's
source-supported-access mandate. They do not establish a blanket right to
republish full descriptions. No applicable contrary signal was identified in
this bounded primary-document review. Per-source robots must still pass on each
probe; unknown/blocked signals stop renewal. The source contracts and opt-out
requirements remain unchanged. Captured hashes are technical bindings to this
review, not substitutes for it.

The old provider hash was computed from URL plus time. It is not historical
content proof. Renew by fetching actual UTF-8 document content, binding its hash
to this adjudication, running fresh allowed probes, and atomically replacing the
provider capture plus appending all affected admission packets. Keep old packets
and observations. Fresh evidence IDs restart observation qualification; never
count prior dates toward the new epoch.

Transport: authenticated `POST /api/cron/source-renew`, provider allowlist
Greenhouse/Recruitee/Teamtailor, at most four identities. Preview has zero writes;
renew requires matching preview revisions, evidence IDs and reviewed hashes.
Fetch drift returns 409 before mutation. Native D1 batch must pass a group/revision
guard and atomically append every packet. Interrupted result requires readback,
not a blind retry. Rollback preserves history and requires a new reviewed decision;
never delete append-only evidence or restore an invalid hash as accepted truth.

Tests exercise real SQLite migration guards, mid-batch rollback, concurrent group
and revision changes, unchanged leases/authority, and old-observation rejection.
Independent review found no release blocker; native D1 acceptance remains required.
