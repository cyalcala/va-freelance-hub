const MAX_PAGE = 100;
const MAX_SEARCH_QUERY_LENGTH = 160;
const MAX_SEARCH_TOKENS = 8;

type ValidPage = { ok: true; page: number };
type ValidJobId = { ok: true; id: number };
type InvalidRequest = { ok: false; status: 400; message: string };

export type PublicPageRequest = ValidPage | InvalidRequest;
export type JobBoardRequest =
  | (ValidPage & { query: string; fresh: FreshFilter | null })
  | InvalidRequest;
export type PublicJobIdRequest = ValidJobId | InvalidRequest;

/**
 * Restrict a public job id before it reaches D1.
 *
 * Two live public routes take a job id from the URL: `pages/jobs/[id].astro`
 * and the outbound apply redirect `pages/api/click/[id].ts`. The detail route
 * validated it with `/^[1-9]\d*$/` plus a safe-integer check, while the click
 * route used `parseInt(idStr, 10)`, which accepts any numeric PREFIX. So
 * `/api/click/12abc`, `/api/click/ 12`, `/api/click/+12`, `/api/click/1e3` and
 * `/api/click/12.9` all resolved job 12.
 *
 * Two reasons that mattered, both on an unauthenticated path:
 *
 * 1. COST. The prefix parsed fine, so the route performed its D1 read and only
 *    then compared the requested redirect target. Every malformed request
 *    therefore cost one prod D1 row read — the same cost class that exhausted
 *    the Cloudflare free-tier daily row-read limit and served 503s for ~14 h
 *    (error 7500, prod D1, 2026-10-04/05). Rejecting here means the malformed
 *    request costs nothing, which is why the call sites parse BEFORE touching
 *    the binding rather than after.
 * 2. IDENTITY. `/jobs/12abc` is a 404, but `/api/click/12abc` was a live 302
 *    that incremented job 12's `click_count`, so one canonical opening accrued
 *    analytics under two spellings. CONSTITUTION §3.2 #11 requires public
 *    surfaces to obey one eligibility contract; two id grammars for one
 *    resource is the same class of divergence.
 *
 * The grammar is deliberately identical to the detail route's: positive
 * decimal, no sign, no leading zero (SQLite `INTEGER PRIMARY KEY` starts at 1),
 * no exponent, no decimal point, and inside the safe-integer range so the value
 * bound into the query is the integer that was validated.
 */
export function parseJobIdRequest(rawId: string | null | undefined): PublicJobIdRequest {
  if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId)) {
    return { ok: false, status: 400, message: "Invalid job ID." };
  }

  const id = Number(rawId);
  if (!Number.isSafeInteger(id)) {
    return { ok: false, status: 400, message: "Invalid job ID." };
  }

  return { ok: true, id };
}

/**
 * Recency filter for the public board. `24h` is a rolling 24-hour window on
 * first-seen (`scraped_at`); `today` is the current Asia/Manila calendar day.
 * Anything else is rejected to null (never a 400 — an unknown filter simply
 * shows the default board).
 *
 * UI-versus-operating-metric semantics (F5): this view's counts measure
 * first-seen arrival recency, NOT the independently adjudicated,
 * receipt-backed FRESH_DISCOVERY performance metric. Do not use this
 * view's count to certify the 100/day objective.
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
