# Pigment & Paper local review — October 8, 2026

## Outcome and authority

The owner rejected the prior restrained aesthetic. This revision keeps the warm
brand family and introduces thick watercolor, paper depth, ink edges, expressive
display type and authentic recorded company marks. Product/source behavior is
preserved. Local acceptance is complete; required CI and live release remain
pending. The old Premium 2026 acceptance is historical, not acceptance of this UI.

## Verification and independent review

Full local suite: 3,023 pass / zero failures. After final logo normalization and
cache-fence refinements, nine identity/cache tests pass with 67 assertions. Four
repository audits, typecheck and build pass. Static design scan ran once on eight
changed UI files: one advisory for common Fraunces use. It is retained because its
weight and curves support the owner's watercolor direction; the generated pigment
and physical surfaces carry the primary visual identity. The heuristic is not
represented as evidence of originality.

The independent read-only reviewer found two important logo edges: social-profile
hosts showed the profile platform's mark, and terminal-dot hostnames bypassed
provider exclusions. Both were fixed without changing links, with tests and
independent inline replay. Final review: no Critical, Important or actionable
Minor findings. GET URLs, ordering, eligibility qualifiers, source Apply,
permitted excerpts, saved timestamps and JobPosting JSON-LD were compared intact.

## Browser and runtime evidence

The production build was served by a local Pages Worker with no D1 binding and
isolated disposable local state. [Final HTTP receipt](evidence/pigment-built-http.json)
records eleven routes and both linked stylesheets returning 200. Tracked Apply
correctly returns 503, Retry-After 30, no-store and no outbound Location. Saved
notices retain the fallback's actual October 7 generation time. These are local
outage checks, not claims about production runtime or collection health.

[Responsive measurements](evidence/pigment-responsive.json) and PNG captures cover
home at 375/390/768/1024/1280/1440/1920, and board/directory/detail/category at
390/1440. No measured horizontal overflow; inspected visible form/pagination
controls are at least 44px. Desktop home first job begins at 818px for 1280+ and
891px at 1024 in the 1000px-high local saved-state viewport. At 375/390 the real
saved notice and intro precede the listings; no claim of first-screen mobile jobs.
The small company note disappears below 1024. Both fonts were actually loaded.

Browser interaction checks: visible skip-link focus and Enter navigation; home
search submits `/opportunities?q=assistant`; board search returns 139 fixture
results; native mobile filter summary opens with Enter; admin filter narrows to
65; Next preserves filters and shows 31–60; unmatched query offers Reset filters;
directory query finds the real MultiplyMii entry; detail shows its mark and source
Apply. Known marks MultiplyMii/Sourcefit/Supabase load; unknown employers use
initials. Source flags remain visible. Browser JavaScript-off and OS reduced-motion
emulation were unavailable; native form HTML and reduced-motion rules were reviewed.
Server logo fallback and hostile identity cases are covered by existing/new tests.

[Contrast calculations](evidence/pigment-contrast.json): thirteen semantic text,
button, evidence, notice, focus/field-edge and footer pairs meet their targets.
Small intro copy/counts/labels have solid paper backing over the decoration.
Decoded HTML: home 77,454 bytes, unfiltered board 42,771, directory 58,990.
CSS: shared 42,410 bytes plus home 7,423. Decorative WebP: 164,434 bytes.
[Observed inventory](evidence/pigment-assets.json): two fonts, six image URLs,
three stylesheets, zero external script URLs. There are zero hydrated islands;
the small logo-error handler is inline client JavaScript. The build emits the
existing React runtime, but inspected pages do not reference it. These are payload
and observed-reference measurements, not field LCP/INP/CLS or compressed transfer.

## Visual critique

Design read: a warm studio employment desk, with pigment as a distinctive backdrop
and solid paper interiors for actual work. Five high-impact defects caught and
fixed: missing employer marks; ATS provider marks; social/trailing-dot provider
marks; small text over variable pigment; and a third mobile shortcut row at 375.
The final viewports recheck these corrections. No generated employer logos,
testimonials, fake freshness or decorative motion were introduced.

| Dimension | Score / 5 | Evidence and practical limit |
| --- | --- | --- |
| Craft | 4 | Consistent outlines, inset marks, offset shadows and readable interiors |
| Originality | 4 | Authored pigment/material direction; common font advisory retained |
| Usability | 4 | Working native search, keyboard filters and preserving pagination |
| Motion | 3 | Modest hover/press feedback; no authored animation needed for the task |
| Typography | 4 | Display/body distinction and measured wrapping across seven widths |
| Content | 4 | Direct navigation copy, source facts intact; rival pass unavailable |
| Performance | 3 | Bounded local asset, no hydration; field timing remains unmeasured |
| Accessibility | 4 | Contrast/targets/focus/native semantics; no full assistive-tech audit |
| Maintainability | 4 | Shared tokens and one presentation identity helper, no dependency |
| Technical innovation | 2 | Existing Astro/native forms deliberately retained |

[Provenance and SlopMonster](PIGMENT_PAPER_2026_PROVENANCE.md) record the pinned
editorial workflow, draft/final 5/5 checks and failed Claude authentication. No
second-family edit was accepted. Jev is advisory and does not inspect screenshots.
The final bounded Jev call returned HTTP 401; root accepted the local iteration
from direct browser measurements, tests and independent review, without retrying
or claiming an advisory approval.
