# OPS-04 Directory Unreachable-Spike Diagnosis

## Decision

`OPS-04` is **TERMINAL — KEEP**. The `unreachable` directory verdict now carries
a small, stable, non-sensitive failure taxonomy, aggregated per run in the audit
response and the scheduled digest. Comparative evidence (two Cloudflare cohorts
plus a same-host probe from a non-Cloudflare runtime) **narrows the cause**: the
`unreachable` cohort is dominated by an opaque Cloudflare **egress-side transport
failure** against origins that are demonstrably alive, **not** origin death.
Strikes, de-verification threshold, visibility, URL immutability, per-company
isolation, the 40-row budget, and the 80% systemic gate are **byte-for-byte
unchanged**. No strike or policy change is warranted by this evidence.

## Execution record

| Field | Evidence |
| --- | --- |
| Unit | `OPS-04` |
| Start | synchronized clean `main` / `origin/main` at `6146290` |
| Behavior commit | `83f94d0` (`feat(directory): expose bounded egress diagnostics`) |
| Branch/worktree | `main`; primary worktree (no worktree required) |
| Primary Addy workflow | `debugging-and-error-recovery` (reproduce → classify → compare → guard) |
| Behavior/instrumentation files | `packages/scraper/linkHealth.ts`, `packages/scraper/index.ts`, `apps/web/src/lib/directory-health.ts`, `apps/web/src/pages/api/cron/directory-audit.ts`, `.github/workflows/gha-directory-pulse.yml` |
| Test files | `packages/scraper/linkHealth.test.ts`, `apps/web/tests/directory-health.test.ts` |
| Local G3 | 513 tests, 0 failures, 1,191 assertions; typecheck, build, guardrails all pass (bun 1.3.14) |
| CI/deploy | GitHub Actions run `32568634636`, success (full suite, D1 migrations applied, FTS verified, Pages deployed; deploy job `97020879509`) |
| Live run #1 | directory-pulse `32568721809` on `83f94d0`, success (read-only diagnostic) |
| Live run #2 | directory-pulse `32568795476` on `83f94d0`, success (read-only diagnostic) |
| Cross-runtime probe | bounded, read-only, 5 redacted hosts, fixed 8s timeout, no repeats, non-Cloudflare runtime |
| Post-run sync | auto-digest commits `a329efc`, `1e9f863`; fast-forwarded to clean `main` |
| Decision | `KEEP` |

## Failure taxonomy

`classifyUnreachableError()` (in `packages/scraper/linkHealth.ts`) maps a thrown
fetch error to one of a small, stable set of reasons plus a `<=40`-char cause
code derived **only** from the error code/name — never the message body, URL, or
stack, so no host, credential, or secret can leak into aggregated evidence:

```text
TIMEOUT          AbortSignal.timeout / ETIMEDOUT / UND_ERR_*_TIMEOUT
DNS_FAILURE      ENOTFOUND / EAI_AGAIN / EAI_FAIL / EAI_NONAME
TLS_FAILURE      CERT* / SSL / TLS / EPROTO / SELF_SIGNED / ERR_TLS*
CONNECT_FAILURE  ECONNREFUSED / ECONNRESET / EHOSTUNREACH / ENETUNREACH / EPIPE
EGRESS_BLOCKED   "Too many subrequests." / "Network connection lost." / egress / blocked / proxy
REQUEST_ERROR    fetch-layer TypeError with no localizable transport cause
UNKNOWN_NETWORK  fallback (also the bucket for a missing reason)
```

The classifier is deliberately runtime-agnostic. Node/undici (this runtime and
GitHub Actions) surfaces a concrete `cause.code`; the Cloudflare Workers runtime
collapses most transport faults into a generic `Error`/`TypeError` whose
name/message is the only signal. Comparing the two distributions **over the same
hosts** is what localizes the fault.

