import { expect, test } from "bun:test";

const layoutSource = await Bun.file(
  new URL("../src/layouts/Layout.astro", import.meta.url),
).text();
const directorySource = await Bun.file(
  new URL("../src/pages/directory.astro", import.meta.url),
).text();

test("desktop header navigation and mobile tabs switch at the same breakpoint", () => {
  expect(layoutSource).toContain('class="md:hidden fixed bottom-0');
  expect(layoutSource).toContain('<nav class="hidden md:flex items-center gap-2">');
  expect(layoutSource).not.toContain("hidden sm:inline-flex");
});

test("directory cards do not depend on a third-party favicon service", () => {
  expect(directorySource).not.toContain("google.com/s2/favicons");
  expect(directorySource).toContain("agency.companyName.charAt(0).toUpperCase()");
});
