# The Filipino Agency Index — Self-Updating Engine (V5.2)

## Strategic Objective
Maintain a 100% automated, zero-maintenance aggregator that provides real-time hiring signals for Filipino VA agencies.

## Operational Logic
1. **Harvest (Every 30 Minutes)**: Trigger.dev orchestrates a global high-velocity fetch across specialized providers (RSS, Reddit, Jobicy, Greenhouse, Lever).
2. **Deduplicate (High-Speed)**: Incoming text signals are normalized and fuzzy-matched using a custom Zig binary to prevent database pollution.
3. **Verify (Live-Check)**: Automated HEAD requests ensure hiring boards are active before they appear on the dashboard.
4. **Publish (High-Performance)**: Astro serves an obsidian dark-mode dashboard with source-coded discovery signals.

## Zero-Cost Maintenance
- **Bun**: Minimal runtime overhead.
- **Turso**: Edge SQLite for zero-cold-start reads.
- **Trigger.dev**: Optimized compute usage by keeping Zig matching under 500ms.
- **Vercel**: Edge-cached Astro static routes.

---
*Created and maintained by Antigravity AI.*
