import { expect, test } from "bun:test";

const directorySource = await Bun.file(
  new URL("../src/components/DirectoryAgencyCard.astro", import.meta.url),
).text();

test("directory cards do not depend on a third-party favicon service", () => {
  expect(directorySource).not.toContain("google.com/s2/favicons");
  expect(directorySource).toContain("/api/company-logo?domain=");
  expect(directorySource).toContain("loading=\"lazy\"");
});
