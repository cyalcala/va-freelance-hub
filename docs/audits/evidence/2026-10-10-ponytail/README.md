# Ponytail review evidence — 2026-10-10

This package supports [the redesign opportunity report](../../PONYTAIL_REDESIGN_OPPORTUNITIES_2026-10-10.md). It records an audit, not a repair, release, source transition or new execution queue.

## Skill provenance

The user explicitly requested [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). The review read and applied the base skill and whole-repository audit skill at upstream commit **9cc65d03aa2da1db7121b912d03596409ee340b8**:

- [Pinned audit skill](https://github.com/DietrichGebert/ponytail/blob/9cc65d03aa2da1db7121b912d03596409ee340b8/skills/ponytail-audit/SKILL.md), archived as `upstream/ponytail-audit.SKILL.md`.
- [Pinned base skill](https://github.com/DietrichGebert/ponytail/blob/9cc65d03aa2da1db7121b912d03596409ee340b8/skills/ponytail/SKILL.md), archived as `upstream/ponytail.SKILL.md`.
- The upstream MIT copyright/permission notice is preserved in `upstream/LICENSE`.

These are instruction-only evidence copies. No plugin, lifecycle hook, global skill configuration or external repository script was installed or executed. Project authority overrides incompatible upstream suggestions: the report measures problem reduction, not code-size savings. Upstream benchmark claims are not project evidence.

## Review boundary

Implementation source: **f6753582a11ca7ffff70943ee69c3fdddbdc60b0** on `codex/verified-flow-directory-checkpoint`. The canonical state can advance after this report; recover it before acting. The previous independent audit's fresh-date failure is historical at this source because the repair has landed.

`code-inventory.json` enumerates tracked code, tests and configuration at the frozen source revision. Inventory does not mean every listed file was read line by line or tested. The report names semantic review coverage and exclusions. Third-party packages, generated build output, ignored/private files and live infrastructure were not exhaustively audited.

`inherited-checks.json` records independent verification of the date unit's six source hashes and nine log hashes. The prior full suite was not rerun for this documentation task. Its clock-projected native fixture limitation remains attached to the evidence; local tests do not establish production acceptance.

The review used no production database/source requests, public-page GETs, deploys, migrations, source transitions, changed parameters, schedules or provider calls. Jev's unchanged recorded 401 remained non-blocking; deterministic review continued without another probe or fallback provider.

## Integrity

`SHA256SUMS.json` records local-byte SHA256, LF-normalized UTF-8 SHA256 and filtered Git blob IDs for the deliverable files. On another operating system Git may convert line endings; compare normalized content or Git blob identities, not local-byte hashes alone. The manifest excludes itself. Hash equality verifies content identity, not the correctness of an inference or current production truth.

Archived offline probes, if present, document their exact command, substituted boundary and observed output in the report. Run them only against isolated local state with the repository test preload. Never replace an in-memory/fake binding with a live database. A recording command's exit0 is not an acceptance test for repaired behavior.
