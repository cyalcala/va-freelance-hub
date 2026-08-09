import { describe, expect, test } from "bun:test";
import { escapeSqlLike, parseJobBoardRequest, parsePageRequest } from "../src/lib/public-query";

describe("parseJobBoardRequest", () => {
  test("normalizes a small FTS query and strict positive page", () => {
    expect(parseJobBoardRequest(new URLSearchParams("q=virtual%20assistant%20jobs&page=2"))).toEqual({
      ok: true,
      query: "virtual assistant jobs",
      page: 2,
    });
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

describe("parsePageRequest", () => {
  test("accepts the default page and rejects numeric aliases", () => {
    expect(parsePageRequest(null)).toEqual({ ok: true, page: 1 });
    expect(parsePageRequest("12junk")).toMatchObject({ ok: false, status: 400 });
  });
});

test("escapes SQL LIKE wildcards in user-provided directory searches", () => {
  expect(escapeSqlLike("100%_ready\\now")).toBe("100\\%\\_ready\\\\now");
});
