# APEX audit and repair — September 6–8, 2026

## Scope and authority

User authorizes end-to-end inspection, fixes, automation, deployment and GitHub
backup, while preserving source policy. Immutable supplied mandate is
[APEX_10X_OPERATING_MANDATE.md](../../APEX_10X_OPERATING_MANDATE.md).
Start checkout: feat/apex-w8-ex09-workable-action at
3538229cc563a8142ddf533b4e56cda8447548c3. Fetched main:
727ca4a06dda26b9dcddddf5824238cfdd5ce137. Inherited dirty execution-state update
was preserved as 199c218 before merging origin/main onto codex/apex-audit-repair.
AGK boot passed using `py scripts/agk.py boot --json` at 647879395cc2c4670273bb8b8d5c21976b3c3482;
ai-skills approved checkout 2821e1726e30de3410324244a527ace828df7f30 matched its lock.
No upstream repositories were modified. No .ai/manifest.yaml exists locally.
Code-review-and-quality skill and independent review agents were used.

## Activity reconciliation

[136 GitHub workflow runs](github-runs.tsv) were inspected from September 6
00:00 Singapore time to the audit snapshot on September 8. Five failures:
34020409916, 34020693482, 34020992873, 34021363174 are historical EX-01/EX-02
failures repaired in main (compound SELECT and D1 GLOB limits / admission error
reporting); 34163500431 is the current Wave 8 duplicate-export failure.
PRs #124–134 were all OPEN at audit start. Green PR validation does not mean
production deployment: main contains EX-01 through EX-05, not APEX Waves 0–8.
Historical legacy Next/Vercel PRs remain outside this active release.
Shadow run 34212051126 shows 3 healthy observations, not the seven/nine claimed
in newer branch docs. D1 confirms Grafana 13 observations and Recruitee/Teamtailor
12 each across roughly two days. There are multi-hour GHA schedule gaps.

## Findings and repairs

| Finding | Repair / evidence | State |
| --- | --- | --- |
| Duplicate Workable exports break Bun 1.3.14 CI | 73dc2e0; keep existing exports; include Python tests in CI | Fixed |
| User Experience matches US prefix; distributed team treated as worldwide | 835b3d2; token boundaries and geographically ambiguous wording | Fixed |
| Worldwide metadata bypasses citizenship/residence restrictions | e86dec2; restrictions take precedence, regression fixtures | Fixed |
| Shift feature invents exact PHT hours/client regions | 91be901; source-stated category only, no inferred hours | Fixed |
| HTTP-success shadow results can hide probe/evidence failure | 2b14f07 and counter correction; shared validator for GHA/Worker | Fixed |
| Hourly GHA clock has multi-hour gaps | Existing Cloudflare 10-minute clock adds independent hourly shadow POST | Deployment observation required |
| Primary evidence SHA hashes URL/time rather than content | 286a6c7; bounded primary-document capture | Fixed for future proposals |
| Shared frozen provider mismatch leaves orphan candidates | 578e652; detect full snapshot mismatch before candidate insertion | Fixed, renewal still required |
| Authenticated endpoints classified advisory Tier A | ebf4242; authenticated sources remain guarded | Fixed |
| Workable malformed/empty HTTP200 overwrites healthy digest | a90882b; validation, limits, dedup, output escaping, bounded git push retry | Fixed |
| Source admission workflow interpolates input in shell | SOURCE_ID env binding and HTTP status check | Fixed |
| Baseline and admission claims exceed evidence | Corrected baseline, execution state, ledger, savepoint, bootloader | Reconciled |

## Deliberate blockers and preservation

Exact-six publication remains in force. ADR-008 risk constants are advisory;
actual server policy remains sp23-shadow-7d-v1 (seven-day span, eight distinct
UTC dates within 14 days, latest <=48h). Three-day fast-track was not enforced.
Six Greenhouse allowlist additions are capabilities, not production admissions.
Existing three providers contain URL/time-based fingerprints; do not count those
as captured primary-content evidence for canary acceptance. Renew evidence via a
reviewed, replayable lifecycle transaction, then establish the applicable fresh
observation window. Do not mutate append-only evidence or manufacture past days.
No sources were promoted and no opportunities were bulk-updated during this audit.

All existing EX/SP, Source Doctor/health memory, prospector, taxonomy, AI cascade,
Inngest fallback, analytics, FTS, directory, and recovery work is retained.
Compensation normalization remains paused per recorded owner instruction.
The immutable original ledger survives in Git history; corrected status is in
APEX_10X_WORKSTREAM_LEDGER.md. No 10x success claim is made.

## Verification and recovery

Initial repaired full suite: 1,240 tests pass, 0 fail across 122 files; Python
7/7; initial build passed. Later independent shared-provider and robots changes
require final exact-commit CI below. Typecheck exposed a Bun mock cast, repaired.
Worker dry-run passed with both endpoint bindings. Final deployment/CI evidence
will be appended after acceptance. D1 queries record changed_db=false and
rows_written=0. Code/migrations/evidence go to GitHub; no raw private data or
secrets are included. D1 recovery uses platform Time Travel, not public SQL dumps.

Lessons: test with the pinned CI runtime; never treat mocked admission as a D1
write; never turn geographical keyword fragments into eligibility; never count
HTTP200 alone as health; never derive exact work hours from timezone metadata;
never label a URL/time fingerprint as a content hash.

