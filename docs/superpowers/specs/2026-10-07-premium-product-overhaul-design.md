# Premium 2026 product overhaul specification

Owner supplied the complete [design direction](../../design/PREMIUM_2026_OWNER_BRIEF.md)
and requested following it while retaining the present color family. Its preferred
A×B direction is the starting authority. A verified pre-design source tag and
[restore procedure](../../design/PREMIUM_2026_SAVEPOINT.md) are on GitHub before UI work.

Product truth and constraints: [PRODUCT.md](../../../apps/web/PRODUCT.md).
Exact visual/interaction contract: [DESIGN.md](../../../apps/web/DESIGN.md).
Controlled surface sequence: [implementation plan](../plans/2026-10-07-premium-product-overhaul.md).

## Discovery and critique

The current 1440×1000 homepage has no search field and the first actual job link
starts at y=972.4 CSS pixels. A centered marketing hero and repeated calls to
action delay the product. Platform and agency colors compete with actual
geographic evidence; multiple 10px pills weaken two-second scanning. Opportunities
uses a cramped search beside four selectors, rather than giving query and
results priority. Directory exposes many category cards before its search.

Keep native GET search/pagination, existing source/eligibility semantics, honest
saved-data date and authoritative Apply. Replace these visual arrangements with
compact search-first home, filter-rail board, quieter rows, searchable employer
groups and a readable detail/apply layout. The user explicitly pinned cream,
charcoal and coral; product precision governs the job board.

## Decisions and acceptance

Compare three realistic rendered concepts, then combine A's warmth and B's
application discipline as preferred in the supplied brief. C provides a comparison
for regional human character without tourism imagery. No decorative image,
animation library or new UI dependency is needed. Manrope is a one-family
typography choice; all existing platform/description/Apply gates are retained.

Preview uses the dated committed public fixture without a D1 binding. Counts and
posting dates are factual fixture metadata, not claims of live ingestion.
Record rendered QA at 390/768/1280/1440, overflow boundaries, actual GET flows,
keyboard/focus/reduced-motion and relevant offline regression checks. Runtime
release goes through the ordinary PR/CI path; no backend or migration changes.

Jev's bounded direction consultation returned HTTP 401 and was non-blocking.
Codex chooses the user-pinned A×B direction using repository/browser evidence.

Reference principles: [Linear filters](https://linear.app/docs/filters) and
[Raycast search](https://manual.raycast.com/search-bar) inform labelled controls
and keyboard efficiency; no product artwork or exact layout is copied.
Font provenance: [Google Fonts Manrope](https://github.com/google/fonts/tree/main/ofl/manrope).

The saved-data fallback, safe Apply refusal and source-quality protections are
acceptance constraints throughout the redesign, not design elements to remove.
