type HtmlEdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

export const PUBLIC_SNAPSHOT_FRESH_MS = 5 * 60_000;

export function publicHtmlCacheControl(response: Response, now = Date.now()): string {
  if (response.status !== 200 || response.headers.has("Set-Cookie")
    || /\b(no-store|private|no-cache)\b/i.test(response.headers.get("Cache-Control") ?? "")) return "no-store";
  if (!response.headers.has("X-Public-Snapshot")) {
    return "public, max-age=60, s-maxage=300, stale-while-revalidate=600";
  }
  const generated = Date.parse(response.headers.get("X-Public-Snapshot-Generated-At") ?? "");
  if (response.headers.get("X-Public-Snapshot") !== "fresh" || !Number.isFinite(generated)
    || generated > now || now >= generated + PUBLIC_SNAPSHOT_FRESH_MS) return "no-store";
  const seconds = Math.min(60, Math.floor((generated + PUBLIC_SNAPSHOT_FRESH_MS - now) / 1000));
  return seconds > 0 ? `public, max-age=${seconds}, s-maxage=${seconds}` : "no-store";
}

export function runtimePublicHtmlCache(): HtmlEdgeCache | null {
  try {
    return typeof caches === "undefined" ? null : (caches as unknown as { default?: HtmlEdgeCache }).default ?? null;
  } catch {
    return null;
  }
}

export async function readPublicHtmlCache(cache: HtmlEdgeCache, key: Request, timeoutMs = 2_000): Promise<Response | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      cache.match(key),
      new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), timeoutMs); }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Only known public HTML routes may share an edge entry. */
export function publicHtmlCacheKey(request: Request): Request | null {
  if (request.method !== "GET" || request.headers.has("Authorization") || request.headers.has("Cookie")) return null;
  const url = new URL(request.url);
  if (!(/^(\/|\/opportunities|\/directory|\/data-policy|\/privacy|\/categories\/[^/.]+|\/jobs\/\d+)\/?$/).test(url.pathname)) return null;
  // The homepage does not consume query parameters. Tracking URLs must not
  // create fresh database reads for identical content.
  if (url.pathname === "/") url.search = "";
  // New frontend assets must not reuse HTML that points to a previous build's
  // stylesheet. Keep the existing eligibility, private-request and TTL rules.
  url.searchParams.set("__public_cache_revision", "2026-10-12-va-openings");
  return new Request(url.toString(), { method: "GET" });
}

export function mayStorePublicHtml(response: Response, now = Date.now()): boolean {
  return publicHtmlCacheControl(response, now) !== "no-store";
}
