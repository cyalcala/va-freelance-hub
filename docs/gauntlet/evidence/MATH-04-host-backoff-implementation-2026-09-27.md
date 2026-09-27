# MATH-04 host cooldown implementation — 2026-09-27

Implementation evidence only; deployment and the clean observation window are
separate acceptance steps. Start SHA:
`016a9bffc0f3801e874e833fb7e9984a070ca1b2`.

The existing dispatcher already shielded same-host siblings within one run.
It did not persist that hold across invocations. The candidate probe also
retried 429 immediately, truncated Retry-After to five seconds, and did not
count the extra request against the accepted two-request budget.

## Bounded change

- Migration `0051_shadow_host_backoff.sql` adds one scheduling row per host.
  Primary-key reads avoid scanning historical observation JSON. The route
  fails closed if the table is unavailable; apply the migration before release.
- A genuine rate-limit result establishes a finite `next_eligible_at` using the
  existing `DEFAULT_MIN_REDISPATCH_MINUTES=1440` floor, any stricter provider
  minimum, and any later server Retry-After. This reuses the accepted daily
  default as a conservative host retry floor; it is a policy default, not an
  empirically optimized interval. No numeric threshold or admission rule changes.
- Retry-After supports delay-seconds and HTTP-date per
  [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after).
  Invalid, negative, malformed, or unrepresentable values fall back to the
  daily floor. A valid longer server delay is never prematurely capped.
- The monotonic upsert cannot shorten a concurrent longer hold. Skips neither
  extend the timestamp nor produce observations, outcomes, or source authority.
  The summary reports the absolute retry time and the reason for new holds.
  Expiration restores the existing evidence and cadence checks automatically.
- The probe makes no inline retry after 429, preserving truthful request counts.
  The first actual rate-limit outcome remains adverse observation evidence.
  Robots responses also preserve available Retry-After metadata.
- Hold persistence occurs before observation persistence: a real 429 remains
  shielded if a later observation revision check rejects. A failed hold write
  aborts the run and returns 503; it cannot report stored observation success.

The host table never publishes, admits, promotes, or changes registry state.
There is no production write in this implementation session. Jev advisory
selected the dedicated table over overloading unrelated fetch state (0.99
confidence); deterministic tests remain the verification authority.

## Verification and limits

Focused tests cover Retry-After parsing, separate-run holds and expiry, no
synthetic observations, current-endpoint revalidation, fail-closed storage,
actual SQLite migration constraints and reordered monotonic writes, and the
route's reader/writer wiring. Typecheck, guardrails, and accepted-parameter
parity passed on local Bun 1.4.2 (repository pin: 1.3.14).

No distributed lease is introduced: simultaneously in-flight runs may still
race before a 429 hold is stored. The new table starts empty and does not
reinterpret historical 429 observations. Long server Retry-After timestamps
remain visible and explicit; they are not silently replaced by a permanent
state or repeatedly renewed by skips.

The gateway's current lookback/earliest-healthy semantics are unchanged; old
adverse rows may still prevent qualification despite a newer clean suffix.
This unit cannot claim zero fleet rate limits, six source promotions, eight
clean days, or increased fresh daily publications before live evidence exists.

Rollback: restore the prior runtime while retaining the additive scheduling
table and genuine observation history. Reopen on repeated post-expiry 429s,
held-host request leakage, unexpected storage failures, or starvation. The
next acceptance action is to measure actual host requests/skips and qualifying
windows after deployment, then follow the unchanged promotion gateway.
