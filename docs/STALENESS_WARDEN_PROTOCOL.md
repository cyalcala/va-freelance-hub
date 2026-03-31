# VA.INDEX — STALENESS WARDEN PROTOCOL
## Version: 1.1 — HIERARCHY-AWARE EDITION
## Focus: Resolve data staleness while maintaining Tier-Priority
## Chain: Trigger.dev → Turso → Drizzle → Vercel API → Astro → Browser

---

### 1. Ingestion Integrity
- **Sentinel Check**: Identify if `latestActivityMs` is jumping for old signals. If a signal has no native `postedAt`, its `latestActivityMs` MUST NOT update beyond its initial capture time.
- **Fingerprint Check**: Ensure no "Signal Collisions" are occurring. The unique index MUST be `(title, company, sourceUrl)`.

### 2. Sorting Hierarchy
- **Primary Sort**: `tier ASC`. Platinum (0) ALWAYS above Gold (1).
- **Secondary Sort**: `latestActivityMs DESC`. Fresh signals float to the top of their respective tiers.
- **Policy**: Never use "Decay Math" that mixes tier and time. Mixed math causes "Tier Leapfrogging" which is a mission-critical failure.

### 3. Remediation Protocol
- **Trigger**: If `max(lastSeenAt)` > 2 hours, trigger `RECOVERY_BURST`.
- **Lock Check**: During recovery, reset `vitals.lockStatus` to `IDLE` before triggering a new harvest.
- **Watchdog Deactivation**: The `database-watchdog` MUST use Tiered Retention (7d for Platinum, 4h for Bronze) to ensure signal density remains high-intent.

### 4. Verification
- **Pulse**: Check `/api/health`.
- **UX Audit**: Verify that the top 50 items are strictly tiered.
