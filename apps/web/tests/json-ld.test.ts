import { expect, test } from "bun:test";
import { serializeJsonLd } from "../src/lib/json-ld";

test("serializes job metadata without allowing a script element breakout", () => {
  const injected = "</script><script>window.xss = 1</script>";
  const serialized = serializeJsonLd({ title: injected });

  expect(serialized).not.toContain("</script>");
  expect(serialized).toContain("\\u003c/script\\u003e\\u003cscript\\u003ewindow.xss = 1\\u003c/script\\u003e");
  expect(JSON.parse(serialized)).toEqual({ title: injected });
});

test("preserves valid JSON-LD values", () => {
  expect(serializeJsonLd({ "@type": "JobPosting", title: "Virtual assistant" }))
    .toBe('{"@type":"JobPosting","title":"Virtual assistant"}');
});
