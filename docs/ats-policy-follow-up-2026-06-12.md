# ATS Policy Follow-Up - 2026-06-12

This follow-up tightens the ATS source policy after the 2026-06-11 health audit
and the Wrangler/D1 access recovery.

## Summary

ATS collection now fails closed for unreviewed or noisy platforms:

- Workable is paused after repeated HTTP 429 history and no reviewed
  source-supported access path.
- Lever and Greenhouse are paused by default because no current production
  directory rows use them and future rows need source-specific review first.
- Breezy remains enabled as `needs_review` because current public endpoints are
  useful and route users back to ATS-hosted URLs, but source-specific terms still
  need review before upgrading it to `allowed`.

## Fix

- Commit `aa670ee` - `fix: pause unreviewed ats platforms`
- Changed `apps/web/src/pages/api/cron/scrape.ts` platform policy:
  - `workable`: `enabled: false`, `complianceStatus: "paused"`
  - `lever`: `enabled: false`, `complianceStatus: "paused"`
  - `greenhouse`: `enabled: false`, `complianceStatus: "paused"`
  - `breezy`: unchanged, enabled as `needs_review`

Follow-up hardening:

- Commit `6304ea4` - `fix: require token review for breezy ats`
- Changed Breezy from platform-wide enabled to token-specific policy:
  - `breezy:20four7va`: enabled as `needs_review`
  - `breezy:sourcefit`: enabled as `needs_review`
  - `breezy:vaaphilippines-recruitment`: enabled as `needs_review`
  - unknown future Breezy tokens: `paused` until source-specific review

## Verification

Local:

- `bun run --cwd apps/web build` passed.
- `git diff --check` passed with only expected CRLF warnings.

CI/deploy:

- CI/deploy run `27372355271` passed for commit `aa670ee`.

Manual Hunter without rollup:

- Workflow run `27372436554` passed.
- Failed sources: 0
- Failed insert batches: 0
- Insert errors: 0
- Skipped sources: 18
- Workable directory rows were reported as `ATS, paused`.
- Breezy results remained enabled:
  - `20Four7VA`: 61 items
  - `Sourcefit`: 65 items
  - `VAA Philippines`: 0 items
  - `24/7 Virtual Assistant`: skipped as duplicate token for `20Four7VA`

Manual Hunter with rollup:

- Workflow run `27372521005` passed.
- Generated rollup commit:
  - `f635f3f` - `docs: update daily source health`
- `docs/source-health-latest.md` now shows Workable ATS sources as `paused` and
  reports 0 failed sources, 0 failed insert batches, and 0 insert errors.

Breezy token allowlist verification:

- `bun run --cwd apps/web build` passed after the allowlist change.
- CI/deploy run `27372929451` passed for commit `6304ea4`.
- Direct probes returned 200 for the current reviewed Breezy JSON endpoints:
  - `https://20four7va.breezy.hr/json`
  - `https://sourcefit.breezy.hr/json`
  - `https://vaaphilippines-recruitment.breezy.hr/json`
- Hunter run `27372988265` surfaced one transient timeout from
  `20Four7VA`; direct probes immediately after were healthy, so the source was
  retried instead of paused.
- Retry Hunter run `27373090226` passed with 0 failed sources, 0 failed insert
  batches, and 0 insert errors.
- Rollup-writing Hunter run `27373196600` passed.
- Generated rollup commit:
  - `14db966` - `docs: update daily source health`
- `docs/source-health-latest.md` now references commit `6304ea4` and reports
  0 failed sources, 0 failed insert batches, and 0 insert errors.

## Remaining Follow-Up

- Review current Breezy-backed sources source-by-source and decide whether each
  should remain `needs_review`, become `allowed`, or be paused.
- Historical opportunity rows from now-paused ATS sources remain visible until a
  separate stale/data-quality policy archives or marks them inactive.