The earlier local `isEgressSuspectReason()` helper was dropped: it asserted a
single-runtime egress-vs-origin split that this unit's own thesis says is
impossible without a cross-runtime comparison, and keeping it would have invited
exactly the policy-by-indistinguishable-failure that OPS-04 exists to prevent.

## Comparative evidence

### Two Cloudflare cohorts (production, 40 rows each, oldest-checked-first rotation)

| Run | ok | bot_wall | parked | unreachable | reason distribution | ratio | degraded |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| `32568721809` (#1) | 30 | 4 | 1 | 5 | `EGRESS_BLOCKED: 5` | 12.5% | false |
| `32568795476` (#2) | 35 | 5 | 0 | 0 | (all zero) | 0% | false |

Every `unreachable` verdict observed on Cloudflare classified as
`EGRESS_BLOCKED` with cause code `Error` (a generic, code-less
"network-connection-lost"-class throw). The phenomenon is **intermittent and
cohort-dependent** (5 in one slice, 0 in the next), which is consistent with a
transient egress fault rather than persistent origin death.

### Same-host probe from a non-Cloudflare runtime

The five hosts run #1 flagged `unreachable / EGRESS_BLOCKED`, re-checked with the
identical `checkDirectoryLink()` classifier and an 8s timeout from a
non-Cloudflare runtime:

| Redacted host | Cloudflare (prod) | Non-Cloudflare runtime |
| --- | --- | --- |
| `ph.indeed.com` | unreachable / EGRESS_BLOCKED | **bot_wall — HTTP 403 (alive)** |
| `ph.jobstreet.com` | unreachable / EGRESS_BLOCKED | **bot_wall — HTTP 403 (alive)** |
| `hellorache.com` | unreachable / EGRESS_BLOCKED | **ok — HTTP 200** |
| `jobquest.ph` | unreachable / EGRESS_BLOCKED | **ok — HTTP 200** |
| `bottleneck.ph` | unreachable / EGRESS_BLOCKED | **ok — HTTP 200** |

**0 of 5 are dead.** All five answer normally (200) or as a live bot-wall (403)
from a different egress. The Cloudflare `unreachable` cohort is an egress-path
transport failure, not a dead-origin signal.

## Supported root cause

The directory `unreachable` spike is caused by **Cloudflare's egress path
failing or being refused for a subset of origins** (opaque
"network-connection-lost"-class `fetch` throws), not by the origins being dead.
The existing no-strike, human-review-only handling of `unreachable` is therefore
**correct**, and any threshold or strike change would have treated a symptom of
runtime-specific network behavior. Confidence: **high** for "not origin death";
**medium** for the precise egress mechanism (anti-bot refusal of Cloudflare
egress IPs vs. transient platform connectivity) — both are egress-side and
neither justifies a strike-policy change.

## Acceptance checklist

- [x] `status='unreachable'` and `isHardDead=false` preserved (unit test on an
      OPS-04-enriched verdict asserts identical strike accounting).
- [x] Small stable taxonomy; 100% of `unreachable` results get one reason code.
- [x] No raw stack/secret/URL leakage (codes are error code/name, `<=40` chars;
      samples are bare hostnames; the committed digest carries counts only).
- [x] No added request count; 40-row budget and concurrency 8 unchanged.
- [x] Two runs produced reason distributions; cross-runtime comparison is
      reproducible via `checkDirectoryLink()`.
- [x] Systemic 80% egress gate unchanged and untripped in both runs.

## Escalation / follow-on (separate unit — NOT folded into OPS-04)

If eliminating the egress-driven `unreachable` cohort becomes a priority, a
**new** bounded unit should evaluate a non-Cloudflare link-health probe path
(e.g. running the directory pulse's fetch from the GitHub Actions runner instead
of the Cloudflare Pages Function, which already resolves these hosts). Per the
OPS-04 escalation rule, remediation is out of scope here; this diagnosis only
localizes the fault and retains the diagnostic instrumentation.
