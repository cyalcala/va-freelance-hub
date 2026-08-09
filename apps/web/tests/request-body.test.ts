import { expect, test } from "bun:test";
import { readJsonBodyLimited } from "../src/lib/request-body";

test("reads JSON when the actual body stays within the byte budget", async () => {
  const request = new Request("https://app.test/api", {
    method: "POST",
    body: JSON.stringify({ items: ["✓"] }),
  });

  await expect(readJsonBodyLimited(request, 128)).resolves.toEqual({
    ok: true,
    value: { items: ["✓"] },
  });
});

test("rejects oversized bodies even when Content-Length is absent or false", async () => {
  const request = new Request("https://app.test/api", {
    method: "POST",
    headers: { "content-length": "1" },
    body: JSON.stringify({ text: "x".repeat(128) }),
  });

  await expect(readJsonBodyLimited(request, 32)).resolves.toEqual({
    ok: false,
    status: 413,
    message: "Payload too large (max 32 bytes)",
  });
});

test("returns a client error for invalid JSON without converting it into a 500", async () => {
  const request = new Request("https://app.test/api", { method: "POST", body: "{" });

  await expect(readJsonBodyLimited(request, 32)).resolves.toEqual({
    ok: false,
    status: 400,
    message: "Invalid JSON payload",
  });
});
