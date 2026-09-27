import { expect, spyOn, test } from "bun:test";
import { loadPublicData, publicDataErrorClass } from "../src/lib/public-route-load";

test("returns loaded data without changing a successful public response", async () => {
  const response = { status: 200, headers: new Headers({ "Cache-Control": "public, max-age=60" }) };

  await expect(loadPublicData(response, async () => ["job"])).resolves.toEqual({ ok: true, value: ["job"] });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
});

test("classifies nested D1 failures without exposing query parameters or secrets", () => {
  expect(publicDataErrorClass(new Error("Failed query: secret-token", {
    cause: new Error("D1_ERROR: too many SQL variables at offset 525: SQLITE_ERROR"),
  }))).toBe("d1_bind_limit");
  expect(publicDataErrorClass(new Error("D1 daily limit exceeded"))).toBe("d1_quota");
  expect(publicDataErrorClass(new Error("no such column: internal_field"))).toBe("d1_schema");
  expect(publicDataErrorClass(new Error("secret-token"))).toBeNull();
  expect(publicDataErrorClass("secret-token")).toBeNull();
});

test("turns an unexpected data failure into a non-cacheable 503", async () => {
  const response = { status: 200, headers: new Headers({ "Cache-Control": "public, max-age=60" }) };
  const log = spyOn(console, "error").mockImplementation(() => {});

  try {
    await expect(loadPublicData(response, async () => { throw new Error("D1 unavailable"); }))
      .resolves.toEqual({ ok: false, value: null });
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(log).toHaveBeenCalledWith("public route data load failed", "Error");
  } finally {
    log.mockRestore();
  }
});
