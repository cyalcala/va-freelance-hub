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

/**
 * Canonicalize a posting URL for IDENTITY use: lowercase the scheme and host
 * only, because RFC 3986 6.2.2.1 makes both case-insensitive while path, query
 * and fragment case can be significant (ATS routes and apply tokens routinely
 * carry it).
 *
 * Why this exists (INCIDENT-0410(aa-47), measured against prod D1 on
 * 2026-10-04): two ingest planes canonicalized the same posting differently.
 * The scraper plane (`normalizeRemoteOkUrl`) lowercases the host; the lake
 * intake plane stored `item.url` verbatim, and RemoteOK's API returns
 * `https://remoteOK.com/...`. D1's `UNIQUE(source_url)` and the
 * `content_hash` index are both case-sensitive, so one canonical opening was
 * served as two active rows with two ids and two hashes (9 pairs / 18 active
 * rows, all RemoteOK).
 *
 * This function fails OPEN on identity: anything it cannot parse is returned
 * byte-for-byte unchanged, so it can never drop or invent a candidate. It is
 * deliberately NOT a URL normalizer — it does not strip default ports, add a
 * trailing slash, sort query parameters, drop fragments or upgrade http, since
 * none of those are needed for identity and each would change stored keys.
 */
export function canonicalizeSourceUrl(raw: string): string {
  if (!raw) return raw;

  // Only absolute scheme://authority URLs have a host to canonicalize.
  const schemeEnd = raw.indexOf("://");
  if (schemeEnd <= 0) return raw;

  const authorityStart = schemeEnd + 3;
  let authorityEnd = raw.length;
  for (const delimiter of ["/", "?", "#"]) {
    const index = raw.indexOf(delimiter, authorityStart);
    if (index !== -1 && index < authorityEnd) authorityEnd = index;
  }
  const authority = raw.slice(authorityStart, authorityEnd);

  // Userinfo is opaque and can carry a secret; lowercasing it could corrupt it.
  if (authority.includes("@")) return raw;

  const scheme = raw.slice(0, schemeEnd).toLowerCase();
  const host = authority.toLowerCase();
  return `${scheme}://${host}${raw.slice(authorityEnd)}`;
}

/** Extract an error message from an unknown thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** SHA-256 hex digest via the Web Crypto API (available in Workers and Node 18+). */
export async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
