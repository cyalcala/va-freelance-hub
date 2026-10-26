> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

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

## Canonical source and controlled deployment receipt

The frozen caller slice is commit
`c5521b1b1ca977e9a762413965db6df3a5dc6019`. Both SSM and GitLab returned this
exact SHA for `refs/heads/codex/verified-flow-directory-checkpoint` after push.
The earlier binding checkpoint `170ad5fd5fecb47ecc7e5bbafaa9ace997dd00a1`
was also pushed and read back on both remotes; its source recovery is above.

After the owner resumed the goal, fresh read-only preflight at 11:06:52 UTC
(19:06 Manila) confirmed the old version, downloaded module digest, target URLs,
secret binding name, compatibility date, disabled workers.dev/previews and
`*/10` schedule still matched the rollback baseline. Cached OAuth had expired;
one normal pinned Wrangler `whoami` refresh succeeded. Failed reads were not
used as drift evidence. No credential value was retained.

The pinned Wrangler 4.143.0 command deployed only this existing Worker with
`--keep-vars --strict` and message
`SSM c5521b1b1ca977e9a762413965db6df3a5dc6019 retained caller failure signatures`.
It exited 0, uploaded 18.31 KiB / 5.42 KiB gzip and reported version
`5869833f-bdd2-4d74-99f1-ab571a4a5fe4`, with `*/10 * * * *` retained.
Independent deployment/configuration/module read-back and a passive normal
scheduled response are pending. CLI upload success does not establish endpoint
repair, new acquisition, publication, visibility or daily throughput. The Pages
lock candidate remains separate; no manual lock release or migration occurred.

## Independent post-release observation

At 11:11:23 UTC, independent Cloudflare API read-back confirmed deployment
`4e85ee4c-e21d-4e77-811f-a61b040b0836`, 100% version
`5869833f-bdd2-4d74-99f1-ab571a4a5fe4`, with the exact `c5521b1b` source message.
The downloaded 18,753-byte `index.js` module SHA256 was
`3fa64867ecb2256111244404504a82fac974c4ed4bf7d937062a360e1ea4cc92`, exactly
matching the verified local dry-run artifact. Compatibility `2026-07-01`, no
compatibility flags, the two existing target URLs, `PROXY_SECRET` binding name,
disabled workers.dev/previews and `*/10 * * * *` schedule were unchanged. No
secret value was emitted. The rollback version remains the recorded October 3
version. Pages metadata still identified deployment
`e1b0ff66-8a93-41b0-b9c7-6de8346c81c7` / reported commit `3065f0d7`.

A passive, sanitized tail armed at 11:11:23 UTC observed the normal 19:20 Manila
tick (scheduled timestamp 11:20:58 UTC), then terminated cleanly at 11:21:40.700
UTC. It sent no additional scrape request. The execution used the new Worker
version and returned `outcome: ok`. Its receipt reported HTTP 200, `COMPLETE`
transport, `JSON_OBJECT`, `terminalState: completed`, `publicationOutcome:
REPORTED`, `reason: VALID_REPORTED_COUNTERS`, `inserted: 0`, `actualChanges: 0`,
`reconciliationRequired: false`, and available cadence/complete diagnostics.
Reported failure counters were zero; absent optional counters remained null.
No exception or server-failure class was emitted.

Read-only D1 SELECTs at 11:24:34 UTC confirmed `__ingest_diag__` attempt/success at
`11:20:59.280Z`, count zero and no error. The lock was released to the epoch with
`updated_at: 11:21:07.899Z`. Fetch events were durably present at the same run
timestamp: Remotive returned 16 changed items, WWR was unchanged, and ATS paths
recorded cadence, rotation, duplicate-token or policy skips. All diagnostic
queries reported zero rows written.

This accepts the bounded caller release and sanitized scheduled observation.
It does not prove the cause of earlier HTTP 503 responses: neither recognized
503 signature occurred in this successful tick. It also establishes no new
publication; zero inserts do not satisfy the daily target. A supported Worker
script download attempt using the Pages project's `production_script_name`
returned 404 / code 10007. Therefore Pages commit metadata remains provenance
metadata, without deployed-function byte attestation through that read path.
MATH remains 0/13 and certified daily flow remains UNKNOWN.

Later bounded source-event read-back established the first resumed durable run
after `05:50:57.109Z` at `10:30:57.221Z` (18:30 Manila), before the caller's
19:08 deployment. Do not attribute endpoint or publication recovery to this
caller release. The successful zero-insert observation was one tick within a
resumed pipeline; the subsequent source/visibility/receipt investigation is
recorded in `ZERO_FLOW_SOURCE_DIAGNOSIS_2026-10-12.md`.
