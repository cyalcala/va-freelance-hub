import { describe, expect, test } from "bun:test";
import { escapeSqlLike, freshFtsCondition, parseFreshFilter, parseJobBoardRequest, parsePageRequest } from "../src/lib/public-query";

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

test("escapes SQL LIKE wildcards in user-provided directory searches", () => {
  expect(escapeSqlLike("100%_ready\\now")).toBe("100\\%\\_ready\\\\now");
});
