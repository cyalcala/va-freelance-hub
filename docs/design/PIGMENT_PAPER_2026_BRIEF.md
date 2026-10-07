# Pigment and paper design revision

Date: 8 October 2026, Asia/Singapore. Owner feedback supersedes the October 7
flat/quiet visual rules: the site felt dull, dry and impersonal; restore company
logos and add thicker aesthetics, shading and a watercolor feel while retaining
the warm color family and useful modern interactions.

## Experience brief

Audience: Filipino professionals finding remote jobs and VA employers. Page job:
search, compare actual listings and follow the original application link.
Primary action remains native GET search. Design read: a warm studio employment
board with pigment washes, substantial paper surfaces and visible employer marks.
Design variance 8/10, motion intensity 3/10, visual density 6/10.

Cream paper, charcoal ink, orange/coral pigment and a small ochre accent. Rounded
ink outlines, warm offset shadows, a tactile search bar and softly shaded rows.
Use a characterful display face with Manrope for controls and reading. Signature:
a compact painted introduction and actual company identities above readable jobs.
Search and recent listings stay in the first desktop viewport. Mobile simplifies
decoration and keeps full-width controls, visible companies and thumb navigation.

Existing routes, filters, eligibility labels, ordering, source restrictions,
Apply authority, fallback states and legal wording remain intact. Real company
domains come from the existing directory with an exact-name match; missing or
ambiguous identities use initials. A source-platform icon is never relabelled as
an employer logo. No new D1 query or identity-guessing network request.

Technology: Astro SSR, native forms, CSS and one local abstract watercolor asset.
No hydration/animation dependency. Texture is decorative and never behind small
body text; no canvas/3D, audio, cursor replacement or scroll hijack. Existing logo
API remains bounded and same-origin. Image failure falls back to readable initials.
Reduced motion removes optional translation; keyboard focus and all core paths
work without JavaScript. Solid surfaces protect AA text contrast. Minimum 44px
controls and no main-content horizontal overflow.

Asset provenance: generated abstract pigment, never generated company marks.
Document prompt/output/optimized bytes. Display/font provenance is recorded in
DESIGN.md. Decorative image budget 250KB; zero new client hydration; font budget
two families, display only where needed. Fallback ladder: solid cream surface,
system fonts, initials, native form interaction.

SlopMonster is used for owned product copy: pinned source
`3fc9787d9337b57c599a80afbefbbb3be5a8eb0b` from
https://github.com/ItsssssJack/SlopMonster. It is a writing checker/editorial
workflow, not a visual-design validator. Inspect its standard-library checker,
lint actual owned copy, request a different-family edit where available, compare
facts and lint again. Do not score third-party job titles as our own prose.

QA: inspect 390/768/1280/1440 plus 375/1024/1920, logos and failed assets, search /
filters / pagination / detail / directory / genuine saved state, keyboard and
contrast. Measured visual critique and independent pre-merge code review. Build,
typecheck, meaningful identity regressions, existing offline/CI and live release
receipts. Retain source savepoints and back up code/evidence/recovery on GitHub.

Start/source return point: `2661cbb6a8bdb815bef58241a1ec7c45a20c1cab`.
Previous pre-premium tag remains available. This is a frontend revision, not a
source-autonomy, database or GCP migration task.
