// Single shared content-hash implementation (2026-07 audit).
//
// Previously four scrapers each carried an identical private copy of this
// function while packages/db/schema.ts claimed the column was "sha256" and a
// dead legacy script (scripts/gha/harvest.ts) really did write sha256 —
// meaning the UNIQUE content_hash_idx could never dedup across writers. The
// live writers are these scrapers only, so the fix is one shared function
// and an honest schema comment.
//
// Properties: cyrb53-style 64-bit hash rendered as 16 hex chars. At the
// current table size (~2k rows) the birthday-bound probability of two
// distinct (title, sourceUrl) pairs colliding is ~1e-13 — and even a
// collision only suppresses one insert via onConflictDoNothing, because
// primary dedup is the UNIQUE source_url column. Do NOT reuse this hash for
// anything security-sensitive.

/** cyrb53-style 64-bit hash of an arbitrary string, rendered as 16 hex chars. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).slice(0, 16);
}

export function toContentHash(title: string, sourceUrl: string): string {
  return hashString(`${title}::${sourceUrl}`);
}
