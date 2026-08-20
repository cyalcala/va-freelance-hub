# Free-first AI triage cascade — 2026-08-20

## Why

The 2026-08-18/19 board freeze (`docs/incident-2026-08-20-inngest-divert-freeze.md`)
had two stacked causes. The Inngest-divert bug was a straightforward fix. The
second cause — the Workers-AI **10k-neuron/day** free-tier ceiling (error `4006`)
— is chronic: every day, once ~50 higher-quality (70B) or a few hundred
cheap-rung triages are spent, new-item triage fails closed until the 00:00 UTC
reset, and the public board stops advancing for hours at a time.

The owner asked whether other free AI providers (OpenRouter, NVIDIA NIM, and
later Groq) could raise that ceiling without cost. This doc records that
evaluation and the resulting architecture: a **free-first provider cascade**
that makes Cloudflare's neuron budget a genuine reserve instead of the daily
fuse that blows every morning.

## Provider evaluation

| Provider | Free tier (as researched 2026-08-20) | Verdict |
| --- | --- | --- |
| **OpenRouter** | 50 req/day unfunded; 1,000/day after a one-time (lifetime) $10 top-up; 20 RPM always | Too small at true $0. Rejected. |
| **NVIDIA NIM** (build.nvidia.com) | ~40 RPM, credits effectively unlimited, no card | **Free tier is explicitly dev/test/eval only — production use requires paid NVIDIA AI Enterprise.** Wrong fit for a live public board. Rejected. |
| **Google Gemini** (Flash-Lite / Flash) | Flash-Lite ~1,000-1,500 req/day, 15 RPM; Flash ~250/day, 10 RPM, more capable; Pro no longer free (since Apr 2026) | **Accepted.** Owner already had `GEMINI_API_KEY`; volume dwarfs the neuron budget; data is public job listings so free-tier training-use terms are an acceptable trade. |
| **Groq** (LPU inference) | `llama-3.3-70b-versatile`: 30 RPM, 1,000 req/day, 100k tokens/day (~66 full triages/day on the token cap); `llama-3.1-8b-instant`: 30 RPM, 14,400 req/day (higher volume, weaker) | **Accepted**, as a second free provider — not a replacement for Gemini. Free/dev tier (same production caveat as any free tier, acceptable at this project's scale). |

No provider is both more capable AND higher-volume than the incumbent —
capability and free daily volume trade off against each other. The design
below tiers providers by how much a given decision matters, rather than
picking one "best" model.

## Architecture

```
Bulk triage (every gate-passed listing):
  Gemini Flash-Lite  →  Groq 70B-versatile  →  Cloudflare model ladder (reserve)

Critical vote (skeptic — the adversarial second opinion on gate-`unknown`
eligibility, i.e. the decisions most likely to put a wrong job on the board):
  Gemini 2.5 Flash    →  Groq 70B-versatile  →  Cloudflare 70B (reserve)
```

- **Gemini is primary.** Its free-tier volume alone (~1k-1.5k/day) comfortably
  exceeds the ~65 new jobs/day this board ingests.
- **Groq is the overflow absorber.** Its role is specifically to catch
  Gemini's rate-limit (429) or quota exhaustion with *another free provider*
  — so a burst of listings never has to fall back to spending neurons.
- **Cloudflare Workers AI is now a true reserve**, not the primary path. It
  only fires when both free HTTP providers fail (or on `AI_PRIMARY=cloudflare`,
  which inverts the whole order back to the original Cloudflare-first design —
  a one-line revert if either free provider's terms or reliability change).
- Every provider call — Cloudflare `env.AI.run`, Gemini `fetch`, Groq `fetch`
  — is charged against the **same per-invocation subrequest counter**
  (`env.chargeAiSubrequest`, wired through `withAiSubrequestBudget`). The
  50-subrequest Workers-Free cap that caused the original 2026-08-07 freeze
  therefore holds regardless of which provider actually serves a given call.
- All three providers **fail closed**: a provider that returns malformed JSON,
  a non-2xx, or omits the eligibility boolean is treated as "unavailable" and
  the cascade advances to the next provider (or defers the listing to the next
  tick if all three fail). No path can publish an unclassified job.

## Implementation

- `packages/scraper/triage.ts` — `triageJob` (bulk) and
  `skepticEligibilityCheck` (critical) were each refactored from a single
  Cloudflare-only ladder into small provider closures (`tryCloudflare`,
  `tryGemini`, `tryGroq` / their skeptic equivalents) run in an ordered list
  built from `AI_PRIMARY` and which keys are present. `validateTriageResult`
  is the one shared shape-validator so Cloudflare, Gemini, and Groq responses
  can never drift apart.
- `geminiGenerateContent` / `groqGenerateContent` are the two raw HTTP
  clients (Gemini `generateContent`, Groq's OpenAI-compatible
  `chat/completions`), each with a 20s timeout and throwing on non-2xx so the
  cascade can advance.
- `isQuotaExhaustionError` still detects Cloudflare's `4006` / subrequest-cap
  errors and sets `env.__cfAiExhausted` so later listings in the same
  invocation skip a Cloudflare ladder that has already proven itself spent —
  this matters most when `AI_PRIMARY=cloudflare`.
- Triage fan-out concurrency was reduced **3 → 2**
  (`apps/web/src/pages/api/cron/scrape.ts`) to keep bursts under Gemini's 15
  RPM / Groq's 30 RPM free-tier ceilings; a narrower burst lands more
  first-try instead of 429-and-defer.
- New env vars (`apps/web/src/env.d.ts`), all optional:
  `AI_PRIMARY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_CRITICAL_MODEL`,
  `GROQ_API_KEY`, `GROQ_MODEL`.
- Runtime proof the keys are actually bound on the live deployment (Cloudflare
  Pages binds secrets at **deploy** time, not set time — the same gotcha that
  delayed the original Gemini activation): the scrape response now includes
  `geminiConfigured` / `groqConfigured` booleans.

## Commits

| Commit | What |
| --- | --- |
| `5b0ce9b` | Initial Gemini-only fallback (Cloudflare-first, Gemini as the sole fallback on exhaustion). |
| `e36d303` | One-time recovery: published the subset of orphaned `pending-triage` rows the deterministic geo-gate had already verified eligible (`worldwide` / `apac_incl_ph`), without waiting on AI — immediate relief while neurons were still spent. |
| `dfec65f` | `geminiConfigured` probe + the redeploy that bound `GEMINI_API_KEY` (set after the prior deploy, so it needed a fresh deploy to take effect). |
| `c17f4e5` | The full free-first cascade: reordered to Gemini-primary / Groq-overflow / Cloudflare-reserve for both bulk triage and the critical skeptic vote; added the Groq client; concurrency 3→2; `AI_PRIMARY` invert switch. 10 new tests. |
| `cb88665` | `groqConfigured` probe + the redeploy that bound `GROQ_API_KEY`. |

## Verification

- `bun run test` — 439 pass, 0 fail (10 new cascade tests in
  `packages/scraper/triage-gemini.test.ts`: provider parsing, Gemini-primary
  leaves the Cloudflare reserve untouched, a simulated Gemini 429 falls
  through to Groq, `AI_PRIMARY=cloudflare` inverts the order, and the
  all-providers-fail path still fails closed).
- `bun run typecheck` / `bun run audit:guardrails` / `bun run build` — all
  clean.
- **Live production evidence**, captured while Cloudflare's neurons were
  *still exhausted* (`__sweep_diag__` still showing `4006`) so any successful
  triage in this window could only have come from the free-provider cascade:
  - `geminiConfigured: true`, `acceptedForInsert: 10` on one Hunter run.
  - The public board's newest **visible** (`is_active=1`) job advanced from
    the frozen `2026-08-18T14:00Z` through `2026-08-20T13:41Z` and then
    `2026-08-20T14:00Z` across successive scrape ticks — i.e. today's jobs are
    live on the board, triaged by Gemini, with zero neurons spent.
  - Both `GEMINI_API_KEY` and `GROQ_API_KEY` are set on the `remotejobs-ph`
    Pages project (`wrangler pages secret list`) and each was followed by a
    redeploy (`dfec65f`, `cb88665`) that succeeded, so both are bound on the
    live deployment.
  - Groq's specific fallback path (Gemini 429 → Groq) is covered by an
    automated test but was not separately forced in production — the
    project's real Gemini free-tier volume (~1k-1.5k/day against ~65
    jobs/day) makes that trigger rare in practice; it remains available as
    soon as it's needed.

## Current backlog state (`pending-triage`, at time of writing)

7 rows remain hidden (`is_active=0`, `inactive_reason='pending-triage')`,
`updated_at` no later than `2026-08-20T11:30:59Z` — i.e. **no new
pending-triage rows have been created since the Inngest-divert fix landed**,
and these 7 are static leftovers, not an active leak. They stay hidden because
`drainPendingTriageInline` (see the incident doc) remains **opt-in OFF** via
`DRAIN_PENDING_TRIAGE` — that decision predates this cascade and can be
revisited now that free-provider capacity, not just neurons, is available to
spend on backlog recovery. Not urgent: 7 rows is noise against ~65 new
jobs/day.

## Owner-facing summary

- The board is no longer capped by the 10k-neuron/day Cloudflare ceiling.
  Fresh jobs publish all day via Gemini (and Groq as overflow), with
  Cloudflare AI held in reserve for when both free providers are unavailable.
- No further action required for this to keep working. Optional: revisit
  `DRAIN_PENDING_TRIAGE=1` to clear the 7 static backlog rows now that
  free-provider capacity exists for it.
- To revert to the original Cloudflare-first behavior for any reason, set
  `AI_PRIMARY=cloudflare` on the Pages project. Treat it like the API keys:
  Cloudflare Pages binds environment variables into a specific deployment, so
  — based on the `GEMINI_API_KEY` / `GROQ_API_KEY` activations this
  session, both of which showed `*Configured: false` until the next deploy —
  assume this also needs a follow-up redeploy to take effect, and confirm via
  the scrape response before relying on it.

See also: `docs/incident-2026-08-20-inngest-divert-freeze.md` (the freeze this
work followed from), [[project_gemini-ai-fallback]] /
[[project_cf-freetier-limits]] in agent memory.
