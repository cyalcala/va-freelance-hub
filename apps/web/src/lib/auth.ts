// Shared cron/ingest authentication (2026-07 audit).
//
// Every protected route previously inlined `providedSecret !== proxySecret`,
// a short-circuiting compare whose runtime leaks the matching-prefix length
// (a timing side channel) and which was duplicated five times. This helper
// centralizes the check and uses a length-independent, constant-time compare.

function timingSafeEqual(a: string, b: string): boolean {
  // Compare digests of equal length so the loop time does not depend on where
  // the first differing byte is, nor on the raw secret lengths.
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Fold both to a fixed 32-byte accumulator via XOR so length differences do
  // not short-circuit; unequal lengths still fail via the length flag.
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** Extract the presented secret from either Authorization: Bearer or x-cron-secret. */
export function extractProvidedSecret(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return request.headers.get("x-cron-secret");
}

/**
 * True when the request carries the correct shared secret. Constant-time.
 * `proxySecret` is env.PROXY_SECRET || env.CRON_SECRET.
 */
export function isAuthorized(request: Request, proxySecret: string | undefined | null): boolean {
  if (!proxySecret) return false;
  const provided = extractProvidedSecret(request);
  if (!provided) return false;
  return timingSafeEqual(provided, proxySecret);
}
