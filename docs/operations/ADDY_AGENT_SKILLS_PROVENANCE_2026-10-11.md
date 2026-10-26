> **Historical Git-host evidence:** The Git-host state and commands below
> describe the dated observation only. Since 2026-10-27, GitHub `origin`
> is canonical; do not restore or reconnect the former service.
> [Current cutover status](GITHUB_CANONICAL_EMERGENCY_CUTOVER_2026-10-27.md).

# Addy Osmani agent skills: portable project inventory, 2026-10-11

## Scope and source

The owner's October 11 instruction requests extensive use of relevant skills
from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills).
This bounded audit preserves the installed skills and repairs their shared
reference dependencies. It changes no application, publication, billing,
production runtime, or source-admission behavior.

All **25 direct project skills** already existed at `.agents/skills/<name>/`.
Their `SKILL.md` files were byte-identical to the existing local upstream checkout
at `.agents/skills/agent-skills`, whose clean HEAD was
`2686b620fc1fed2e8f60c704839c766b8594c6b6` (release **0.6.11**, commit subject
`chore(release): bump plugin manifests to 0.6.11`, authored September 25).
The installed snapshot stays pinned to that revision. A read-only upstream query
on October 11 returned main SHA `1be8e34187e34647bb83adc3a1323b26ae6f6abe`;
this is an observation, not a claim that the newer revision was installed.

The existing nested `.git` directory is preserved. Do not stage it as an embedded
repository. The portable installation is the direct 25 skill directories,
their existing per-skill support files, `.agents/references`, the MIT license,
and the provenance/verification files. It works without that nested checkout.

The installed global trees at `C:/Users/admin/.agents/skills/agent-skills-addy`
and `C:/Users/admin/.codex/skills/agent-skills-addy` each expose 24 direct skills
and a nested duplicate; both lack `constraint-driven-development` in their
direct `skills/` inventory. Those copies were preserved without modification.
For this project, prefer its complete direct 25-skill inventory below.

## Portability repair

Direct skills retain the original upstream `../../references/<name>.md` links.
The initial audit found **22 unresolved links** across 27 checked skill/reference
files because those paths resolve to the previously absent `.agents/references`.
Seven byte-identical shared references were restored from the pinned checkout:

- `accessibility-checklist.md`
- `definition-of-done.md`
- `observability-checklist.md`
- `orchestration-patterns.md`
- `performance-checklist.md`
- `security-checklist.md`
- `testing-patterns.md`

The upstream MIT license is retained as
`.agents/skills/LICENSE.addyosmani-agent-skills`.
`.agents/skills/addy-agent-skills-provenance.json` records the source SHA,
skill names, and **39 asset SHA256 fingerprints**, normalizing CRLF to LF so
Windows checkout line endings do not create false mismatches.
No `SKILL.md` contents or global copies were overwritten.

## Complete inventory and applicable routing

Read each relevant `SKILL.md` before applying it. User authorization and this
project's existing constitution, invariants, and acceptance contracts remain
authoritative; installing a workflow does not relax those contracts.

| Phase | Installed skills | Application to this goal |
| --- | --- | --- |
| Routing/context | `using-agent-skills`, `context-engineering` | Recover current evidence and choose bounded workflows. |
| Definition/planning | `interview-me`, `idea-refine`, `spec-driven-development`, `constraint-driven-development`, `planning-and-task-breakdown` | Reuse canonical requirements and quality limits; clarify only a genuinely missing consequential decision. |
| Implementation | `incremental-implementation`, `source-driven-development`, `api-and-interface-design` | Small reversible changes, official provider contracts, stable publication/control interfaces. |
| Proof/recovery | `test-driven-development`, `doubt-driven-development`, `debugging-and-error-recovery` | Adversarial counterexamples, reproducible requirement evidence, independent review, failure diagnosis. |
| Quality/safety | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization` | Protect verified behavior, credentials, spending boundaries, and measured throughput. |
| Runtime/delivery | `observability-and-instrumentation`, `ci-cd-and-automation`, `git-workflow-and-versioning`, `shipping-and-launch` | Record source/runtime health separately, verify canonical SSM and GitLab mirror SHAs, require deployment provenance. |
| Durable memory/migration | `documentation-and-adrs`, `deprecation-and-migration` | Maintain restartable checkpoints; retire residual clocks only with accepted replacement evidence. |
| Product surface | `frontend-ui-engineering`, `browser-testing-with-devtools` | Use when a bounded slice changes the public site; check actual available browser tooling first. |

No `.ai/manifest.yaml` or repository `scripts/skill-router.py` exists in this
checkout. The installed Addy source also supplies no `skill-router.py`.
Fallback for this bounded audit is the explicit intent map in
`.agents/skills/using-agent-skills/SKILL.md`; do not claim an unavailable router,
native plugin, paid model, or browser integration was invoked.

## Reproducible verification and limits

Run from the repository root:

```powershell
python .agents/skills/verify-addy-portability.py
git ls-remote https://github.com/addyosmani/agent-skills.git refs/heads/main
```

The verifier checks all 39 recorded asset fingerprints, the exact direct skill
inventory, and shared-reference resolution from each containing file, excluding
fenced examples. The original missing-reference counterexample was reproduced
before repair. After repair it returned **25 skills, 39 assets, 27 checked
skill/reference files, 43 reference links, zero errors, and `passed: true`**.
An adversarial in-memory manifest changed one expected asset digest to 64 zeros;
the verifier rejected it with `SHA256 mismatch`. A separate fenced-example
counterexample confirmed that example reference text is ignored. No installed
files were altered by those counterexamples. `git diff --check` was also run.
The verifier does not require the nested checkout, install network dependencies,
execute the optional Bash helper, or alter files. Python 3.13 was available for
this audit. The optional `idea-refine` Bash script remains present; shell/runtime
compatibility was not tested and is not necessary for the current engineering
workstream.

This receipt proves installation identity and portability only. It proves no
mathematical requirement, runtime cutover, job permission, production deployment,
or daily publication target. Root execution owns broader verification, canonical
commit/push, mirror verification, and independent review of this checkpoint.
