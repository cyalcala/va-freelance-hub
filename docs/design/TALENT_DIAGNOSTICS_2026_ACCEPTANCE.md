# Talent mark and internal diagnostics refinement — October 8, 2026

Status: implementation, local verification and independent review complete;
required CI and production acceptance pending (three of five checkpoints).

## Owner direction and recovery

The owner requested a softly blinking deep-orange mark beside “For Filipino
talent”, replacing the star that resembled Anthropic. The owner also requested
removal of the intermittent public saved-listings banner, with its diagnostic
information retained internally for AI maintainers. This supersedes the earlier
design rule requiring that visible strip; historical acceptance remains dated.

Start SHA: `93c2e1e4f0da8f82c0f143ed76ccd9904eebb286` on
`codex/filipino-talent-pulse`, after fetching origin/main. The accepted watercolor
design and original savepoint tags remain available. Restore source into a new
branch rather than resetting shared main. Git is not a database-state backup.

## Implementation and local evidence

The mark is a 12px circle in `#C55729` with a soft 2.6-second opacity/scale cycle,
never fully extinguished. It is decorative/aria-hidden and static under reduced
motion. No JavaScript or new asset is needed. The shared layout removes the
public strip and mirrors six existing snapshot headers into head metadata.
Homepage counts say “jobs in the board”, without a fabricated freshness claim.
The HTML cache revision is advanced to fence previous stylesheet references.

[Maintainer/AI diagnostic contract](../operations/PUBLIC_SNAPSHOT_DIAGNOSTICS.md)
is linked from AGENTS.md. Existing classification, logging, refresh, `no-store`,
source Apply and actual unavailable-response behavior remain intact. Standard
metadata is discoverable by inspecting tools; this is not automatic recognition
by every AI or a confidential channel.

Local targeted suite: 50 pass / zero failures / 181 assertions. Typecheck and
production build pass. [Eleven-route no-D1 HTTP receipt](evidence/talent-local-http.json)
includes both CSS assets 200, zero hydrated islands and guarded Apply refusal:
503, Retry-After 30, no-store, no Location. [Metadata receipt](evidence/talent-local-metadata.json)
checks exact header/meta agreement, banner absence and no-store for saved state.
Receipts identify the start SHA plus working-tree edits, not an immutable commit.
The required Linux built-Worker probe now checks truthful internal metadata in
place of the explicitly superseded visible banner assertion.

Browser preview at 1440 and 390 confirms no banner or horizontal overflow,
12px deep-orange mark with active 2.6-second animation and preserved native
search submission to `/opportunities?q=assistant`. Separate observations show
changing opacity. Both sampled job details retain source/application information;
recorded company marks/unknown initials are unchanged. Actual no-D1 observations
include `lkg_fallback` and later `stale` as edge state is reused, never relabelled
fresh. [Desktop](evidence/talent-local-home.png),
[mobile](evidence/talent-local-mobile.png), [detail](evidence/talent-local-detail.png).
OS reduced-motion emulation was unavailable; the explicit static CSS override
was reviewed, not represented as an emulated browser check.

## Remaining acceptance

Independent read-only review approved the working diff on the start SHA with no
Critical, Important or actionable Minor findings. It confirmed header timing,
truthful metadata, reduced-motion behavior and unchanged serving/Apply safeguards.
The review does not substitute for committed-head CI or live acceptance.

Commit/push task-owned code/docs/evidence, run normal
required PR CI, merge and inspect the exact-SHA Pages release. Verify live HTML
header/meta agreement, CSS delivery, orange mark and absent strip, then record
the release receipts and acceptance in the canonical recovery documents.
No source admission, GCP deployment, DB schema or publication-authority change.
