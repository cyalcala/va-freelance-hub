const MAX_PAGE = 100;
const MAX_SEARCH_QUERY_LENGTH = 160;
const MAX_SEARCH_TOKENS = 8;

type ValidPage = { ok: true; page: number };
type InvalidRequest = { ok: false; status: 400; message: string };

export type PublicPageRequest = ValidPage | InvalidRequest;
export type JobBoardRequest =
  | (ValidPage & { query: string; fresh: FreshFilter | null })
  | InvalidRequest;

/**
 * Recency filter for the public board. `24h` is a rolling 24-hour window on
 * first-seen (`scraped_at`); `today` is the current Asia/Manila calendar day.
 * Anything else is rejected to null (never a 400 — an unknown filter simply
 * shows the default board).
 */
export type FreshFilter = "24h" | "today";

export function parseFreshFilter(raw: string | null): FreshFilter | null {
  if (raw === "24h" || raw === "today") return raw;
  return null;
}

/**
 * Raw FTS-path predicate for a parsed fresh filter. The value is allowlisted
 * by `parseFreshFilter`, so interpolation is injection-safe; request values
 * never reach this string.
 */
export function freshFtsCondition(fresh: FreshFilter): string {
  if (fresh === "24h") {
    return "unixepoch(o.scraped_at) >= unixepoch('now') - 86400";
  }
  return "date(o.scraped_at, '+8 hours') = date('now', '+8 hours')";
}

/**
 * Restrict public list parameters before they reach D1. Strict decimal parsing
 * prevents URL aliases such as `1e2`, while the ceiling bounds OFFSET work.
 */
export function parsePageRequest(rawPage: string | null): PublicPageRequest {
  if (!rawPage) return { ok: true, page: 1 };
  if (!/^[1-9]\d*$/.test(rawPage)) {
    return { ok: false, status: 400, message: "Invalid page number." };
  }

  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page > MAX_PAGE) {
    return { ok: false, status: 400, message: `Page must be between 1 and ${MAX_PAGE}.` };
  }

  return { ok: true, page };
}

/**
 * Constrain FTS input so a single public request cannot cause unbounded token
 * parsing, cache-key growth, or deep D1 pagination.
 */
export function parseJobBoardRequest(params: URLSearchParams): JobBoardRequest {
  const query = (params.get("q") || "").trim();
  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `Search terms must be ${MAX_SEARCH_QUERY_LENGTH} characters or fewer.`,
    };
  }
  if (query && query.split(/\s+/).filter(Boolean).length > MAX_SEARCH_TOKENS) {
    return {
      ok: false,
      status: 400,
      message: `Search supports up to ${MAX_SEARCH_TOKENS} terms.`,
    };
  }

  const page = parsePageRequest(params.get("page"));
  const fresh = parseFreshFilter(params.get("fresh"));
  return page.ok ? { ...page, query, fresh } : page;
}

/** Escape user text for a parameterized SQLite LIKE expression with ESCAPE '\\'. */
export function escapeSqlLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
