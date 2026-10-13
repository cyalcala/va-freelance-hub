# Cache-only Pages release preflight and rollback — October 13

## Bounded outcome

At **2026-10-13 11:49:38–11:49:40 UTC**, one authenticated project GET and
two D1 SELECTs matched the expected deployment and schema metadata. The cached
Wrangler OAuth credential worked without renewal. No deployment, rollback,
provider request, manual scrape, migration or configuration change was made.
Both SELECTs reported zero rows written and one row read each.

Candidate source: `34e3bd1efa34dc3a2c31f2cc3e5b6c5b04790e83`.
This is a preflight receipt, not evidence that this candidate is deployed or
that its runtime freshness/cost targets are accepted.

The allowlisted [capture](preflight.json) and [read-only helper](preflight-readonly.ts)
are hashed in `preflight-integrity.json`. The capture retains no credential or
environment-variable values. It is a projection of the API response, not an
archived full project configuration or a restore backup. The helper deliberately
refuses to overwrite its existing receipt; do not rerun it merely to replay
this evidence.

## Current production contract

| Field | Observed value |
| --- | --- |
| Project / host | `remotejobs-ph` / `remotejobs-ph.pages.dev` |
| Production branch | `main` |
| Canonical and latest deployment | `e1b0ff66-8a93-41b0-b9c7-6de8346c81c7` |
| Reported source commit | `3065f0d709d5a1950c247d5a11df542b07721bcb` |
| Environment / latest stage | `production` / `deploy: success` |
| Compatibility date | `2024-11-01` |
| Compatibility flags | `nodejs_compat` only |
| D1 binding | `DB` → `08072f16-d3d1-436a-9104-b057a162db7c` |
| Workers AI binding | `AI` |
| Newest migration entry | `0054_public_serving_snapshot.sql`, applied October 7 |

Production configuration and both deployment projections contain the same five
environment-variable names, each with type `secret_text`: `GEMINI_API_KEY`,
`GROQ_API_KEY`, `INNGEST_SIGNING_KEY`, `OPENROUTER_API_KEY`, `PROXY_SECRET`.
Values were neither retained nor displayed. Sampled KV, R2, service, Durable
Object, Vectorize and Hyperdrive binding-name maps were empty.

The snapshot row at `11:49:40.658Z` had generation
`2026-10-13T11:23:06.080Z`, `refresh_started_at=NULL`, payload length 686,391
characters and `payload_is_plain_json=0`. The source supports encoded gzip
snapshots; this metadata query neither decodes the payload nor proves corruption.
It also does not prove what every browser or edge location was serving.

The newest migration entry is a bounded schema-ceiling observation, not a
complete structural schema attestation. Canonical deployment commit metadata
is not a byte-for-byte attestation of the already deployed bundle.

## Concrete release constraints

1. Build and upload the exact archived candidate source with its own frozen
   dependencies. The dirty combined repair checkout contains other runtime
   changes and is outside this release.
2. Retain the successful compatible-base targeted tests, typecheck, build,
   source archive and artifact digests before uploading. The independent
   preflight does not substitute for those verification results.
3. Keep the observed production branch, compatibility contract, DB and AI
   bindings, existing remote secrets and clocks. `env.production` in the
   candidate's `apps/web/wrangler.jsonc` matches the observed contract; its
   different root compatibility date is not the production date.
4. No D1 migration or source/publication policy change accompanies this
   cache-only release. Reconcile and hold if the authoritative deployment,
   production settings or schema change before the upload.
5. After deployment, retain the new deployment ID and source/artifact mapping,
   inspect the same safe configuration projection, and observe ordinary public
   requests and refresh completion. Demonstrate generated-at age and remaining
   HTML cache lifetime rather than relying on the `fresh` label alone.

Independent source review compared the exact candidate with reported live
source `3065f0d...`: only three snapshot/cache runtime files, their three test
files and one release document differ. The reviewed change caps snapshot HTML
to the remaining five-minute generation deadline, checks the deadline on cache
HIT and MISS, expires warm snapshot reuse at that same deadline and makes the
SQLite lease claim eligible at equality. Existing stale fallback, one shared
refresh lease and private/error-response cache exclusions remain present.
The added adversarial cases exercise the last second, exact deadline and
two-isolate single-claim behavior. No new blocking defect was identified in
this bounded source review; no additional tests were run by this reviewer.
Actual CPU, global refresh behavior and visibility latency still require
runtime observation. This review does not cover the uncommitted job-flow
repairs.

## Supported rollback target and operation

Cloudflare documents successful production deployments as eligible Pages
rollback targets; preview deployments are excluded. Its dashboard provides
the rollback action on the chosen deployment.
[Official Pages rollback documentation](https://developers.cloudflare.com/pages/configuration/rollbacks/).

The API operation is a POST to
`/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/rollback`
and requires `Pages Write` permission.
[Official rollback API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/rollback/).

For this release the concrete retained target is:

```text
POST https://api.cloudflare.com/client/v4/accounts/76cf15ef361089aa0411e75ff77d343a/pages/projects/remotejobs-ph/deployments/e1b0ff66-8a93-41b0-b9c7-6de8346c81c7/rollback
```

Supply authentication in memory through the existing authorized credential
path; do not print it or store it in the receipt. The observed target meets
the documented production/success eligibility conditions. This operation was
**not executed**. Read capability alone does not establish that a future
rollback request will succeed; retain and inspect its actual result if used.

Rollback is appropriate if the new artifact introduces public 5xx responses,
breaks existing routes/configuration, exposes private responses to shared
cache, or produces a demonstrated runtime regression. Following rollback,
verify the canonical deployment ID and ordinary public route behavior.
Rollback changes the served deployment; it is not a D1 data restoration,
snapshot-history backup or proof that publication state has been undone.
Neither this preflight nor the rollback plan advances a MATH requirement or
certifies daily throughput.