## First repair release accepted

PR #135 merged as 7a2cd94e50d4873fca7b352956ee56fc8d0fb7c2.
PR CI 34215018419 passed on f79127bddd2f0a8c22d1d1ac27272cf4b74d9b95.
Production Pages CI/deployment 34215162977 and Worker deployment 34215162793
both passed. Pages deployment: https://37af3a8b.remotejobs-ph.pages.dev.
1,244 tests pass on pinned Bun 1.3.14; typecheck/build/guardrails/Worker verification
and Python 7 tests pass. Manual shadow 34215262873 passed; first automated
source-economics run 34215259661 passed and backed up its report. Public route
smoke returned HTTP200 for homepage, opportunity/search queries, directory,
data policy, privacy and sitemap (production-smoke.json).

CI also caught an unpinned Wrangler command (34214613875) and an import outside
its declaring workspace (34214771460); both repaired before merge. Retired
Vercel account-block check is irrelevant to active Cloudflare deployment.
PRs #125–134 were automatically merged through retained ancestry; #124 is an
obsolete bootloader proposal and should not supersede CURRENT.md.

Live Workable preprocessing exceeded the explicit 128 MiB ceiling and failed
closed, preserving last-good output. No claim of live Workable acceptance; next
step is bounded streaming/minimal-field preprocessing or a measured safe budget.
Source renewal is the next separate slice; no past observations will be counted
as new primary-content evidence.

## Evidence-renewal and streaming releases

PR #136 merged as e4ce720ce58825f79579d744b7c4d0d9415c548d.
PR CI34216088585 passed 1,252 tests; production Pages34216203545 passed.
Renewal appends a new admission epoch using native D1 atomic batch guards and
fresh content captures/probes. Old packets/observations stay immutable. Tests
cover mid-batch rollback, group/revision races and old-epoch disqualification.
PR #137 (c6ddba78ad36d0350c04c8174bf7e364e6493d34) added bounded authenticated
stage diagnostics; production34216611134 passed. Preview exposed Workers'
unsupported redirect:error option before any write. PR #138 uses manual mode
and explicit HTTP rejection; local regression/typecheck pass. CI caught a stale
redirect expectation and then Bun mock typing; fixed before acceptance.

Independent Workable review caught nested-job silent omission and oversized XML
token allocation. Streaming now rejects both before publishing a digest, while
SAX discards descriptions. Limits:512MiB raw,32MiB metadata,16KiB fields/markup,
100,000 jobs,120s, with temporary cleanup. Python3.9+ stdlib required; platform
launchers are checked, no downloads/pip dependency. Focused16 Bun +8 Python tests
pass, including a synthetic132MiB feed and low-memory adversarial token tests.
A local live attempt on September8 ended ECONNRESET and preserved last-good
output. This is not a successful production feed acceptance.

Read-only probes found healthy GitLab, Remote.com, Nearform, Ghost and Wikimedia
feeds. Canonical exceeded the current524288-byte probe limit (540269 bytes) and
is withheld; no alternate endpoint or publication override used. See
greenhouse-probes.json. Source counts are probe samples, not qualified supply.
PR #124 closed as superseded; its branch/history remain available.

A thread heartbeat, apex-source-recovery-and-qualification, is scheduled every
six hours to continue bounded authorized work and check qualification. It stays
quiet on unchanged/non-actionable state. GitHub daily economics and Workable,
hourly GitHub shadow, and independent Cloudflare shadow clocks remain active.
The desktop heartbeat depends on app scheduling availability; it is not a
replacement for deployed ingestion clocks.

## Live acceptance and bounded follow-up

PR #138 merged as7db386070b0654ec320514abbcdc8a32dc5d9be4; PR CI34217630933
and production34217731133 passed. Independent reviewer confirmed both XML
findings closed. GitHub Workable34217743529 failed at512MiB in30s; this is a
measured resource boundary, not successful preprocessing. Daily bulk scheduling
is made dormant; manual run remains, next review2026-09-15 or earlier supported
bounded feed evidence. Do not repeat bulk downloads merely to produce green CI.

Native D1 renewal succeeded: Greenhouse revision3/evidence4 and Recruitee
revision2/evidence5. GitLab and Remote.com admitted to shadow (published0).
Readback confirms five shadow identities; manual shadow34218062832 passed.
Renewed epochs start September8, not September6. Three healthy Greenhouse
candidates (Nearform/Ghost/Wikimedia) remain staged until renewal/dispatch
capacity is measured; route renewal currently supports at most4 identities per
provider, and expanding the group must not create an unrenewable evidence set.
Canonical remains withheld at the524288-byte probe bound.

Teamtailor raw HTML varied with a per-request CSP nonce. The same nonce appears
in link/script attributes and data-n-css. A reviewed exact-URL canonicalization
replaces only that unique44-character Base64 token; all other HTML stays
hash-significant. Two fresh captures match ac78d16e06d1eae6f0da138bde040586db0a6216464c3cb0480816afe42dda26.
Absent/multiple nonce formats fail closed. Article content was reread and still
documents public RSS metadata sharing, original job link and100-job default.
This is a content hash with a documented transport-nonce normalization, not a
URL/time fingerprint or ignored substantive difference. Final Teamtailor native
renewal follows deployment and an exact preview/hash comparison.
