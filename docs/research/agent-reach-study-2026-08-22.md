# Agent Reach bounded planning study

**Status:** planning reference only

**Study date:** 2026-08-22 (Asia/Singapore)

**Upstream repository:** <https://github.com/Panniantong/Agent-Reach>

**Audited upstream revision:** [`93ae1d18c37b707dec053c7c4f9d91cd8ef8943d`](https://github.com/Panniantong/Agent-Reach/commit/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d), the `main` revision observed on 2026-08-22 (commit authored 2026-08-12)

**Comparison target:** the VA Freelance Hub working tree observed on 2026-08-22

## Decision in one paragraph

Use Agent Reach as **architecture inspiration, not as a dependency or ingestion
engine**. Its strongest transferable ideas are ordered access paths, an explicit
active path, bounded side-effect-free probes, per-source failure isolation, and
machine-readable diagnostics. VA Freelance Hub should implement only the needed
parts in its existing TypeScript/Astro/D1 pipeline, with compliance approval as a
hard precondition. Do not install, vendor, embed, or operate Agent Reach; do not
adopt its cookie-, login-, browser-session-, proxy-, or anti-block-dependent
connectors; and do not treat technical reachability as permission to collect,
store, or republish data.

## Evidence legend and scope

- **[V] Verified:** directly observed in the repository, code, metadata, issue,
  release, or CI result cited at the audited revision/date.
- **[R] Repository claim:** stated by the maintainer or release notes but not
  independently reproduced in this study.
- **[I] Inference:** an analysis or VA Freelance Hub recommendation derived from
  verified evidence; it is not an upstream claim.

This was a read-only architecture and planning study. It did not install Agent
Reach, execute its installers, authenticate to any platform, reuse browser
cookies, probe third-party social platforms, reproduce its tests, or assess
every transitive dependency. Mutable repository statistics are explicitly
dated. The exact commit above is the normative snapshot for code claims.

## What Agent Reach actually does

**[V]** Agent Reach is a local Python command-line capability/bootstrap layer
for AI agents. It registers platform-specific channels, chooses from an ordered
list of available backends, helps install or configure external tools, and
reports their health. Its own README describes this boundary and its skill file
shows that agents perform most reads and searches by invoking upstream CLIs,
MCP servers, APIs, or web adapters directly:

- [README at the audited revision](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/README.md)
- [Agent-facing command routes](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/skill/SKILL.md)
- [Core orchestration](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/core.py)

**[V]** The audited channel registry contains 15 channels: GitHub, Twitter/X,
YouTube, Reddit, Facebook, Instagram, Bilibili, Xiaohongshu, LinkedIn,
Xiaoyuzhou, V2EX, Xueqiu, RSS, Exa, and generic web. The registry is a routing
inventory, not a claim that each channel is always usable or compliant:
[channel registry](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/channels/__init__.py).

**[V]** Each channel follows a small contract: determine whether it can handle
a URL, expose ordered backends, select an active backend, report its tier, and
perform a health check. Configuration can override backend preference:
[base channel contract](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/channels/base.py).

**[V]** `doctor` builds a result for every channel, isolates exceptions to the
affected channel, and emits statuses such as `ok`, `warn`, `off`, and `error`,
including backend and active-backend details. The CLI supports JSON output, and
the audited implementation opens configuration in read-only mode:
[doctor implementation](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/doctor.py) and
[CLI implementation](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/cli.py).

**[V]** The probe layer executes bounded version/status checks and distinguishes
`ok`, `missing`, `broken`, `timeout`, and `error`. This is materially stronger
than checking only whether an executable name exists because it can identify a
stale shim or broken installation:
[probe implementation](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/probe.py).

**[V]** Agent Reach's own MCP server exposes status only. Its implementation
explicitly directs actual content operations to the upstream tools:
[MCP status server](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/integrations/mcp_server.py).

**[I]** Therefore Agent Reach is not a replacement for VA Freelance Hub's
scheduler, source compliance registry, normalization, deduplication, persistent
storage, stale-record handling, or public job board. No equivalent durable
ingestion pipeline is presented in the audited tree; the product boundary is
local tool reachability and routing.

## Architecture and capabilities

```text
Agent / user
  -> Agent Reach CLI or status-only MCP endpoint
     -> channel registry
        -> URL capability match
        -> ordered backend preference
        -> active-backend selection
        -> bounded health probe
           -> external CLI, MCP server, API, RSS parser, or web adapter

doctor --json
  -> one isolated result per channel
  -> status + message + tier + backends + active backend
```

### Capability families

| Family | Audited behavior | VA Hub relevance |
| --- | --- | --- |
| Generic web | **[V]** Routes public HTTP(S) pages through a bounded reader adapter and detects common block pages. | **[I]** Useful as a reminder to validate content, not as a universal ingestion fallback. |
| RSS/Atom | **[V]** Parses feeds through `feedparser`. | **[I]** Closest to VA Hub's preferred official-feed path, although VA Hub already has native feed ingestion. |
| GitHub | **[V]** Uses GitHub tooling for repository operations. | **[I]** Not a job-source need; GitHub Actions already provides VA Hub operations. |
| Search/discovery | **[V]** Supports Exa when configured. | **[I]** Potential future candidate discovery only, never automatic source approval. |
| Video/audio | **[V]** Uses `yt-dlp` and can perform bounded transcription. | **[I]** Outside the current product scope. |
| Social/career platforms | **[V]** Some routes depend on cookies, browser sessions, platform CLIs, MCP servers, or network workarounds. | **[I]** Incompatible with the current public-source compliance boundary. |

The generic web implementation and its safety bounds are visible in
[`web.py`](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/channels/web.py).
Installation and credential/session guidance is documented in
[`docs/install.md`](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/docs/install.md).

## Dependencies, packaging, and license

### Runtime and dependency shape

**[V]** The project requires Python 3.10 or newer and is classified as Beta.
Its declared core dependencies are `requests`, `feedparser`, `python-dotenv`,
`loguru`, `pyyaml`, `rich`, and `yt-dlp[default]`. Optional groups add
Playwright, `browser-cookie3`, and `mcp[cli]`. It also orchestrates external
executables and services, including Node/npm-based tools and platform-specific
CLIs or MCP servers:
[package metadata](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/pyproject.toml).

**[V]** A constraints file pins known versions for reproducible installation,
including the core HTTP/feed/config/logging/media dependencies:
[constraints file](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/constraints.txt).

**[I]** Adding this Python and external-tool graph to the Bun/TypeScript system
would increase runtime, patching, secret, subprocess, and cross-platform burden
without replacing any necessary part of the production ingestion path.

### License boundary

**[V]** Agent Reach's repository code is MIT licensed:
[LICENSE](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/LICENSE).

**[I]** The MIT license covers the upstream project's copyrighted code; it does
not grant permission to collect or republish third-party content, waive platform
terms, authorize cookie/session reuse, or relicense the external tools it
installs. Those are separate compliance and supply-chain decisions.

## Maturity assessment

| Signal | Evidence | Assessment |
| --- | --- | --- |
| Project age and activity | **[V]** GitHub metadata observed 2026-08-22 reported creation on 2026-02-24, a push on 2026-08-12, and roughly 73.9k stars and 6.3k forks. [Repository API](https://api.github.com/repos/Panniantong/Agent-Reach) | **[I]** Active and highly visible, but only about six months old; popularity is not operational maturity. |
| Release posture | **[V]** Latest published release observed was `v1.5.0` from 2026-06-11. Current `main` still declares 1.5.0 but includes later hardening commits. [v1.5.0 release](https://github.com/Panniantong/Agent-Reach/releases/tag/v1.5.0) | **[I]** Release artifacts and current source have drifted; pinning only the release would omit post-release fixes. |
| Stability label | **[V]** Package classifier says Beta. [pyproject.toml](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/pyproject.toml) | **[I]** Appropriate for reference study, not a reason to place it on VA Hub's production path. |
| Automated checks | **[V]** CI covers Python 3.10-3.13, Windows, and a wheel-install gate; the latest run inspected for the audited revision succeeded. [workflow](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/.github/workflows/pytest.yml), [run 31560766545](https://github.com/Panniantong/Agent-Reach/actions/runs/31560766545) | **[I]** Positive engineering signal, but it does not validate third-party availability, source terms, or VA-specific ingestion semantics. |
| Test volume | **[R]** Release notes report 162 tests and 32 end-to-end tests. [v1.5.0 release](https://github.com/Panniantong/Agent-Reach/releases/tag/v1.5.0) | Not reproduced in this study. |
| Current defects | **[V]** Open issue #590 documents bare `mcporter` invocation problems on Windows and highlights main/release drift. [Issue #590](https://github.com/Panniantong/Agent-Reach/issues/590) | **[I]** Cross-platform subprocess routing remains a practical integration risk. |

## Security review

### Historical audit and current mitigations

**[V]** Security audit issue #378 reported unsafe install defaults, possible
secret disclosure, permissive hostname suffix matching, unbounded media
transcription, doctor side effects, non-atomic configuration, and stale
documentation. The issue is closed:
[issue #378](https://github.com/Panniantong/Agent-Reach/issues/378).

**[V]** Do not treat every historical finding as current. The audited `main`
contains substantial subsequent hardening, including the following controls:

- installation is check-only/safe by default; system-changing installation
  requires explicit `--system` selection;
- `doctor` opens configuration read-only;
- configuration writes are atomic, reject symlink targets, constrain file
  permissions where supported, and mask sensitive-looking values;
- URL matching uses exact-host or dot-delimited-subdomain semantics rather than
  a bare suffix;
- the generic web channel accepts normalized public HTTP(S) inputs, bounds the
  response size to 5 MB, and identifies common anti-bot responses; and
- transcription limits source size, duration, chunk count, and output volume,
  disables playlist expansion, constrains fallback behavior, and cleans up
  temporary files.

Evidence:
[security hardening commit](https://github.com/Panniantong/Agent-Reach/commit/ffa661321efde9d6769c62a844fec3dc9a317ba5),
[`url.py`](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/utils/url.py),
[`config.py`](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/config.py),
[`web.py`](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/channels/web.py), and
[`transcribe.py`](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/transcribe.py).

### Residual security and operational concerns

- **[V]** `--system` can still install and configure a broad chain of
  third-party packages, executables, skills, and MCP servers. **[I]** This is a
  supply-chain and change-control surface VA Hub does not need.
- **[V]** Several platform routes rely on browser cookies or authenticated
  sessions. **[I]** These increase credential exposure and account-action risk,
  even when technically supported.
- **[V]** The security policy supports only the latest version and says
  third-party dependency vulnerabilities are outside the project's scope:
  [SECURITY.md](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/SECURITY.md).
  **[I]** That boundary is material because upstream dependencies and tools are
  central to the product.
- **[V]** Not every channel check proves live usability. For example, some
  checks establish only local configuration or expected routing, and the web
  check can report local readiness without a live content request. **[I]** VA
  Hub diagnostics must distinguish configuration readiness, endpoint
  reachability, schema/content validity, and a successful ingestion result.
- **[V]** The MCP module's error guidance refers to an `mcp` installation extra,
  while the audited package metadata defines `browser`, `cookies`, `all`, and
  `dev` extras rather than a standalone `mcp` extra:
  [MCP server](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/integrations/mcp_server.py) and
  [package metadata](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/pyproject.toml).
  **[I]** This reinforces the decision to defer any MCP surface.

## Compliance fit for VA Freelance Hub

VA Freelance Hub's policy prefers official APIs, RSS feeds, and explicitly
supported public paths; stores minimal factual metadata; links to the original
source; respects cadence, robots directives, and terms; and pauses uncertain
sources. Agent Reach's breadth cannot weaken those rules.

### Hard boundaries

- **[I]** A successful network or tool probe is evidence of technical
  reachability only. It is never evidence of permission to automate,
  persist, transform, or republish content.
- **[I]** Exa or a generic reader may suggest a candidate source, but that
  candidate must enter `needs_review`; discovery must not auto-enable ingestion.
- **[I]** Do not reuse cookies, logged-in browser sessions, residential proxies,
  or other mechanisms to reach content unavailable through an approved public
  source path.
- **[I]** Do not bypass a login, paywall, CAPTCHA, robots rule, rate limit,
  access block, or express anti-automation term.
- **[I]** Do not use Jina Reader or any other reader as a universal fallback
  when a source's approved API/RSS path fails. A fallback is a distinct access
  path requiring its own terms, robots, provenance, cadence, and data-minimizing
  approval.
- **[I]** Probe payloads and diagnostics must avoid full job descriptions and
  secrets; store the minimum needed to establish health and route selection.

The concern is grounded in Agent Reach's documented cookie/session and
platform-access setup, not merely hypothetical:
[installation guide](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/docs/install.md) and
[agent-facing routes](https://github.com/Panniantong/Agent-Reach/blob/93ae1d18c37b707dec053c7c4f9d91cd8ef8943d/agent_reach/skill/SKILL.md).

## Direct mapping to the current VA Hub code

| Current VA Hub evidence | Agent Reach concept | Planning consequence |
| --- | --- | --- |
| **[V]** `packages/scraper/sources.ts:1-18` already models source type, collection method, compliance status/notes, item bounds, and cadence. | Ordered channel backends and active backend. | **[I]** Extend the existing source model only when a real source has two or more independently approved access paths. Do not create a parallel registry. |
| **[V]** `packages/db/schema.ts:140-179` already persists source fetch state/events: attempt/success times, count, duration, error, skip state, method, and compliance status. | Machine-readable doctor/probe results. | **[I]** Persist any path/probe diagnostics into these existing operational records, adding only narrowly justified fields such as `access_path_id` or `diagnostic_code`. Do not add a Python status store. |
| **[V]** `packages/db/schema.ts:181-195` and `packages/scraper/robotsGate.ts` already provide a D1 robots cache and a bounded policy gate. The gate is presently staged in `observe` mode, while `enforce` is implemented. | Bounded, side-effect-free checks. | **[I]** Reuse the existing gate in the native probe. Do not use this study to flip enforcement without the evidence and rollout called for by the existing staging contract. |
| **[V]** `apps/web/src/pages/api/cron/prospect.ts:95-97` stores discovered ATS tokens but keeps them paused until code review/promotion. | Discovery and backend availability. | **[I]** Preserve this human gate. Availability may enrich the review queue but cannot promote a source or path. |
| **[V]** `.github/workflows/gha-sentinel-pulse.yml` reads `source_fetch_events`, detects repeated failures, and can propose or apply a source pause through repository-controlled changes. | Per-channel isolation and status rollup. | **[I]** Feed richer native diagnostic codes into Hunter/Sentinel instead of introducing Agent Reach's `doctor` as a second operations plane. |
| **[V]** `packages/scraper/sources.ts:177-178` currently treats `needs_review` as enabled because only `paused` and `deprecated` are excluded. | A channel can be configured even when unavailable. | **[I]** Any access-path design must fail closed: only `allowed` paths may enter scheduled ingestion. If operators need to probe `needs_review`, make that an explicit non-ingesting review action rather than inheriting `enabledSources` behavior. |

### Immediate hostname-boundary finding

**[V]** `packages/scraper/prospector.ts:91` currently accepts a trusted host when
`host.endsWith(t)` is true, in addition to exact and dot-subdomain matches. The
bare suffix makes a lookalike such as `evilremotive.com` match
`remotive.com`. The ATS recognizer at lines 111, 117, 123, 128, and 133 uses the
same unsafe bare-suffix pattern; for example, `evilgreenhouse.io` can enter the
Greenhouse branch.

**[I]** Agent Reach's corrected exact-host-or-dot-subdomain helper is directly
relevant as a design lesson. VA Hub should independently implement the
equivalent TypeScript rule and adversarial tests. This is a small security and
data-provenance fix; it does not require copying upstream code or adding an
Agent Reach dependency.

## ADOPT / ADAPT / DEFER / REJECT matrix

The verbs in this matrix classify **concepts**. They do not authorize package
installation or source-policy changes.

| Decision | Concept | Rationale and boundary |
| --- | --- | --- |
| **ADOPT** | Ordered, approved access paths with one observable active path | Makes fallback choice explicit and debuggable. Every path needs separate compliance approval; no implicit generic fallback. |
| **ADOPT** | Side-effect-free, bounded probe contract | Probe with explicit time, byte, redirect, and semantic bounds; never install, authenticate, publish, or mutate source state as a side effect. |
| **ADOPT** | Per-source/per-path failure isolation | One broken source must yield a typed result without hiding other source results or turning the whole pulse green. |
| **ADOPT** | Machine-readable diagnostic status and safe hint codes | Enables Hunter/Sentinel rollups and avoids relying on free-form logs. Hints must not include secrets or full fetched content. |
| **ADAPT** | Channel registry -> compliance-first access-path registry | Keep VA Hub's existing `Source` registry as the authority. Add paths only for concrete, approved needs; compliance approval precedes availability selection. |
| **ADAPT** | Exact hostname matcher | Implement natively in TypeScript and reuse across trusted-source and ATS recognition. Accept `host === domain` or `host.endsWith('.' + domain)` only. |
| **ADAPT** | `doctor` -> layered source diagnostic | Separate local/config readiness, bounded endpoint health, content/schema validity, and end-to-end ingestion health. HTTP 200 alone is not healthy. |
| **ADAPT** | Discovery output | Route candidates to a provenance-rich `needs_review`/paused queue. Require human review before scheduled collection. |
| **DEFER** | Exa-backed source discovery | Consider only if a measured recall gap justifies another provider and its current terms, privacy, cost, provenance, and retention behavior are reviewed. |
| **DEFER** | MCP or agent-skill status surface | GitHub Actions, D1 telemetry, Hunter, and Sentinel already form the correct production control plane. Add another interface only for a demonstrated operator workflow. |
| **DEFER** | General multi-backend framework | Do not generalize before at least one current source has multiple independently approved paths and a real failover requirement. |
| **REJECT** | Installing or vendoring Agent Reach and its Python/toolchain graph | Adds a second runtime and broad external supply chain without replacing VA Hub's ingestion responsibilities. |
| **REJECT** | Cookie-, login-, browser-session-, or proxy-dependent platform connectors | Conflicts with the public-source, no-bypass policy and adds credential/account risk. |
| **REJECT** | Jina Reader or another reader as a universal ingestion fallback | Technical accessibility does not confer collection or republication permission; it can silently change provenance and terms. |
| **REJECT** | Upstream connector code reuse or broad auto-crawling | VA Hub needs a narrow source-indexing system, not unrestricted platform reach. |
| **REJECT** | Treating zero monetary cost or a successful probe as compliance | Cost, availability, permission, and content-use rights are independent decisions. |

## Inspiration versus code reuse

### Approved inspiration boundary

- Study the shape of `Channel`, ordered backends, active-backend reporting,
  `ProbeResult`, bounded timeouts, and per-channel exception isolation.
- Translate only the useful behavior into VA Hub's existing TypeScript types,
  fetch wrappers, D1 tables, and GitHub Actions evidence loop.
- Preserve VA Hub's stricter compliance state, cadence controls, minimal-data
  model, original-source linkback, robots evidence, and manual promotion gates.

### Code-reuse boundary

- Do **not** clone Agent Reach into this repository, vendor it, install it in CI,
  import its Python package, invoke its installer, or ship its connectors.
- Do **not** copy its platform command recipes or adopt its cookie/session setup.
- The proposed hostname rule and probe/result concepts are simple patterns to
  implement independently in idiomatic TypeScript.
- Although MIT would permit code reuse with its required copyright and license
  notice, no such reuse is needed or approved by this plan. If a later decision
  calls for substantial copying, document the exact upstream commit and retain
  the MIT notice before implementation. That later decision still would not
  grant rights to third-party tools, platform access, or fetched content.

## Narrow native-TypeScript planning consequence

Do not build a generalized Agent Reach analogue. Plan one small vertical slice
that closes the demonstrated hostname issue and establishes a reusable probe
contract for an already approved source path.

### Slice 1 — hostname trust boundary (first)

1. Add one centralized TypeScript helper such as
   `hostMatchesAllowedDomain(host, allowedDomain)` that returns true only for an
   exact hostname or a dot-delimited subdomain.
2. Replace the bare suffix checks in `isTrustedSourceUrl` and every ATS branch in
   `extractAtsToken`.
3. Add table-driven tests covering exact hosts, valid subdomains, mixed case,
   trailing-dot normalization policy, malformed URLs, and adversarial lookalikes
   such as `evilremotive.com`, `remotive.com.evil.example`,
   `evilgreenhouse.io`, and `greenhouse.io.evil.example`.
4. Verify that no newly rejected host can create a directory candidate or ATS
   token.

### Slice 2 — one approved-path probe, only when a concrete source needs it

A minimal native shape is sufficient:

```ts
type AccessPathKind =
  | "official_api"
  | "official_rss"
  | "approved_public_json"
  | "approved_public_html";

interface SourceAccessPath {
  id: string;
  url: string;
  kind: AccessPathKind;
  priority: number;
  complianceStatus: "allowed" | "needs_review" | "paused" | "deprecated";
  enabled: boolean;
  complianceNotes: string;
  probe: {
    timeoutMs: number;
    maxBytes: number;
    expectedContentType?: string;
    semanticCheck: string;
  };
}
```

The implementation should:

1. refuse scheduled probes and fetches unless the selected path is explicitly
   `allowed` and enabled;
2. use the existing bounded fetch and robots/cadence machinery, validate the
   final redirect host, and perform a source-specific semantic check;
3. return a typed result such as `healthy`, `blocked`, `rate_limited`, `timeout`,
   `schema_drift`, `empty`, or `error`, with path ID, timestamp, latency, HTTP
   status, bounded item count, and a stable diagnostic code;
4. persist through `source_fetch_state` / `source_fetch_events` and surface via
   the existing Hunter/Sentinel reporting path; and
5. keep all discovery candidates paused/`needs_review` until human approval.

Do not add `accessPaths` pre-emptively to every source. Implement Slice 2 only
for a named source with an evidenced fallback need and two separately approved
paths; otherwise Slice 1 is the complete consequence of this study.

### Acceptance conditions

- Lookalike domains cannot pass trusted-source or ATS recognition.
- Only an explicitly `allowed` access path can become active for scheduled
  ingestion.
- A `needs_review` path cannot be enabled through the current broad
  `enabledSources` predicate; an operator-only diagnostic, if needed, is
  separate and non-ingesting.
- HTTP 200 with an empty, blocked, login, challenge, or schema-mismatched body is
  not reported as healthy.
- Every failure is isolated and machine-readable; one source failure cannot hide
  another source's result or make the run appear wholly healthy.
- Probes have explicit timeout and byte limits and store no full descriptions,
  credentials, cookies, or session material.
- No login, cookie export, CAPTCHA handling, residential proxy, block bypass, or
  unrestricted crawling is introduced.

## Final recommendation

**[I]** Adopt the diagnostic discipline, adapt it to a compliance-first
TypeScript source-path model, defer optional discovery and interface layers, and
reject the runtime/connectors. The immediate plan should be the hostname-boundary
test-and-fix slice. A multi-path probe abstraction should wait for one real,
approved source failover case so the design stays proportional to VA Freelance
Hub's compact public-index mission.
