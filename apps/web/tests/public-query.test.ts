import { describe, expect, test } from "bun:test";
import { escapeSqlLike, freshFtsCondition, parseFreshFilter, parseJobBoardRequest, parseJobIdRequest, parsePageRequest } from "../src/lib/public-query";

describe("parseJobBoardRequest", () => {
  test("normalizes a small FTS query and strict positive page", () => {
    expect(parseJobBoardRequest(new URLSearchParams("q=virtual%20assistant%20jobs&page=2"))).toEqual({
      ok: true,
      query: "virtual assistant jobs",
      page: 2,
      fresh: null,
    });
  });

  test("parses the fresh-arrivals filter as an allowlist", () => {
    expect(parseJobBoardRequest(new URLSearchParams("fresh=24h"))).toMatchObject({ ok: true, fresh: "24h" });
    expect(parseJobBoardRequest(new URLSearchParams("fresh=today"))).toMatchObject({ ok: true, fresh: "today" });
    expect(parseJobBoardRequest(new URLSearchParams("q=va&fresh=24h&page=3"))).toMatchObject({
      ok: true,
      query: "va",
      page: 3,
      fresh: "24h",
    });
  });

  test("unknown fresh values fall back to the default board without a 400", () => {
    expect(parseJobBoardRequest(new URLSearchParams("fresh=hourly"))).toMatchObject({ ok: true, fresh: null });
    expect(parseJobBoardRequest(new URLSearchParams("fresh="))).toMatchObject({ ok: true, fresh: null });
  });

  test("rejects oversized and high-cardinality queries before FTS", () => {
    expect(parseJobBoardRequest(new URLSearchParams(`q=${"x".repeat(161)}`))).toMatchObject({ ok: false, status: 400 });
    expect(parseJobBoardRequest(new URLSearchParams("q=one two three four five six seven eight nine"))).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects malformed and unbounded pages", () => {
    expect(parseJobBoardRequest(new URLSearchParams("page=1e2"))).toMatchObject({ ok: false, status: 400 });
    expect(parseJobBoardRequest(new URLSearchParams("page=101"))).toMatchObject({ ok: false, status: 400 });
  });
});

describe("parseFreshFilter", () => {
  test("accepts only the allowlisted windows", () => {
    expect(parseFreshFilter("24h")).toBe("24h");
    expect(parseFreshFilter("today")).toBe("today");
    expect(parseFreshFilter(null)).toBeNull();
    expect(parseFreshFilter("24H")).toBeNull();
    expect(parseFreshFilter("7d")).toBeNull();
    expect(parseFreshFilter("today; DROP TABLE opportunities")).toBeNull();
  });

  test("freshFtsCondition stays bound-free and Manila-anchored", () => {
    expect(freshFtsCondition("24h")).toContain("scraped_at");
    expect(freshFtsCondition("24h")).not.toContain("?");
    expect(freshFtsCondition("today")).toContain("+8 hours");
  });
});

describe("parsePageRequest", () => {
  test("accepts the default page and rejects numeric aliases", () => {
    expect(parsePageRequest(null)).toEqual({ ok: true, page: 1 });
    expect(parsePageRequest("12junk")).toMatchObject({ ok: false, status: 400 });
  });
});

/**
 * The single public job-id grammar, shared by `/jobs/[id]` and the outbound
 * apply redirect `/api/click/[id]`. The redirect route previously used
 * `parseInt`, which accepts any numeric PREFIX, so one job had a live 302
 * spelling that the detail route 404'd.
 */
describe("parseJobIdRequest", () => {
  test("accepts the smallest and largest ids a real row can have", () => {
    expect(parseJobIdRequest("1")).toEqual({ ok: true, id: 1 });
    expect(parseJobIdRequest("4667")).toEqual({ ok: true, id: 4667 });
    expect(parseJobIdRequest(String(Number.MAX_SAFE_INTEGER))).toEqual({
      ok: true,
      id: Number.MAX_SAFE_INTEGER,
    });
  });

  test("rejects every numeric alias parseInt would have accepted", () => {
    // Each of these parsed to a real id under `parseInt(x, 10)`.
    expect(parseInt("123abc", 10)).toBe(123);
    expect(parseInt("1e3", 10)).toBe(1);
    expect(parseInt(" 123", 10)).toBe(123);
    expect(parseInt("+123", 10)).toBe(123);
    expect(parseInt("12.9", 10)).toBe(12);
    for (const alias of ["123abc", "1e3", " 123", "+123", "12.9"]) {
      expect(parseJobIdRequest(alias)).toMatchObject({ ok: false, status: 400 });
    }
  });

  test("rejects ids outside the autoincrement range SQLite can hold", () => {
    // `INTEGER PRIMARY KEY AUTOINCREMENT` starts at 1, so 0 and a leading zero
    // name no row; a negative id is not an alias for a high one.
    expect(parseJobIdRequest("0")).toMatchObject({ ok: false, status: 400 });
    expect(parseJobIdRequest("0123")).toMatchObject({ ok: false, status: 400 });
    expect(parseJobIdRequest("-123")).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects an id outside the safe-integer range rather than rounding it", () => {
    // Parses exactly in JS, so this is a range check, not a float accident.
    const beyondMax = String(Number.MAX_SAFE_INTEGER + 2);
    expect(Number.isSafeInteger(Number(beyondMax))).toBe(false);
    expect(parseJobIdRequest(beyondMax)).toMatchObject({ ok: false, status: 400 });
  });

  test("rejects absent and non-string ids without throwing", () => {
    expect(parseJobIdRequest(null)).toMatchObject({ ok: false, status: 400 });
    expect(parseJobIdRequest(undefined)).toMatchObject({ ok: false, status: 400 });
    expect(parseJobIdRequest("")).toMatchObject({ ok: false, status: 400 });
  });

  test("the validated id is the exact integer that gets bound into the query", () => {
    // Guards the class of bug where a string id is passed through and the
    // database driver coerces it differently from the validation.
    const parsed = parseJobIdRequest("4667");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(typeof parsed.id).toBe("number");
      expect(String(parsed.id)).toBe("4667");
    }
  });
});

test("escapes SQL LIKE wildcards in user-provided directory searches", () => {
  expect(escapeSqlLike("100%_ready\\now")).toBe("100\\%\\_ready\\\\now");
});
