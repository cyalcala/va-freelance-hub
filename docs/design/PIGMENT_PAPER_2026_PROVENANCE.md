# Pigment & Paper provenance — October 8, 2026

## Artwork and typography

The built-in image generation tool created one abstract decorative watercolor.
The original is retained in the local generated-images directory; the deployed
derivative is `apps/web/public/textures/pigment-paper.webp` (1200×800, 164,434 bytes).
Bundled Sharp resized/encoded the PNG as WebP; no app dependency was added.
The artwork carries no text, employer mark, person or factual claim.

Prompt direction: landscape watercolor on warm ivory paper, quiet left and upper
space, thick granulated coral, vermilion and terracotta strokes concentrated on
the right and bottom, ochre-gold lower swash and subtle sage accents; organic
pigment edges, dry brush and visible paper grain. No typography, logos or objects.

Fraunces is served through the existing Google Fonts transport alongside Manrope,
with display=swap and local fallback fonts. Fraunces provenance/license:
[Google Fonts OFL record](https://github.com/google/fonts/blob/main/ofl/fraunces/OFL.txt).
The same-origin company-logo endpoint uses actual recorded public website domains;
these marks are not generated artwork. Generic hosted ATS marks are excluded.

## SlopMonster

[SlopMonster](https://github.com/ItsssssJack/SlopMonster) was read and used at
commit `3fc9787d9337b57c599a80afbefbbb3be5a8eb0b` (MIT). It is an editorial workflow,
not a visual-design engine. Its Python checker ran on owned interface copy,
excluding third-party job titles, descriptions and dynamic counts.

The draft scored 5/5. Manual review still replaced the vague “A little research.
A better next step.” with “Explore the company directory.” and shortened the
mobile search placeholder. Final copy is retained alongside the draft.

A second model-family pass was attempted with the installed Claude CLI, the
supplied cleanse prompt, public copy only, no tools and no session persistence.
It exited 1 because the configured OAuth token expired (401). No rival edit was
accepted or represented as complete. Local editorial review and checker continued;
no authentication state was changed. A clean checker score does not prove quality
or human authorship.
