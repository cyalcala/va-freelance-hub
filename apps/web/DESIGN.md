# Pigment & Paper design contract

Authority: October 8 owner feedback in `../../docs/design/PIGMENT_PAPER_2026_BRIEF.md` supersedes the October 7 flat visual rules. Product facts remain in PRODUCT.md. Earlier Premium 2026 review/acceptance records are historical evidence.

## Direction

A warm studio desk for finding work. Preserve cream, charcoal and orange/coral; add real watercolor grain, weighty paper surfaces, ink outlines and warm offset shadows. Fraunces display type gives the introduction character; Manrope keeps search, job titles and metadata easy to scan. Variance 8/10, motion 3/10, density 6/10. Personality comes from material, type and company identity, without invented proof.

## Tokens and component grammar

| Role | Value / rule |
| --- | --- |
| Page / surface / recessed | `#F8F0E4` / `#FFFCF6` / `#EEE2D2` |
| Ink / muted / control border | `#2B241E` / `#6B5C50` / `#8E7662` |
| Accent text / hover / fill | `#A93E25` / `#85301D` / `#F17A54` |
| Primary button | Ink text and outline on coral fill, 3px ink shadow |
| Evidence | Actual recorded state only; existing green and attention semantics |
| Typography | Fraunces 600–700 display, Manrope 400–800 body and controls |
| Type sizes | 12–14 metadata, 15–16 body, 17–18 job title, 28–44 page title, 39–60 home title |
| Radius | 10–12 controls, 14 marks, 18 result surfaces, 24 painted intro |
| Borders / shadows | 1.5–2px edges; warm 3–7px offset shadows and restrained soft depth |
| Motion | Short color feedback and 1–2px action/row lift; disabled under reduced motion |
| Content | 1200px maximum; 20px mobile gutters; 4px spacing scale |

Search is a native GET form. Labels stay visible. Job rows retain title, employer, employment type, source and source date. Geographic evidence remains actual and likely stays labelled likely. Do not add salary/shift filters or alter ranking.

## Page and responsive behavior

Home uses a painted introduction with native search and category links, then real recent listings within the first desktop viewport. The small desktop company note links to exact directory searches; it disappears below 1024px. Paint has lower opacity on mobile. Small counts have a solid paper backing.

Opportunities uses a 264px paper filter rail above 1024px and native disclosure below it. Search/filter/pagination URLs remain useful without JavaScript. Directory uses the same paper rows and existing safe company website links. Details retain original-source Apply, source-aware excerpt limits, unknown facts and JobPosting JSON-LD. Legal pages inherit type and chrome without legal edits.

Check 390/768/1280/1440 plus 375/1024/1920 boundaries. No horizontal scrolling, legible wrapping, controls at least 44px, clear keyboard focus and reduced motion. Saved-board notices keep their actual generation timestamp; no freshness claim.

## Company marks

Use the existing same-origin logo endpoint only for sanitized, recorded company websites. Jobs gain presentation-only logo domains through exact normalized directory names. Conflicting names/domains remain unknown. Hosted careers provider domains are excluded, so Workable/Greenhouse/Lever marks cannot impersonate an employer. Do not guess websites, add queries or change the serving snapshot schema. Missing marks use initials. Images reserve dimensions and load lazily; a small progressive error handler restores initials after an image transport failure. Names and all discovery links remain useful when JavaScript or logos fail.

## Assets, copy and budgets

One local generated abstract watercolor WebP, 1200×800, 164,434 bytes. No text, people, employer marks or claims in generated artwork. No animation library, canvas, new dependency or hydrated island. Two existing-transport Google font families with display=swap and system/Georgia fallback. Record actual resource measurements; local observations do not establish field Core Web Vitals.

Use SlopMonster at pinned commit `3fc9787d9337b57c599a80afbefbbb3be5a8eb0b` for owned interface copy, preserving source titles and factual conditions. It is a writing workflow, not a visual evaluator. Checker scores alone do not establish copy quality. Record the independent model pass or its limitation.

Accept after browser rendering, responsive/keyboard/GET/state checks, contrast, appropriate tests/typecheck/build, independent code review and existing release offline checks. Fence cached HTML to this asset revision without changing TTLs.
