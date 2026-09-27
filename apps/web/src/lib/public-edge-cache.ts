/** Only known public HTML routes may share an edge entry. */
export function publicHtmlCacheKey(request: Request): Request | null {
  if (request.method !== "GET" || request.headers.has("Authorization") || request.headers.has("Cookie")) return null;
  const url = new URL(request.url);
  if (!(/^(\/|\/opportunities|\/directory|\/data-policy|\/privacy|\/categories\/[^/.]+|\/jobs\/\d+)\/?$/).test(url.pathname)) return null;
  // The homepage does not consume query parameters. Tracking URLs must not
  // create fresh database reads for identical content.
  if (url.pathname === "/") url.search = "";
  // A new schema of public eligibility must not reuse pre-repair cache entries.
  url.searchParams.set("__public_cache_revision", "2026-09-27-eligibility");
  return new Request(url.toString(), { method: "GET" });
}

export function mayStorePublicHtml(response: Response): boolean {
  return response.status === 200 &&
    !response.headers.has("Set-Cookie") &&
    !/\b(no-store|private|no-cache)\b/i.test(response.headers.get("Cache-Control") ?? "");
}
