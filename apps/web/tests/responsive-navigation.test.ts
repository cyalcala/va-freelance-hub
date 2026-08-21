import { expect, test } from "bun:test";

const layoutSource = await Bun.file(
  new URL("../src/layouts/Layout.astro", import.meta.url),
).text();

test("desktop header navigation and mobile tabs switch at the same breakpoint", () => {
  expect(layoutSource).toContain('class="md:hidden fixed bottom-0');
  expect(layoutSource).toContain('<nav class="hidden md:flex items-center gap-2">');
  expect(layoutSource).not.toContain("hidden sm:inline-flex");
});
