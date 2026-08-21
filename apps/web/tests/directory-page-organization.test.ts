import { expect, test } from "bun:test";

const directorySource = await Bun.file(
  new URL("../src/pages/directory.astro", import.meta.url),
).text();
const categoryNavSource = await Bun.file(
  new URL("../src/components/DirectoryCategoryNav.astro", import.meta.url),
).text();

test("directory presents category-first navigation instead of one undifferentiated grid", () => {
  expect(categoryNavSource).toContain('aria-label="Agency categories"');
  expect(categoryNavSource).toContain("Find your lane");
  expect(directorySource).toContain("groupedCards.map");
  expect(directorySource).toContain("View this category →");
});

test("search and pagination retain the selected category", () => {
  expect(directorySource).toContain("params.set('category', selectedCategory)");
  expect(directorySource).toContain('type="hidden" name="category"');
  expect(directorySource).toContain("Clear category");
});
