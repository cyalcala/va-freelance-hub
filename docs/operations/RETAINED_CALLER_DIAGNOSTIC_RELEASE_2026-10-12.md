# Retained caller diagnostic — verified release candidate

This small incident slice identifies the existing scrape endpoint's 503 response
signature without retaining raw body/error text. It changes the retained Worker
caller only. The Pages lock-acknowledgement candidate is separate and uncommitted.
No source admission, cadence, GCP job, schema, publication or billing change is
part of this release. MATH remains 0/13; certified daily flow remains UNKNOWN.

Baseline source `170ad5fd5fecb47ecc7e5bbafaa9ace997dd00a1` is exactly read back
on SSM and GitLab. A fresh depth-one single-branch network clone from SSM,
without local object sharing, recovered this exact HEAD with clean status and
successful `git fsck --full --no-reflogs`. Its portability verifier passed 25
skills / 39 assets / 43 links / zero errors. This proves selected-checkpoint
source recovery, not all refs/history, credentials, dependencies or databases.

## Behavior and local evidence

The parser emits an optional enum-only `serverFailureClass` for server errors.
Only complete bounded HTTP 503 JSON matching the exact deployed endpoint shapes
can produce `REGISTRY_POLICY_UNAVAILABLE` or `RUN_LOCK_UNAVAILABLE`. Additional,
private, contradictory, malformed, oversized or truncated fields yield
`UNCLASSIFIED_SERVER_ERROR`. Non-server responses retain their prior shape.
UNKNOWN, null publication counts, confirmed prefix and existing success/held
classification remain unchanged. A class identifies a received signature,
not an underlying D1 error, committed lock ownership or zero publication.

| Verification | Result |
| --- | --- |
| New-class RED against unchanged parser | 19 expected failures |
| Parser/index targeted | 68 pass / 0 fail / 334 assertions |
| Native Workerd/Miniflare focused | 4 pass / 0 fail / 33 assertions, 35.94s |
| Entire retained Worker regression | 104 pass / 0 fail / 628 assertions, 148.10s |
| Typecheck | exit 0 |
| Wrangler 4.143.0 deployment dry run | exit 0; 18.31 KiB upload / 5.42 KiB gzip |
| Four governance audits | all exit 0 |
| Independent three-file review | no blocking finding; bounded caller scope approved |

Actual bundle is `workers/freshness-cron/tmp/retained-caller-diagnostic-oct12/index.js`
(outdir resolution is relative to the Worker config, despite the root README).
SHA256 `3fa64867ecb2256111244404504a82fac974c4ed4bf7d937062a360e1ea4cc92`.
Parser LF-normalized SHA256:
`b5a74dca71a2d32ef5d2dbbf8b4bbf0786caa0a6dacd614ec7fd354ca9ef0028`.
The native proof makes one synthetic upstream POST, rejects the response, emits
only the sanitized receipt, and verifies private-token absence. No live scrape
POST was sent for these tests.

## Concrete controlled release and observation

Target is the existing `va-freelance-freshness-cron` Worker. Preserve its deployed
`*/10` schedule, secret binding, target URLs, compatibility date, disabled public
route and existing independent hourly shadow at minute 20. Its current rollback
version was `1ddd35ba-0b09-4cb3-a771-61b327d2be4c`; downloaded module SHA256
`eed05d3355e8237b92f0af92b55935024b0f6baa17ddbcf60466948dcf6f821b`.
Read current deployment again before changing it to detect unrelated drift.

The local caller also includes prior bounded-body, manual-redirect refusal and
safe manual-error response changes absent from the October 3 version; these are
caller behavior changes, not merely new logs. Full native regression covers
them. Source inspection independently confirmed no new target or shadow action.

After the verified code commit is pushed/read back from canonical SSM and mirror,
deploy the existing Worker with retained variables and a source-SHA message.
Record version/deployment, uploaded module digest and configuration read-back.
Use a bounded sanitized passive tail to observe a normal scheduled tick, without
an extra source fetch. Roll back on changed target/bindings/actions, privacy
leakage or incorrect count/UNKNOWN semantics; the pre-existing endpoint 503
alone is not evidence of a caller regression.

NEXT is to use the observed class and native lock counterexample to make a
compatible endpoint repair, then restore permitted acquisition/ready supply and
measure actual receipt/visibility outcomes. Current Pages/schema stays at its
observed older revision/0054 until separately tested and recovered. Deployment
and runtime observation receipts follow; neither is claimed by this pre-release
document.
