import { expect, test } from "bun:test";
import { getDb } from "./client";

test("the active database client requires an explicit Cloudflare D1 binding", () => {
  expect(() => getDb()).toThrow("Cloudflare D1 binding");
});
